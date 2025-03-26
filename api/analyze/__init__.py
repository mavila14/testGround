import json
import base64
import requests
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    # Replace with your actual API key
    gemini_api_key = "AIzaSyB-RIjhhODp6aPTzqVcwbXD894oebXFCUY"

    try:
        body = req.get_json()
    except:
        return func.HttpResponse("Invalid JSON body", status_code=400)

    item_name = body.get("itemName", "").strip()
    item_cost = float(body.get("itemCost", 0))
    image_base64 = body.get("imageBase64", None)

    # Master instruction set – covers both text-only and image scenarios
    instructions = """
    You are analyzing a single consumer item. You may be provided with an image (inline_data) and/or text describing the item.

    Steps:
      1. Identify the item with brand/model if possible.
      2. Estimate a typical cost for the item in USD.
      3. Provide 1-2 sentences of interesting facts.

    Return only valid JSON in the following format:
    {
      "name": "...",
      "cost": 123.45,
      "facts": "..."
    }
    """

    # If user provided neither text nor image, handle gracefully
    if not item_name and not image_base64:
        fallback_data = {
            "name": "Unknown Item",
            "cost": 0.0,
            "facts": "No name or image provided. Unable to analyze.",
        }
        return finalize_response(fallback_data, item_cost)

    # Construct the request body for Gemini’s generative endpoint
    gemini_url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-pro:generateContent?key=" + gemini_api_key
    )

    # Core “contents” payload
    contents = {
        "contents": [
            {
                "parts": [
                    {"text": instructions}
                ]
            }
        ]
    }

    # If user provided an item name, append it
    if item_name:
        # Put the item name on a separate part so Gemini can read it
        contents["contents"][0]["parts"].append({"text": f"Item name: {item_name}"})

    # If user provided an image, append it
    if image_base64:
        contents["contents"][0]["parts"].append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": image_base64
            }
        })

    # Attempt call to Gemini API
    try:
        headers = {"Content-Type": "application/json"}
        resp = requests.post(gemini_url, headers=headers, json=contents)
        resp.raise_for_status()
        gemini_response = resp.json()

        # Gemini’s text result
        text_output = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        # Attempt to parse JSON from that text
        response_data = extract_json(text_output)

    except Exception as e:
        # If Gemini call fails or returns invalid data, fallback
        response_data = {
            "name": item_name or "Unknown",
            "cost": 0,
            "facts": f"Error calling Gemini: {str(e)}"
        }

    # Return final response with recommendation
    return finalize_response(response_data, item_cost)


def finalize_response(data: dict, user_budget: float) -> func.HttpResponse:
    """
    Given the parsed data from Gemini (or fallback),
    determine Buy/Don't Buy based on user’s budget,
    attach explanation, and return a valid JSON HttpResponse.
    """
    # Basic cost check
    recommended = "Buy" if data["cost"] <= user_budget else "Don't Buy"
    explanation = (
        f"Based on the provided budget of ${user_budget:.2f}, "
        f"the AI suggests: {recommended}."
    )

    data["recommendation"] = recommended
    data["explanation"] = explanation

    return func.HttpResponse(
        json.dumps(data),
        status_code=200,
        mimetype="application/json"
    )


def extract_json(text: str) -> dict:
    """
    Attempt to locate and parse the first valid JSON block
    in Gemini’s returned text. If invalid, return fallback data.
    """
    text = text.strip()
    start_idx = text.find("{")
    end_idx = text.rfind("}") + 1

    if start_idx >= 0 and end_idx > start_idx:
        json_str = text[start_idx:end_idx]
        try:
            data = json.loads(json_str)
            # Safeguards in case the LLM misses any fields
            if "name" not in data:
                data["name"] = "Unknown"
            if "cost" not in data or not isinstance(data["cost"], (int, float)):
                data["cost"] = 0
            if "facts" not in data:
                data["facts"] = "No facts provided."
            return data
        except:
            pass

    # Fallback if no valid JSON is found
    return {
        "name": "Unknown",
        "cost": 0,
        "facts": "Gemini response not in recognized JSON format."
    }
