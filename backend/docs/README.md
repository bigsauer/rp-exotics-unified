# RP Exotics Backend API

A comprehensive backend API for RP Exotics with user authentication, dealer management, and deal tracking.

## 🚀 Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (User/Admin)
  - Secure password hashing with bcrypt
  - Account lockout protection
  - Password change functionality

- **Dealer Management**
  - Search and autocomplete dealers
  - Track dealer metrics and history
  - Comprehensive dealer profiles

- **Deal Tracking**
  - Create and manage vehicle deals
  - Search by VIN, stock number, make, model
  - Automatic stock number generation
  - Deal history tracking

- **Security Features**
  - Input validation and sanitization
  - Rate limiting for login attempts
  - Secure password storage
  - JWT token expiration

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rp-exotics-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   Create a `.env` file in the root directory:
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

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev
   ```

## 🧪 Testing

Run the authentication test suite:
```bash
node test-auth.js
```

## 📚 API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "preferences": {
    "theme": "dark",
    "notifications": false
  }
}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### User Management (Admin Only)

#### Get All Users
```http
GET /api/users
Authorization: Bearer <admin_jwt_token>
```

#### Get Single User
```http
GET /api/users/:id
Authorization: Bearer <admin_jwt_token>
```

#### Update User
```http
PUT /api/users/:id
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "role": "admin",
  "isActive": true
}
```

#### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <admin_jwt_token>
```

### Dealer Endpoints

#### Search Dealers
```http
GET /api/dealers/search?q=search_term
```

#### Get All Dealers
```http
GET /api/dealers
```

#### Get Single Dealer
```http
GET /api/dealers/:id
```

#### Create Dealer
```http
POST /api/dealers
Content-Type: application/json

{
  "name": "ABC Motors",
  "type": "dealership",
  "contact": {
    "primaryContact": "John Smith",
    "phone": "555-123-4567",
    "email": "john@abcmotors.com"
  }
}
```

### Deal Endpoints

#### Get All Deals
```http
GET /api/deals?page=1&limit=50
```

#### Search Deals
```http
GET /api/deals/search?vin=1HGBH41JXMN109186&make=Toyota&model=Camry
```

#### Get Single Deal
```http
GET /api/deals/:id
```

#### Create Deal
```http
POST /api/deals
Content-Type: application/json

{
  "vin": "1HGBH41JXMN109186",
  "vehicle": {
    "year": 2023,
    "make": "Toyota",
    "model": "Camry",
    "trim": "SE"
  },
  "parties": {
    "purchasedFrom": {
      "name": "ABC Motors",
      "contact": {
        "phone": "555-123-4567"
      }
    }
  },
  "financials": {
    "purchasePrice": 25000,
    "salePrice": 28000
  }
}
```

#### Update Deal
```http
PUT /api/deals/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "sold",
  "financials": {
    "salePrice": 28500
  }
}
```

## 🔐 Security Features

### Password Security
- Passwords are hashed using bcrypt with configurable salt rounds
- Minimum password length validation
- Secure password comparison

### JWT Authentication
- Tokens expire after 7 days (configurable)
- Secure token verification
- User role and ID embedded in tokens

### Account Protection
- Account lockout after 5 failed login attempts
- 15-minute lockout period
- Automatic reset of failed attempts on successful login

### Input Validation
- Email format validation
- Username uniqueness check
- Required field validation
- SQL injection prevention through MongoDB

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique, lowercase),
  email: String (unique, lowercase),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String (enum: ['user', 'admin']),
  isActive: Boolean,
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,
  preferences: {
    theme: String,
    notifications: Boolean,
    language: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Dealers Collection
```javascript
{
  _id: ObjectId,
  name: String,
  type: String,
  status: String,
  contact: {
    primaryContact: String,
    phone: String,
    email: String
  },
  metrics: {
    totalDeals: Number,
    totalPurchaseVolume: Number,
    totalSaleVolume: Number,
    lastDealDate: Date
  },
  dealHistory: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### Deals Collection
```javascript
{
  _id: ObjectId,
  vin: String,
  stockNumber: String,
  vehicle: {
    year: Number,
    make: String,
    model: String,
    trim: String
  },
  parties: {
    purchasedFrom: Object,
    soldTo: Object
  },
  financials: {
    purchasePrice: Number,
    salePrice: Number
  },
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Environment Variables for Production
```bash
# Use a strong, unique JWT secret
JWT_SECRET=your_super_secure_jwt_secret_here

# Use MongoDB Atlas or production MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rp_exotics

# Set appropriate port
PORT=3000

# Increase bcrypt rounds for production
BCRYPT_ROUNDS=12
```

### Security Checklist
- [ ] Change default JWT secret
- [ ] Use HTTPS in production
- [ ] Set up proper CORS configuration
- [ ] Use environment variables for all secrets
- [ ] Set up rate limiting
- [ ] Configure proper MongoDB access controls
- [ ] Set up monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please contact the development team. 