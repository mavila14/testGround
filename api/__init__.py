import azure.functions as func
from .analyze import main

def initialize_function(function_app):
    function_app.add_function("analyze", main)
