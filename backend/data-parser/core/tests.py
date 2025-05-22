# from django.test import TestCase

# # Create your tests here.
# from celery import Celery
# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# import csv
# from io import StringIO
# import pika
# import json

# app = Celery('validation_service', broker='amqp://localhost:5672', backend='rpc://')
# fastapi_app = FastAPI()

# # Validation functions (same as before)
# def validate_csv_type1(csv_data):
#     try:
#         csv_file = StringIO(csv_data)
#         reader = csv.DictReader(csv_file)
#         required = {'id', 'name'}
#         if not required.issubset(reader.fieldnames):
#             return {'message': 'Missing required columns', 'jsonData': None}
#         json_data = [row for row in reader]
#         return {'message': 'validation successful', 'jsonData': json_data}
#     except Exception as e:
#         return {'message': f'Validation failed: {str(e)}', 'jsonData': None}

# VALIDATION_MAP = {'type1': validate_csv_type1}

# @app.task
# def process_validation(request_id, csv_data, csv_type):
#     validate_func = VALIDATION_MAP.get(csv_type)
#     result = validate_func(csv_data) if validate_func else {'message': 'Invalid CSV type', 'jsonData': None}
#     # Publish result to RabbitMQ
#     connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
#     channel = connection.channel()
#     channel.queue_declare(queue='validation_responses')
#     channel.basic_publish(exchange='', routing_key='validation_responses', body=json.dumps({
#         'requestId': request_id,
#         'message': result['message'],
#         'jsonData': result['jsonData']
#     }))
#     connection.close()
#     return result

# # FastAPI endpoint
# class ValidationRequest(BaseModel):
#     csv: str
#     type: str
#     requestId: str

# @fastapi_app.post("/validate/{csv_type}")
# async def validate_csv(csv_type: str, request: ValidationRequest):
#     if csv_type != request.type:
#         raise HTTPException(status_code=400, detail="CSV type mismatch")
#     result = process_validation(request.requestId, request.csv, request.type)
#     return {'requestId': request.requestId, 'message': result['message'], 'jsonData': result['jsonData']}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(fastapi_app, host="0.0.0.0", port=8000)