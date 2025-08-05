const express = require('express');
const router = express.Router();
const axios = require('axios');
const Dealer = require('../models/Dealer');
const Deal = require('../models/Deal');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const documentGenerator = require('../services/documentGenerator');
const emailService = require('../services/emailService');

// Performance optimization: Dealer lookup caching
const dealerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedDealer = async (query) => {
  const cacheKey = JSON.stringify(query);
  const cached = dealerCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const dealer = await Dealer.findOne(query).lean();
  dealerCache.set(cacheKey, { data: dealer, timestamp: Date.now() });
  return dealer;
};

// Function to generate stock number with month-deal-type format
async function generateStockNumber(dealType, dealType2SubType) {
  const currentDate = new Date();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // 01-12
  
  // Determine deal type prefix (R for Retail, W for Wholesale)
  let typePrefix = 'R'; // Default to Retail
  if (dealType && dealType.startsWith('wholesale')) {
    typePrefix = 'W'; // Wholesale
  }
  
  // Determine transaction type suffix (P for Purchase, S for Sale, F for Flip)
  let transactionSuffix = 'P'; // Default to Purchase
  
  if (dealType === 'wholesale-flip' && dealType2SubType === 'buy-sell') {
    transactionSuffix = 'F'; // Flip
  } else if (dealType === 'wholesale-d2d' && dealType2SubType === 'sale') {
    transactionSuffix = 'S'; // Sale
  } else if (dealType === 'wholesale-d2d' && dealType2SubType === 'buy') {
    transactionSuffix = 'P'; // Purchase
  } else if (dealType === 'retail-pp' && dealType2SubType === 'buy') {
    transactionSuffix = 'P'; // Purchase
  } else if (dealType === 'retail-pp' && dealType2SubType === 'sale') {
    transactionSuffix = 'S'; // Sale
  } else if (dealType === 'auction') {
    transactionSuffix = 'P'; // Purchase (auction purchase)
  } else if (dealType === 'wholesale-flip' && dealType2SubType === 'buy') {
    transactionSuffix = 'P'; // Purchase (wholesale flip buy)
  } else if (dealType === 'wholesale-flip' && dealType2SubType === 'sale') {
    transactionSuffix = 'S'; // Sale (wholesale flip sale)
  }
  
  // Get count of deals for this month with the same type prefix and transaction suffix
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Create the pattern to match existing deals with the same type
  const typePattern = new RegExp(`^\\d{2}-\\d{4}-${typePrefix}${transactionSuffix}$`);
  
  const count = await Deal.countDocuments({
    rpStockNumber: typePattern,
    createdAt: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  }) + 1;
  
  const stockNumber = `${month}-${count.toString().padStart(4, '0')}-${typePrefix}${transactionSuffix}`;
  console.log(`[STOCK NUMBER] Generated: ${stockNumber} (Month: ${month}, Count: ${count}, Type: ${dealType}/${dealType2SubType}, Prefix: ${typePrefix}, Suffix: ${transactionSuffix})`);
  
  return stockNumber;
}

// Add the compatibility mapping here so it's available everywhere
const statusCompatMap = {
  'contract_received': 'contract-received',
  'title_processing': 'title-processing',
  'payment_approved': 'payment-approved',
  'funds_disbursed': 'funds-disbursed',
  'title_received': 'title-received',
  'deal_complete': 'deal-complete'
};

// VIN decode cache schema
const vinDecodeCacheSchema = new mongoose.Schema({
  vin: { type: String, required: true, unique: true },
  decodedData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});
const VinDecodeCache = mongoose.models.VinDecodeCache || mongoose.model('VinDecodeCache', vinDecodeCacheSchema);

// Helper function to find or create dealer in MongoDB
async function findOrCreateDealer(dealerInfo) {
  try {
    if (!dealerInfo.name || dealerInfo.name === 'Private Seller' || dealerInfo.name === 'Private Buyer') {
      return dealerInfo;
    }

    // Normalize address: always use object {street, city, state, zip}
    let normalizedAddress = {};
    if (dealerInfo.address) {
      if (typeof dealerInfo.address === 'string') {
        // Try to parse as JSON, or fallback to street only
        try {
          const parsed = JSON.parse(dealerInfo.address);
          if (typeof parsed === 'object') {
            normalizedAddress = parsed;
          } else {
            normalizedAddress = { street: dealerInfo.address };
          }
        } catch {
          normalizedAddress = { street: dealerInfo.address };
        }
      } else if (typeof dealerInfo.address === 'object') {
        normalizedAddress = {
          street: dealerInfo.address.street || '',
          city: dealerInfo.address.city || '',
          state: dealerInfo.address.state || '',
          zip: dealerInfo.address.zip || ''
        };
      }
    }

    // Check if dealer already exists in MongoDB
    let existingDealer = await Dealer.findOne({
      $or: [
        { name: new RegExp(`^${dealerInfo.name}$`, 'i') },
        { 'contact.email': dealerInfo.email?.toLowerCase() },
        { 'contact.phone': dealerInfo.phone }
      ]
    }).lean(); // .lean() added for speed

    if (existingDealer) {
      // Log before state
      console.log('[DEALER UPDATE] Before:', JSON.stringify(existingDealer, null, 2));
      let updated = false;
      if (dealerInfo.contactPerson && !existingDealer.contact?.phone) {
        existingDealer.contact = existingDealer.contact || {};
        existingDealer.contact.phone = dealerInfo.phone;
        updated = true;
      }
      if (dealerInfo.phone && !existingDealer.contact?.phone) {
        existingDealer.contact = existingDealer.contact || {};
        existingDealer.contact.phone = dealerInfo.phone;
        updated = true;
      }
      if (dealerInfo.email && !existingDealer.contact?.email) {
        existingDealer.contact = existingDealer.contact || {};
        existingDealer.contact.email = dealerInfo.email.toLowerCase();
        updated = true;
      }
      // Merge address fields robustly
      if (Object.keys(normalizedAddress).length > 0) {
        existingDealer.contact = existingDealer.contact || {};
        existingDealer.contact.address = existingDealer.contact.address || {};
        const addr = normalizedAddress;
        let addressChanged = false;
        ['street', 'city', 'state', 'zip'].forEach(key => {
          if (addr[key] && addr[key] !== existingDealer.contact.address[key]) {
            existingDealer.contact.address[key] = addr[key];
            addressChanged = true;
          }
        });
        if (addressChanged) {
          updated = true;
          console.log('[DEALER UPDATE] Address merged:', existingDealer.contact.address);
        }
      }
      // Merge license number
      if (dealerInfo.licenseNumber && dealerInfo.licenseNumber !== existingDealer.licenseNumber) {
        console.log(`[DEALER UPDATE] Updating license number for ${existingDealer.name}: ${existingDealer.licenseNumber} -> ${dealerInfo.licenseNumber}`);
        existingDealer.licenseNumber = dealerInfo.licenseNumber;
        updated = true;
      } else {
        console.log(`[DEALER UPDATE] License number for ${existingDealer.name} unchanged: ${existingDealer.licenseNumber}`);
      }
      // Merge tier
      if (dealerInfo.tier && dealerInfo.tier !== existingDealer.tier) {
        existingDealer.tier = dealerInfo.tier;
        updated = true;
      }
      if (updated) {
        try {
          await Dealer.findByIdAndUpdate(existingDealer._id, existingDealer, { new: true, runValidators: true }).lean(); // .lean() added for speed
          console.log('[DEALER UPDATE] After:', JSON.stringify(existingDealer, null, 2));
        } catch (err) {
          console.error('[DEALER UPDATE] ❌ Error saving updated dealer:', err);
        }
      } else {
        console.log('[DEALER UPDATE] No changes detected for dealer:', existingDealer.name);
      }
      return {
        id: existingDealer._id,
        name: existingDealer.name,
        contactPerson: dealerInfo.contactPerson || '',
        phone: existingDealer.contact?.phone || dealerInfo.phone || '',
        email: existingDealer.contact?.email || dealerInfo.email || '',
        company: existingDealer.company || '',
        licenseNumber: existingDealer.licenseNumber || dealerInfo.licenseNumber || '',
        tier: existingDealer.tier || 'Tier 1',
        type: existingDealer.type || 'dealer',
        address: existingDealer.contact?.address || normalizedAddress || {}
      };
    }

    // Create new dealer in MongoDB
    try {
      const newDealer = new Dealer({
        name: dealerInfo.name.trim(),
        company: dealerInfo.company || '',
        type: dealerInfo.type || 'dealer',
        contact: {
          phone: dealerInfo.phone || '',
          email: dealerInfo.email?.toLowerCase() || '',
          address: normalizedAddress
        },
        licenseNumber: dealerInfo.licenseNumber || '',
        tier: dealerInfo.tier || 'Tier 1',
        notes: `Auto-created from deal on ${new Date().toLocaleDateString()}`,
        isActive: true
      });
      console.log(`[DEALER CREATE] Creating new dealer with license number: ${dealerInfo.licenseNumber}`);
      await newDealer.save();
      console.log(`[DEALER CREATE] New dealer created:`, JSON.stringify(newDealer, null, 2));
      return {
        id: newDealer._id,
        name: newDealer.name,
        contactPerson: dealerInfo.contactPerson || '',
        phone: newDealer.contact?.phone || '',
        email: newDealer.contact?.email || '',
        company: newDealer.company || '',
        licenseNumber: newDealer.licenseNumber || '',
        tier: newDealer.tier || 'Tier 1',
        type: newDealer.type || 'Dealer',
        address: newDealer.contact?.address || normalizedAddress || {}
      };
    } catch (err) {
      console.error('[DEALER CREATE] ❌ Error creating new dealer:', err);
      return dealerInfo;
    }
  } catch (error) {
    console.error('Error in findOrCreateDealer:', error);
    return dealerInfo; // Return original info if dealer creation fails
  }
}

// Add global request logger for debugging
router.use((req, res, next) => {
  console.log(`[DEBUG][deals.js] ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Deals routes working!' });
});

// GET /api/deals - Return all deals (for frontend)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use .lean() for faster read-only queries
    const deals = await Deal.find().sort({ createdAt: -1 }).lean(); // .lean() added for speed
    res.json({ success: true, deals, count: deals.length });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Failed to retrieve deals' });
  }
});

// VIN Decode endpoint
router.post('/vin/decode', authenticateToken, async (req, res) => {
  try {
    console.log('[VIN DECODE] Request body:', req.body);
    const { vin } = req.body;
    
    if (!vin || vin.length !== 17) {
      console.warn('[VIN DECODE] Invalid VIN:', vin);
      return res.status(400).json({ 
        error: 'Valid 17-character VIN required' 
      });
    }

    // Check cache first
    const cached = await VinDecodeCache.findOne({ vin }).lean(); // .lean() added for speed
    if (cached) {
      console.log('[VIN DECODE] Cache hit for VIN:', vin, 'Data:', cached.decodedData);
      return res.json({
        success: true,
        data: cached.decodedData,
        decodedAt: cached.createdAt,
        cached: true
      });
    }

    // Using NHTSA free API
    const response = await axios.get(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      { timeout: 10000 }
    );
    console.log('[VIN DECODE] NHTSA API response:', JSON.stringify(response.data, null, 2));

    if (response.data?.Results) {
      const results = response.data.Results;
      
      const extractValue = (...variables) => {
        for (const variable of variables) {
          const result = results.find(r => r.Variable === variable);
          if (result?.Value && result.Value !== 'Not Applicable') return result.Value;
        }
        return null;
      };

      const decodedData = {
        year: extractValue('Model Year'),
        make: extractValue('Make'),
        model: extractValue('Model'),
        trim: extractValue('Trim'),
        bodyStyle: extractValue('Body Class', 'Body Type'),
        engine: extractValue('Engine Model', 'Engine Configuration', 'Engine Manufacturer'),
        transmission: extractValue('Transmission Style', 'Transmission Type'),
        driveType: extractValue('Drive Type', 'Drive'),
        manufacturer: extractValue('Manufacturer', 'Manufacturer Name'),
        plantCountry: extractValue('Plant Country'),
        plantCity: extractValue('Plant City'),
        plantState: extractValue('Plant State'),
        fuelType: extractValue('Fuel Type - Primary', 'Fuel Type'),
        doors: extractValue('Doors'),
        cylinders: extractValue('Engine Cylinders', 'Cylinders'),
        displacement: extractValue('Displacement (L)', 'Displacement (CC)', 'Displacement (CI)'),
        gvwr: extractValue('GVWR'),
        restraintType: extractValue('Restraint Type'),
        series: extractValue('Series'),
        other: {
          wheelbase: extractValue('Wheelbase (inches)'),
          brakeSystem: extractValue('Brake System'),
          steeringType: extractValue('Steering Type'),
          axleConfiguration: extractValue('Axle Configuration'),
        }
      };
      console.log('[VIN DECODE] Final decodedData:', decodedData);
      // Save to cache
      await VinDecodeCache.create({ vin, decodedData });

      res.json({
        success: true,
        data: decodedData,
        decodedAt: new Date(),
        cached: false
      });
    } else {
      console.error('[VIN DECODE] NHTSA API returned no Results for VIN:', vin);
      res.status(400).json({ error: 'Unable to decode VIN: NHTSA API returned no results.' });
    }
  } catch (error) {
    console.error('[VIN DECODE] VIN decode error:', error);
    res.status(500).json({ error: 'VIN decode service temporarily unavailable. ' + (error.message || '') });
  }
});

// Enhanced dealer search endpoint - now uses MongoDB
router.get('/dealers/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ dealers: [] });
    }
    
    // Search dealers in MongoDB using text search
    const dealers = await Dealer.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } }).limit(10).lean(); // .lean() added for speed
    
    // Format dealers for frontend
    const formattedDealers = dealers.map(dealer => ({
      id: dealer._id,
      name: dealer.name,
      company: dealer.company || '',
      contactPerson: dealer.contact?.phone ? 'Contact Available' : '',
      phone: dealer.contact?.phone || '',
      email: dealer.contact?.email || '',
      type: dealer.type || 'Dealer'
    }));
    
    res.json({ dealers: formattedDealers });
  } catch (error) {
    console.error('Dealer search error:', error);
    res.status(500).json({ error: 'Search temporarily unavailable' });
  }
});

// Enhanced Deals CRUD endpoints with MongoDB dealer auto-creation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const dealData = req.body;
    
    console.log('[DEBUG] Incoming dealData:', dealData);
    if (dealData.currentStage === 'documentation') {
      dealData.currentStage = 'title-processing';
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEAL CREATION] 📋 Received deal data:', {
        vin: dealData.vin,
        year: dealData.year,
        make: dealData.make,
        model: dealData.model,
        dealType: dealData.dealType,
        dealType2SubType: dealData.dealType2SubType,
        dealType2: dealData.dealType2,
        salesperson: dealData.salesperson,
        purchasePrice: dealData.purchasePrice,
        listPrice: dealData.listPrice,
        instantOffer: dealData.instantOffer,
        seller: dealData.seller
      });
      
      console.log('[DEAL CREATION] 🔍 DEAL TYPE DEBUGGING:');
      console.log('[DEAL CREATION] 🔍 - dealType:', dealData.dealType);
      console.log('[DEAL CREATION] 🔍 - dealType2SubType:', dealData.dealType2SubType);
      console.log('[DEAL CREATION] 🔍 - dealType2:', dealData.dealType2);
      console.log('[DEAL CREATION] 🔍 - Full dealData object:', JSON.stringify(dealData, null, 2));
    }
    
    console.log('[DEAL CREATION] ✅ Basic validation passed');
    
    // Validate required fields
    if (!dealData.vin || !dealData.seller) {
      console.log('[DEAL CREATION] ❌ Missing VIN or seller');
      return res.status(400).json({ 
        error: 'VIN and seller information are required' 
      });
    }
    
    // Additional validation for required vehicle and seller fields
    const missingFields = [];
    if (!dealData.mileage) missingFields.push('mileage');
    if (!dealData.exteriorColor && !dealData.color) missingFields.push('exteriorColor');
    if (!dealData.interiorColor) missingFields.push('interiorColor');
    if (!dealData.seller.email && !(dealData.seller.contact && dealData.seller.contact.email)) missingFields.push('seller.email');
    if (!dealData.seller.phone && !(dealData.seller.contact && dealData.seller.contact.phone)) missingFields.push('seller.phone');
    // Remove company requirement as it's optional for private sellers
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEAL CREATION] 🔍 Field validation details:', {
        mileage: dealData.mileage,
        exteriorColor: dealData.exteriorColor,
        color: dealData.color,
        interiorColor: dealData.interiorColor,
        sellerEmail: dealData.seller.email,
        sellerContactEmail: dealData.seller.contact?.email,
        sellerPhone: dealData.seller.phone,
        sellerContactPhone: dealData.seller.contact?.phone
      });
      
      console.log('[DEAL CREATION] 🔍 Checking missing fields:', missingFields);
    }
    if (missingFields.length > 0) {
      console.log('[DEAL CREATION] ❌ Missing required fields:', missingFields);
      return res.status(400).json({ error: 'Missing required fields: ' + missingFields.join(', ') });
    }
    
    console.log('[DEAL CREATION] ✅ All validation passed');

    console.log('[DEAL CREATION] 🔄 Processing seller information...');
    // Flatten/merge seller contact info
    let seller = dealData.seller;
    console.log('[DEAL CREATION] 📋 Original seller:', seller);
    // Log address and license number from incoming seller
    console.log('[DEAL CREATION] 📋 Incoming seller address:', seller.address);
    console.log('[DEAL CREATION] 📋 Incoming seller license number:', seller.licenseNumber);
    // If contact exists, merge it into top-level seller
    if (seller.contact) {
      seller.email = seller.email || seller.contact.email;
      seller.phone = seller.phone || seller.contact.phone;
      seller.address = seller.address || seller.contact.address;
      console.log('[DEAL CREATION] 🔄 Merged contact info into seller');
      console.log('[DEAL CREATION] 🔄 Seller address after merge:', seller.address);
      console.log('[DEAL CREATION] 🔄 Seller license number after merge:', seller.licenseNumber);
    }
    // Check if seller should be treated as private (based on name, type, or deal type)
    const isPrivateSeller = (seller.name && seller.name.toLowerCase() === 'private seller') || 
                           (seller.type && seller.type.toLowerCase() === 'private') || 
                           (dealData.dealType && dealData.dealType.toLowerCase() === 'retail-pp') ||
                           (dealData.dealType && dealData.dealType.toLowerCase() === 'retail-d2d') ||
                           (dealData.dealType && dealData.dealType.toLowerCase() === 'wholesale-private');
    
    // Special handling for wholesale-d2d deals - always allow dealer creation
    const isWholesaleD2D = dealData.dealType && dealData.dealType.toLowerCase() === 'wholesale-d2d';
    
    // Always attempt to create or update the seller dealer if a name is provided and not a private seller
    // Allow dealer creation for wholesale-d2d deals, prevent for private sellers and retail deals
    if (seller.name && (!isPrivateSeller || isWholesaleD2D)) {
      if (isWholesaleD2D) {
        console.log('[DEAL CREATION] 🏢 Creating or updating dealer for wholesale-d2d deal:', seller.name);
      } else {
        console.log('[DEAL CREATION] 🏢 Creating or updating dealer:', seller.name);
      }
      seller = await findOrCreateDealer({
        name: seller.name,
        contactPerson: seller.contactPerson || seller.contact,
        phone: seller.phone,
        email: seller.email,
        company: seller.company,
        type: 'Dealer',
        address: seller.address,
        licenseNumber: seller.licenseNumber,
        tier: seller.tier
      });
      // Ensure seller.type is always 'dealer' if found/created as a dealer
      seller.type = 'dealer';
      console.log('[DEAL CREATION] ✅ Dealer processed:', seller);
      // Log autofilled address and license number after dealer lookup
      console.log('[DEAL CREATION] 🏷️ Autofilled seller address:', seller.address);
      console.log('[DEAL CREATION] 🏷️ Autofilled seller license number:', seller.licenseNumber);
    } else {
      if (isPrivateSeller) {
        console.log('[DEAL CREATION] 👤 Using private seller (name: ' + seller.name + ', type: ' + seller.type + ')');
      } else {
        console.log('[DEAL CREATION] 🚫 Skipping dealer creation for retail-pp or retail-d2d deal (wholesale-d2d deals will create dealers).');
      }
    }
    // Debug log for final seller.type
    console.log('[DEAL CREATION] Final seller.type:', seller.type);

    // Auto-create buyer if it's a new dealer
    let buyer = dealData.buyer;
    if (buyer && buyer.name && buyer.name !== 'Private Buyer') {
      if (isWholesaleD2D) {
        console.log('[DEAL CREATION] 🏢 Creating or updating buyer dealer for wholesale-d2d deal:', buyer.name);
      }
      buyer = await findOrCreateDealer({
        name: buyer.name,
        contactPerson: buyer.contactPerson || buyer.contact,
        phone: buyer.phone,
        email: buyer.email,
        company: buyer.company,
        type: 'Dealer',
        address: buyer.address,
        licenseNumber: buyer.licenseNumber,
        tier: buyer.tier
      });
      // Ensure buyer.type is always 'dealer' if found/created as a dealer
      buyer.type = 'dealer';
    }
    // Debug log for final buyer.type
    console.log('[DEAL CREATION] Final buyer.type:', buyer && buyer.type);
    console.log('[DEAL CREATION] Final buyer data:', buyer ? {
      name: buyer.name,
      type: buyer.type,
      email: buyer.email,
      phone: buyer.phone,
      licenseNumber: buyer.licenseNumber,
      dealerId: buyer.dealerId
    } : 'No buyer data');

    // Assign updated seller and buyer back to dealData before any further use
    dealData.seller = seller;
    dealData.buyer = buyer;
    // Debug log for both types before any document generation or deal creation
    console.log('[DEAL CREATION] [SUMMARY] seller.type:', seller.type, 'buyer.type:', buyer && buyer.type, 'dealType:', dealData.dealType);

    // --- Address Sanitization Utility ---
    function ensureAddressObject(address) {
      if (!address) return { street: '', city: '', state: '', zip: '' };
      if (typeof address === 'object') return address;
      // If it's a string, try to parse it (very basic split, you may want to improve this)
      const [street = '', city = '', stateZip = ''] = address.split(',');
      const [state = '', zip = ''] = stateZip.trim().split(' ');
      return {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim()
      };
    }

    // --- Sanitize Seller Address ---
    if (seller) {
      if (seller.contact) {
        seller.contact.address = ensureAddressObject(seller.contact.address);
        console.log('[DEAL CREATION] 🧹 Sanitized seller.contact.address:', seller.contact.address);
      }
      seller.address = ensureAddressObject(seller.address);
      console.log('[DEAL CREATION] 🧹 Sanitized seller.address:', seller.address);
    }

    // --- Sanitize Buyer Address ---
    if (buyer) {
      if (buyer.contact) {
        buyer.contact.address = ensureAddressObject(buyer.contact.address);
        console.log('[DEAL CREATION] 🧹 Sanitized buyer.contact.address:', buyer.contact.address);
      }
      buyer.address = ensureAddressObject(buyer.address);
      console.log('[DEAL CREATION] 🧹 Sanitized buyer.address:', buyer.address);
    }

    // Log vehicle record details before deal creation
    console.log('[DEAL CREATION] 🚗 Vehicle record input to Deal:', {
      vin: dealData.vin,
      year: dealData.year,
      make: dealData.make,
      model: dealData.model,
      mileage: dealData.mileage,
      exteriorColor: dealData.exteriorColor,
      interiorColor: dealData.interiorColor,
      rpStockNumber: dealData.rpStockNumber,
      vehicle: dealData.vehicle,
      color: dealData.color
    });

    // Add robust financial field mapping
    const financial = {
      paymentStatus: dealData.paymentStatus || 'pending',
      payoffBalance: dealData.payoffBalance !== undefined ? Number(dealData.payoffBalance) : 0,
      amountDueToCustomer: dealData.amountDueToCustomer !== undefined ? Number(dealData.amountDueToCustomer) : 0,
      amountDueToRP: dealData.amountDueToRP !== undefined ? Number(dealData.amountDueToRP) : 0,
      brokerFee: dealData.brokerFee !== undefined ? Number(dealData.brokerFee) : 0,
      brokerFeePaidTo: dealData.brokerFeePaidTo || '',
      commissionRate: dealData.commissionRate !== undefined ? Number(dealData.commissionRate) : 0
    };
    console.log('[DEAL CREATION] [DEBUG] Financial fields to save:', financial);
    console.log('[DEAL CREATION] [DEBUG] Raw brokerFee from frontend:', dealData.brokerFee);
    console.log('[DEAL CREATION] [DEBUG] Raw brokerFeePaidTo from frontend:', dealData.brokerFeePaidTo);

    // Map generalNotes to notes for document generation
    if (req.body.generalNotes) {
      dealData.notes = req.body.generalNotes;
      dealData.generalNotes = req.body.generalNotes;
    }

    console.log('[DEBUG] About to create Deal with:', dealData);
    
    // Generate purchase ID (rpStockNumber) if not provided
    let purchaseId = dealData.rpStockNumber;
    if (!purchaseId) {
      purchaseId = await generateStockNumber(dealData.dealType, dealData.dealType2SubType);
    }
    
    // Preserve the manually entered stock number separately
    const manualStockNumber = dealData.stockNumber || '';
    
    // Create the deal using the Deal Mongoose model
    console.log('[DEAL CREATION] 🚗 Creating new deal object...');
    const newDeal = new Deal({
      vehicle: `${dealData.year} ${dealData.make} ${dealData.model}`,
      vin: dealData.vin,
      year: dealData.year,
      make: dealData.make,
      model: dealData.model,
      rpStockNumber: purchaseId,
      stockNumber: manualStockNumber,
      salesperson: dealData.salesperson,
      purchasePrice: dealData.purchasePrice || 0,
      purchaseDate: dealData.purchaseDate || new Date(),
      listPrice: dealData.listPrice || 0,
              instantOffer: dealData.instantOffer || 0,
      mileage: dealData.mileage,
      color: dealData.color || dealData.exteriorColor,
      exteriorColor: dealData.exteriorColor || dealData.color,
      interiorColor: dealData.interiorColor,
      financial,
      seller: {
        name: seller.name,
        type: isPrivateSeller ? 'private' : 'dealer',
        email: seller.email || '',
        phone: seller.phone || '',
        company: seller.company || '',
        contact: {
          address: seller.contact?.address || seller.address || '',
          phone: seller.phone || '',
          email: seller.email || ''
        }
      },
      buyer: buyer ? {
        name: buyer.name || '',
        type: buyer.type || 'dealer',
        email: buyer.email || '',
        phone: buyer.phone || '',
        company: buyer.company || '',
        contact: {
          address: buyer.contact?.address || buyer.address || '',
          phone: buyer.phone || '',
          email: buyer.email || ''
        },
        licenseNumber: buyer.licenseNumber || '',
        tier: buyer.tier || 'Tier 1',
        dealerId: buyer.dealerId || null
      } : null,
      dealType: dealData.dealType || 'wholesale',
      fundingSource: dealData.fundingSource,
      paymentMethod: dealData.paymentMethod,
      currentStage: 'documentation',
      priority: 'medium',
      createdBy: dealData.createdBy || (req.user && req.user.id) || null,
      dealId: null, // This will be auto-generated by the pre-save middleware
      workflowHistory: [{
        stage: 'documentation',
        timestamp: new Date(),
        changedBy: (req.user && req.user.id) || null,
        notes: 'Deal created',
        previousStage: null
      }],
      generalNotes: dealData.generalNotes,
      notes: dealData.notes
    });
    
    console.log('[DEAL CREATION] 💾 Saving deal to database...');
    
    // Retry mechanism for potential duplicate rpStockNumber
    let savedDeal;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await newDeal.save();
        savedDeal = newDeal;
        break;
      } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.rpStockNumber) {
          // Duplicate rpStockNumber, generate a new one and retry
          retryCount++;
          console.log(`[DEAL CREATION] ⚠️ Duplicate rpStockNumber detected (attempt ${retryCount}/${maxRetries}), generating new one...`);
          newDeal.rpStockNumber = await generateStockNumber(dealData.dealType, dealData.dealType2SubType);
        } else {
          // Other error, re-throw
          throw error;
        }
      }
    }
    
    if (retryCount >= maxRetries) {
      throw new Error('Failed to generate unique purchase ID after multiple attempts');
    }
    // Log the saved deal to confirm fields
    const dealForLogging = await Deal.findById(savedDeal._id).lean(); // .lean() added for speed
    console.log('[DEAL CREATION] ✅ Deal saved (fields check):', {
      id: dealForLogging._id,
      color: dealForLogging.color,
      exteriorColor: dealForLogging.exteriorColor,
      interiorColor: dealForLogging.interiorColor,
      mileage: dealForLogging.mileage
    });
    console.log('[DEAL CREATION] ✅ Deal saved successfully:', savedDeal._id);
    await savedDeal.populate();

    // Create a vehicle record for every deal
    console.log(`[DEAL CREATION] 🚗 Starting vehicle record creation for deal: ${savedDeal._id}`);
    console.log(`[DEAL CREATION] 📋 Deal details:`, {
      vin: savedDeal.vin,
      year: savedDeal.year,
      make: savedDeal.make,
      model: savedDeal.model,
      stockNumber: savedDeal.rpStockNumber,
      dealType: savedDeal.dealType,
      dealType2: dealData.dealType2SubType || '',
      purchasePrice: savedDeal.purchasePrice,
      salesperson: savedDeal.salesperson
    });
    
    const VehicleRecord = require('../models/VehicleRecord');
    
    // Map dealType2SubType to valid enum values
    const mapDealType2 = (dealType2SubType) => {
      const mapping = {
        'buy': 'Buy',
        'sale': 'Sale',
        'buy-sell': 'Buy/Sell',
        'consign-a': 'Consign-A',
        'consign-b': 'Consign-B',
        'consign-c': 'Consign-C',
        'consign-rdnc': 'Consign-RDNC'
      };
      return mapping[dealType2SubType] || 'Buy'; // Default to 'Buy' if not found
    };
    
    console.log('[DEAL CREATION] 📝 Creating vehicle record object...');
    const mappedDealType2 = mapDealType2(dealData.dealType2SubType);
    console.log('[DEAL CREATION] 🔄 Mapped dealType2SubType:', dealData.dealType2SubType, '->', mappedDealType2);
    
    const vehicleRecord = new VehicleRecord({
      vin: savedDeal.vin,
      year: savedDeal.year,
      make: savedDeal.make,
      model: savedDeal.model,
      stockNumber: savedDeal.rpStockNumber,
      color: savedDeal.color,
      exteriorColor: savedDeal.exteriorColor,
      interiorColor: savedDeal.interiorColor,
      mileage: savedDeal.mileage,
      dealId: savedDeal._id,
      dealType: savedDeal.dealType,
      dealType2: mappedDealType2,
      purchasePrice: savedDeal.purchasePrice,
      listPrice: savedDeal.listPrice,
      commission: {
        rate: dealData.commissionRate || 0,
        amount: dealData.commissionRate ? (savedDeal.purchasePrice * dealData.commissionRate / 100) : 0
      },
      generatedDocuments: [],
      createdBy: (req.user && req.user.id) || null,
      salesperson: savedDeal.salesperson
    });
    
    console.log(`[DEAL CREATION] 📝 Vehicle record object created:`, {
      recordId: vehicleRecord.recordId,
      vin: vehicleRecord.vin,
      color: vehicleRecord.color,
      exteriorColor: vehicleRecord.exteriorColor,
      interiorColor: vehicleRecord.interiorColor,
      mileage: vehicleRecord.mileage,
      dealId: vehicleRecord.dealId,
      dealType: vehicleRecord.dealType,
      dealType2: vehicleRecord.dealType2
    });
    
    try {
      await vehicleRecord.save();
      console.log(`[DEAL CREATION] ✅ Vehicle record saved successfully: ${vehicleRecord._id}`);
      console.log(`[DEAL CREATION] 📊 Vehicle record details:`, {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        color: vehicleRecord.color,
        exteriorColor: vehicleRecord.exteriorColor,
        interiorColor: vehicleRecord.interiorColor,
        mileage: vehicleRecord.mileage,
        stockNumber: vehicleRecord.stockNumber,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        generatedDocuments: vehicleRecord.generatedDocuments.length,
        createdAt: vehicleRecord.createdAt
      });
    } catch (saveError) {
      console.error(`[DEAL CREATION] ❌ Error saving vehicle record:`, saveError);
      throw saveError;
    }
    
    // Link the vehicle record to the deal
    console.log(`[DEAL CREATION] 🔗 Linking vehicle record ${vehicleRecord._id} to deal ${savedDeal._id}`);
    savedDeal.vehicleRecordId = vehicleRecord._id;
    await savedDeal.save();
    console.log(`[DEAL CREATION] ✅ Deal updated with vehicleRecordId: ${vehicleRecord._id}`);

    // Note: Removed auto-population of document placeholders to prevent unwanted empty documents

    // === Helper: Normalize for robust dealer matching ===
    function normalizeName(name) {
      return (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }
    function normalizeEmail(email) {
      return (email || '').toLowerCase().trim();
    }
    function normalizePhone(phone) {
      return (phone || '').replace(/\D/g, '');
    }
    // === Ensure BOTH seller.type and buyer.type are correct before PDF generation (ALWAYS RUN THIS IMMEDIATELY BEFORE CONTRACT GENERATION) ===
    const Dealer = require('../models/Dealer');
    // === EXTREME DEBUGGING for seller/buyer type detection and contract generation ===
    try {
      console.log('==================== DEBUG START ====================');
      console.log('[DEBUG] Raw seller object:', JSON.stringify(seller, null, 2));
      console.log('[DEBUG] Raw buyer object:', JSON.stringify(buyer, null, 2));
      // If frontend explicitly sets sellerType, use it
      if (req.body.sellerType) {
        seller.type = req.body.sellerType;
        if (dealData.seller) dealData.seller.type = req.body.sellerType;
        if (dealData.sellerInfo) dealData.sellerInfo.type = req.body.sellerType;
        console.log('[DEBUG] seller.type forcibly set from req.body.sellerType:', req.body.sellerType);
      }
      // If frontend explicitly sets buyerType, use it
      if (req.body.buyerType) {
        buyer.type = req.body.buyerType;
        if (dealData.buyer) dealData.buyer.type = req.body.buyerType;
        if (dealData.buyerInfo) dealData.buyerInfo.type = req.body.buyerType;
        console.log('[DEBUG] buyer.type forcibly set from req.body.buyerType:', req.body.buyerType);
      }
      // If dealData.seller.type is set, override seller.type
      if (dealData.seller && dealData.seller.type) {
        seller.type = dealData.seller.type;
        console.log('[DEBUG] seller.type overridden by frontend to:', seller.type);
      }
      if (dealData.buyer && dealData.buyer.type) {
        buyer.type = dealData.buyer.type;
        console.log('[DEBUG] buyer.type overridden by frontend to:', buyer.type);
      }
      // Normalization
      const normSellerName = normalizeName(seller.name);
      const normSellerEmail = normalizeEmail(seller.email);
      const normSellerPhone = normalizePhone(seller.phone);
      const normBuyerName = normalizeName(buyer.name);
      const normBuyerEmail = normalizeEmail(buyer.email);
      const normBuyerPhone = normalizePhone(buyer.phone);
      console.log('[DEBUG] Normalized seller:', { normSellerName, normSellerEmail, normSellerPhone });
      console.log('[DEBUG] Normalized buyer:', { normBuyerName, normBuyerEmail, normBuyerPhone });
      // Queries
      const sellerQuery = {
        $or: [
          { normalizedName: normSellerName },
          { 'contact.normalizedEmail': normSellerEmail },
          { 'contact.normalizedPhone': normSellerPhone }
        ]
      };
      const buyerQuery = {
        $or: [
          { normalizedName: normBuyerName },
          { 'contact.normalizedEmail': normBuyerEmail },
          { 'contact.normalizedPhone': normBuyerPhone }
        ]
      };
      console.log('[DEBUG] Seller DB query:', JSON.stringify(sellerQuery));
      console.log('[DEBUG] Buyer DB query:', JSON.stringify(buyerQuery));
      // DB Results (only if type not set by frontend) - PARALLEL QUERIES
      const dealerQueries = [];
      
      if (!dealData.seller.type) {
        dealerQueries.push(Dealer.findOne(sellerQuery).lean());
      }
      if (!dealData.buyer.type && buyer) {
        dealerQueries.push(Dealer.findOne(buyerQuery).lean());
      }
      
      if (dealerQueries.length > 0) {
        const dealerResults = await Promise.all(dealerQueries);
        let resultIndex = 0;
        
        if (!dealData.seller.type) {
          const sellerDealerRecord = dealerResults[resultIndex++];
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] Seller DB result:', sellerDealerRecord ? JSON.stringify(sellerDealerRecord, null, 2) : 'null');
          }
          if (sellerDealerRecord && (sellerDealerRecord.type === 'dealer' || sellerDealerRecord.type === 'Dealer')) {
            seller.type = 'dealer';
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG] Seller is a dealer (DB match)');
            }
          } else {
            seller.type = 'private';
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG] Seller is private (no DB match)');
            }
          }
        }
        
        if (!dealData.buyer.type && buyer) {
          const buyerDealerRecord = dealerResults[resultIndex++];
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] Buyer DB result:', buyerDealerRecord ? JSON.stringify(buyerDealerRecord, null, 2) : 'null');
          }
          if (buyerDealerRecord && (buyerDealerRecord.type === 'dealer' || buyerDealerRecord.type === 'Dealer')) {
            buyer.type = 'dealer';
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG] Buyer is a dealer (DB match)');
            }
          } else {
            buyer.type = 'private';
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DEBUG] Buyer is private (no DB match)');
            }
          }
        }
      }
      // Assign back
      dealData.seller = seller;
      dealData.buyer = buyer;
      console.log('[DEBUG] Final seller object:', JSON.stringify(seller, null, 2));
      console.log('[DEBUG] Final buyer object:', JSON.stringify(buyer, null, 2));
      // Contract logic
      const sellerType = (seller && seller.type) ? String(seller.type).toLowerCase() : '';
      const buyerType = (buyer && buyer.type) ? String(buyer.type).toLowerCase() : '';
      const dealTypeStr = (newDeal.dealType || '').toLowerCase();
      console.log('[DEBUG][CONTRACT SELECTION] sellerType:', sellerType, 'buyerType:', buyerType, 'dealType:', dealTypeStr, 'req.body.sellerType:', req.body.sellerType, 'req.body.buyerType:', req.body.buyerType);
      let contractType = 'none';
      if (dealTypeStr.includes('flip') && sellerType === 'dealer' && buyerType === 'dealer') {
        contractType = 'wholesale_purchase_agreement (flip)';
      } else if (sellerType === 'dealer') {
        contractType = 'wholesale_purchase_agreement';
      } else if (sellerType === 'private') {
        contractType = 'private_party_purchase_agreement';
      }
      console.log('[DEBUG][CONTRACT SELECTION] Contract type chosen:', contractType);
      console.log('==================== DEBUG END ====================');
    } catch (err) {
      console.error('[DEBUG] Exception in extreme debugging:', err);
      console.error(err.stack);
    }
    // === PDF Generation for Wholesale Flip Vehicle Record and Contract ===
    const sellerType = (seller && seller.type) ? String(seller.type).toLowerCase() : '';
    const buyerType = (buyer && buyer.type) ? String(buyer.type).toLowerCase() : '';
    const dealTypeStr = (newDeal.dealType || '').toLowerCase();
    console.log('[PDF GEN] seller.type:', sellerType, 'buyer.type:', buyerType, 'dealType:', dealTypeStr);
    console.log('[PDF GEN] dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN] Full deal data for document generation:', {
      dealType: newDeal.dealType,
      dealType2SubType: dealData.dealType2SubType,
      dealType2: mappedDealType2, // Use the mapped value
      sellerType: sellerType,
      buyerType: buyerType,
      seller: seller,
      buyer: buyer
    });
    let pdfInfo = null;
    let purchaseContractPdfInfo = null;
    // For wholesale flip deals where both parties are dealers, generate vehicle record, purchase agreement, and bill of sale - PARALLEL GENERATION
    if (dealTypeStr.includes('flip') && sellerType === 'dealer' && buyerType === 'dealer') {
      console.log('[PDF GEN] 🎯 Starting PARALLEL document generation for wholesale-flip dealer-to-dealer deal');
      console.log('[PDF GEN] 📋 Deal details:', {
        dealType: dealTypeStr,
        sellerType,
        buyerType,
        stockNumber: newDeal.rpStockNumber,
        vin: dealData.vin
      });
      
      // Prepare document generation data
      const documentData = {
        ...dealData,
        seller,
        buyer,
        financial,
        stockNumber: newDeal.rpStockNumber,
        dealType: newDeal.dealType,
        dealType2SubType: dealData.dealType2SubType,
        dealType2: mappedDealType2,
        salesperson: newDeal.salesperson,
        notes: newDeal.notes,
        generalNotes: newDeal.generalNotes,
      };
      
      // Generate all documents in parallel
      const pdfPromises = [
        documentGenerator.generateWholesaleFlipVehicleRecord(documentData, req.user)
          .then(result => ({ type: 'vehicleRecord', result }))
          .catch(error => ({ type: 'vehicleRecord', error })),
        documentGenerator.generateWholesalePurchaseOrder(documentData, req.user)
          .then(result => ({ type: 'purchaseAgreement', result }))
          .catch(error => ({ type: 'purchaseAgreement', error })),
        documentGenerator.generateWholesaleBOS(documentData, req.user)
          .then(result => ({ type: 'billOfSale', result }))
          .catch(error => ({ type: 'billOfSale', error }))
      ];
      
      try {
        const pdfResults = await Promise.all(pdfPromises);
        
        // Process results
        pdfResults.forEach(({ type, result, error }) => {
          if (error) {
            console.error(`[PDF GEN] ❌ Error generating ${type} PDF:`, error);
            console.error(`[PDF GEN] ❌ Error stack:`, error.stack);
          } else {
            console.log(`[PDF GEN] ✅ ${type} PDF generated:`, {
              fileName: result?.fileName,
              filePath: result?.filePath,
              fileSize: result?.fileSize,
              documentNumber: result?.documentNumber
            });
            
            // Assign results to appropriate variables
            if (type === 'vehicleRecord') pdfInfo = result;
            if (type === 'purchaseAgreement') purchaseContractPdfInfo = result;
            if (type === 'billOfSale') dealData.billOfSalePdfInfo = result;
          }
        });
      } catch (parallelError) {
        console.error('[PDF GEN] ❌ Error in parallel PDF generation:', parallelError);
      }
    } else if (dealTypeStr === 'wholesale-d2d' && dealData.dealType2SubType === 'sale') {
      // For wholesale D2D sale deals, generate vehicle record and wholesale BOS (sales order)
      console.log('[PDF GEN] 🎯 Starting document generation for wholesale-d2d sale deal');
      console.log('[PDF GEN] 📋 Deal details:', {
        dealType: dealTypeStr,
        dealType2SubType: dealData.dealType2SubType,
        sellerType,
        buyerType,
        stockNumber: newDeal.rpStockNumber,
        vin: dealData.vin
      });
      
      // Prepare document generation data
      const documentData = {
        ...dealData,
        seller,
        buyer,
        financial,
        stockNumber: newDeal.rpStockNumber,
        dealType: newDeal.dealType,
        dealType2SubType: dealData.dealType2SubType,
        dealType2: mappedDealType2,
        salesperson: newDeal.salesperson,
        notes: newDeal.notes,
        generalNotes: newDeal.generalNotes,
      };
      
      // Generate documents in parallel for wholesale D2D sale
      const pdfPromises = [
        documentGenerator.generateWholesaleFlipVehicleRecord(documentData, req.user)
          .then(result => ({ type: 'vehicleRecord', result }))
          .catch(error => ({ type: 'vehicleRecord', error })),
        documentGenerator.generateWholesaleBOS(documentData, req.user)
          .then(result => ({ type: 'billOfSale', result }))
          .catch(error => ({ type: 'billOfSale', error }))
      ];
      
      try {
        const pdfResults = await Promise.all(pdfPromises);
        
        // Process results
        pdfResults.forEach(({ type, result, error }) => {
          if (error) {
            console.error(`[PDF GEN] ❌ Error generating ${type} PDF:`, error);
            console.error(`[PDF GEN] ❌ Error stack:`, error.stack);
          } else {
            console.log(`[PDF GEN] ✅ ${type} PDF generated:`, {
              fileName: result?.fileName,
              filePath: result?.filePath,
              fileSize: result?.fileSize,
              documentNumber: result?.documentNumber
            });
            
            // Assign results to appropriate variables
            if (type === 'vehicleRecord') pdfInfo = result;
            if (type === 'billOfSale') purchaseContractPdfInfo = result;
          }
        });
      } catch (parallelError) {
        console.error('[PDF GEN] ❌ Error in parallel PDF generation for wholesale D2D sale:', parallelError);
      }
    } else if (dealTypeStr === 'wholesale-d2d' && dealData.dealType2SubType === 'buy') {
      // For wholesale D2D buy deals, generate vehicle record and wholesale purchase order
      console.log('[PDF GEN] 🎯 Starting document generation for wholesale-d2d buy deal');
      console.log('[PDF GEN] 📋 Deal details:', {
        dealType: dealTypeStr,
        dealType2SubType: dealData.dealType2SubType,
        sellerType,
        buyerType,
        stockNumber: newDeal.rpStockNumber,
        vin: dealData.vin
      });
      
      // Prepare document generation data
      const documentData = {
        ...dealData,
        seller,
        buyer,
        financial,
        stockNumber: newDeal.rpStockNumber,
        dealType: newDeal.dealType,
        dealType2SubType: dealData.dealType2SubType,
        dealType2: mappedDealType2,
        salesperson: newDeal.salesperson,
        notes: newDeal.notes,
        generalNotes: newDeal.generalNotes,
      };
      
      // Generate documents in parallel for wholesale D2D buy
      const pdfPromises = [
        documentGenerator.generateWholesaleFlipVehicleRecord(documentData, req.user)
          .then(result => ({ type: 'vehicleRecord', result }))
          .catch(error => ({ type: 'vehicleRecord', error })),
        documentGenerator.generateWholesalePurchaseOrder(documentData, req.user)
          .then(result => ({ type: 'purchaseOrder', result }))
          .catch(error => ({ type: 'purchaseOrder', error }))
      ];
      
      try {
        const pdfResults = await Promise.all(pdfPromises);
        
        // Process results
        pdfResults.forEach(({ type, result, error }) => {
          if (error) {
            console.error(`[PDF GEN] ❌ Error generating ${type} PDF:`, error);
            console.error(`[PDF GEN] ❌ Error stack:`, error.stack);
          } else {
            console.log(`[PDF GEN] ✅ ${type} PDF generated:`, {
              fileName: result?.fileName,
              filePath: result?.filePath,
              fileSize: result?.fileSize,
              documentNumber: result?.documentNumber
            });
            
            // Assign results to appropriate variables
            if (type === 'vehicleRecord') pdfInfo = result;
            if (type === 'purchaseOrder') purchaseContractPdfInfo = result;
          }
        });
      } catch (parallelError) {
        console.error('[PDF GEN] ❌ Error in parallel PDF generation for wholesale D2D buy:', parallelError);
      }
    } else if (sellerType === 'dealer') {
      // Generate purchase contract as wholesale purchase agreement if seller is a dealer (and not both dealer flip)
      try {
        purchaseContractPdfInfo = await documentGenerator.generateWholesalePurchaseOrder({
          ...dealData,
          seller,
          buyer,
          financial,
          stockNumber: newDeal.rpStockNumber,
          dealType: newDeal.dealType,
          dealType2SubType: dealData.dealType2SubType,
          dealType2: mappedDealType2, // Use the mapped value
          salesperson: newDeal.salesperson,
          notes: newDeal.notes,
          generalNotes: newDeal.generalNotes,
        }, req.user);
        console.log('[PDF GEN] Wholesale Purchase Agreement PDF generated:', purchaseContractPdfInfo);
      } catch (pdfErr) {
        console.error('[PDF GEN] Error generating Wholesale Purchase Agreement PDF:', pdfErr);
      }
    } else if (sellerType === 'private') {
      // For retail PP deals, generate both vehicle record and purchase agreement
      if (dealTypeStr === 'retail-pp') {
        console.log('[PDF GEN] 🎯 Starting document generation for retail-pp deal');
        console.log('[PDF GEN] 📋 Deal details:', {
          dealType: dealTypeStr,
          sellerType,
          buyerType,
          stockNumber: newDeal.rpStockNumber,
          vin: dealData.vin
        });
        
        try {
          // Generate vehicle record first
          console.log('[PDF GEN] 🔄 Generating vehicle record...');
          pdfInfo = await documentGenerator.generateRetailPPVehicleRecord({
            ...dealData,
            seller,
            buyer,
            financial,
            stockNumber: newDeal.rpStockNumber,
            dealType: newDeal.dealType,
            dealType2SubType: dealData.dealType2SubType,
            dealType2: mappedDealType2, // Use the mapped value
            salesperson: newDeal.salesperson,
            notes: newDeal.notes,
            generalNotes: newDeal.generalNotes,
          }, req.user);
          console.log('[PDF GEN] ✅ Retail PP Vehicle Record PDF generated:', {
            fileName: pdfInfo?.fileName,
            filePath: pdfInfo?.filePath,
            fileSize: pdfInfo?.fileSize,
            documentNumber: pdfInfo?.documentNumber
          });
        } catch (pdfErr) {
          console.error('[PDF GEN] ❌ Error generating Retail PP Vehicle Record PDF:', pdfErr);
          console.error('[PDF GEN] ❌ Error stack:', pdfErr.stack);
        }
        
        try {
          // Generate purchase agreement (only one for retail-pp deals)
          console.log('[PDF GEN] 🔄 Generating Retail Private Party Purchase Contract...');
          purchaseContractPdfInfo = await documentGenerator.generateRetailPPBuy({
            ...dealData,
            seller,
            buyer,
            financial,
            stockNumber: newDeal.rpStockNumber,
            dealType: newDeal.dealType,
            dealType2SubType: dealData.dealType2SubType,
            dealType2: mappedDealType2, // Use the mapped value
            salesperson: newDeal.salesperson,
            notes: newDeal.notes,
            generalNotes: newDeal.generalNotes,
          }, req.user);
          console.log('[PDF GEN] ✅ Retail Private Party Purchase Contract PDF generated:', {
            fileName: purchaseContractPdfInfo?.fileName,
            filePath: purchaseContractPdfInfo?.filePath,
            fileSize: purchaseContractPdfInfo?.fileSize,
            documentNumber: purchaseContractPdfInfo?.documentNumber
          });
        } catch (pdfErr) {
          console.error('[PDF GEN] ❌ Error generating Retail Private Party Purchase Contract PDF:', pdfErr);
          console.error('[PDF GEN] ❌ Error stack:', pdfErr.stack);
        }
        
        // For retail-pp deals, we've already generated the specific documents
        // Don't set them to null as this would trigger the fallback generation
        console.log('[PDF GEN] ✅ Retail-pp documents generated successfully, skipping fallback');
      } else {
        // For other private seller deals, generate purchase agreement only
        try {
          purchaseContractPdfInfo = await documentGenerator.generateRetailPPBuy({
            ...dealData,
            seller,
            buyer,
            financial,
            stockNumber: newDeal.rpStockNumber,
            dealType: newDeal.dealType,
            dealType2SubType: dealData.dealType2SubType,
            dealType2: mappedDealType2, // Use the mapped value
            salesperson: newDeal.salesperson,
            notes: newDeal.notes,
            generalNotes: newDeal.generalNotes,
          }, req.user);
          console.log('[PDF GEN] Private Party Purchase Agreement PDF generated:', purchaseContractPdfInfo);
        } catch (pdfErr) {
          console.error('[PDF GEN] Error generating Private Party Purchase Agreement PDF:', pdfErr);
        }
      }
    } else {
      // Generate basic vehicle record for all other deal types
      try {
        pdfInfo = await documentGenerator.generateStandardVehicleRecord({
          ...dealData,
          seller,
          buyer,
          financial,
          stockNumber: newDeal.rpStockNumber,
          dealType: newDeal.dealType,
          dealType2SubType: dealData.dealType2SubType,
          dealType2: mappedDealType2, // Use the mapped value
          salesperson: newDeal.salesperson,
          notes: newDeal.notes,
          generalNotes: newDeal.generalNotes,
        }, req.user);
        console.log('[PDF GEN] Standard Vehicle Record PDF generated:', pdfInfo);
      } catch (pdfErr) {
        console.error('[PDF GEN] Error generating Standard Vehicle Record PDF:', pdfErr);
      }
    }

    // Ensure at least one document is generated for every deal
    if (!pdfInfo && !purchaseContractPdfInfo) {
      console.log('[PDF GEN] ⚠️ No documents generated, creating fallback document...');
      try {
        pdfInfo = await documentGenerator.generateStandardVehicleRecord({
          ...dealData,
          seller,
          buyer,
          financial,
          stockNumber: newDeal.rpStockNumber,
          dealType: newDeal.dealType,
          dealType2SubType: dealData.dealType2SubType,
          dealType2: mappedDealType2, // Use the mapped value
          salesperson: newDeal.salesperson,
          notes: newDeal.notes,
          generalNotes: newDeal.generalNotes,
        }, req.user);
        console.log('[PDF GEN] ✅ Fallback Standard Vehicle Record PDF generated:', {
          fileName: pdfInfo?.fileName,
          filePath: pdfInfo?.filePath,
          fileSize: pdfInfo?.fileSize
        });
      } catch (pdfErr) {
        console.error('[PDF GEN] ❌ Error generating fallback Standard Vehicle Record PDF:', pdfErr);
      }
    }
    
    // Summary of document generation
    console.log('[PDF GEN] 📊 Document generation summary:', {
      vehicleRecordGenerated: !!pdfInfo,
      purchaseAgreementGenerated: !!purchaseContractPdfInfo,
      billOfSaleGenerated: !!dealData.billOfSalePdfInfo,
      vehicleRecordFileName: pdfInfo?.fileName,
      purchaseAgreementFileName: purchaseContractPdfInfo?.fileName,
      billOfSaleFileName: dealData.billOfSalePdfInfo?.fileName,
      totalDocuments: (pdfInfo ? 1 : 0) + (purchaseContractPdfInfo ? 1 : 0) + (dealData.billOfSalePdfInfo ? 1 : 0)
    });

    // Save generated documents to vehicle record and deal
    try {
      console.log('[DOC SAVE] 💾 Saving generated documents...');
      console.log('[DOC SAVE] pdfInfo:', pdfInfo);
      console.log('[DOC SAVE] purchaseContractPdfInfo:', purchaseContractPdfInfo);
      
      // Save to vehicle record
      if (pdfInfo) {
        // Use the document type from the generated document, or fallback to 'vehicle_record'
        const documentType = pdfInfo.documentType || 'vehicle_record';
        vehicleRecord.generatedDocuments.push({
          documentType: documentType,
          fileName: pdfInfo.fileName,
          filePath: pdfInfo.filePath,
          fileSize: pdfInfo.fileSize,
          documentNumber: pdfInfo.documentNumber,
          generatedAt: new Date(),
          generatedBy: req.user.id,
          status: 'draft'
        });
        console.log(`[DOC SAVE] ✅ ${documentType} PDF saved to vehicle record`);
      } else {
        console.log('[DOC SAVE] ⚠️ No vehicle record PDF generated');
      }
      
      if (purchaseContractPdfInfo) {
        // Use the document type from the generated document, or fallback to 'purchase_agreement'
        const documentType = purchaseContractPdfInfo.documentType || 'purchase_agreement';
        vehicleRecord.generatedDocuments.push({
          documentType: documentType,
          fileName: purchaseContractPdfInfo.fileName,
          filePath: purchaseContractPdfInfo.filePath,
          fileSize: purchaseContractPdfInfo.fileSize,
          documentNumber: purchaseContractPdfInfo.documentNumber,
          generatedAt: new Date(),
          generatedBy: req.user.id,
          status: 'draft'
        });
        console.log(`[DOC SAVE] ✅ ${documentType} PDF saved to vehicle record`);
      } else {
        console.log('[DOC SAVE] ⚠️ No purchase agreement PDF generated');
      }
      
      // Save bill of sale for wholesale-flip deals
      if (dealData.billOfSalePdfInfo) {
        vehicleRecord.generatedDocuments.push({
          documentType: 'bill_of_sale',
          fileName: dealData.billOfSalePdfInfo.fileName,
          filePath: dealData.billOfSalePdfInfo.filePath,
          fileSize: dealData.billOfSalePdfInfo.fileSize,
          documentNumber: dealData.billOfSalePdfInfo.documentNumber,
          generatedAt: new Date(),
          generatedBy: req.user.id,
          status: 'draft'
        });
        console.log('[DOC SAVE] ✅ Bill of sale PDF saved to vehicle record');
      }
      
      // Save vehicle record with documents
      if (vehicleRecord.generatedDocuments.length > 0) {
        await vehicleRecord.save();
        console.log('[DOC SAVE] ✅ Vehicle record updated with generated documents');
        console.log('[DOC SAVE] 📊 Vehicle record now has', vehicleRecord.generatedDocuments.length, 'documents');
      }
      
      // Update deal documents array
      if (pdfInfo) {
        newDeal.documents.push({
          type: 'vehicle_record',
          documentId: `vehicle_record_${Date.now()}`,
          fileName: pdfInfo.fileName,
          filePath: pdfInfo.filePath,
          uploaded: true,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
          approved: false,
          required: false,
          version: 1
        });
      }
      
      if (purchaseContractPdfInfo) {
        newDeal.documents.push({
          type: 'purchase_agreement',
          documentId: `purchase_agreement_${Date.now()}`,
          fileName: purchaseContractPdfInfo.fileName,
          filePath: purchaseContractPdfInfo.filePath,
          uploaded: true,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
          approved: false,
          required: true,
          version: 1
        });
      }
      
      // Add bill of sale to deal documents for wholesale-flip deals
      if (dealData.billOfSalePdfInfo) {
        newDeal.documents.push({
          type: 'bill_of_sale',
          documentId: `bill_of_sale_${Date.now()}`,
          fileName: dealData.billOfSalePdfInfo.fileName,
          filePath: dealData.billOfSalePdfInfo.filePath,
          uploaded: true,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
          approved: false,
          required: true,
          version: 1
        });
      }
      
      // Save deal with documents
      if (newDeal.documents.length > 0) {
        await newDeal.save();
        console.log('[DOC SAVE] ✅ Deal updated with generated documents');
        console.log('[DOC SAVE] 📊 Deal now has', newDeal.documents.length, 'documents');
      }
      
    } catch (docSaveError) {
      console.error('[DOC SAVE] ❌ Error saving generated documents:', docSaveError);
      // Don't fail the deal creation if document saving fails
    }

    // Update broker commission if brokerage fee is present
    try {
      if (newDeal.brokerFee && newDeal.brokerFee > 0 && newDeal.brokerFeePaidTo) {
        console.log('[BROKER COMMISSION] 💰 Updating broker commission for deal:', newDeal._id);
        console.log('[BROKER COMMISSION] Broker fee:', newDeal.brokerFee, 'Paid to:', newDeal.brokerFeePaidTo);
        
        // Find broker by name
        const Broker = require('../models/Broker');
        const broker = await Broker.findOne({ 
          name: { $regex: new RegExp(newDeal.brokerFeePaidTo, 'i') }
        });
        
        if (broker) {
          console.log('[BROKER COMMISSION] ✅ Found broker:', broker.name);
          
          // Get current month in YYYY-MM format
          const currentMonth = new Date().toISOString().slice(0, 7);
          
          // Find existing monthly commission record
          let monthlyCommission = broker.monthlyCommissions.find(
            mc => mc.month === currentMonth
          );

          if (monthlyCommission) {
            // Update existing record
            monthlyCommission.amount += newDeal.brokerFee;
            monthlyCommission.dealCount += 1;
            monthlyCommission.lastUpdated = new Date();
          } else {
            // Create new monthly record
            broker.monthlyCommissions.push({
              month: currentMonth,
              amount: newDeal.brokerFee,
              dealCount: 1,
              lastUpdated: new Date()
            });
          }

          // Update total stats
          broker.totalDeals += 1;
          broker.totalVolume += newDeal.brokerFee;
          broker.lastContact = new Date();

          await broker.save();
          console.log('[BROKER COMMISSION] ✅ Broker commission updated successfully');
        } else {
          console.log('[BROKER COMMISSION] ⚠️ Broker not found:', newDeal.brokerFeePaidTo);
        }
      }
    } catch (brokerError) {
      console.error('[BROKER COMMISSION] ❌ Error updating broker commission:', brokerError);
      // Don't fail the deal creation if broker commission update fails
    }

    // Return response immediately for faster user experience
    res.status(201).json({
      success: true,
      message: 'Deal and vehicle record created successfully',
      deal: newDeal.toObject({ virtuals: true }),
      vehicleRecord: vehicleRecord.toObject({ virtuals: true }),
      pdfInfo: pdfInfo || undefined,
      purchaseContractPdfInfo: purchaseContractPdfInfo || undefined,
      processing: 'Documents and emails are being processed in the background'
    });

    // Process non-critical operations asynchronously
    setImmediate(async () => {
      try {
        // Send deal receipt email to the user who created the deal
        console.log('[EMAIL] 📧 Sending deal receipt email to:', req.user.email);
        
        // Collect generated documents
        const generatedDocuments = [];
        if (pdfInfo) {
          generatedDocuments.push({ 
            name: 'Vehicle Record',
            filePath: pdfInfo.filePath,
            fileName: pdfInfo.fileName
          });
        }
        if (purchaseContractPdfInfo) {
          generatedDocuments.push({ 
            name: 'Purchase Agreement',
            filePath: purchaseContractPdfInfo.filePath,
            fileName: purchaseContractPdfInfo.fileName
          });
        }
        
        // Send email receipt
        const emailResult = await emailService.sendDealReceipt(
          req.user.email,
          {
            vin: newDeal.vin,
            rpStockNumber: newDeal.rpStockNumber,
            year: newDeal.year,
            make: newDeal.make,
            model: newDeal.model,
            dealType: newDeal.dealType,
            salesperson: newDeal.salesperson,
            seller: newDeal.seller,
            buyer: newDeal.buyer
          },
          generatedDocuments
        );
        
        if (emailResult.success) {
          console.log('[EMAIL] ✅ Deal receipt email sent successfully');
        } else {
          console.log('[EMAIL] ⚠️ Failed to send deal receipt email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('[EMAIL] ❌ Error sending deal receipt email:', emailError);
        // Don't fail the deal creation if email fails
      }
    });
  } catch (error) {
    console.error('[DEAL CREATION] ❌ Error creating deal:', error);
    
    // Log specific validation errors
    if (error.name === 'ValidationError') {
      console.error('[DEAL CREATION] 📋 Validation errors:', error.errors);
      const validationErrors = Object.keys(error.errors).map(key => 
        `${key}: ${error.errors[key].message}`
      );
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Log specific database errors
    if (error.code === 11000) {
      console.error('[DEAL CREATION] 🔄 Duplicate key error:', error.keyValue);
      return res.status(400).json({ 
        error: 'Duplicate entry found', 
        details: error.keyValue 
      });
    }
    
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.get('/deals', authenticateToken, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    // Apply filters
    if (status) {
      query.currentStage = status;
    }

    if (search) {
      query.$or = [
        { vin: new RegExp(search, 'i') },
        { make: new RegExp(search, 'i') },
        { model: new RegExp(search, 'i') },
        { rpStockNumber: new RegExp(search, 'i') },
        { 'seller.name': new RegExp(search, 'i') },
        { 'buyer.name': new RegExp(search, 'i') }
      ];
    }

    const deals = await Deal.find(query).sort({ createdAt: -1 }).lean(); // .lean() added for speed

    res.json({ 
      success: true,
      deals: deals,
      count: deals.length
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Failed to retrieve deals' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id).lean(); // .lean() added for speed
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({
      success: true,
      data: deal
    });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: 'Failed to retrieve deal' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = req.body;
    
    console.log('[DEBUG] Incoming updateData:', updateData);
    if (updateData.currentStage && statusCompatMap[updateData.currentStage]) {
      updateData.currentStage = statusCompatMap[updateData.currentStage];
    }

    // Auto-create new dealers if deal is updated with new dealer info
    let seller = updateData.seller;
    if (seller && seller.name && seller.name !== 'Private Seller') {
      seller = await findOrCreateDealer({
        name: seller.name,
        contactPerson: seller.contactPerson || seller.contact,
        phone: seller.phone,
        email: seller.email,
        company: seller.company,
        licenseNumber: seller.licenseNumber,
        type: 'Dealer',
        address: seller.address,
        tier: seller.tier
      });
      console.log('[DEAL UPDATE] Seller info after findOrCreateDealer:', JSON.stringify(seller, null, 2));
    }

    let buyer = updateData.buyer;
    if (buyer && buyer.name && buyer.name !== 'Private Buyer') {
      buyer = await findOrCreateDealer({
        name: buyer.name,
        contactPerson: buyer.contactPerson || buyer.contact,
        phone: buyer.phone,
        email: buyer.email,
        company: buyer.company,
        licenseNumber: buyer.licenseNumber,
        type: 'Dealer',
        address: buyer.address,
        tier: buyer.tier
      });
      if (buyer) {
        console.log('[DEAL UPDATE] Buyer info after findOrCreateDealer:', JSON.stringify(buyer, null, 2));
      }
    }

    // Update the deal
    const updatedDeal = await Deal.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        seller: seller || updateData.seller,
        buyer: buyer || updateData.buyer
      },
      { new: true, runValidators: true }
    ).lean(); // .lean() added for speed

    if (!updatedDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: updatedDeal
    });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user has permission to delete deals (finance role or admin)
    if (req.user.role !== 'finance' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions to delete deals' });
    }

    // Get the deal before deleting it so we can access its documents
    const dealToDelete = await Deal.findById(req.params.id);
    
    if (!dealToDelete) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const cloudStorage = require('../services/cloudStorage');
    const deletedFiles = [];

    // Delete all deal documents from cloud storage
    if (dealToDelete.documents && Array.isArray(dealToDelete.documents)) {
      for (const doc of dealToDelete.documents) {
        if (doc.fileName) {
          try {
            console.log(`[DEAL DELETE] Deleting document: ${doc.fileName}`);
            const deleteResult = await cloudStorage.deleteFile(doc.fileName);
            if (deleteResult.success) {
              deletedFiles.push(doc.fileName);
              console.log(`[DEAL DELETE] ✅ Successfully deleted document: ${doc.fileName}`);
            } else {
              console.warn(`[DEAL DELETE] ⚠️ Failed to delete document: ${doc.fileName}`, deleteResult.error);
            }
          } catch (error) {
            console.error(`[DEAL DELETE] ❌ Error deleting document ${doc.fileName}:`, error);
          }
        }
      }
    }

    // Delete all seller uploaded documents from cloud storage
    if (dealToDelete.sellerUploadedDocuments && Array.isArray(dealToDelete.sellerUploadedDocuments)) {
      for (const doc of dealToDelete.sellerUploadedDocuments) {
        if (doc.fileName) {
          try {
            console.log(`[DEAL DELETE] Deleting seller document: ${doc.fileName}`);
            const deleteResult = await cloudStorage.deleteFile(doc.fileName);
            if (deleteResult.success) {
              deletedFiles.push(doc.fileName);
              console.log(`[DEAL DELETE] ✅ Successfully deleted seller document: ${doc.fileName}`);
            } else {
              console.warn(`[DEAL DELETE] ⚠️ Failed to delete seller document: ${doc.fileName}`, deleteResult.error);
            }
          } catch (error) {
            console.error(`[DEAL DELETE] ❌ Error deleting seller document ${doc.fileName}:`, error);
          }
        }
      }
    }

    // Delete the deal
    const deletedDeal = await Deal.findByIdAndDelete(req.params.id).lean();
    
    // Also delete associated vehicle record if it exists
    if (deletedDeal.vehicleRecordId) {
      const VehicleRecord = require('../models/VehicleRecord');
      try {
        const vehicleRecord = await VehicleRecord.findById(deletedDeal.vehicleRecordId);
        if (vehicleRecord) {
          // Delete vehicle record documents from cloud storage
          if (vehicleRecord.generatedDocuments && Array.isArray(vehicleRecord.generatedDocuments)) {
            for (const doc of vehicleRecord.generatedDocuments) {
              if (doc.fileName) {
                try {
                  console.log(`[DEAL DELETE] Deleting vehicle record document: ${doc.fileName}`);
                  const deleteResult = await cloudStorage.deleteFile(doc.fileName);
                  if (deleteResult.success) {
                    deletedFiles.push(doc.fileName);
                    console.log(`[DEAL DELETE] ✅ Successfully deleted vehicle record document: ${doc.fileName}`);
                  } else {
                    console.warn(`[DEAL DELETE] ⚠️ Failed to delete vehicle record document: ${doc.fileName}`, deleteResult.error);
                  }
                } catch (error) {
                  console.error(`[DEAL DELETE] ❌ Error deleting vehicle record document ${doc.fileName}:`, error);
                }
              }
            }
          }
          // Delete the vehicle record
          await VehicleRecord.findByIdAndDelete(deletedDeal.vehicleRecordId).lean();
          console.log(`[DEAL DELETE] ✅ Successfully deleted vehicle record: ${deletedDeal.vehicleRecordId}`);
        }
      } catch (error) {
        console.error(`[DEAL DELETE] ❌ Error deleting vehicle record:`, error);
      }
    }

    console.log(`[DEAL DELETE] ✅ Deal deletion complete. Deleted ${deletedFiles.length} files from cloud storage.`);

    res.json({
      success: true,
      message: 'Deal and all associated documents deleted successfully',
      data: {
        deletedDeal,
        deletedFilesCount: deletedFiles.length,
        deletedFiles
      }
    });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router; 