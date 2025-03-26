import json
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps({"status": "success", "message": "API is working!"}),
        status_code=200,
        mimetype="application/json"
    )
