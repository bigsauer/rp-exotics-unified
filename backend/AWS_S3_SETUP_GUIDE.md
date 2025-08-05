# AWS S3 Setup Guide for Cloud Storage

## 🔧 Required Environment Variables

You need to set up the following environment variables for the cloud storage system to work:

### Create a `.env` file in the backend directory:

```env
# AWS S3 Configuration (REQUIRED for document storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=rp-exotics-document-storage

# Node Environment
NODE_ENV=development

# MongoDB Connection (if needed locally)
MONGODB_URI=your_mongodb_connection_string_here

# JWT Authentication
JWT_SECRET=your_jwt_secret_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Email Configuration (if needed)
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=noreply@yourdomain.com
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

## 🚨 Important Notes

- **The system now requires AWS S3 to work** - there is no local fallback
- **AWS credentials must be set** before the application can start
- **Documents will be stored in S3** and accessed via S3 URLs
- **Make sure your S3 bucket is in the same region** as specified in AWS_REGION

## 🧪 Testing

After setting up the credentials, test the connection by running:

```bash
cd backend
node -e "
const cloudStorage = require('./services/cloudStorage');
cloudStorage.testS3Connection().then(() => {
  console.log('✅ S3 connection successful');
}).catch(err => {
  console.error('❌ S3 connection failed:', err.message);
});
"
```

## 🚀 Production Deployment

For production deployment on Railway, make sure to set all the environment variables in your Railway project dashboard as described in `DEPLOYMENT_ENV_CONFIG.md`. 