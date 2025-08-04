# SlipStreamDocs.com Domain Setup Guide

## 🎯 **Goal: Send emails from `noreply@slipstreamdocs.com`**

Your `slipstreamdocs.com` domain has been added to Resend! Now let's complete the setup.

## 📋 **Current Status**

✅ **Domain added to Resend**: `slipstreamdocs.com`  
✅ **Email service updated**: Ready to use `noreply@slipstreamdocs.com`  
✅ **CORS configured**: `slipstreamdocs.com` allowed to access API  
⏳ **DNS verification**: Pending  

## 🔧 **Step 1: Configure DNS Records**

### **Get DNS Records from Resend**

1. **Go to Resend Dashboard**
   - Visit [resend.com/domains](https://resend.com/domains)
   - Click on `slipstreamdocs.com`
   - Copy the required DNS records

### **Required DNS Records (Typical)**

```
Type: TXT
Name: @
Content: resend-verification=your_verification_code_from_resend
TTL: Auto
```

```
Type: CNAME
Name: resend
Content: track.resend.com
TTL: Auto
```

### **Optional: Email Authentication Records**

For better deliverability, also add:

```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
TTL: Auto
```

```
Type: TXT
Name: resend._domainkey
Content: your_dkim_key_from_resend
TTL: Auto
```

## 🔧 **Step 2: Add DNS Records to Your Provider**

### **Option A: Cloudflare (Recommended)**
1. Go to [cloudflare.com](https://cloudflare.com)
2. Select `slipstreamdocs.com`
3. Go to **DNS** tab
4. Add the TXT and CNAME records
5. Set TTL to **Auto**

### **Option B: GoDaddy**
1. Go to [godaddy.com](https://godaddy.com)
2. Access domain management
3. Go to **DNS Management**
4. Add the records

### **Option C: Namecheap**
1. Go to [namecheap.com](https://namecheap.com)
2. Access **Advanced DNS**
3. Add the records

## 🔧 **Step 3: Wait for Verification**

- **DNS Propagation**: 1-24 hours
- **Resend Verification**: Automatic
- **Email Notification**: You'll receive confirmation

## 🔧 **Step 4: Test the Setup**

### **Check Resend Dashboard**
- Domain should show as "Verified"
- Status should be "Active"

### **Test Email Sending**
1. Create a test deal in your system
2. Verify emails are sent from `noreply@slipstreamdocs.com`
3. Check delivery to recipients

## 📧 **Email Configuration**

### **Current Email Setup**
- **From Address**: `noreply@slipstreamdocs.com`
- **Sender Name**: "RP Exotics" or user's name
- **Domain**: `slipstreamdocs.com` (verified)

### **Email Types Ready**
- ✅ Deal Status Updates
- ✅ Document Upload Notifications
- ✅ New Deal Notifications
- ✅ System Alerts
- ✅ Deal Receipts
- ✅ Password Reset Requests
- ✅ Signature Requests
- ✅ Signature Completions

## 🌐 **CORS Configuration**

### **Allowed Origins**
- `https://slipstreamdocs.com`
- `https://www.slipstreamdocs.com`
- All Vercel preview URLs
- Local development URLs

### **API Access**
- ✅ Frontend can access backend API
- ✅ Cross-origin requests allowed
- ✅ Credentials supported

## 🚀 **Deployment Status**

### **Current Deployment**
- ✅ **Email service**: Updated to use `slipstreamdocs.com`
- ✅ **CORS**: Configured for domain access
- ✅ **Backend**: Deployed to Railway
- ✅ **Frontend**: Ready for domain

### **Environment Variables**
```bash
# Verify these are set in Railway
RESEND_API_KEY=your_resend_api_key
FRONTEND_URL=https://slipstreamdocs.com
```

## 🔍 **Troubleshooting**

### **Domain Not Verifying**
1. **Check DNS Records**: Ensure TXT and CNAME are correct
2. **Wait Longer**: DNS can take up to 24 hours
3. **Check TTL**: Set to Auto or 300 seconds
4. **Contact Support**: If still not working after 24 hours

### **Emails Not Sending**
1. **Check Resend Dashboard**: Verify domain status
2. **Check API Key**: Ensure RESEND_API_KEY is set
3. **Check Logs**: Review Railway logs for errors
4. **Test Manually**: Try sending test email from Resend dashboard

### **CORS Errors**
1. **Check Origin**: Ensure `slipstreamdocs.com` is in allowed origins
2. **Check Protocol**: Use `https://` not `http://`
3. **Check Subdomain**: Include both `www` and non-www versions

### **Emails Going to Spam**
1. **Add SPF Record**: Resend provides this
2. **Add DKIM Record**: Resend provides this
3. **Add DMARC Record**: Optional but recommended
4. **Monitor Reputation**: Check Resend dashboard

## 📊 **Monitoring**

### **Resend Dashboard**
- Monitor delivery rates
- Check bounce rates
- View email analytics
- Track domain reputation

### **Railway Logs**
```bash
# Check for email errors
railway logs | grep -i email

# Check for CORS issues
railway logs | grep -i cors
```

## 🎯 **Success Indicators**

✅ **Domain shows as "Verified" in Resend**  
✅ **Emails sent from `noreply@slipstreamdocs.com`**  
✅ **Professional sender name "RP Exotics"**  
✅ **High delivery rates in Resend dashboard**  
✅ **No CORS errors in logs**  
✅ **No bounce errors in logs**  

## 📞 **Support**

If you encounter issues:

1. **Resend Support**: [support.resend.com](https://support.resend.com)
2. **DNS Provider Support**: Contact your DNS provider
3. **Railway Support**: Check Railway documentation

## 🔄 **Next Steps**

1. **Complete DNS setup** (if not done)
2. **Wait for verification** (1-24 hours)
3. **Test email sending** with a real deal
4. **Monitor delivery rates** in Resend dashboard
5. **Set up email authentication** (SPF, DKIM, DMARC)

---

**Once your domain is verified, your emails will send from `noreply@slipstreamdocs.com` with professional branding!** 🎉 