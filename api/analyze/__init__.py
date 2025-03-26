import json
import base64
import requests
import logging
import azure.functions as func

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("munger_ai_api")

# Define Gemini API key
GEMINI_API_KEY = "AIzaSyB-RIjhhODp6aPTzqVcwbXD894oebXFCUY"

def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    Azure Functions HTTP trigger function for analyzing purchase decisions.
    
    This function uses the Gemini API to make a direct buy/don't buy recommendation.
    """
    try:
        body = req.get_json()
    except:
        return func.HttpResponse("Invalid JSON body", status_code=400)
    
    item_name = body.get("itemName", "")
    item_cost = float(body.get("itemCost", 0))
    image_base64 = body.get("imageBase64", None)
    
    try:
        # If image is provided, get item details from image
        item_details = {}
        if image_base64:
            item_details = analyze_image_with_gemini(item_name, image_base64)
            
            # If image analysis returns a different item name, use it
            if item_details.get("name") and item_details["name"] != "Error":
                item_name = item_details["name"]
        
        # Get buy/don't buy recommendation
        recommendation = get_purchase_recommendation(item_name, item_cost)
        
        # Build response
        response_data = {
            "name": item_name,
            "cost": item_cost,
            "recommendation": recommendation["decision"],
            "explanation": recommendation["explanation"]
        }
        
        # Add image analysis details if available
        if image_base64 and "facts" in item_details:
            response_data["facts"] = item_details["facts"]
        
        return func.HttpResponse(
            json.dumps(response_data),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return func.HttpResponse(
            json.dumps({
                "error": str(e),
                "message": "Error analyzing purchase decision"
            }),
            status_code=500,
            mimetype="application/json"
        )

def analyze_image_with_gemini(item_name: str, image_base64: str) -> dict:
    """
    Analyze an image using the Gemini API to identify and provide facts about an item.
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
        return extract_json(text)
    except Exception as e:
        logger.error(f"Error calling Gemini API for image analysis: {str(e)}")
        return {
            "name": "Error",
            "cost": 0,
            "facts": f"Error analyzing image: {e}"
        }

def get_purchase_recommendation(item_name: str, item_cost: float) -> dict:
    """
    Generate a buy/don't buy recommendation using the Gemini API.
    """
    prompt = f"""
    As Charlie Munger, the legendary investor and business partner of Warren Buffett, analyze the following purchase decision:

    Item: {item_name}
    Cost: ${item_cost:.2f}

    Provide a clear "Buy" or "Don't Buy" recommendation based on your principles of rational decision-making, opportunity cost, and long-term value.

    Return ONLY a JSON object with this structure:
    {{
      "decision": "Buy" or "Don't Buy",
      "explanation": "2-3 sentences explaining your recommendation using Charlie Munger's mental models and investment principles"
    }}
    """
    
    gemini_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-pro:generateContent?key={GEMINI_API_KEY}"
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
            "maxOutputTokens": 512,
            "topP": 0.8
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        resp = requests.post(gemini_url, headers=headers, json=request_body)
        resp.raise_for_status()
        gemini_response = resp.json()
        text = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        result = extract_json(text)
        
        # Ensure we have the expected fields
        if "decision" not in result or "explanation" not in result:
            raise ValueError("Invalid response format")
            
        return result
    
    except Exception as e:
        logger.error(f"Error generating recommendation: {str(e)}")
        return {
            "decision": "Consider carefully",
            "explanation": f"Unable to provide a definitive recommendation for {item_name} due to insufficient information. Consider your personal financial situation and necessity of the purchase."
        }

def extract_json(text: str) -> dict:
    """
    Extract JSON from text response.
    """
    text = text.strip()
    start_idx = text.find("{")
    end_idx = text.rfind("}") + 1
    if start_idx >= 0 and end_idx > start_idx:
        json_str = text[start_idx:end_idx]
        try:
            return json.loads(json_str)
        except:
            pass
            
    # If JSON extraction failed, create a default response
    if "buy" in text.lower():
        return {
            "decision": "Buy",
            "explanation": "Based on the available information, this appears to be a reasonable purchase."
        }
    elif "don't buy" in text.lower() or "do not buy" in text.lower():
        return {
            "decision": "Don't Buy",
            "explanation": "Based on the available information, this does not appear to be a worthwhile purchase."
        }
    else:
        return {
            "decision": "Consider carefully",
            "explanation": "Weigh the value of this purchase against your financial goals and needs."
        }
