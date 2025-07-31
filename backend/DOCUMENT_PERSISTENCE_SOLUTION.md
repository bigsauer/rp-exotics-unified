# Document Persistence Solution

## 🚨 **PROBLEM IDENTIFIED**

Your system is currently storing **155 PDF documents** locally in the `backend/uploads/documents` directory. When you deploy the backend, these documents are **lost** because:

1. **Ephemeral Storage**: Railway/Heroku deployments create fresh containers
2. **Local File System**: Documents are stored locally instead of in persistent cloud storage
3. **Missing Configuration**: AWS S3 cloud storage is not configured

## 🔧 **SOLUTION: Configure Cloud Storage**

### **Current State:**
- ✅ **155 PDF documents** stored locally
- ❌ **Documents lost on deployment**
- ❌ **No cloud storage configured**

### **Required Action:**
Configure AWS S3 to persist documents across deployments.

---

## 📋 **STEP-BY-STEP SETUP**

### **Step 1: Create AWS S3 Bucket**

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click "Create bucket"
3. **Bucket name**: `rp-exotics-documents`
4. **Region**: `us-east-1` (or your preferred region)
5. **Public access**: Configure as needed for document access
6. Click "Create bucket"

### **Step 2: Create IAM User**

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. **Username**: `rp-exotics-document-storage`
4. **Access type**: Programmatic access
5. **Permissions**: Attach `AmazonS3FullAccess` policy
6. **Create access key**: Save the Access Key ID and Secret Access Key

### **Step 3: Configure Environment Variables**

Add these to your Railway deployment environment:

```bash
NODE_ENV=production
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET_NAME=rp-exotics-documents
AWS_REGION=us-east-1
```

### **Step 4: Test Configuration**

```bash
# Test cloud storage functionality
node test-cloud-storage.js

# Migrate existing documents to cloud
node migrate-documents-to-cloud.js
```

---

## 🚀 **IMMEDIATE ACTIONS NEEDED**

### **Option A: Quick Fix (Recommended)**
1. **Set up AWS S3** (30 minutes)
2. **Configure environment variables** in Railway
3. **Migrate existing documents** to cloud storage
4. **Deploy with cloud storage enabled**

### **Option B: Temporary Workaround**
1. **Backup documents** before each deployment
2. **Restore documents** after deployment
3. **Manual process** - not recommended for production

---

## 📊 **IMPACT ANALYSIS**

### **Current Risk:**
- **155 documents** will be lost on next deployment
- **No document persistence** across deployments
- **Manual document recovery** required

### **After Fix:**
- ✅ **Documents persist** across deployments
- ✅ **Automatic cloud storage** for all new documents
- ✅ **Reliable document access** for users
- ✅ **Scalable storage** solution

---

## 🔍 **VERIFICATION STEPS**

### **Before Deployment:**
1. Run `node debug-document-storage.js`
2. Verify cloud storage configuration
3. Test document upload/download
4. Migrate existing documents

### **After Deployment:**
1. Verify documents are accessible
2. Test document generation
3. Check cloud storage logs
4. Monitor storage costs

---

## 💰 **COST ESTIMATION**

### **AWS S3 Costs (Estimated):**
- **Storage**: ~$0.023 per GB per month
- **Requests**: ~$0.0004 per 1,000 requests
- **Data transfer**: ~$0.09 per GB

### **For 155 documents (~50MB):**
- **Monthly storage**: ~$0.001
- **Monthly requests**: ~$0.01
- **Total estimated**: **~$0.01/month**

---

## 🆘 **EMERGENCY PROCEDURE**

### **If Documents Are Lost:**
1. **Check cloud storage** for migrated documents
2. **Restore from backup** if available
3. **Regenerate documents** from deal data
4. **Contact support** for assistance

### **Prevention:**
1. **Always test** cloud storage before deployment
2. **Monitor deployment** logs for errors
3. **Keep backups** of critical documents
4. **Use staging environment** for testing

---

## 📞 **SUPPORT**

### **Need Help?**
- **AWS S3 Setup**: [AWS Documentation](https://docs.aws.amazon.com/s3/)
- **Railway Environment Variables**: [Railway Docs](https://docs.railway.app/deploy/environment-variables)
- **System Issues**: Contact development team

### **Quick Commands:**
```bash
# Debug current state
node debug-document-storage.js

# Test cloud storage
node test-cloud-storage.js

# Setup instructions
node setup-cloud-storage.js

# Migrate documents
node migrate-documents-to-cloud.js
```

---

## ✅ **CHECKLIST**

- [ ] Create AWS S3 bucket
- [ ] Create IAM user with S3 access
- [ ] Configure environment variables
- [ ] Test cloud storage functionality
- [ ] Migrate existing documents
- [ ] Deploy with cloud storage enabled
- [ ] Verify document persistence
- [ ] Monitor storage costs

---

**⚠️ URGENT: Configure cloud storage before next deployment to prevent document loss!** 