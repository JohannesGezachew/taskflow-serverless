import json
import boto3
import os
from datetime import datetime
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
        # Get todo ID from path parameters
        todo_id = event['pathParameters']['id']
        
        # Parse request body
        body = json.loads(event['body'])
        
        # Update timestamp
        timestamp = datetime.utcnow().isoformat()
        
        # Build update expression
        update_expression = "SET updated_at = :timestamp"
        expression_values = {':timestamp': timestamp}
        
        if 'title' in body:
            update_expression += ", title = :title"
            expression_values[':title'] = body['title']
            
        if 'description' in body:
            update_expression += ", description = :description"
            expression_values[':description'] = body['description']
            
        if 'completed' in body:
            update_expression += ", completed = :completed"
            expression_values[':completed'] = body['completed']
        
        # Update item in DynamoDB
        response = table.update_item(
            Key={'id': todo_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(response['Attributes'], cls=DecimalEncoder)
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