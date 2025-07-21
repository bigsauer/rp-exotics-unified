# RP Exotics Backend API

This is the new Express.js backend server for RP Exotics, built with Mongoose and designed to work with your React frontend.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/rp-exotics
JWT_SECRET=your-secret-key-here
VIN_DECODE_API_URL=https://vpic.nhtsa.dot.gov/api/vehicles
```

### Running the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5001`

## 📡 API Endpoints

### Health Check
- **GET** `/api/health` - Server health status
- **GET** `/api/test` - Frontend connection test

### Authentication
- **GET** `/api/auth/test` - Auth routes test (placeholder)

### Deals Management
- **GET** `/api/deals` - Get all deals (mock data)
- **POST** `/api/deals` - Create new deal (mock implementation)

### VIN Decode
- **POST** `/api/vin/decode` - Decode VIN using NHTSA API
  ```json
  {
    "vin": "1HGBH41JXMN109186"
  }
  ```

### Dealer Search
- **GET** `/api/dealers/search?q=searchterm` - Search dealers (mock data)

## 🔧 CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (React dev server)
- `http://localhost:3001` (Alternative React port)
- `http://localhost:5000` (Your existing backend)

## 🗄️ Database Models

### Deal Model
- Vehicle information (VIN, year, make, model, etc.)
- Deal information (type, funding source, stage, etc.)
- Financial information (prices, fees, etc.)
- Seller information
- Documentation status
- Auto-generated stock numbers (RP20250001 format)

### Dealer Model
- Basic dealer information
- Contact details
- Deal history
- Text search capabilities

### User Model
- Authentication details
- Role-based access control
- Active/inactive status

## 🧪 Testing

### Test Models
```bash
node test-models.js
```

### Test VIN Decode
```bash
node test-vin-decode.js
```

### Test Team Login (existing)
```bash
node test-team-login.js
```

## 🔄 Migration from app.js

This new backend (`server.js`) runs alongside your existing `app.js`:
- **app.js**: Port 5000 (existing functionality)
- **server.js**: Port 5001 (new Mongoose-based API)

### Next Steps for Full Migration:
1. Move authentication logic from `app.js` to `routes/auth.js`
2. Replace mock data in deals routes with actual Mongoose model operations
3. Implement real dealer search using the Dealer model
4. Add proper error handling and validation
5. Implement JWT authentication middleware

## 🌐 Frontend Integration

Your React frontend can now connect to this backend at:
```
http://localhost:5001/api
```

### Example API calls:
```javascript
// Health check
fetch('http://localhost:5001/api/health')

// VIN decode
fetch('http://localhost:5001/api/vin/decode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vin: '1HGBH41JXMN109186' })
})

// Get deals
fetch('http://localhost:5001/api/deals')

// Search dealers
fetch('http://localhost:5001/api/dealers/search?q=Ian')
```

## 📁 Project Structure

```
rp-exotics-backend/
├── server.js              # Main server file
├── app.js                 # Existing server (port 5000)
├── models/                # Mongoose models
│   ├── Deal.js
│   ├── Dealer.js
│   ├── User.js
│   └── index.js
├── routes/                # API routes
│   ├── auth.js
│   └── deals.js
├── .env                   # Environment variables
├── package.json
└── test-*.js             # Test files
```

## 🚨 Important Notes

1. **Port Configuration**: The new backend runs on port 5001 to avoid conflicts with your existing app.js on port 5000.

2. **Database**: Uses the same MongoDB database as your existing app, but with Mongoose models.

3. **CORS**: Configured to allow frontend connections from multiple localhost ports.

4. **Mock Data**: Some endpoints return mock data - replace with actual database operations as needed.

5. **Authentication**: Currently placeholder - implement real JWT auth when ready.

## 🔗 External APIs

- **VIN Decode**: Uses free NHTSA API (no key required)
- **MongoDB**: Local or Atlas connection

## 📞 Support

For issues or questions about the new backend setup, check the test files for examples of how to use the API endpoints. 