# AWS Console Deployment

Manual deployment guide for TaskFlow serverless infrastructure using AWS Management Console.

## Prerequisites
- AWS Account with administrative access
- IAM permissions for DynamoDB, Lambda, API Gateway, S3, CloudFront
- Project source code

## DynamoDB Configuration

### Create Table
1. Navigate to DynamoDB Console
2. Create table with the following configuration:
   - **Table name**: `TodoItems`
   - **Partition key**: `id` (String)
   - **Billing mode**: On-demand
   - **Encryption**: Default (AWS owned key)

### Verify Table Creation
- Confirm table status shows "Active"
- Note the table ARN for IAM policy configuration

## IAM Role Setup

### Lambda Execution Role
1. Navigate to IAM Console → Roles
2. Create role with:
   - **Trusted entity**: AWS Lambda
   - **Permissions**: Custom policy (see below)
   - **Role name**: `TaskFlowLambdaRole`

### IAM Policy Document
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/TodoItems"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```
     - `AWSLambdaBasicExecutionRole`
     - `AmazonDynamoDBFullAccess`
   - Click "Next"

4. **Name the Role**
   - **Role name**: `TodoLambdaRole`
   - Click "Create role"

## Step 3: Create Lambda Functions

You need to create 5 Lambda functions. For each function:

### Function 1: Create Todo

1. **Go to Lambda Console**
   - Search for "Lambda" in AWS Console
   - Click "Lambda"

2. **Create Function**
   - Click "Create function"
   - **Function name**: `CreateTodo`
   - **Runtime**: Python 3.9
   - **Execution role**: Use existing role → `TodoLambdaRole`
   - Click "Create function"

3. **Add Code**
   - In the code editor, replace all content with:

```python
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
```

4. **Add Environment Variable**
   - Scroll down to "Environment variables"
   - Click "Edit"
   - Click "Add environment variable"
   - **Key**: `TABLE_NAME`
   - **Value**: `TodoItems`
   - Click "Save"

5. **Deploy the Function**
   - Click "Deploy" button

### Function 2: Get All Todos

1. **Create Another Function**
   - Go back to Lambda console
   - Click "Create function"
   - **Function name**: `GetTodos`
   - **Runtime**: Python 3.9
   - **Execution role**: Use existing role → `TodoLambdaRole`
   - Click "Create function"

2. **Add Code**

```python
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
```

3. **Add Environment Variable**
   - **Key**: `TABLE_NAME`
   - **Value**: `TodoItems`

4. **Deploy the Function**

### Function 3: Get Single Todo

1. **Create Function**
   - **Function name**: `GetTodo`
   - **Runtime**: Python 3.9
   - **Execution role**: Use existing role → `TodoLambdaRole`

2. **Add Code**

```python
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
        # Get todo ID from path parameters
        todo_id = event['pathParameters']['id']
        
        # Get item from DynamoDB
        response = table.get_item(Key={'id': todo_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Todo not found'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(response['Item'], cls=DecimalEncoder)
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
```

3. **Add Environment Variable**
   - **Key**: `TABLE_NAME`
   - **Value**: `TodoItems`

4. **Deploy the Function**

### Function 4: Update Todo

1. **Create Function**
   - **Function name**: `UpdateTodo`
   - **Runtime**: Python 3.9
   - **Execution role**: Use existing role → `TodoLambdaRole`

2. **Add Code**

```python
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
```

3. **Add Environment Variable**
   - **Key**: `TABLE_NAME`
   - **Value**: `TodoItems`

4. **Deploy the Function**

### Function 5: Delete Todo

1. **Create Function**
   - **Function name**: `DeleteTodo`
   - **Runtime**: Python 3.9
   - **Execution role**: Use existing role → `TodoLambdaRole`

2. **Add Code**

```python
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    try:
        # Get todo ID from path parameters
        todo_id = event['pathParameters']['id']
        
        # Delete item from DynamoDB
        table.delete_item(Key={'id': todo_id})
        
        return {
            'statusCode': 204,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
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
```

3. **Add Environment Variable**
   - **Key**: `TABLE_NAME`
   - **Value**: `TodoItems`

4. **Deploy the Function**

## Step 4: Create API Gateway

1. **Go to API Gateway Console**
   - Search for "API Gateway" in AWS Console
   - Click "API Gateway"

2. **Create API**
   - Click "Create API"
   - Choose "REST API" (not private)
   - Click "Build"
   - **API name**: `TodoAPI`
   - **Description**: `Serverless Todo API`
   - Click "Create API"

3. **Enable CORS**
   - Click "Actions" dropdown
   - Select "Enable CORS"
   - Leave default settings
   - Click "Enable CORS and replace existing CORS headers"
   - Click "Yes, replace existing values"

### Create API Resources and Methods

#### Resource 1: /todos

1. **Create Resource**
   - Click "Actions" → "Create Resource"
   - **Resource Name**: `todos`
   - **Resource Path**: `/todos`
   - Check "Enable API Gateway CORS"
   - Click "Create Resource"

2. **Add GET Method (Get All Todos)**
   - Select `/todos` resource
   - Click "Actions" → "Create Method"
   - Select "GET" from dropdown
   - Click checkmark
   - **Integration type**: Lambda Function
   - **Lambda Region**: eu-north-1 (or your region)
   - **Lambda Function**: `GetTodos`
   - Click "Save"
   - Click "OK" to give permission

3. **Add POST Method (Create Todo)**
   - Select `/todos` resource
   - Click "Actions" → "Create Method"
   - Select "POST" from dropdown
   - Click checkmark
   - **Integration type**: Lambda Function
   - **Lambda Function**: `CreateTodo`
   - Click "Save"
   - Click "OK" to give permission

#### Resource 2: /todos/{id}

1. **Create Resource**
   - Select `/todos` resource
   - Click "Actions" → "Create Resource"
   - **Resource Name**: `todo-item`
   - **Resource Path**: `/{id}`
   - Check "Enable API Gateway CORS"
   - Click "Create Resource"

2. **Add GET Method (Get Single Todo)**
   - Select `/todos/{id}` resource
   - Click "Actions" → "Create Method"
   - Select "GET" from dropdown
   - **Lambda Function**: `GetTodo`
   - Click "Save" and "OK"

3. **Add PUT Method (Update Todo)**
   - Select `/todos/{id}` resource
   - Click "Actions" → "Create Method"
   - Select "PUT" from dropdown
   - **Lambda Function**: `UpdateTodo`
   - Click "Save" and "OK"

4. **Add DELETE Method (Delete Todo)**
   - Select `/todos/{id}` resource
   - Click "Actions" → "Create Method"
   - Select "DELETE" from dropdown
   - **Lambda Function**: `DeleteTodo`
   - Click "Save" and "OK"

### Deploy API

1. **Deploy API**
   - Click "Actions" → "Deploy API"
   - **Deployment stage**: [New Stage]
   - **Stage name**: `prod`
   - Click "Deploy"

2. **Get API URL**
   - After deployment, you'll see the **Invoke URL**
   - Copy this URL (e.g., `https://abc123.execute-api.eu-north-1.amazonaws.com/prod`)
   - **SAVE THIS URL** - you'll need it for the frontend

## Step 5: Create S3 Bucket for Frontend

1. **Go to S3 Console**
   - Search for "S3" in AWS Console
   - Click "S3"

2. **Create Bucket**
   - Click "Create bucket"
   - **Bucket name**: `todo-app-frontend-[your-name]` (must be globally unique)
   - **Region**: eu-north-1 (or your region)
   - Uncheck "Block all public access"
   - Check "I acknowledge that the current settings might result in this bucket and the objects within becoming public"
   - Click "Create bucket"

3. **Enable Static Website Hosting**
   - Click on your bucket name
   - Go to "Properties" tab
   - Scroll down to "Static website hosting"
   - Click "Edit"
   - **Static website hosting**: Enable
   - **Index document**: `index.html`
   - Click "Save changes"

4. **Set Bucket Policy**
   - Go to "Permissions" tab
   - Scroll to "Bucket policy"
   - Click "Edit"
   - Add this policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

   - Click "Save changes"

## Step 6: Update and Upload Frontend

1. **Update API URL in Frontend**
   - Open `frontend/script.js` in a text editor
   - Find the line: `const API_BASE_URL = 'YOUR_API_GATEWAY_URL_HERE';`
   - Replace `YOUR_API_GATEWAY_URL_HERE` with your actual API Gateway URL from Step 4
   - Save the file

2. **Upload Frontend Files**
   - Go back to your S3 bucket
   - Click "Upload"
   - Click "Add files"
   - Select all files from your `frontend` folder:
     - `index.html`
     - `script.js`
     - `style.css`
     - `favicon.svg`
   - Click "Upload"

3. **Get Website URL**
   - Go to "Properties" tab
   - Scroll to "Static website hosting"
   - Copy the **Bucket website endpoint** URL
   - This is your HTTP todo app URL (we'll add HTTPS next!)

## Step 7: Enable HTTPS with CloudFront (Highly Recommended)

1. **Go to CloudFront Console**
   - Search for "CloudFront" in AWS Console
   - Click "CloudFront"

2. **Create Distribution**
   - Click "Create distribution"
   - **Distribution name**: `TaskFlow-Frontend`
   - **Description**: `HTTPS distribution for TaskFlow todo app`
   - **Distribution type**: Single website or app

3. **Specify Origin**
   - **Origin type**: Amazon S3
   - **S3 origin**: Browse and select your bucket `todo-app-frontend-[your-name]`
   - **IMPORTANT**: Click "Use website endpoint"
   - **Origin settings**: Use recommended origin settings
   - **Cache settings**: Use recommended cache settings

4. **Enable Security**
   - **Security protections**: Do not enable security protections (to keep it free)

5. **Create Distribution**
   - Review settings and click "Create distribution"
   - **Wait 5-15 minutes** for deployment to complete
   - Copy the **CloudFront domain name** (e.g., `https://d1234567890.cloudfront.net`)
   - **This is your production HTTPS URL!** 🎉

## Step 8: Test Your Application

1. **Open Your Todo App**
   - **HTTPS URL**: Visit your CloudFront distribution URL
   - **HTTP URL**: Visit the S3 website endpoint URL (fallback)
   - You should see your todo application with the custom favicon

2. **Test Functionality**
   - Try adding a new todo
   - Try marking todos as complete
   - Try editing todos
   - Try deleting todos
   - Test theme switching (dark/light mode)
   - Test user session management

## Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Make sure CORS is enabled on API Gateway
   - Redeploy the API after making changes

2. **Lambda Function Errors**
   - Check CloudWatch Logs for detailed error messages
   - Go to CloudWatch → Log groups → `/aws/lambda/[function-name]`

3. **DynamoDB Access Issues**
   - Verify the IAM role has DynamoDB permissions
   - Check that TABLE_NAME environment variable is set correctly

4. **API Gateway 502 Errors**
   - Usually means Lambda function crashed
   - Check CloudWatch logs for the specific function

### Getting Help:

- Check AWS CloudWatch Logs for detailed error messages
- Verify all environment variables are set correctly
- Make sure all resources are in the same region
- Ensure IAM permissions are properly configured

## Cleanup (When Done Testing)

To avoid charges, delete resources in this order:
1. Empty and delete S3 bucket
2. Delete API Gateway
3. Delete Lambda functions
4. Delete DynamoDB table
5. Delete IAM role

---

**Congratulations!** You've successfully deployed a serverless todo application using the AWS Console. Your app is now live and accessible via the S3 website endpoint URL.