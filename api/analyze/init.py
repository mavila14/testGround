import json
import base64
import requests
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    gemini_api_key = "AIzaSyB-RIjhhODp6aPTzqVcwbXD894oebXFCUY"  # Your API key

    try:
        body = req.get_json()
    except:
        return func.HttpResponse("Invalid JSON body", status_code=400)

    item_name = body.get("itemName", "")
    item_cost = float(body.get("itemCost", 0))
    image_base64 = body.get("imageBase64", None)

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

    if not image_base64:
        response_data = {
            "name": item_name if item_name else "Unknown",
            "cost": item_cost,
            "facts": "No image provided, so AI is unsure of details."
        }
    else:
        gemini_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-1.5-pro:generateContent?key={gemini_api_key}"
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

        headers = { "Content-Type": "application/json" }

        try:
            resp = requests.post(gemini_url, headers=headers, json=request_body)
            resp.raise_for_status()
            gemini_response = resp.json()
            text = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
            parsed_json = extract_json(text)
            response_data = parsed_json
        except Exception as e:
            response_data = {
                "name": "Error",
                "cost": 0,
                "facts": f"Error calling Gemini: {e}"
            }

    recommended = "Buy" if response_data["cost"] <= item_cost else "Don't Buy"
    explanation = (
        f"Based on the image and your budget of ${item_cost:.2f}, "
        f"the AI suggests: {recommended}."
    )

    response_data["recommendation"] = recommended
    response_data["explanation"] = explanation

    return func.HttpResponse(
        json.dumps(response_data),
        status_code=200,
        mimetype="application/json"
    )

def extract_json(text: str):
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
        "facts": "Gemini response not in recognized JSON format."
    }
