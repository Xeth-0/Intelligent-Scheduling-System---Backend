# from celery import Celery
# import os



# # Initialize Celery with RabbitMQ as the broker
# app = Celery(
#     'csv_validator',
#     broker=os.getenv('RABBITMQ_URL'),
#     backend='rpc://',  # Use RPC for result retrieval
# )

# # Configure Celery settings
# app.conf.update(
#     task_serializer='json',  # Serialize tasks as JSON
#     accept_content=['json'],  # Accept JSON content
#     result_serializer='json',  # Serialize results as JSON
#     task_acks_late=True,  # Acknowledge tasks after completion
#     worker_prefetch_multiplier=1,  # Process one task at a time
# )