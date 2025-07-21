# Auto-Dealer Creation System

## Overview

The RP Exotics backend now automatically creates dealer records whenever you buy from or sell to a new dealer that's not already in your system. This ensures your dealer database stays up-to-date organically as you do business.

## How It Works

### 1. Deal Creation Process

When you create a new deal via `POST /api/deals`, the system:

1. **Validates the deal data** (VIN and seller required)
2. **Checks if the seller exists** in your dealer database
3. **Auto-creates the seller** if it's a new dealer
4. **Checks if the buyer exists** (if applicable)
5. **Auto-creates the buyer** if it's a new dealer
6. **Creates the deal** with proper dealer references

### 2. Dealer Matching Logic

The system matches dealers using these criteria (in order of priority):
- **Exact name match** (case-insensitive)
- **Email match** (if provided)
- **Phone match** (if provided)

### 3. Auto-Created Dealer Properties

New dealers created automatically include:
```json
{
  "id": "auto-generated-timestamp",
  "name": "Dealer Name",
  "contactPerson": "Contact Person Name",
  "phone": "Phone Number",
  "email": "Email Address",
  "status": "active",
  "type": "exotic",
  "location": {
    "city": "",
    "state": "",
    "country": "USA"
  },
  "notes": "Auto-created from deal on [date]",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## API Endpoints

### Create Deal with Auto-Dealer Creation
```http
POST /api/deals
Content-Type: application/json

{
  "vin": "SBM14FCA4LW004366",
  "year": "2020",
  "make": "McLaren",
  "model": "720S",
  "trim": "Coupe",
  "rpStockNumber": "RP2025001",
  "currentStage": "purchased",
  "seller": {
    "name": "Exotic Motors of Miami",
    "contactPerson": "Carlos Rodriguez",
    "phone": "305-555-0123",
    "email": "carlos@exoticmotorsmiami.com"
  },
  "purchasePrice": 285000,
  "notes": "Test deal with auto-created dealer"
}
```

### Response
```json
{
  "success": true,
  "message": "Deal created successfully",
  "data": {
    "id": "1703123456789",
    "vin": "SBM14FCA4LW004366",
    "year": "2020",
    "make": "McLaren",
    "model": "720S",
    "trim": "Coupe",
    "rpStockNumber": "RP2025001",
    "currentStage": "purchased",
    "seller": {
      "id": "1703123456789",
      "name": "Exotic Motors of Miami",
      "contactPerson": "Carlos Rodriguez",
      "phone": "305-555-0123",
      "email": "carlos@exoticmotorsmiami.com",
      "status": "active",
      "type": "exotic",
      "notes": "Auto-created from deal on 12/21/2023"
    },
    "purchasePrice": 285000,
    "notes": "Test deal with auto-created dealer",
    "createdAt": "2023-12-21T10:30:45.123Z",
    "updatedAt": "2023-12-21T10:30:45.123Z"
  }
}
```

## Testing

Run the test script to see auto-dealer creation in action:

```bash
node test-deal-creation.js
```

This will:
1. Create a deal with a new dealer as seller
2. Create a deal with a new dealer as buyer
3. Create a deal with an existing dealer (no duplicate)
4. Show all auto-created dealers
5. Display all deals in the system

## Frontend Integration

In your React frontend, when creating deals:

1. **Seller/Buyer Input**: Allow users to enter dealer information
2. **Auto-Search**: Use `/api/dealers/search?q=dealer_name` to find existing dealers
3. **New Dealer**: If no match found, allow entering new dealer details
4. **Submit Deal**: Send to `/api/deals` - the backend will handle dealer creation automatically

## Benefits

✅ **No Manual Data Entry**: Dealers are created automatically as you do business
✅ **No Duplicates**: Existing dealers are reused based on name/email/phone
✅ **Complete Records**: All dealer contact info is captured during deal creation
✅ **Audit Trail**: Auto-created dealers are marked with creation date and source
✅ **Flexible**: Works for both sellers and buyers

## Example Scenarios

### Scenario 1: Buying from New Dealer
1. You find a great McLaren at "Exotic Motors of Miami"
2. Create deal with seller info: name, contact person, phone, email
3. System automatically creates dealer record
4. Future deals with same dealer will reuse existing record

### Scenario 2: Selling to New Dealer
1. "Luxury Auto Gallery" wants to buy your BMW
2. Create deal with buyer info
3. System automatically creates dealer record
4. Dealer is now in your database for future transactions

### Scenario 3: Existing Dealer
1. You do another deal with "Exotic Motors of Miami"
2. System finds existing dealer record
3. No duplicate created
4. Deal is linked to existing dealer

## Notes

- **Private Sellers/Buyers**: Use "Private Seller" or "Private Buyer" as name to avoid auto-creation
- **Data Updates**: If you provide new contact info for existing dealer, it will be updated
- **Manual Override**: You can still manually create dealers via `/api/dealers` if needed
- **Production**: In production, this would use a real database instead of in-memory storage 