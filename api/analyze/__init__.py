import json
import base64
import requests
import logging
import re
from typing import Dict, Any
import azure.functions as func

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("munger_ai_api")

# Define Gemini API key
GEMINI_API_KEY = "AIzaSyB-RIjhhODp6aPTzqVcwbXD894oebXFCUY"

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Azure Functions HTTP trigger function for analyzing purchase decisions.
    
    This function uses the Enhanced Gemini Service to analyze a purchase decision
    and provide a recommendation based on Charlie Munger's mental models.
    """
    try:
        body = req.get_json()
    except:
        return func.HttpResponse("Invalid JSON body", status_code=400)
    
    item_name = body.get("itemName", "")
    item_cost = float(body.get("itemCost", 0))
    monthly_income = float(body.get("leftoverIncome", 2000))  # Default to 2000 if not provided
    has_debt = body.get("hasDebt", "No")  # Default to No if not provided
    financial_goal = body.get("financialGoal", "")  # Default to empty if not provided
    urgency = body.get("urgency", "Mixed")  # Default to Mixed if not provided
    extra_context = body.get("extraContext", "")  # Default to empty if not provided
    image_base64 = body.get("imageBase64", None)
    
    # Create a context dictionary for the purchase analysis
    purchase_context = {
        "item_name": item_name,
        "item_cost": item_cost,
        "leftover_income": monthly_income,
        "has_high_interest_debt": has_debt,
        "main_financial_goal": financial_goal,
        "purchase_urgency": urgency,
        "extra_context": extra_context
    }
    
    try:
        # Create an instance of the enhanced Gemini service
        gemini_service = EnhancedGeminiService()
        
        # Analyze the purchase
        factors = gemini_service.analyze_purchase(purchase_context)
        
        # Calculate the total PDS score
        pds_score = sum([factors.get(f, 0) for f in ['D', 'O', 'G', 'L', 'B']])
        
        # Determine recommendation based on PDS score
        if pds_score >= 5:
            recommendation = "Buy it"
        elif pds_score < 0:
            recommendation = "Don't Buy it"
        else:
            recommendation = "Consider carefully"
        
        # Format factors for display
        factor_explanations = []
        for f, name in [
            ('D', 'Discretionary Income'),
            ('O', 'Opportunity Cost'),
            ('G', 'Goal Alignment'),
            ('L', 'Long-term Impact'),
            ('B', 'Behavioral')
        ]:
            score = factors.get(f, 0)
            explanation = factors.get(f'{f}_explanation', 'No explanation available')
            factor_explanations.append(f"{name} ({f}): {score:+d} - {explanation}")
        
        # Use insights if available
        insights = factors.get("insights", [])
        if not insights:
            insights = ["Consider your budget constraints before making this purchase."]
        
        # Create response data
        response_data = {
            "name": item_name,
            "cost": item_cost,
            "pds_score": pds_score,
            "recommendation": recommendation,
            "factors": factor_explanations,
            "insights": insights,
            "explanation": f"Based on Charlie Munger's mental models, your purchase of {item_name} received a Purchase Decision Score of {pds_score}."
        }
        
        # If image was provided, add image analysis results
        if image_base64:
            image_analysis = analyze_image_with_gemini(item_name, image_base64)
            if "name" in image_analysis and image_analysis["name"] != "Error":
                response_data["name"] = image_analysis["name"]
                response_data["facts"] = image_analysis["facts"]
        
        return func.HttpResponse(
            json.dumps(response_data),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        logger.error(f"Error during purchase analysis: {str(e)}")
        return func.HttpResponse(
            json.dumps({
                "error": str(e),
                "message": "Error analyzing purchase decision"
            }),
            status_code=500,
            mimetype="application/json"
        )

def analyze_image_with_gemini(item_name: str, image_base64: str) -> Dict[str, Any]:
    """
    Analyze an image using the Gemini API to identify and provide facts about an item.
    
    Args:
        item_name: Name of the item provided by the user
        image_base64: Base64-encoded image data
        
    Returns:
        Dictionary with item name, cost estimate, and interesting facts
    """
    instructions = """
      You are shown a single consumer item.
      1. Identify it with brand/model if visible
      2. Estimate cost in USD
      3. Provide 1-2 sentences of interesting facts

      Return only valid JSON in this format:
      {
        "name": "...",
        "cost": 123.45,
        "facts": "..."
      }
    """
    
    gemini_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-pro:generateContent?key={GEMINI_API_KEY}"
    )
    
    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": instructions},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }
        ]
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        resp = requests.post(gemini_url, headers=headers, json=request_body)
        resp.raise_for_status()
        gemini_response = resp.json()
        text = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        parsed_json = extract_json(text)
        return parsed_json
    except Exception as e:
        logger.error(f"Error calling Gemini API for image analysis: {str(e)}")
        return {
            "name": "Error",
            "cost": 0,
            "facts": f"Error analyzing image: {e}"
        }

def extract_json(text: str):
    """
    Extract JSON from text response.
    
    Args:
        text: Text containing JSON data
        
    Returns:
        Parsed JSON data or default values if parsing fails
    """
    text = text.strip()
    start_idx = text.find("{")
    end_idx = text.rfind("}") + 1
    if start_idx >= 0 and end_idx > start_idx:
        json_str = text[start_idx:end_idx]
        try:
            data = json.loads(json_str)
            if "name" not in data:
                data["name"] = "Unknown"
            if "cost" not in data or not isinstance(data["cost"], (int, float)):
                data["cost"] = 0
            if "facts" not in data:
                data["facts"] = ""
            return data
        except:
            pass
    return {
        "name": "Unknown",
        "cost": 0,
        "facts": "Response not in recognized JSON format."
    }

# Enhanced Gemini Service from paste.txt
class EnhancedGeminiService:
    """Enhanced Gemini service for purchase decision analysis with improved prompting and error handling"""
    
    def __init__(self, model_name="gemini-1.5-pro"):
        self.model_name = model_name
        logger.info(f"Initialized Gemini service with model: {model_name}")
    
    def analyze_purchase(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a purchase decision using enhanced prompting and error handling
        
        Args:
            context: Dictionary containing purchase details and user context
            
        Returns:
            Dictionary with factor scores and explanations
        """
        prompt = self._create_enhanced_prompt(context)
        logger.info(f"Analyzing purchase: {context.get('item_name', 'Unknown')}")
        
        try:
            # Call Gemini API directly with requests library
            gemini_url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.model_name}:generateContent?key={GEMINI_API_KEY}"
            )
            
            request_body = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1024,
                    "topP": 0.95
                }
            }
            
            headers = {"Content-Type": "application/json"}
            
            response = requests.post(gemini_url, headers=headers, json=request_body)
            response.raise_for_status()
            
            data = response.json()
            
            # Process the response
            if data and "candidates" in data and data["candidates"]:
                response_text = data["candidates"][0]["content"]["parts"][0]["text"]
                result = self._process_response(response_text)
                logger.info(f"Analysis complete. PDS Score: {sum([result.get(f, 0) for f in ['D', 'O', 'G', 'L', 'B']])}")
                return result
            else:
                logger.error("Empty response from Gemini API")
                return self._create_fallback_response("Empty response")
                
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return self._create_fallback_response(str(e))
    
    def _create_enhanced_prompt(self, context: Dict[str, Any]) -> str:
        """
        Create an enhanced prompt with clear instructions and examples
        
        Args:
            context: Dictionary containing purchase details and user context
            
        Returns:
            Formatted prompt string
        """
        # Extract context variables
        item_name = context.get("item_name", "Unknown Item")
        item_cost = context.get("item_cost", 0)
        leftover_income = context.get("leftover_income", 0)
        has_debt = context.get("has_high_interest_debt", "No")
        financial_goal = context.get("main_financial_goal", "")
        urgency = context.get("purchase_urgency", "Mixed")
        extra_context = context.get("extra_context", "")
        
        # Calculate income-to-cost ratio for better context
        income_cost_ratio = leftover_income / max(1, item_cost)
        
        # Create the enhanced prompt
        prompt = f"""
        You are a financial decision assistant based on Charlie Munger's mental models.
        
        # PURCHASE CONTEXT
        - Item Name: {item_name}
        - Item Cost: ${item_cost:.2f}
        - Monthly Leftover Income: ${leftover_income:.2f}
        - Income-to-Cost Ratio: {income_cost_ratio:.2f}
        - Has High-Interest Debt: {has_debt}
        - Financial Goal: {financial_goal}
        - Purchase Urgency: {urgency}
        - Additional Context: {extra_context}
        
        # TASK
        Evaluate this purchase using our 5-factor Purchase Decision Score (PDS) system:
        PDS = D + O + G + L + B, where each factor ranges from -2 to +2.
        
        # EVALUATION FRAMEWORK
        For each factor, provide:
        1. A score from -2 to +2
        2. A brief but specific explanation for the score
        
        ## D: DISCRETIONARY INCOME FACTOR
        - +2: Excellent affordability (cost < 10% of monthly leftover income)
        - +1: Good affordability (cost 10-25% of monthly leftover income)
        - 0: Moderate affordability (cost 25-50% of monthly leftover income)
        - -1: Challenging affordability (cost 50-100% of monthly leftover income)
        - -2: Poor affordability (cost > 100% of monthly leftover income)
        
        ## O: OPPORTUNITY COST FACTOR
        - Consider debt payment, investing, and saving alternatives
        - High-interest debt should heavily influence this score negatively
        
        ## G: GOAL ALIGNMENT FACTOR
        - How does this purchase align with stated financial goals?
        - Does it accelerate or delay financial milestones?
        
        ## L: LONG-TERM IMPACT FACTOR
        - Consider depreciation, maintenance costs, lifespan
        - Will this purchase generate future costs or savings?
        
        ## B: BEHAVIORAL FACTOR
        - Is this a genuine need or an impulse purchase?
        - Consider psychological utility and satisfaction durability
        
        # EXAMPLE ANALYSIS
        Here's an example analysis for purchasing a $2000 laptop with $1500 monthly leftover income:
        ```
        D: 0 - The $2000 laptop costs more than one month's leftover income, which is significant but potentially manageable.
        O: -1 - This represents opportunity cost vs. adding to emergency fund.
        G: +1 - Aligns with professional development if used for work/education.
        L: +1 - Long useful lifespan with good resale value.
        B: 0 - Mixed need/want; replaces aging computer but has premium features.
        ```
        
        # OUTPUT FORMAT
        Return a valid JSON object with this exact structure:
        {{
          "D": score,
          "O": score,
          "G": score,
          "L": score,
          "B": score,
          "D_explanation": "Your explanation here",
          "O_explanation": "Your explanation here",
          "G_explanation": "Your explanation here",
          "L_explanation": "Your explanation here",
          "B_explanation": "Your explanation here",
          "insights": ["Insight 1", "Insight 2"]
        }}
        
        Return ONLY the JSON object, no other text.
        """
        
        return prompt
    
    def _process_response(self, text: str) -> Dict[str, Any]:
        """
        Process the response from Gemini, with robust JSON extraction
        
        Args:
            text: Response text from Gemini
            
        Returns:
            Dictionary with factor scores and explanations
        """
        # Try direct JSON parsing first
        try:
            data = json.loads(text)
            if self._validate_factors(data):
                return data
        except json.JSONDecodeError:
            logger.warning("Direct JSON parsing failed, trying regex extraction")
        
        # Try to extract JSON with regex
        json_matches = re.findall(r"(\{[\s\S]*?\})", text)
        for json_str in json_matches:
            try:
                data = json.loads(json_str)
                if self._validate_factors(data):
                    return data
            except json.JSONDecodeError:
                continue
        
        # If no valid JSON found, try to extract structured data
        return self._extract_structured_data(text)
    
    def _validate_factors(self, data: Dict[str, Any]) -> bool:
        """
        Validate that all required factors are present and in range
        
        Args:
            data: Dictionary with factor scores
            
        Returns:
            Boolean indicating if the data is valid
        """
        required_factors = ["D", "O", "G", "L", "B"]
        
        # Check all factors exist
        if not all(factor in data for factor in required_factors):
            return False
        
        # Check all factors are integers in range [-2, 2]
        for factor in required_factors:
            value = data[factor]
            if not isinstance(value, int) or value < -2 or value > 2:
                return False
        
        return True
    
    def _extract_structured_data(self, text: str) -> Dict[str, Any]:
        """
        Extract structured data from text when JSON parsing fails
        
        Args:
            text: Response text from Gemini
            
        Returns:
            Dictionary with extracted factor scores and explanations
        """
        # Create a default response structure
        result = {
            "D": 0, "O": 0, "G": 0, "L": 0, "B": 0,
            "D_explanation": "", "O_explanation": "", "G_explanation": "",
            "L_explanation": "", "B_explanation": "",
            "insights": []
        }
        
        # Extract factor scores using regex
        factor_patterns = {
            "D": r"D:\s*([+-]?\d+)",
            "O": r"O:\s*([+-]?\d+)",
            "G": r"G:\s*([+-]?\d+)",
            "L": r"L:\s*([+-]?\d+)",
            "B": r"B:\s*([+-]?\d+)"
        }
        
        for factor, pattern in factor_patterns.items():
            match = re.search(pattern, text)
            if match:
                try:
                    value = int(match.group(1))
                    # Ensure value is in range [-2, 2]
                    result[factor] = max(-2, min(2, value))
                except (ValueError, IndexError):
                    pass
        
        # Extract explanations
        for factor in ["D", "O", "G", "L", "B"]:
            # Look for explanations after the factor score
            explanation_pattern = rf"{factor}:\s*[+-]?\d+\s*-\s*([^\n]+)"
            match = re.search(explanation_pattern, text)
            if match:
                result[f"{factor}_explanation"] = match.group(1).strip()
        
        # Try to extract insights
        insights_pattern = r"insights?:?\s*\n?(?:\d\.\s*|\*\s*|\-\s*)?([^\n]+)"
        insights_matches = re.finditer(insights_pattern, text, re.IGNORECASE)
        insights = [match.group(1).strip() for match in insights_matches]
        if insights:
            result["insights"] = insights[:2]  # Limit to 2 insights
        
        return result
    
    def _create_fallback_response(self, error_message: str) -> Dict[str, Any]:
        """
        Create a fallback response when the API call fails
        
        Args:
            error_message: Error message
            
        Returns:
            Dictionary with default factor scores and explanations
        """
        logger.warning(f"Creating fallback response due to: {error_message}")
        return {
            "D": 0, "O": 0, "G": 0, "L": 0, "B": 0,
            "D_explanation": "Unable to determine due to technical issues.",
            "O_explanation": "Unable to determine due to technical issues.",
            "G_explanation": "Unable to determine due to technical issues.",
            "L_explanation": "Unable to determine due to technical issues.",
            "B_explanation": "Unable to determine due to technical issues.",
            "insights": [
                "Consider your budget constraints before making this purchase.",
                "Technical issue occurred during analysis."
            ],
            "error": error_message
        }
