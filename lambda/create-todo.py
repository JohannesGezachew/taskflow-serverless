import json
import boto3
import uuid
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    try:
        # Parse request body
        body = json.loads(event['body'])
        
        # Generate unique ID and timestamp
        todo_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Create todo item
        item = {
            'id': todo_id,
            'title': body['title'],
            'description': body.get('description', ''),
            'completed': False,
            'userId': body.get('userId', 'anonymous'),
            'created_at': timestamp,
            'updated_at': timestamp
        }
        
        # Save to DynamoDB
        table.put_item(Item=item)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(item)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }