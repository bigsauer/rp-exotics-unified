# Cloud Storage Setup Guide

## Why PDFs Get Deleted on Deployment

When you deploy to Railway (or any cloud platform), the application container is ephemeral. This means:
- All local files (including uploaded PDFs) are lost on each deployment
- The `uploads/documents` directory gets wiped clean
- This is why your PDFs disappear after every backend deployment

## Solution: Cloud Storage

I've implemented a cloud storage solution that automatically uploads PDFs to AWS S3, making them persistent across deployments.

## Setup Options

### Option 1: AWS S3 (Recommended)

1. **Create an AWS S3 Bucket:**
   - Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
   - Create a new bucket named `rp-exotics-documents` (or your preferred name)
   - Make sure it's in the same region as your Railway deployment

2. **Create an IAM User:**
   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
   - Create a new user with programmatic access
   - Attach the `AmazonS3FullAccess` policy (or create a custom policy with minimal permissions)

3. **Get Access Keys:**
   - Note down the Access Key ID and Secret Access Key
   - Add them to your Railway environment variables

4. **Set Environment Variables in Railway:**
   ```
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=rp-exotics-documents
   ```

### Option 2: Railway Volumes (Alternative)

If you prefer to keep files local but persistent:

1. **Add a Railway Volume:**
   - In your Railway project dashboard
   - Go to "Volumes" tab
   - Create a new volume for `/app/uploads`
   - Mount it to your service

2. **Update the uploads directory path:**
   - The system will automatically use the volume path

### Option 3: Local Development

For local development, the system automatically falls back to local storage:
- No additional setup required
- Files are stored in `uploads/documents/`
- Works offline

## How It Works

1. **Automatic Upload:** When a PDF is generated, it's automatically uploaded to cloud storage
2. **Fallback:** If cloud storage fails, it falls back to local storage
3. **URL Generation:** PDF URLs point to cloud storage (persistent) instead of local paths
4. **Backward Compatibility:** Existing local files continue to work

## Benefits

✅ **Persistent Storage:** PDFs survive deployments  
✅ **Scalable:** No storage limits on your server  
✅ **Fast Access:** CDN-backed delivery  
✅ **Backup:** Automatic redundancy  
✅ **Cost Effective:** Very low cost for document storage  

## Testing

After setup, test by:
1. Generating a new PDF document
2. Checking the logs for cloud storage upload messages
3. Verifying the PDF URL points to cloud storage
4. Redeploying and confirming the PDF is still accessible

## Troubleshooting

### "AWS credentials not found"
- Check that all AWS environment variables are set in Railway
- Verify the IAM user has S3 permissions

### "Upload failed, using local path"
- This is normal fallback behavior
- Check AWS credentials and bucket permissions
- Verify the bucket exists and is accessible

### "File not found after deployment"
- Ensure cloud storage is properly configured
- Check that the PDF URL points to cloud storage, not local path

## Cost Estimation

For typical usage:
- **Storage:** ~$0.023 per GB per month
- **Requests:** ~$0.0004 per 1,000 requests
- **Data Transfer:** ~$0.09 per GB

**Estimated monthly cost:** $1-5 for typical document storage needs 