# 📧 Signature Email Deployment Guide

This guide ensures that client signature emails work properly in production deployments.

## 🎯 Overview

The signature email system allows finance users to:
1. Sign documents electronically
2. Send signed documents to clients for their signatures
3. Track signature status and compliance

## 🔧 Required Environment Variables

### Railway Backend Environment Variables

Add these environment variables in your Railway project dashboard:

```env
# Frontend URL (CRITICAL for signature links)
FRONTEND_URL=https://your-frontend-url.vercel.app

# Email Service (CRITICAL for sending emails)
RESEND_API_KEY=re_your_resend_api_key_here

# Node Environment
NODE_ENV=production

# MongoDB Connection
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# AWS S3 Configuration (for document storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=rp-exotics-document-storage
```

### Vercel Frontend Environment Variables

Add these environment variables in your Vercel project dashboard:

```env
# Backend API URL
REACT_APP_API_URL=https://your-backend-url.railway.app
```

## 🚀 Deployment Steps

### 1. Configure Environment Variables

#### Railway (Backend)
1. Go to your Railway project dashboard
2. Navigate to the "Variables" tab
3. Add all the required environment variables listed above
4. **CRITICAL**: Ensure `FRONTEND_URL` is set to your production frontend URL
5. **CRITICAL**: Ensure `RESEND_API_KEY` is set to a valid Resend API key
6. Click "Save"

#### Vercel (Frontend)
1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add the backend API URL
4. Click "Save"

### 2. Verify Configuration

Run the verification script to ensure everything is configured correctly:

```bash
cd backend
node verify-signature-email-config.js
```

You should see:
```
✅ All required environment variables are set
🎉 Signature email functionality should work properly
```

### 3. Deploy

Both Railway and Vercel will automatically deploy when you push changes to GitHub:

```bash
git add .
git commit -m "Add signature email functionality"
git push origin main
```

## 🧪 Testing the Signature Email System

### 1. Test Finance User Signature

1. Log in as a finance user
2. Navigate to a deal with documents
3. Click "Sign Document" on any document card
4. Complete the signature process
5. Verify the document is signed and stored

### 2. Test Client Email Sending

1. After signing a document as finance user
2. Enter a client email address
3. Click "Send to Client"
4. Verify the email is sent successfully
5. Check the email contains the correct signature link

### 3. Test Client Signature Process

1. Open the email sent to the client
2. Click the "Sign Document Online" button
3. Verify the signature page loads correctly
4. Complete the client signature process
5. Verify the signature is recorded

## 📧 Email Configuration

### Resend Setup

1. Create a Resend account at [resend.com](https://resend.com)
2. Create an API key
3. Add the API key to your Railway environment variables
4. Verify your domain (optional but recommended)

### Email Templates

The system uses professional email templates that include:
- RP Exotics branding
- Document information
- Secure signature links
- Legal compliance notices
- Security warnings

## 🔗 Signature URL Structure

The signature URLs follow this pattern:
```
https://your-frontend-url.vercel.app/sign/{signatureId}
```

Where:
- `your-frontend-url.vercel.app` is your production frontend URL
- `{signatureId}` is a unique identifier for the signature request

## 🛡️ Security Features

### Email Security
- HTTPS links only
- 7-day expiration on signature links
- Full audit trail recording
- IP address tracking
- User agent tracking

### Legal Compliance
- ESIGN Act compliant
- UETA compliant
- Intent to sign verification
- Electronic business consent
- Document integrity maintained

## 📊 Monitoring and Logs

### Railway Logs

Monitor these log patterns for successful operation:

```
[EMAIL][sendClientSignatureRequest] Sending signature request
[EMAIL][sendClientSignatureRequest] Client signature request email sent successfully
[SIGNATURES ROUTE] Client signature request created successfully
```

### Common Issues

#### Email Not Sending
- Check `RESEND_API_KEY` is set correctly
- Verify Resend account is active
- Check Railway logs for email errors

#### Signature Links Not Working
- Verify `FRONTEND_URL` is set to production URL
- Ensure frontend is deployed and accessible
- Check signature route is working

#### Client Can't Access Signature Page
- Verify CORS configuration
- Check frontend routing for `/sign/:signatureId`
- Ensure DocumentSignature component is working

## 🔄 Production Deployment Checklist

- [ ] `FRONTEND_URL` set to production frontend URL
- [ ] `RESEND_API_KEY` set to valid Resend API key
- [ ] `NODE_ENV` set to "production"
- [ ] Backend deployed successfully on Railway
- [ ] Frontend deployed successfully on Vercel
- [ ] Verification script passes
- [ ] Finance user can sign documents
- [ ] Client emails are sent successfully
- [ ] Client can access signature links
- [ ] Client can complete signature process
- [ ] Signatures are recorded in database
- [ ] Audit trail is complete

## 🆘 Troubleshooting

### Email Issues

**Problem**: Emails not being sent
**Solution**: 
1. Check `RESEND_API_KEY` is correct
2. Verify Resend account is active
3. Check Railway logs for email errors

**Problem**: Emails sent but links don't work
**Solution**:
1. Verify `FRONTEND_URL` is correct
2. Ensure frontend is deployed
3. Check signature route configuration

### Signature Issues

**Problem**: Client can't access signature page
**Solution**:
1. Check frontend routing
2. Verify DocumentSignature component
3. Check CORS configuration

**Problem**: Signatures not being recorded
**Solution**:
1. Check MongoDB connection
2. Verify signature routes are working
3. Check database permissions

## 📞 Support

If you encounter issues:

1. Run the verification script: `node verify-signature-email-config.js`
2. Check Railway logs for errors
3. Verify all environment variables are set correctly
4. Test the signature flow step by step
5. Check email delivery in Resend dashboard

## ✅ Success Indicators

When everything is working correctly, you should see:

1. ✅ Finance users can sign documents
2. ✅ Client emails are sent with signature links
3. ✅ Clients can access signature pages
4. ✅ Signatures are recorded with full audit trail
5. ✅ Documents are properly signed and stored
6. ✅ All legal compliance requirements are met

Once all indicators are green, your signature email system is ready for production use! 🎉 