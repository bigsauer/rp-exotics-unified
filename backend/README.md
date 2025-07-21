# RP Exotics Backend

A Node.js/Express backend for the RP Exotics car dealership management system with MongoDB integration.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the backend root:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=5001
```

### Running the Application
```bash
# Development
npm start

# Production
NODE_ENV=production npm start
```

## 📁 Project Structure

```
backend/
├── models/          # MongoDB/Mongoose models
├── routes/          # Express routes
├── middleware/      # Custom middleware
├── tests/           # Test files
├── scripts/         # Utility scripts
├── docs/            # Documentation
├── uploads/         # File uploads
└── app.js           # Main application file
```

## 🔧 Available Scripts

### Development
- `npm start` - Start the development server
- `npm test` - Run tests

### Database Setup
- `node scripts/setup.js` - Initial database setup
- `node scripts/userSetup.js` - Create initial users
- `node scripts/populate-dealers.js` - Populate dealer data
- `node scripts/upload-dealers.js` - Upload dealer information
- `node scripts/seed-document-types.js` - Seed document types

### Maintenance
- `node scripts/fix-dealer-emails.js` - Fix dealer email issues

## 🧪 Testing

All test files are located in the `tests/` directory:
- `test-auth.js` - Authentication tests
- `test-back-office.js` - Back office functionality tests
- `test-deal-creation.js` - Deal creation tests
- `test-dealer-management.js` - Dealer management tests
- `test-models.js` - Database model tests
- `test-sales-tracker.js` - Sales tracking tests
- And more...

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify authentication

### Deals
- `GET /api/deals` - Get all deals
- `POST /api/deals` - Create new deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Dealers
- `GET /api/dealers` - Get all dealers
- `GET /api/dealers/search` - Search dealers
- `POST /api/dealers` - Create dealer
- `PUT /api/dealers/:id` - Update dealer

### Sales Tracking
- `GET /api/sales` - Get sales data
- `POST /api/sales` - Create sales record

### Back Office
- `GET /api/backoffice/deals` - Back office deals view
- `GET /api/backoffice/analytics` - Analytics data

## 🚀 Deployment

### Railway Deployment
The application is configured for Railway deployment with:
- `railway.json` - Railway configuration
- `Procfile` - Process definition

### Environment Variables for Production
- `MONGODB_URI` - Production MongoDB connection
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV=production`

## 📖 Additional Documentation

For detailed information, see the `docs/` directory:
- `BACKEND_README.md` - Detailed backend documentation
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `QUICKSTART.md` - Quick start guide
- `AUTO_DEALER_CREATION.md` - Auto dealer creation process
- `QUICK_DEPLOY.md` - Quick deployment instructions

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization

## 📝 License

This project is proprietary software for RP Exotics. 