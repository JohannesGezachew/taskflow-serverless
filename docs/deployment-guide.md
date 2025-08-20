# CloudFormation Deployment

Infrastructure as Code deployment using AWS CloudFormation.

## Prerequisites

- AWS CLI configured with appropriate credentials
- IAM permissions for CloudFormation, Lambda, API Gateway, DynamoDB, S3
- Python 3.9+ runtime available

## Deployment

### Automated Deployment

```bash
aws cloudformation deploy \
  --template-file cloudformation/template.yaml \
  --stack-name taskflow-serverless \
  --capabilities CAPABILITY_IAM \
  --region us-east-1 \
  --parameter-overrides \
    Environment=prod
```

### Manual Steps
1. Package Lambda functions:
```bash
cd lambda/
zip -r ../deployment/lambda-functions.zip *.py
```

2. Deploy stack:
```bash
aws cloudformation create-stack \
  --stack-name taskflow-serverless \
  --template-body file://cloudformation/template.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters ParameterKey=Environment,ParameterValue=prod
```

3. Monitor deployment:
```bash
aws cloudformation describe-stacks \
  --stack-name taskflow-serverless \
  --query 'Stacks[0].StackStatus'
```

## Post-Deployment Configuration

### Update Frontend Configuration
1. Get API Gateway URL from stack outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name taskflow-serverless \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

2. Update `frontend/script.js` with the API URL

4. **Important**: Note the API Gateway URL from the deployment outputs

## Step 3: Update Frontend Configuration

1. Open `frontend/script.js`
2. Replace the `API_BASE_URL` with your actual API Gateway URL:

```javascript
const API_BASE_URL = 'https://your-actual-api-id.execute-api.your-region.amazonaws.com/prod';
```

## Step 4: Deploy Frontend to S3

### Option A: Use the Upload Script (Recommended)
```cmd
upload-frontend.bat
```

### Option B: Manual Upload
1. Get your S3 bucket name from the CloudFormation outputs
2. Upload frontend files:

```cmd
aws s3 sync frontend/ s3://your-bucket-name --delete
```

3. Your frontend will be available at: `http://your-bucket-name.s3-website-your-region.amazonaws.com`

## Step 5: Test the Application

1. Open the S3 website URL in your browser
2. Test creating, reading, updating, and deleting todos
3. Check CloudWatch logs for any issues

## Cleanup

To remove all resources:

```bash
sam delete --stack-name serverless-todo-api
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your API Gateway has CORS enabled
2. **Lambda Timeout**: Increase timeout in template.yaml if needed
3. **DynamoDB Permissions**: Verify IAM role has proper DynamoDB permissions
4. **S3 Access**: Ensure bucket policy allows public read access

### Monitoring

- Check CloudWatch Logs for Lambda function errors
- Monitor API Gateway metrics in CloudWatch
- Use X-Ray for distributed tracing (optional)

## Security Considerations

- Enable API throttling in production
- Implement authentication (Cognito) for production use
- Use environment-specific configurations
- Enable CloudTrail for audit logging