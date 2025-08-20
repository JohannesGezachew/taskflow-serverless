import json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    try:
        # Get userId from query parameters (optional for backward compatibility)
        user_id = event.get('queryStringParameters', {})
        if user_id:
            user_id = user_id.get('userId', 'anonymous')
        else:
            user_id = 'anonymous'
        
        # Scan all items from DynamoDB
        response = table.scan()
        items = response['Items']
        
        # Filter by userId if provided, otherwise return all (for backward compatibility)
        if user_id != 'anonymous':
            items = [item for item in items if item.get('userId', 'anonymous') == user_id]
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(items, cls=DecimalEncoder)
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