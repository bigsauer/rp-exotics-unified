# 🚀 Deployment Guide - Railway + GitHub

This guide will help you deploy your RP Exotics backend to Railway and connect it to GitHub.

## 📋 Prerequisites

1. **GitHub Account** - Create one at [github.com](https://github.com)
2. **Railway Account** - Sign up at [railway.app](https://railway.app)
3. **MongoDB Atlas** - Free cluster at [mongodb.com](https://mongodb.com)

## 🔄 Step 1: Create GitHub Repository

### Option A: Create New Repository
1. Go to [github.com](https://github.com)
2. Click "New repository"
3. Name it: `rp-exotics-backend`
4. Make it **Public** (Railway works better with public repos)
5. Don't initialize with README (we already have one)

### Option B: Use Existing Repository
If you already have a GitHub repo, skip to Step 2.

## 🔗 Step 2: Connect to GitHub

Run these commands in your terminal:

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/rp-exotics-backend.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

## 🚂 Step 3: Deploy to Railway

### 3.1 Connect Railway to GitHub
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select your `rp-exotics-backend` repository
6. Click "Deploy Now"

### 3.2 Configure Environment Variables
In your Railway project dashboard:

1. Go to the "Variables" tab
2. Add these environment variables:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_here
FRONTEND_URL=https://your-frontend-url.com
```

### 3.3 Get MongoDB Atlas Connection String
1. Go to [mongodb.com](https://mongodb.com)
2. Create a free cluster
3. Click "Connect"
4. Choose "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password
7. Add this to Railway as `MONGODB_URI`

## 🌐 Step 4: Get Your Backend URL

After deployment:
1. Railway will give you a URL like: `https://your-app-name.railway.app`
2. Your API will be available at: `https://your-app-name.railway.app/api`

## 🔧 Step 5: Update Frontend

Update your React frontend to use the new Railway URL:

```javascript
// Replace localhost:5001 with your Railway URL
const API_BASE_URL = 'https://your-app-name.railway.app/api';

// Example API calls
fetch(`${API_BASE_URL}/health`)
fetch(`${API_BASE_URL}/vin/decode`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vin: '1HGBH41JXMN109186' })
})
```

## 🧪 Step 6: Test Your Deployment

Test your deployed API:

```bash
# Health check
curl https://your-app-name.railway.app/api/health

# VIN decode
curl -X POST https://your-app-name.railway.app/api/vin/decode \
  -H "Content-Type: application/json" \
  -d '{"vin":"1HGBH41JXMN109186"}'
```

## 🔄 Step 7: Continuous Deployment

Railway will automatically redeploy when you push changes to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update API endpoints"
git push origin main
```

Railway will automatically detect the changes and redeploy!

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check Railway logs for errors
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version in `package.json`

2. **MongoDB Connection Fails**
   - Check your MongoDB Atlas connection string
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Verify the database user has correct permissions

3. **CORS Errors**
   - Add your frontend URL to the CORS configuration
   - Check the `FRONTEND_URL` environment variable

4. **Environment Variables Not Working**
   - Restart your Railway deployment after adding variables
   - Check variable names match exactly

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **MongoDB Atlas**: [docs.mongodb.com](https://docs.mongodb.com)
- **GitHub**: [docs.github.com](https://docs.github.com)

## 🎉 Success!

Once deployed, your backend will be available at:
```
https://your-app-name.railway.app/api
```

Your frontend can now connect to this production URL instead of localhost! 