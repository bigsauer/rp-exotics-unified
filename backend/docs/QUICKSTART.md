# 🚀 Quick Start Guide - RP Exotics User Authentication

## ⚡ 5-Minute Setup

### 1. Create Environment File
Create a `.env` file in your project root:
```bash
# RP Exotics Backend Environment Variables

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/rp_exotics

# JWT Configuration
JWT_SECRET=rp_exotics_super_secret_key_2025_change_this_in_production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000

# Security
BCRYPT_ROUNDS=12
```

### 2. Setup Database
```bash
npm run setup
```

### 3. Start Server
```bash
npm start
```

### 4. Test Authentication
```bash
npm test
```

## 🎯 What You Get

✅ **Complete User Authentication System**
- User registration and login
- JWT token-based authentication
- Password hashing and security
- Account lockout protection

✅ **Role-Based Access Control**
- User roles (user/admin)
- Protected admin endpoints
- Secure authorization middleware

✅ **User Management**
- Profile management
- Password changes
- User preferences
- Admin user management

✅ **Security Features**
- Input validation
- Rate limiting for login attempts
- Secure password storage
- JWT token expiration

## 📡 API Endpoints Ready to Use

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get profile (authenticated)
- `PUT /api/auth/profile` - Update profile (authenticated)
- `PUT /api/auth/change-password` - Change password (authenticated)

### User Management (Admin)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🔐 Security Best Practices

1. **Change the JWT Secret** in production
2. **Use HTTPS** in production
3. **Set up proper CORS** for your frontend
4. **Use environment variables** for all secrets
5. **Monitor login attempts** and implement rate limiting

## 🧪 Testing Your Setup

The test suite will:
1. Register test users
2. Test login functionality
3. Verify profile management
4. Test password changes
5. Verify admin functionality
6. Test security features

## 🚀 Next Steps

1. **Integrate with Frontend** - Use the JWT tokens for authenticated requests
2. **Add More Features** - Extend user profiles, add more roles
3. **Production Deployment** - Set up proper environment variables
4. **Monitoring** - Add logging and monitoring

## 🆘 Need Help?

- Check the full README.md for detailed documentation
- Review the test-auth.js file for usage examples
- All endpoints are documented in the README.md

---

**🎉 You're all set! Your RP Exotics backend now has a complete user authentication system!** 