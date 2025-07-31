# 🚀 Deployment Workflow Guide

## Overview

This guide explains how to use the new **3-Environment Deployment Workflow** that allows safe testing and deployment without affecting production users.

## 🌍 Environment Structure

### 1. **Development Environment** (Blue)
- **Purpose**: Active development and testing
- **URL**: `https://dev-opis-frontend.vercel.app`
- **Users**: Developers, IT team
- **Features**: All features enabled, including beta features
- **Database**: Development database (separate from production)

### 2. **Staging Environment** (Yellow)
- **Purpose**: Pre-production testing and validation
- **URL**: `https://staging-opis-frontend.vercel.app`
- **Users**: IT team, select testers
- **Features**: Production-ready features only
- **Database**: Staging database (separate from production)

### 3. **Production Environment** (Green)
- **Purpose**: Live system for end users
- **URL**: `https://opis-frontend-dw442ltxo-bigsauers-projects.vercel.app`
- **Users**: All finance personnel and clients
- **Features**: Stable, tested features only
- **Database**: Production database

## 🔄 Deployment Workflow

### Step 1: Development
1. **Make changes** in your local development environment
2. **Test locally** to ensure everything works
3. **Deploy to Development** using the IT page
4. **Test thoroughly** in the development environment

### Step 2: Staging
1. **Promote from Development to Staging** using the IT page
2. **Test in staging** with real data (but separate database)
3. **Validate all features** work as expected
4. **Get approval** from stakeholders if needed

### Step 3: Production
1. **Promote from Staging to Production** using the IT page
2. **Monitor** the deployment
3. **Verify** everything works in production
4. **Notify users** of any changes

## 🎛️ Using the IT Management Page

### Access
- Navigate to the IT page in your application
- Only users with `it` or `admin` role can access

### Deployment Controls

#### Development Environment
- **Deploy**: Deploy latest changes to development
- **Rollback**: Revert to previous development version
- **URL**: Direct link to development environment

#### Staging Environment
- **Promote from Dev**: Move tested changes from development to staging
- **Rollback**: Revert staging to previous version
- **URL**: Direct link to staging environment

#### Production Environment
- **Promote from Staging**: Move validated changes from staging to production
- **Rollback**: Emergency rollback of production (use carefully!)
- **URL**: Direct link to production environment

### Feature Flags

Control which features are available in each environment:

- **Enhanced Signatures**: PDF signature system
- **New Dashboard**: New dashboard layout
- **Advanced Reporting**: Advanced analytics
- **Beta Features**: Experimental features

Toggle features on/off per environment to control what users see.

## 🛠️ Setting Up the Environments

### Frontend Setup (Vercel)

1. **Create Development Environment**
   ```bash
   # Create new Vercel project for development
   vercel --name opis-frontend-dev
   ```

2. **Create Staging Environment**
   ```bash
   # Create new Vercel project for staging
   vercel --name opis-frontend-staging
   ```

3. **Configure Environment Variables**
   - Set `REACT_APP_API_URL` for each environment
   - Development: Point to development backend
   - Staging: Point to staging backend
   - Production: Point to production backend

### Backend Setup (Railway)

1. **Create Development Backend**
   - Create new Railway project
   - Set environment variables
   - Configure development database

2. **Create Staging Backend**
   - Create new Railway project
   - Set environment variables
   - Configure staging database

3. **Update Environment URLs**
   - Set `DEV_URL`, `STAGING_URL`, `PROD_URL` in your main backend
   - Update the IT page with correct URLs

## 🔧 Environment Variables

### Frontend (.env files)

```bash
# Development
REACT_APP_API_URL=https://dev-backend.railway.app

# Staging
REACT_APP_API_URL=https://staging-backend.railway.app

# Production
REACT_APP_API_URL=https://astonishing-chicken-production.up.railway.app
```

### Backend (Railway Environment Variables)

```bash
# Environment URLs
DEV_URL=https://dev-opis-frontend.vercel.app
STAGING_URL=https://staging-opis-frontend.vercel.app
PROD_URL=https://opis-frontend-dw442ltxo-bigsauers-projects.vercel.app

# Database URLs (separate for each environment)
DEV_DATABASE_URL=mongodb://...
STAGING_DATABASE_URL=mongodb://...
PROD_DATABASE_URL=mongodb://...

# Version tracking
DEV_VERSION=v1.2.3-dev
STAGING_VERSION=v1.2.3-staging
PROD_VERSION=v1.2.2
```

## 📋 Best Practices

### Development Workflow
1. **Always test locally** before deploying
2. **Use feature flags** to control feature rollout
3. **Test in development** thoroughly before promoting
4. **Document changes** in deployment history

### Staging Workflow
1. **Test with real data** (but separate database)
2. **Validate all user flows** work correctly
3. **Check performance** and load times
4. **Get stakeholder approval** for major changes

### Production Workflow
1. **Only promote from staging** (never directly from development)
2. **Monitor deployment** closely
3. **Have rollback plan** ready
4. **Notify users** of any breaking changes

### Emergency Procedures
1. **Immediate rollback** if issues are detected
2. **Communicate** with users about the issue
3. **Investigate** the root cause
4. **Fix and retest** before redeploying

## 🚨 Safety Features

### Validation
- **Promotion paths** are validated (dev→staging→production only)
- **Confirmation dialogs** for all production changes
- **Rollback capability** for all environments

### Monitoring
- **Deployment history** tracks all changes
- **User tracking** shows who made changes
- **Status monitoring** for all environments

### Access Control
- **IT role required** for deployment controls
- **Audit trail** of all deployment actions
- **Environment isolation** prevents cross-contamination

## 📞 Support

If you encounter issues with the deployment workflow:

1. **Check deployment history** in the IT page
2. **Verify environment variables** are set correctly
3. **Test in development** first
4. **Contact IT team** if problems persist

## 🔄 Quick Reference

### Daily Workflow
1. **Develop** → Test locally
2. **Deploy to Dev** → Test thoroughly
3. **Promote to Staging** → Validate with real data
4. **Promote to Production** → Release to users

### Emergency Rollback
1. **Identify** the problematic environment
2. **Click Rollback** in the IT page
3. **Monitor** the rollback process
4. **Verify** the system is stable

### Feature Rollout
1. **Enable feature** in development
2. **Test thoroughly** in development
3. **Promote to staging** with feature enabled
4. **Test in staging** with real users
5. **Promote to production** when ready

---

**Remember**: Always test in development and staging before touching production! 🛡️ 