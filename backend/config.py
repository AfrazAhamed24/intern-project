import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key-123')
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/vendor_portal')
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    S3_BUCKET = os.environ.get('S3_BUCKET', 'vendor-documents')
