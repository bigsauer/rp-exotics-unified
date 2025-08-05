# 🚀 Deployment Environment Configuration Guide

This guide ensures that vehicle records and all documents are properly created and stored in S3 when deployed on Railway and Vercel.

## 🔧 Required Environment Variables

### Railway Backend Environment Variables

Add these environment variables in your Railway project dashboard:

```env
# Node Environment
NODE_ENV=production

# MongoDB Connection
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-url.vercel.app

# AWS S3 Configuration (CRITICAL FOR DOCUMENT STORAGE)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=rp-exotics-document-storage

# Email Configuration (REQUIRED for signature emails)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# Optional: Logging
LOG_LEVEL=info
```

### Vercel Frontend Environment Variables

Add these environment variables in your Vercel project dashboard:

```env
# Backend API URL
REACT_APP_API_BASE_URL=https://your-backend-url.railway.app/api
REACT_APP_BACKEND_URL=https://your-backend-url.railway.app

# Optional: Feature flags
REACT_APP_ENABLE_DEBUG_LOGGING=false
```

## 🔑 AWS S3 Setup Instructions

### 1. Create S3 Bucket

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click "Create bucket"
3. Bucket name: `rp-exotics-document-storage` (or your preferred name)
4. Region: `us-east-2` (or your preferred region)
5. Keep default settings for versioning, encryption, etc.
6. Click "Create bucket"

### 2. Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Add user"
3. Username: `rp-exotics-s3-user`
4. Access type: "Programmatic access"
5. Click "Next: Permissions"

### 3. Attach S3 Policy

1. Click "Attach existing policies directly"
2. Search for and select `AmazonS3FullAccess` (or create custom policy)
3. Click "Next: Tags" (optional)
4. Click "Next: Review"
5. Click "Create user"

### 4. Get Access Keys

1. Click on the created user
2. Go to "Security credentials" tab
3. Click "Create access key"
4. Select "Application running outside AWS"
5. Copy the Access Key ID and Secret Access Key
6. **IMPORTANT**: Save these securely - you won't see the secret key again

### 5. Custom S3 Policy (Recommended for Security)

Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:HeadBucket",
                "s3:HeadObject"
            ],
            "Resource": [
                "arn:aws:s3:::rp-exotics-document-storage",
                "arn:aws:s3:::rp-exotics-document-storage/*"
            ]
        }
    ]
}
```

## 🚂 Railway Deployment Steps

### 1. Connect to GitHub

1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account
5. Select your repository
6. Click "Deploy Now"

### 2. Configure Environment Variables

1. In your Railway project dashboard
2. Go to "Variables" tab
3. Add all the environment variables listed above
4. Click "Save"

### 3. Deploy

1. Railway will automatically deploy when you push to GitHub
2. Monitor the deployment logs for any errors
3. Check that S3 connection is successful in logs

## 🌐 Vercel Deployment Steps

### 1. Connect to GitHub

1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: Create React App
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/build`
   - Install Command: `npm install`

### 2. Configure Environment Variables

1. In your Vercel project dashboard
2. Go to "Settings" → "Environment Variables"
3. Add all the frontend environment variables listed above
4. Click "Save"

### 3. Deploy

1. Vercel will automatically deploy when you push to GitHub
2. Monitor the deployment logs
3. Test the application functionality

## 🧪 Testing Document Storage

### 1. Test S3 Connection

After deployment, check the Railway logs for:

```
[CLOUD STORAGE] ✅ S3 connection test successful
[CLOUD STORAGE] ✅ Bucket accessible: rp-exotics-document-storage
```

### 2. Test Document Generation

1. Create a new deal in the application
2. Generate documents (Bill of Sale, Vehicle Record, etc.)
3. Check the logs for successful S3 uploads:

```
[PDF GEN] ✅ Cloud storage successful for: vehicle_record_ABC123.pdf
[CLOUD STORAGE] ✅ File uploaded successfully: https://...
```

### 3. Test Document Access

1. Try to download/view generated documents
2. Verify they load from S3 URLs
3. Check that documents persist after redeployment

## 🚨 Troubleshooting

### S3 Connection Issues

**Error: "Access Denied"**
- Check AWS credentials are correct
- Verify IAM user has proper S3 permissions
- Ensure bucket name matches exactly

**Error: "NoSuchBucket"**
- Verify bucket exists in the correct region
- Check bucket name spelling
- Ensure bucket is in the same region as specified in AWS_REGION

**Error: "InvalidAccessKeyId"**
- Check AWS_ACCESS_KEY_ID is correct
- Verify the access key is active
- Ensure no extra spaces in environment variables

### Document Generation Issues

**Error: "Cloud storage is required in production"**
- Ensure all AWS environment variables are set
- Check S3 bucket is accessible
- Verify IAM permissions

**Error: "File does not exist"**
- Check uploads directory permissions
- Verify file generation completed before upload
- Check disk space on Railway

### CORS Issues

**Error: "CORS policy blocked"**
- Verify FRONTEND_URL is set correctly
- Check CORS configuration in backend
- Ensure frontend URL matches exactly

## 📊 Monitoring and Logs

### Railway Logs

Monitor these log patterns for successful operation:

```
✅ MongoDB connected successfully
✅ S3 connection test successful
✅ File uploaded successfully
✅ Cloud storage successful for: [filename]
```

### Vercel Logs

Check for successful frontend builds and API connections:

```
✓ Compiled successfully
✓ API calls to backend successful
```

## 🔄 Continuous Deployment

Both Railway and Vercel will automatically redeploy when you push changes to GitHub:

```bash
git add .
git commit -m "Update document storage configuration"
git push origin main
```

## 📞 Support

If you encounter issues:

1. Check the deployment logs first
2. Verify all environment variables are set correctly
3. Test S3 connection manually
4. Check AWS IAM permissions
5. Verify bucket configuration
6. **For signature email issues**: Run `node verify-signature-email-config.js`
7. **For signature email issues**: Check Railway logs for email errors
8. **For signature email issues**: Verify FRONTEND_URL is set to production URL

## ✅ Success Checklist

- [ ] S3 bucket created and accessible
- [ ] IAM user with proper permissions created
- [ ] All environment variables set in Railway
- [ ] All environment variables set in Vercel
- [ ] Backend deploys successfully
- [ ] Frontend deploys successfully
- [ ] S3 connection test passes
- [ ] Document generation works
- [ ] Documents upload to S3 successfully
- [ ] Documents persist after redeployment
- [ ] Document download/view works
- [ ] Vehicle records generate correctly
- [ ] All document types work (Bill of Sale, Vehicle Record, etc.)
- [ ] **Signature Email System**:
  - [ ] RESEND_API_KEY configured
  - [ ] FRONTEND_URL set to production URL
  - [ ] Finance users can sign documents
  - [ ] Client signature emails are sent
  - [ ] Client signature links work correctly
  - [ ] Signatures are recorded with audit trail

Once all items are checked, your deployment is ready for production use! 🎉 