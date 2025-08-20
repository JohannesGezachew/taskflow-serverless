# AWS Free Tier Optimization

Cost analysis and optimization strategies for TaskFlow deployment.

## Service Limits (12-month Free Tier)

### Compute & API
| Service | Free Tier Limit | TaskFlow Usage | Status |
|---------|----------------|----------------|---------|
| Lambda | 1M requests/month | ~10K requests | ✅ Well within limits |
| API Gateway | 1M calls/month | ~10K calls | ✅ Well within limits |
| Lambda Compute | 400K GB-seconds | ~1K GB-seconds | ✅ Well within limits |

### Storage & Database
| Service | Free Tier Limit | TaskFlow Usage | Status |
|---------|----------------|----------------|---------|
| DynamoDB | 25GB storage | <1MB | ✅ Minimal usage |
| DynamoDB | 25 RCU/WCU | 5 RCU/WCU | ✅ Well within limits |
| S3 | 5GB storage | ~50KB | ✅ Minimal usage |
| S3 | 20K GET requests | ~1K requests | ✅ Well within limits |

### CDN & Monitoring
| Service | Free Tier Limit | TaskFlow Usage | Status |
|---------|----------------|----------------|---------|
| CloudFront | 50GB transfer | ~1GB | ✅ Well within limits |
| CloudWatch | 10 custom metrics | 5 metrics | ✅ Well within limits |

## Cost Optimization Strategies

### DynamoDB Optimization
- Use on-demand billing for unpredictable workloads
- Implement TTL for temporary data
- Monitor consumed capacity units

### Lambda Optimization
- Set appropriate memory allocation (128MB default)
- Optimize function execution time
- Use environment variables for configuration

### S3 & CloudFront Optimization
- Enable S3 Transfer Acceleration only if needed
- Use CloudFront caching effectively
- Implement proper cache headers

## Monitoring & Alerts

### Cost Monitoring
```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Usage Monitoring
- Enable detailed billing reports
- Set up CloudWatch alarms for service limits
- Monitor DynamoDB throttling events
1. **Lambda Optimization**
   - Use minimum memory (128MB)
   - Optimize code for fast execution
   - Avoid long-running functions

2. **DynamoDB Optimization**
   - Use provisioned capacity (5 RCU/WCU)
   - Avoid hot partitions
   - Monitor consumed vs provisioned capacity

3. **S3 Optimization**
   - Minimize file sizes
   - Use efficient file formats
   - Enable compression

4. **API Gateway Optimization**
   - Implement caching if needed
   - Use efficient request patterns
   - Monitor request counts

### Warning Signs
- DynamoDB throttling errors
- Lambda timeout errors
- Unexpected charges in billing

## Cleanup Commands

### Delete Everything
```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name serverless-todo-api

# Empty and delete S3 bucket
aws s3 rm s3://your-bucket-name --recursive
aws s3api delete-bucket --bucket your-bucket-name
```

### Verify Cleanup
```bash
# Check for remaining resources
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE
aws s3 ls
aws dynamodb list-tables
aws lambda list-functions
```

## Expected Monthly Usage (Light Testing)

| Service | Usage | Free Tier Limit | Status |
|---------|-------|-----------------|--------|
| Lambda | ~1,000 requests | 1M requests | ✅ Safe |
| API Gateway | ~1,000 calls | 1M calls | ✅ Safe |
| DynamoDB | ~1GB storage | 25GB storage | ✅ Safe |
| S3 | ~1MB storage | 5GB storage | ✅ Safe |
| CloudWatch | Basic logs | 5GB ingestion | ✅ Safe |

## Emergency Stop
If you see unexpected charges:
1. Delete the CloudFormation stack immediately
2. Check for orphaned resources
3. Contact AWS Support if needed

The project is designed to stay well within free tier limits for normal development and testing use.