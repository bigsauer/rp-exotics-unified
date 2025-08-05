const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const SalesDeal = require('../models/SalesDeal');
const VehicleRecord = require('../models/VehicleRecord');
const User = require('../models/User');
const documentGenerator = require('../services/documentGenerator');
const { authenticateToken: auth } = require('../middleware/auth');
const fs = require('fs-extra');
const path = require('path');
const Dealer = require('../models/Dealer');
const cloudStorage = require('../services/cloudStorage');

// Handle OPTIONS preflight requests for document generation
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Generate document and create vehicle record for a deal
// 🚀 Performance optimized with browser pooling, template caching, and parallel generation
router.post('/generate/:dealId', auth, async (req, res) => {
  let deal = null; // Declare deal variable outside try block
  try {
    const { dealId } = req.params;
    const userId = req.user.id;

    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] DOCUMENT GENERATION REQUEST STARTED');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] Deal ID:', dealId);
    console.log('🔍 [DOC GEN DEBUG] User ID:', userId);
    console.log('🔍 [DOC GEN DEBUG] User Email:', req.user.email);
    console.log('🔍 [DOC GEN DEBUG] User Role:', req.user.role);
    console.log('🔍 [DOC GEN DEBUG] Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 [DOC GEN DEBUG] Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 [DOC GEN DEBUG] ===========================================');

    console.log(`[DOC GEN] Received request to generate document for dealId: ${dealId} by user: ${userId}`);

    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] STARTING DEAL LOOKUP');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // Find the deal in both Deal and SalesDeal collections
    console.log('🔍 [DOC GEN DEBUG] Looking up deal in Deal collection...');
    deal = await Deal.findById(dealId).populate('seller.dealerId');
    
    if (deal) {
      console.log('🔍 [DOC GEN DEBUG] ✅ Deal found in Deal collection');
      console.log('🔍 [DOC GEN DEBUG] Deal model name:', deal.constructor.modelName);
      console.log('🔍 [DOC GEN DEBUG] Deal ID:', deal._id);
      console.log('🔍 [DOC GEN DEBUG] Deal VIN:', deal.vin);
      console.log('🔍 [DOC GEN DEBUG] Deal Type:', deal.dealType);
    } else {
      console.log('🔍 [DOC GEN DEBUG] ❌ Deal not found in Deal collection, trying SalesDeal...');
      // If not found in Deal collection, try SalesDeal collection
      deal = await SalesDeal.findById(dealId); // SalesDeal doesn't have seller.dealerId field
      
      if (deal) {
        console.log('🔍 [DOC GEN DEBUG] ✅ Deal found in SalesDeal collection');
        console.log('🔍 [DOC GEN DEBUG] Deal model name:', deal.constructor.modelName);
        console.log('🔍 [DOC GEN DEBUG] Deal ID:', deal._id);
        console.log('🔍 [DOC GEN DEBUG] Deal VIN:', deal.vin);
        console.log('🔍 [DOC GEN DEBUG] Customer name:', deal.customer?.name);
        console.log('🔍 [DOC GEN DEBUG] SalesPerson name:', deal.salesPerson?.name);
      } else {
        console.log('🔍 [DOC GEN DEBUG] ❌ Deal not found in either collection');
      }
    }
    
    // Check if deal exists before trying to set properties
    if (!deal) {
      console.error(`[DOC GEN] Deal not found in either collection for dealId: ${dealId}`);
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    console.log(`[DOC GEN] Found deal in ${deal.constructor.modelName} collection`);
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] DEAL LOOKUP COMPLETED');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // Update document generation status
    deal.documentGenerationStatus = 'in_progress';
    deal.lastDocumentGenerationAttempt = new Date();
    deal.documentGenerationError = null;
    await deal.save();

    // Get user info
    let user = await User.findById(userId);
    if (!user) {
      console.error(`[DOC GEN] User not found for userId: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    // Ensure firstName and lastName are present for PDF generation
    user = user.toObject();
    user.firstName = user.firstName || (user.profile && user.profile.firstName) || req.user.firstName || '';
    user.lastName = user.lastName || (user.profile && user.profile.lastName) || req.user.lastName || '';
    console.log('[DOC GEN] FINAL user.firstName:', user.firstName, '| user.lastName:', user.lastName);
    console.log('[DOC GEN] User object for PDF generation:', JSON.stringify(user, null, 2));

    // Debug: Log all raw deal fields
    console.log('[DOC GEN] Raw deal fields:', {
      year: deal.year,
      make: deal.make,
      model: deal.model,
      vin: deal.vin,
      stockNumber: deal.stockNumber,
      rpStockNumber: deal.rpStockNumber,
      color: deal.color,
      exteriorColor: deal.exteriorColor,
      interiorColor: deal.interiorColor,
      mileage: deal.mileage,
      purchasePrice: deal.purchasePrice,
      listPrice: deal.listPrice,
      dealType: deal.dealType,
      dealType2: deal.dealType2,
      dealType2SubType: deal.dealType2SubType,
      seller: deal.seller
    });
    
    console.log('[DOC GEN] 🔍 DEAL TYPE DEBUGGING:');
    console.log('[DOC GEN] 🔍 - dealType:', deal.dealType);
    console.log('[DOC GEN] 🔍 - dealType2SubType:', deal.dealType2SubType);
    console.log('[DOC GEN] 🔍 - dealType2:', deal.dealType2);
    console.log('[DOC GEN] 🔍 - Request body dealType2:', req.body.dealType2);
    console.log('[DOC GEN] 🔍 - Full deal object:', JSON.stringify(deal, null, 2));
    // --- Robust sellerInfo extraction ---
    let seller = deal.seller || {};
    
    // Handle SalesDeal records which don't have seller information
    if (deal.constructor.modelName === 'SalesDeal') {
      console.log('[DOC GEN] Processing SalesDeal - no seller information available');
      seller = {
        name: 'N/A',
        email: '',
        phone: '',
        address: '',
        licenseNumber: '',
        tier: '',
        type: 'N/A'
      };
      
      // Note: Deal type determination for SalesDeal records is handled later in the code
      // when creating the dealData object (lines 199-210)
    } else {
      // Always attempt dealer DB lookup if seller.name exists and any key field is missing
      if (seller.name && (!seller.licenseNumber || !seller.addressString)) {
        try {
          console.log('[DOC GEN] Attempting dealer DB lookup for name:', seller.name);
          const dealerDoc = await Dealer.findOne({ name: { $regex: new RegExp('^' + seller.name + '$', 'i') } });
          if (dealerDoc) {
            console.log('[DOC GEN] Dealer DB lookup result:', dealerDoc);
            // Merge missing fields
            if (!seller.licenseNumber && dealerDoc.licenseNumber) seller.licenseNumber = dealerDoc.licenseNumber;
            if (!seller.addressString && dealerDoc.contact && dealerDoc.contact.address) {
              seller.addressString = formatAddress(dealerDoc.contact.address);
            }
          } else {
            console.warn('[DOC GEN] Dealer not found in DB for name:', seller.name);
          }
        } catch (err) {
          console.error('[DOC GEN] Error during dealer DB lookup:', err);
        }
        console.log('[DOC GEN] Seller object after dealer merge:', JSON.stringify(seller, null, 2));
      }
    }
    console.log('[DOC GEN] Raw seller object:', JSON.stringify(seller, null, 2));
    let licenseNumber = '';
    let addressString = '';
    // Try all possible locations for licenseNumber
    const licenseSources = [
      seller.licenseNumber,
      seller.licenceNumber,
      seller.dealerId && seller.dealerId.licenseNumber,
      seller.contact && seller.contact.licenseNumber
    ];
    console.log('[DOC GEN] License number sources:', licenseSources);
    licenseNumber = licenseSources.find(x => !!x) || '';
    // Try all possible locations for address
    const addressSources = [
      seller.addressString,
      seller.contact && seller.contact.addressString,
      seller.dealerId && seller.dealerId.addressString
    ];
    console.log('[DOC GEN] Address string sources:', addressSources);
    addressString = addressSources.find(x => !!x) || '';
    if (!addressString) {
      // Try formatting address object
      const rawAddress = seller.address || (seller.contact && seller.contact.address) || (seller.dealerId && seller.dealerId.address) || '';
      console.log('[DOC GEN] Raw address object for formatting:', rawAddress);
      addressString = formatAddress(rawAddress);
      console.log('[DOC GEN] Formatted address string:', addressString);
    }
    // Debug logs for each field
    console.log('[DOC GEN] Extracted seller licenseNumber:', licenseNumber);
    console.log('[DOC GEN] Extracted seller addressString:', addressString);
    // Build sellerInfo for PDF
    const sellerInfo = {
      name: seller.name || '',
      email: (seller.contact && seller.contact.email) || seller.email || '',
      phone: (seller.contact && seller.contact.phone) || seller.phone || '',
      address: addressString,
      licenseNumber,
      tier: seller.tier || '',
      type: seller.type || ''
    };
    console.log('[DOC GEN] Final sellerInfo for PDF:', JSON.stringify(sellerInfo, null, 2));
    
    // Debug: Log the original deal.financial object
    console.log('[DOC GEN] Original deal.financial:', deal.financial);
    console.log('[DOC GEN] Deal brokerFee from root:', deal.brokerFee);
    console.log('[DOC GEN] Deal brokerFeePaidTo from root:', deal.brokerFeePaidTo);
    
    // Build dealData for PDF, include all vehicle fields and robust financial field mapping
    // Create a complete financial object with all fields
    const completeFinancial = {
      ...deal.financial,
      brokerFee: deal.financial?.brokerFee || deal.brokerFee || 0,
      brokerFeePaidTo: deal.financial?.brokerFeePaidTo || deal.brokerFeePaidTo || '',
      commissionRate: deal.financial?.commissionRate || deal.commissionRate || 0,
      payoffBalance: deal.financial?.payoffBalance || deal.payoffBalance || 0,
      amountDueToCustomer: deal.financial?.amountDueToCustomer || deal.amountDueToCustomer || 0,
      amountDueToRP: deal.financial?.amountDueToRP || deal.amountDueToRP || 0,
      listPrice: deal.listPrice || 0
    };
    
    console.log('[DOC GEN] Complete financial object:', completeFinancial);
    
    // Determine dealType for SalesDeal records
    let determinedDealType = deal.dealType;
    if (!determinedDealType && deal.constructor.modelName === 'SalesDeal') {
      // For SalesDeal records, determine deal type based on available information
      if (req.body.dealType2 === 'Buy' || deal.dealType2 === 'Buy') {
        determinedDealType = 'retail-pp'; // Default to retail private party for buy deals
        console.log('[DOC GEN] Set dealType to retail-pp for SalesDeal buy transaction');
      } else if (req.body.dealType2 === 'Sale' || deal.dealType2 === 'Sale') {
        determinedDealType = 'retail-pp'; // Default to retail private party for sale deals
        console.log('[DOC GEN] Set dealType to retail-pp for SalesDeal sale transaction');
      } else {
        determinedDealType = 'retail-pp'; // Default fallback
        console.log('[DOC GEN] Set dealType to retail-pp as default for SalesDeal');
      }
    }
    
    const dealData = {
      year: deal.year,
      make: deal.make,
      model: deal.model,
      vin: deal.vin,
      stockNumber: deal.stockNumber || 'N/A',
      color: deal.color,
      exteriorColor: deal.exteriorColor,
      interiorColor: deal.interiorColor,
      mileage: deal.mileage,
      purchasePrice: deal.purchasePrice,
      listPrice: deal.listPrice,
      wholesalePrice: req.body.wholesalePrice || deal.wholesalePrice || 0,
      killPrice: deal.killPrice,
      dealType: determinedDealType,
      dealType2: req.body.dealType2 || deal.dealType2 || 'Buy',
      dealType2SubType: req.body.dealType2SubType || deal.dealType2SubType || 'buy',
      sellerInfo,
      seller: deal.seller,
      buyer: deal.buyer,
      financial: completeFinancial, // Use the complete financial object
      commissionRate: req.body.commissionRate !== undefined ? req.body.commissionRate : (deal.financial?.commissionRate || 0),
      payoffBalance: req.body.payoffBalance !== undefined ? req.body.payoffBalance : (deal.financial?.payoffBalance || 0),
      amountDueToCustomer: req.body.amountDueToCustomer !== undefined ? req.body.amountDueToCustomer : (deal.financial?.amountDueToCustomer || 0),
      amountDueToRP: req.body.amountDueToRP !== undefined ? req.body.amountDueToRP : (deal.financial?.amountDueToRP || 0),
      brokerFee: req.body.brokerFee !== undefined ? req.body.brokerFee : (deal.financial?.brokerFee || 0),
      brokerFeePaidTo: req.body.brokerFeePaidTo !== undefined ? req.body.brokerFeePaidTo : (deal.financial?.brokerFeePaidTo || ''),
      paymentMethod: deal.paymentMethod,
      paymentTerms: deal.paymentTerms,
      fundingSource: deal.fundingSource,
      vehicleDescription: deal.vehicleDescription,
      generalNotes: deal.generalNotes,
      rpStockNumber: deal.rpStockNumber,
      titleInfo: deal.titleInfo,
      notes: deal.notes || deal.generalNotes || '',
      vehicleRecordId: deal.vehicleRecordId || undefined
    };
    
    // 🔧 ENSURE CORRECT DEAL TYPE 2 FOR WHOLESALE D2D SALE DEALS
    if (dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale') {
      dealData.dealType2 = 'Sale';
      console.log('[DOC GEN][DEAL_TYPE_FIX] Forced dealType2 to "Sale" for wholesale d2d sale deal');
      console.log('[DOC GEN][DEBUG] 🔍 dealType2 after setting:', dealData.dealType2);
      console.log('[DOC GEN][DEBUG] 🔍 dealType2SubType:', dealData.dealType2SubType);
      console.log('[DOC GEN][DEBUG] 🔍 dealType:', dealData.dealType);
    }
    
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] DEAL DATA CREATION COMPLETED');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('[DOC GEN] dealData for PDF:', JSON.stringify(dealData, null, 2));
    console.log('🔍 [DOC GEN DEBUG] Deal Type:', dealData.dealType);
    console.log('🔍 [DOC GEN DEBUG] Deal Type2:', dealData.dealType2);
    console.log('🔍 [DOC GEN DEBUG] Deal Type2SubType:', dealData.dealType2SubType);
    console.log('🔍 [DOC GEN DEBUG] Seller:', dealData.seller);
    console.log('🔍 [DOC GEN DEBUG] Buyer:', dealData.buyer);
    console.log('🔍 [DOC GEN DEBUG] Purchase Price:', dealData.purchasePrice);
    console.log('🔍 [DOC GEN DEBUG] List Price:', dealData.listPrice);
    console.log('🔍 [DOC GEN DEBUG] ===========================================');

    // Handle SalesDeal model field mapping
    if (deal.constructor.modelName === 'SalesDeal') {
      console.log('[DOC GEN] 🔧 Processing SalesDeal - mapping fields for document generation');
      
      // Map SalesDeal fields to expected Deal fields
      dealData = {
        ...dealData,
        // Map customer to seller for SalesDeal
        seller: {
          name: deal.customer?.name || req.body.sellerName || 'N/A',
          type: deal.customer?.type || req.body.sellerType || 'private',
          contact: {
            phone: deal.customer?.contact?.phone || req.body.sellerPhone || 'N/A',
            email: deal.customer?.contact?.email || req.body.sellerEmail || 'N/A',
            address: deal.customer?.contact?.address || req.body.sellerAddress || 'N/A'
          }
        },
        // Map salesPerson to buyer (RP Exotics)
        buyer: {
          name: 'RP Exotics',
          type: 'dealer',
          contact: {
            phone: deal.salesPerson?.phone || 'N/A',
            email: deal.salesPerson?.email || 'N/A'
          }
        },
        // Map financial fields
        purchasePrice: deal.financial?.purchasePrice,
        listPrice: deal.financial?.listPrice,
        wholesalePrice: deal.financial?.wholesalePrice || 0,
        instantOffer: deal.financial?.instantOffer || 0,
        // Map other fields
        salesperson: deal.salesPerson?.name || 'N/A',
        color: deal.color || deal.exteriorColor,
        exteriorColor: deal.exteriorColor || deal.color,
        interiorColor: deal.interiorColor,
        mileage: deal.mileage,
        // Ensure required fields are present
        dealType: req.body.dealType || 'retail-pp',
        dealType2: req.body.dealType2 || 'Buy',
        dealType2SubType: req.body.dealType2SubType || 'buy'
      };
      
      console.log('[DOC GEN] 🔧 SalesDeal field mapping completed:', {
        dealType: dealData.dealType,
        dealType2: dealData.dealType2,
        dealType2SubType: dealData.dealType2SubType,
        sellerName: dealData.seller?.name,
        buyerName: dealData.buyer?.name,
        purchasePrice: dealData.purchasePrice,
        listPrice: dealData.listPrice
      });
    }

    // Ensure sellerFromDB and buyerFromDB are populated for license number extraction
    if (dealData.seller && dealData.seller.dealerId) {
      dealData.sellerFromDB = await Dealer.findById(dealData.seller.dealerId);
    }
    if (dealData.buyer && dealData.buyer.dealerId) {
      dealData.buyerFromDB = await Dealer.findById(dealData.buyer.dealerId);
    }
    
    // For wholesale flip deals, ensure buyer data is properly populated from dealer database
    if (dealData.dealType === 'wholesale-flip' && dealData.buyer && dealData.buyer.type === 'dealer') {
      console.log('[DOC GEN] 🎯 Wholesale flip deal detected - ensuring buyer dealer data is populated');
      
      // If buyer has dealerId but no name, populate from dealer database
      if (dealData.buyer.dealerId && (!dealData.buyer.name || dealData.buyer.name === 'N/A')) {
        const buyerDealer = await Dealer.findById(dealData.buyer.dealerId);
        if (buyerDealer) {
          console.log('[DOC GEN] 🎯 Found buyer dealer in database:', buyerDealer.name);
          dealData.buyer = {
            ...dealData.buyer,
            name: buyerDealer.name,
            contact: {
              address: buyerDealer.contact?.address || {},
              phone: buyerDealer.contact?.phone || 'N/A',
              email: buyerDealer.contact?.email || 'N/A'
            },
            licenseNumber: buyerDealer.licenseNumber || '',
            tier: buyerDealer.tier || 'Tier 1'
          };
          dealData.buyerFromDB = buyerDealer;
        } else {
          console.log('[DOC GEN] 🎯 Buyer dealer not found in database, using existing data');
        }
      }
      
      // If buyer has name but no dealerId, try to find dealer by name
      if (dealData.buyer.name && dealData.buyer.name !== 'N/A' && !dealData.buyer.dealerId) {
        const buyerDealer = await Dealer.findOne({ name: { $regex: new RegExp('^' + dealData.buyer.name + '$', 'i') } });
        if (buyerDealer) {
          console.log('[DOC GEN] 🎯 Found buyer dealer by name:', buyerDealer.name);
          dealData.buyer = {
            ...dealData.buyer,
            dealerId: buyerDealer._id,
            contact: {
              address: buyerDealer.contact?.address || {},
              phone: buyerDealer.contact?.phone || 'N/A',
              email: buyerDealer.contact?.email || 'N/A'
            },
            licenseNumber: buyerDealer.licenseNumber || '',
            tier: buyerDealer.tier || 'Tier 1'
          };
          dealData.buyerFromDB = buyerDealer;
        }
      }
      
      console.log('[DOC GEN] 🎯 Final buyer data after dealer lookup:', JSON.stringify(dealData.buyer, null, 2));
    }

    console.log(`[DOC GEN] Prepared dealData:`, dealData);
    console.log(`[DOC GEN] Vehicle fields:`, {
      mileage: deal.mileage,
      color: deal.color,
      exteriorColor: deal.exteriorColor,
      interiorColor: deal.interiorColor
    });

    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] STARTING DOCUMENT GENERATION LOGIC');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // Generate documents based on deal type
    console.log(`[DOC GEN] 🎯 Starting document generation for deal type: ${dealData.dealType}`);
    console.log(`[DOC GEN] 🎯 Deal subtype: ${dealData.dealType2SubType}`);
    
    console.log('🔍 [DOC GEN DEBUG] Document generator available:', !!documentGenerator);
    console.log('🔍 [DOC GEN DEBUG] Document generator methods:', Object.keys(documentGenerator));
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log(`[DOC GEN] 🎯 Full deal data for document generation:`, {
      dealType: dealData.dealType,
      dealType2SubType: req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType || 'buy',
      dealType2: req.body.dealType2 || dealData.dealType2,
      seller: dealData.seller,
      buyer: dealData.buyer,
      sellerInfo: dealData.sellerInfo,
      buyerInfo: dealData.buyerInfo
    });
    console.log(`[DOC GEN] 🎯 Condition checks:`);
    console.log(`[DOC GEN] 🎯 - dealData.dealType === 'wholesale-flip': ${dealData.dealType === 'wholesale-flip'}`);
    console.log(`[DOC GEN] 🎯 - req.body.dealType2: ${req.body.dealType2}`);
    console.log(`[DOC GEN] 🎯 - dealData.dealType2: ${dealData.dealType2}`);
    console.log(`[DOC GEN] 🎯 - Final dealType2: ${req.body.dealType2 || dealData.dealType2}`);
    console.log(`[DOC GEN] 🎯 - dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Buy'): ${dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Buy')}`);
    console.log(`[DOC GEN] 🎯 - dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Sale'): ${dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Sale')}`);
    
    // ENHANCED DEBUGGING FOR WHOLESALE D2D SALE
    console.log(`[DOC GEN] 🔍 ENHANCED WHOLESALE D2D SALE DEBUGGING:`);
    console.log(`[DOC GEN] 🔍 - dealData.dealType: "${dealData.dealType}"`);
    console.log(`[DOC GEN] 🔍 - dealData.dealType2: "${dealData.dealType2}"`);
    console.log(`[DOC GEN] 🔍 - dealData.dealType2SubType: "${dealData.dealType2SubType}"`);
    console.log(`[DOC GEN] 🔍 - req.body.dealType2: "${req.body.dealType2}"`);
    console.log(`[DOC GEN] 🔍 - req.body.dealType2SubType: "${req.body.dealType2SubType}"`);
    console.log(`[DOC GEN] 🔍 - deal.dealType2: "${deal.dealType2}"`);
    console.log(`[DOC GEN] 🔍 - deal.dealType2SubType: "${deal.dealType2SubType}"`);
    
    // Check all possible sale conditions
    const condition1 = dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Sale');
    const condition2 = dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType) === 'sale');
    const condition3 = dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale';
    const condition4 = dealData.dealType === 'wholesale-d2d' && req.body.dealType2SubType === 'sale';
    
    console.log(`[DOC GEN] 🔍 SALE CONDITION CHECKS:`);
    console.log(`[DOC GEN] 🔍 - Condition 1 (dealType2 === 'Sale'): ${condition1}`);
    console.log(`[DOC GEN] 🔍 - Condition 2 (dealType2SubType === 'sale' with fallbacks): ${condition2}`);
    console.log(`[DOC GEN] 🔍 - Condition 3 (dealData.dealType2SubType === 'sale'): ${condition3}`);
    console.log(`[DOC GEN] 🔍 - Condition 4 (req.body.dealType2SubType === 'sale'): ${condition4}`);
    console.log(`[DOC GEN] 🔍 - ANY SALE CONDITION: ${condition1 || condition2 || condition3 || condition4}`);
    
    console.log(`[DOC GEN] 🎯 - Full req.body for debugging:`, JSON.stringify(req.body, null, 2));
    
    // Initialize document results array
    let documentResults = [];
    let vehicleRecordResult;
    
    if (dealData.dealType === 'wholesale-flip') {
      console.log(`[DOC GEN] 🎯 BRANCH TAKEN: wholesale-flip`);
      console.log(`[DOC GEN] 🎯 Generating documents for wholesale flip buy/sell deal based on seller type`);
      
      try {
        // Use the actual seller type from the deal data
        const sellerType = dealData.seller?.type || req.body.sellerType || 'private';
        console.log(`[DOC GEN] 🎯 Seller type for wholesale flip: ${sellerType}`);
        
        const correctedSellerData = {
          ...dealData.seller,
          type: sellerType, // Use actual seller type, don't force to private
          name: dealData.seller?.name || 'N/A',
          contact: {
            address: dealData.seller?.contact?.address || {},
            phone: dealData.seller?.contact?.phone || 'N/A',
            email: dealData.seller?.contact?.email || 'N/A'
          }
        };
        
        // If seller is a dealer and has incomplete data, try to populate from dealer database
        if (sellerType === 'dealer' && dealData.seller && (!dealData.seller.name || dealData.seller.name === 'N/A')) {
          if (dealData.seller.dealerId) {
            const sellerDealer = await Dealer.findById(dealData.seller.dealerId);
            if (sellerDealer) {
              console.log('[DOC GEN] 🎯 Found seller dealer in database:', sellerDealer.name);
              correctedSellerData.name = sellerDealer.name;
              correctedSellerData.contact = {
                address: sellerDealer.contact?.address || {},
                phone: sellerDealer.contact?.phone || 'N/A',
                email: sellerDealer.contact?.email || 'N/A'
              };
              correctedSellerData.licenseNumber = sellerDealer.licenseNumber || '';
              correctedSellerData.tier = sellerDealer.tier || 'Tier 1';
            }
          }
        }
        
        // Fix buyer data - ensure it has all required fields from req.body if present
        const parseAddress = (addr) => {
          if (!addr) return {};
          if (typeof addr === 'object') return addr;
          const parts = addr.split(',').map(s => s.trim());
          return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || ''
          };
        };
        const correctedBuyerData = {
          ...dealData.buyer,
          name: req.body.buyerName || dealData.buyer?.name || '',
          type: req.body.buyerType || dealData.buyer?.type || 'private',
          licenseNumber: req.body.buyerLicenseNumber || dealData.buyer?.licenseNumber || '',
          tier: req.body.buyerTier || dealData.buyer?.tier || 'Tier 1',
          contact: {
            address: req.body.buyerAddress ? parseAddress(req.body.buyerAddress) : (dealData.buyer?.contact?.address || {}),
            phone: req.body.buyerPhone || dealData.buyer?.contact?.phone || 'N/A',
            email: req.body.buyerEmail || dealData.buyer?.contact?.email || 'N/A'
          }
        };
        
        // If buyer is a dealer and has incomplete data, try to populate from dealer database
        if (correctedBuyerData.type === 'dealer' && (!correctedBuyerData.name || correctedBuyerData.name === 'N/A' || correctedBuyerData.name.trim() === '')) {
          if (dealData.buyer.dealerId) {
            const buyerDealer = await Dealer.findById(dealData.buyer.dealerId);
            if (buyerDealer) {
              console.log('[DOC GEN] 🎯 Found buyer dealer in database for correction:', buyerDealer.name);
              correctedBuyerData.name = buyerDealer.name;
              correctedBuyerData.contact = {
                address: buyerDealer.contact?.address || {},
                phone: buyerDealer.contact?.phone || 'N/A',
                email: buyerDealer.contact?.email || 'N/A'
              };
              correctedBuyerData.licenseNumber = buyerDealer.licenseNumber || '';
              correctedBuyerData.tier = buyerDealer.tier || 'Tier 1';
            }
          }
        }
        
        console.log(`[DOC GEN] 🔧 Corrected seller data:`, correctedSellerData);
        console.log(`[DOC GEN] 🔧 Corrected buyer data:`, correctedBuyerData);
        console.log(`[DOC GEN] 🔧 Corrected buyer data.name:`, correctedBuyerData.name);
        console.log(`[DOC GEN] 🔧 Corrected buyer data.type:`, correctedBuyerData.type);
        
        // Prepare document generation tasks
        const buyerDocumentData = {
          ...dealData,
          seller: correctedBuyerData, // Use corrected buyer data as seller for buyer document
          sellerInfo: correctedBuyerData, // Use corrected buyer data as seller for buyer document
          buyer: correctedBuyerData, // Update buyer data
          isBuyerDocument: true
        };
        
        const sellerDocumentData = {
          ...dealData,
          seller: {
            ...correctedSellerData,
            address: correctedSellerData.contact?.address || '',
            phone: correctedSellerData.contact?.phone || '',
            email: correctedSellerData.contact?.email || ''
          },
          sellerInfo: {
            ...correctedSellerData,
            address: correctedSellerData.contact?.address || '',
            phone: correctedSellerData.contact?.phone || '',
            email: correctedSellerData.contact?.email || ''
          },
          buyer: correctedBuyerData, // Update buyer data
          isSellerDocument: true
        };
        
        console.log('[DOC GEN] 🚩 buyerDocumentData:', JSON.stringify(buyerDocumentData, null, 2));
        console.log('[DOC GEN] 🚩 sellerDocumentData:', JSON.stringify(sellerDocumentData, null, 2));

        // PATCH: Always trust req.body.sellerType and req.body.buyerType for document generation
        if (req.body.sellerType) {
          buyerDocumentData.sellerType = req.body.sellerType;
          sellerDocumentData.sellerType = req.body.sellerType;
          if (buyerDocumentData.seller) buyerDocumentData.seller.type = req.body.sellerType;
          if (buyerDocumentData.sellerInfo) buyerDocumentData.sellerInfo.type = req.body.sellerType;
          if (sellerDocumentData.seller) sellerDocumentData.seller.type = req.body.sellerType;
          if (sellerDocumentData.sellerInfo) sellerDocumentData.sellerInfo.type = req.body.sellerType;
          console.log('[DOC GEN PATCH] sellerType set on doc data:', req.body.sellerType);
        }
        if (req.body.buyerType) {
          buyerDocumentData.buyerType = req.body.buyerType;
          sellerDocumentData.buyerType = req.body.buyerType;
          if (buyerDocumentData.buyer) buyerDocumentData.buyer.type = req.body.buyerType;
          if (buyerDocumentData.buyerInfo) buyerDocumentData.buyerInfo.type = req.body.buyerType;
          if (sellerDocumentData.buyer) sellerDocumentData.buyer.type = req.body.buyerType;
          if (sellerDocumentData.buyerInfo) sellerDocumentData.buyerInfo.type = req.body.buyerType;
          console.log('[DOC GEN PATCH] buyerType set on doc data:', req.body.buyerType);
        }

        // Generate documents based on seller type
        console.time('[PERF] generateWholesaleFlipDocuments');
        
        if (sellerType === 'dealer') {
          console.log(`[DOC GEN] 🎯 Seller is DEALER - generating wholesale documents`);
          
          // For dealer seller: generate wholesale purchase agreement and wholesale BOS
          // But first, ensure buyer data is complete
          let finalBuyerData = correctedBuyerData;
          
          // Only use RP Exotics fallback if buyer data is truly incomplete
          // Check if buyer has a name but it's not 'N/A' or empty
          const hasValidBuyerName = correctedBuyerData.name && 
                                   correctedBuyerData.name !== 'N/A' && 
                                   correctedBuyerData.name.trim() !== '' &&
                                   correctedBuyerData.name !== 'RP Exotics';
          
          if (correctedBuyerData.type === 'dealer' && !hasValidBuyerName) {
            console.log('[DOC GEN] 🎯 Buyer data truly incomplete (no valid name), using RP Exotics as fallback');
            console.log('[DOC GEN] 🎯 Original buyer name was:', correctedBuyerData.name);
            finalBuyerData = {
              name: 'RP Exotics',
              type: 'dealer',
              contact: {
                address: {
                  street: '1155 N Warson Rd',
                  city: 'Saint Louis',
                  state: 'MO',
                  zip: '63132'
                },
                phone: '(314) 970-2427',
                email: 'titling@rpexotics.com'
              },
              licenseNumber: 'D4865',
              tier: 'Tier 1'
            };
          } else {
            console.log('[DOC GEN] 🎯 Using actual buyer data:', correctedBuyerData.name);
          }
          
          console.log('[DOC GEN] 🚀 About to call generateDocument for dealer-to-dealer wholesale flip documents');
          
          // For dealer-to-dealer wholesale flip: generate both seller and buyer documents
          // Check if buyer is also a dealer
          if (correctedBuyerData.type === 'dealer') {
            console.log('[DOC GEN] 🎯 DEALER-TO-DEALER WHOLESALE FLIP DETECTED - generating both documents');
            
            const [sellerResult, buyerResult] = await Promise.all([
              // Seller document: wholesale purchase agreement (for the selling dealer)
              documentGenerator.generateWholesaleFlipBuySellDocuments({
                ...sellerDocumentData,
                sellerType: 'dealer',
                buyerType: 'dealer',
                isSellerDocument: true,
                isBuyerDocument: false
              }, user),
              // Buyer document: wholesale BOS (for the buying dealer)
              documentGenerator.generateWholesaleFlipBuySellDocuments({
                ...buyerDocumentData,
                sellerType: 'dealer',
                buyerType: 'dealer',
                isSellerDocument: false,
                isBuyerDocument: true
              }, user)
            ]);
            
            console.log(`[DOC GEN] Dealer seller document (wholesale purchase agreement):`, sellerResult);
            console.log(`[DOC GEN] Dealer buyer document (wholesale BOS):`, buyerResult);
            
            documentResults.push({
              ...sellerResult,
              documentType: 'wholesale_purchase_agreement',
              party: 'seller'
            });
            
            documentResults.push({
              ...buyerResult,
              documentType: 'wholesale_bos',
              party: 'buyer'
            });
          } else {
            // For dealer seller with private buyer: only generate seller document (wholesale purchase order)
            console.log('[DOC GEN] 🎯 Dealer seller with private buyer - generating seller document only');
            
            const sellerResult = await documentGenerator.generateWholesaleFlipBuySellDocuments({
              ...sellerDocumentData,
              sellerType: 'dealer',
              buyerType: 'private'
            }, user);
            
            console.log(`[DOC GEN] Dealer seller document (wholesale purchase order):`, sellerResult);
            
            documentResults.push({
              ...sellerResult,
              documentType: 'wholesale_purchase_order',
              party: 'seller'
            });
          }
          
        } else {
          console.log(`[DOC GEN] 🎯 Seller is PRIVATE PARTY - generating retail documents and wholesale BOS`);
          
          // For private party seller: generate retail private party purchase agreement for seller
          // and wholesale BOS for the purchasing dealer (buyer)
          
          const [sellerResult, buyerResult] = await Promise.all([
            // Seller document: retail PP purchase agreement (seller is private party)
            documentGenerator.generateWholesaleFlipBuySellDocuments({
              ...sellerDocumentData,
              sellerType: 'private',
              buyerType: 'dealer',
              seller: correctedSellerData,
              buyer: correctedBuyerData,
              buyerInfo: correctedBuyerData
            }, user),
            // Buyer document: wholesale BOS (buyer is purchasing dealer)
            documentGenerator.generateWholesaleFlipBuySellDocuments({
              ...buyerDocumentData,
              sellerType: 'private',
              buyerType: 'dealer',
              seller: correctedSellerData,
              buyer: correctedBuyerData,
              buyerInfo: correctedBuyerData
            }, user)
          ]);
          
          console.log(`[DOC GEN] Private seller document (retail PP purchase agreement):`, sellerResult);
          console.log(`[DOC GEN] Dealer buyer document (wholesale BOS):`, buyerResult);
          
          documentResults.push({
            ...sellerResult,
            documentType: 'retail_pp_buy',
            party: 'seller'
          });
          
          documentResults.push({
            ...buyerResult,
            documentType: 'wholesale_bos',
            party: 'buyer'
          });
        }
        

        
        console.timeEnd('[PERF] generateWholesaleFlipDocuments');
        
      } catch (err) {
        console.error(`[DOC GEN] Error generating wholesale flip documents:`, err);
        throw err;
      }
    } else if (dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Buy')) {
      // Handle wholesale D2D buy deals - generate only seller document (no BOS needed)
      console.log(`[DOC GEN] 🎯 BRANCH TAKEN: wholesale-d2d BUY`);
      console.log(`[DOC GEN] 🎯 Generating 1 document for wholesale D2D buy deal (seller only)`);
      
      try {
        // Helper function for parsing addresses
        const parseAddress = (addr) => {
          if (!addr) return {};
          if (typeof addr === 'object') return addr;
          const parts = addr.split(',').map(s => s.trim());
          return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || ''
          };
        };
        
        // For wholesale D2D buy: RP Exotics is the buyer, selling dealer is the seller
        const rpExoticsBuyer = {
          name: 'RP Exotics',
          type: 'dealer',
          licenseNumber: 'D4865',
          tier: 'Tier 1',
          contact: {
            address: {
              street: '1155 N Warson Rd',
              city: 'Saint Louis',
              state: 'MO',
              zip: '63132'
            },
            phone: '(314) 970-2427',
            email: 'titling@rpexotics.com'
          }
        };
        
        const sellingDealer = {
          ...dealData.seller,
          name: dealData.seller?.name || 'N/A',
          type: req.body.sellerType || dealData.seller?.type || 'dealer',
          licenseNumber: req.body.sellerLicenseNumber || dealData.seller?.licenseNumber || '',
          tier: req.body.sellerTier || dealData.seller?.tier || 'Tier 1',
          contact: {
            address: req.body.sellerAddress ? parseAddress(req.body.sellerAddress) : (dealData.seller?.contact?.address || {}),
            phone: req.body.sellerPhone || dealData.seller?.contact?.phone || 'N/A',
            email: req.body.sellerEmail || dealData.seller?.contact?.email || 'N/A'
          }
        };
        
        console.log(`[DOC GEN] 🔧 RP Exotics buyer data:`, rpExoticsBuyer);
        console.log(`[DOC GEN] 🔧 Selling dealer data:`, sellingDealer);
        
        // Prepare seller document generation data
        const sellerDocumentData = {
          ...dealData,
          seller: sellingDealer, // Selling dealer is the seller
          sellerInfo: sellingDealer,
          buyer: rpExoticsBuyer, // RP Exotics is the buyer
          isSellerDocument: true
        };
        
        console.log('[DOC GEN] 🚩 sellerDocumentData:', JSON.stringify(sellerDocumentData, null, 2));

        // PATCH: Always trust req.body.sellerType and req.body.buyerType for document generation
        if (req.body.sellerType) {
          sellerDocumentData.sellerType = req.body.sellerType;
          if (sellerDocumentData.seller) sellerDocumentData.seller.type = req.body.sellerType;
          if (sellerDocumentData.sellerInfo) sellerDocumentData.sellerInfo.type = req.body.sellerType;
          console.log('[DOC GEN PATCH] sellerType set on doc data:', req.body.sellerType);
        }
        if (req.body.buyerType) {
          sellerDocumentData.buyerType = req.body.buyerType;
          if (sellerDocumentData.buyer) sellerDocumentData.buyer.type = req.body.buyerType;
          if (sellerDocumentData.buyerInfo) sellerDocumentData.buyerInfo.type = req.body.buyerType;
          console.log('[DOC GEN PATCH] buyerType set on doc data:', req.body.buyerType);
        }

        // Generate seller document only
        console.time('[PERF] generateWholesaleD2DBuyDocuments');
        const sellerResult = await documentGenerator.generateDocument(sellerDocumentData, user);
        console.timeEnd('[PERF] generateWholesaleD2DBuyDocuments');
        
        console.log(`[DOC GEN] Seller document generated (wholesale purchase agreement):`, sellerResult);
        
        // Add seller document to results
        documentResults.push({
          ...sellerResult,
          documentType: sellerResult.documentType,
          party: 'seller'
        });
        
      } catch (err) {
        console.error(`[DOC GEN] Error generating wholesale D2D buy seller document:`, err);
        throw err;
      }
    } else if (dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Sale' || (req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType) === 'sale')) {
      // Handle wholesale D2D sale deals - generate wholesale BOS
      console.log(`[DOC GEN] 🎯 BRANCH TAKEN: wholesale-d2d SALE`);
      console.log(`[DOC GEN] 🎯 WHOLESALE D2D SALE DEAL DETECTED - Generating wholesale BOS`);
      console.log(`[DOC GEN] 🎯 Generating 1 document for wholesale D2D sale deal (wholesale BOS)`);
      console.log(`[DOC GEN][DEBUG] 🔍 ENHANCED DEBUGGING FOR WHOLESALE D2D SALE`);
      console.log(`[DOC GEN][DEBUG] 🔍 req.body:`, JSON.stringify(req.body, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 dealData:`, JSON.stringify(dealData, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 user:`, JSON.stringify(user, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 dealType:`, dealData.dealType);
      console.log(`[DOC GEN][DEBUG] 🔍 dealType2:`, dealData.dealType2);
      console.log(`[DOC GEN][DEBUG] 🔍 dealType2SubType:`, dealData.dealType2SubType);
      console.log(`[DOC GEN][DEBUG] 🔍 seller:`, JSON.stringify(dealData.seller, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 buyer:`, JSON.stringify(dealData.buyer, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 titleInfo:`, JSON.stringify(dealData.titleInfo, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 financial:`, JSON.stringify(dealData.financial, null, 2));
      console.log(`[DOC GEN][DEBUG] 🔍 All deal keys:`, Object.keys(dealData));
      try {
        // Helper function for parsing addresses
        const parseAddress = (addr) => {
          if (!addr) return {};
          if (typeof addr === 'object') return addr;
          const parts = addr.split(',').map(s => s.trim());
          return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || ''
          };
        };
        // For wholesale D2D sale: RP Exotics is the seller, purchasing dealer is the buyer
        const rpExoticsSeller = {
          name: 'RP Exotics',
          type: 'dealer',
          licenseNumber: 'D4865',
          tier: 'Tier 1',
          contact: {
            address: {
              street: '1155 N Warson Rd',
              city: 'Saint Louis',
              state: 'MO',
              zip: '63132'
            },
            phone: '(314) 970-2427',
            email: 'titling@rpexotics.com'
          }
        };
        const purchasingDealer = {
          name: req.body.buyerName || dealData.buyer?.name || 'N/A',
          type: req.body.buyerType || dealData.buyer?.type || 'dealer',
          licenseNumber: req.body.buyerLicenseNumber || dealData.buyer?.licenseNumber || '',
          tier: req.body.buyerTier || dealData.buyer?.tier || 'Tier 1',
          contact: {
            address: req.body.buyerAddress ? parseAddress(req.body.buyerAddress) : (dealData.buyer?.contact?.address || {}),
            phone: req.body.buyerPhone || dealData.buyer?.contact?.phone || 'N/A',
            email: req.body.buyerEmail || dealData.buyer?.contact?.email || 'N/A'
          }
        };
        console.log(`[DOC GEN][DEBUG] 🔧 RP Exotics seller data:`, JSON.stringify(rpExoticsSeller, null, 2));
        console.log(`[DOC GEN][DEBUG] 🔧 Purchasing dealer data:`, JSON.stringify(purchasingDealer, null, 2));
        // Prepare document generation data
        const saleDocumentData = {
          ...dealData,
          dealType2SubType: req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType || 'sale',
          dealType2: req.body.dealType2 || dealData.dealType2, // Dynamic based on input
          seller: rpExoticsSeller, // RP Exotics is the seller
          sellerInfo: rpExoticsSeller,
          buyer: purchasingDealer, // Purchasing dealer is the buyer
          buyerInfo: purchasingDealer,
          purchasingDealer: purchasingDealer
        };
        console.log('[DOC GEN][DEBUG] 🔧 saleDocumentData:', JSON.stringify(saleDocumentData, null, 2));
        // PATCH: Always trust req.body.sellerType and req.body.buyerType for document generation
        if (req.body.sellerType) {
          saleDocumentData.sellerType = req.body.sellerType;
          if (saleDocumentData.seller) saleDocumentData.seller.type = req.body.sellerType;
          if (saleDocumentData.sellerInfo) saleDocumentData.sellerInfo.type = req.body.sellerType;
          console.log('[DOC GEN PATCH] sellerType set on doc data:', req.body.sellerType);
        }
        if (req.body.buyerType) {
          saleDocumentData.buyerType = req.body.buyerType;
          if (saleDocumentData.buyer) saleDocumentData.buyer.type = req.body.buyerType;
          if (saleDocumentData.buyerInfo) saleDocumentData.buyerInfo.type = req.body.buyerType;
          console.log('[DOC GEN PATCH] buyerType set on doc data:', req.body.buyerType);
        }
        // Generate sale document only
        console.time('[PERF] generateWholesaleD2DSaleDocuments');
        console.log(`[DOC GEN][DEBUG] 🚀 Calling documentGenerator.generateDocument for wholesale D2D sale with data:`, {
          dealType: saleDocumentData.dealType,
          dealType2SubType: saleDocumentData.dealType2SubType,
          seller: saleDocumentData.seller?.name,
          buyer: saleDocumentData.buyer?.name
        });
        let saleResult;
        try {
          saleResult = await documentGenerator.generateDocument(saleDocumentData, user);
          console.log(`[DOC GEN][DEBUG] ✅ documentGenerator.generateDocument completed successfully`);
        } catch (docError) {
          console.error(`[DOC GEN][DEBUG] ❌ Error in documentGenerator.generateDocument:`, docError);
          console.error(`[DOC GEN][DEBUG] ❌ Error stack:`, docError.stack);
          console.error(`[DOC GEN][DEBUG] ❌ Sale document data that caused error:`, JSON.stringify(saleDocumentData, null, 2));
          throw docError;
        }
        console.timeEnd('[PERF] generateWholesaleD2DSaleDocuments');
        console.log(`[DOC GEN][DEBUG] ✅ documentGenerator.generateDocument completed for wholesale D2D sale`);
        console.log(`[DOC GEN][DEBUG] Sale document generated (wholesale BOS):`, saleResult);
        console.log(`[DOC GEN][DEBUG] 🔍 Sale document type: ${saleResult?.documentType}`);
        console.log(`[DOC GEN][DEBUG] 🔍 Sale document fileName: ${saleResult?.fileName}`);
        // Validate the result
        if (!saleResult) {
          console.error(`[DOC GEN][DEBUG] ❌ Sale result is null or undefined!`);
          throw new Error('Document generation failed - no result returned');
        }
        if (!saleResult.documentType) {
          console.error(`[DOC GEN][DEBUG] ❌ Sale result missing documentType!`);
          throw new Error('Document generation failed - missing documentType');
        }
        documentResults.push({
          ...saleResult,
          documentType: saleResult.documentType,
          party: 'buyer'
        });
      } catch (err) {
        console.error(`[DOC GEN][DEBUG] ❌ Error generating wholesale D2D sale document:`, err);
        throw err;
      }
    } else if (dealData.dealType === 'retail-pp') {
      // Special handling for retail-pp deals - generate purchase contract only
      console.log(`[DOC GEN] 🎯 BRANCH TAKEN: retail-pp deal`);
      console.log(`[DOC GEN] 🎯 Generating purchase contract for retail-pp deal (vehicle record handled separately)`);
      
      try {
        // Generate purchase contract only
        console.log(`[DOC GEN] 🔄 Generating Retail Private Party Purchase Contract...`);
        const purchaseContractResult = await documentGenerator.generateRetailPPBuy(dealData, user);
        console.log(`[DOC GEN] ✅ Retail Private Party Purchase Contract PDF generated:`, {
          fileName: purchaseContractResult?.fileName,
          filePath: purchaseContractResult?.filePath,
          fileSize: purchaseContractResult?.fileSize,
          documentNumber: purchaseContractResult?.documentNumber
        });
        
        // Add purchase contract to results
        documentResults.push({
          ...purchaseContractResult,
          documentType: 'retail_pp_buy',
          party: 'main'
        });
        
      } catch (err) {
        console.error(`[DOC GEN] Error generating retail-pp documents:`, err);
        throw err;
      }
    } else if (dealData.dealType === 'retail-d2d' && dealData.dealType2SubType === 'buy') {
      // Generate wholesale purchase agreement for retail-d2d buy deals
      console.log(`[DOC GEN] 🎯 BRANCH TAKEN: retail-d2d BUY - GENERATING WHOLESALE PURCHASE AGREEMENT`);
      console.log(`[DOC GEN] 🎯 retail-d2d buy deals generate wholesale purchase agreement`);
      console.log(`[DOC GEN] 🎯 dealData.dealType: "${dealData.dealType}"`);
      console.log(`[DOC GEN] 🎯 dealData.dealType2: "${dealData.dealType2}"`);
      console.log(`[DOC GEN] 🎯 dealData.dealType2SubType: "${dealData.dealType2SubType}"`);
      
      try {
        console.log(`[DOC GEN] 🔧 Generating wholesale purchase agreement for retail-d2d buy deal...`);
        const wholesalePurchaseResult = await documentGenerator.generateWholesalePPBuy(dealData, user);
        console.log(`[DOC GEN] ✅ Wholesale purchase agreement generated:`, wholesalePurchaseResult);
        
        documentResults.push({
          ...wholesalePurchaseResult,
          documentType: 'wholesale_purchase_agreement',
          party: 'main'
        });
        
      } catch (err) {
        console.error(`[DOC GEN] Error generating wholesale purchase agreement for retail-d2d buy:`, err);
        throw err;
      }
    } else {
      // Use the original generateDocument function for other deal types
      console.log(`[DOC GEN] 🎯 BRANCH TAKEN: DEFAULT (other deal types)`);
      console.log(`[DOC GEN] 🎯 This means none of the specific conditions matched!`);
      console.log(`[DOC GEN] 🎯 dealData.dealType: "${dealData.dealType}"`);
      console.log(`[DOC GEN] 🎯 dealData.dealType2: "${dealData.dealType2}"`);
      console.log(`[DOC GEN] 🎯 dealData.dealType2SubType: "${dealData.dealType2SubType}"`);
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('🔍 [DOC GEN DEBUG] CALLING MAIN DOCUMENT GENERATOR');
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('🔍 [DOC GEN DEBUG] About to call documentGenerator.generateDocument');
      console.log('🔍 [DOC GEN DEBUG] dealData keys:', Object.keys(dealData));
      console.log('🔍 [DOC GEN DEBUG] user keys:', Object.keys(user));
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      
      try {
        console.time('[PERF] generateDocument');
        console.log('🔍 [DOC GEN DEBUG] 🚀 Calling documentGenerator.generateDocument...');
        const documentResult = await documentGenerator.generateDocument(dealData, user);
        console.timeEnd('[PERF] generateDocument');
        console.log('🔍 [DOC GEN DEBUG] ✅ documentGenerator.generateDocument completed successfully');
        console.log('🔍 [DOC GEN DEBUG] Document result:', documentResult);
        console.log(`[DOC GEN] Document generated:`, documentResult);
        documentResults.push(documentResult);
        
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log('🔍 [DOC GEN DEBUG] MAIN DOCUMENT GENERATION COMPLETED');
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
      } catch (err) {
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log('🔍 [DOC GEN DEBUG] ❌ MAIN DOCUMENT GENERATION FAILED');
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.error(`[DOC GEN] Error generating document:`, err);
        console.error('🔍 [DOC GEN DEBUG] Error stack:', err.stack);
        console.error('🔍 [DOC GEN DEBUG] Error message:', err.message);
        console.error('🔍 [DOC GEN DEBUG] Error name:', err.name);
        throw err;
      }
    }

    // Generate the Vehicle Record PDF for ALL deals EXCEPT:
    // - wholesale d2d sale (handled separately)
    if (typeof documentGenerator.generateVehicleRecordPDF === 'function' && 
        !(dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale')) {
      try {
        console.log(`[DOC GEN] 🚗 Starting vehicle record generation for deal: ${deal._id}`);
        console.log(`[DOC GEN] 📊 Deal data for vehicle record:`, {
          dealType: dealData.dealType,
          dealType2SubType: dealData.dealType2SubType,
          stockNumber: dealData.stockNumber,
          vin: dealData.vin,
          year: dealData.year,
          make: dealData.make,
          model: dealData.model
        });
        console.log(`[DOC GEN] 👤 User data for vehicle record:`, {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        });
        
        // Debug: Check if dealData has required fields for vehicle record generation
        console.log(`[DOC GEN] 🔍 Vehicle record generation check:`, {
          hasVin: !!dealData.vin,
          hasStockNumber: !!dealData.stockNumber,
          hasYear: !!dealData.year,
          hasMake: !!dealData.make,
          hasModel: !!dealData.model,
          hasDealType: !!dealData.dealType,
          dealType: dealData.dealType,
          dealType2SubType: dealData.dealType2SubType
        });
        
        // For wholesale d2d sale deals, use the corrected saleDocumentData
        // Check if saleDocumentData exists (which means this is a wholesale d2d sale deal)
        const vehicleRecordData = (typeof saleDocumentData !== 'undefined' && saleDocumentData && dealData.dealType === 'wholesale-d2d') 
          ? saleDocumentData 
          : dealData;
        
        console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] 🔍 Vehicle Record Data Source (Non-Wholesale D2D Sale):');
        console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - Using regular dealData (not wholesale d2d sale)');
        console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - vehicleRecordData.dealType:', vehicleRecordData.dealType);
        console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - vehicleRecordData.dealType2SubType:', vehicleRecordData.dealType2SubType);
        console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - vehicleRecordData.dealType2:', vehicleRecordData.dealType2);
        
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log('🔍 [DOC GEN DEBUG] CALLING VEHICLE RECORD GENERATOR');
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log('🔍 [DOC GEN DEBUG] About to call documentGenerator.generateVehicleRecordPDF');
        console.log('🔍 [DOC GEN DEBUG] vehicleRecordData keys:', Object.keys(vehicleRecordData));
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        
        console.time('[PERF] generateVehicleRecordPDF');
        console.log('🔍 [DOC GEN DEBUG] 🚀 Calling documentGenerator.generateVehicleRecordPDF...');
        vehicleRecordResult = await documentGenerator.generateVehicleRecordPDF(vehicleRecordData, user);
        console.timeEnd('[PERF] generateVehicleRecordPDF');
        console.log('🔍 [DOC GEN DEBUG] ✅ documentGenerator.generateVehicleRecordPDF completed successfully');
        console.log('🔍 [DOC GEN DEBUG] Vehicle record result:', vehicleRecordResult);
        
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log('🔍 [DOC GEN DEBUG] VEHICLE RECORD GENERATION COMPLETED');
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        
        console.log(`[DOC GEN] ✅ Vehicle Record PDF generated successfully:`, {
          fileName: vehicleRecordResult?.fileName,
          filePath: vehicleRecordResult?.filePath,
          fileSize: vehicleRecordResult?.fileSize,
          documentType: vehicleRecordResult?.documentType
        });
        
        // Verify the file was actually created
        if (vehicleRecordResult?.filePath) {
          const fileExists = await fs.pathExists(vehicleRecordResult.filePath);
          console.log(`[DOC GEN] 📁 Vehicle record file exists: ${fileExists}`);
          if (fileExists) {
            const stats = await fs.stat(vehicleRecordResult.filePath);
            console.log(`[DOC GEN] 📊 Vehicle record file size: ${stats.size} bytes`);
          } else {
            console.error(`[DOC GEN] ❌ Vehicle record file was not created at: ${vehicleRecordResult.filePath}`);
          }
        }
        
      } catch (err) {
        console.error(`[DOC GEN] ❌ Error generating Vehicle Record PDF:`, err);
        console.error(`[DOC GEN] ❌ Error stack:`, err.stack);
        console.error(`[DOC GEN] ❌ Deal data that caused error:`, JSON.stringify(dealData, null, 2));
        console.error(`[DOC GEN] ❌ User data that caused error:`, JSON.stringify(user, null, 2));
        // Don't throw the error, but log it thoroughly for debugging
        vehicleRecordResult = null;
      }
    } else {
      if (dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale') {
        console.log(`[DOC GEN] 🚫 Skipping vehicle record generation for wholesale D2D sale deal - handled separately`);
      } else {
        console.warn(`[DOC GEN] ⚠️ generateVehicleRecordPDF function not available`);
      }
    }

    // Check if vehicle record already exists for this deal
    console.log(`[DOC GEN] 🔍 Checking for existing vehicle record for deal: ${deal._id}`);
    console.log(`[DOC GEN] 🔍 Request body data:`, {
      generalNotes: req.body.generalNotes,
      vehicleDescription: req.body.vehicleDescription,
      buyerName: req.body.buyerName,
      buyerType: req.body.buyerType,
      sellerType: req.body.sellerType
    });
    console.log(`[DOC GEN] 🔍 Deal data:`, {
      generalNotes: deal.generalNotes,
      vehicleDescription: deal.vehicleDescription,
      buyer: deal.buyer,
      seller: deal.seller,
      notes: deal.notes
    });
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] VEHICLE RECORD LOOKUP');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    let vehicleRecord = await VehicleRecord.findOne({ dealId: deal._id });
    console.log('🔍 [DOC GEN DEBUG] Vehicle record lookup result:', vehicleRecord ? 'Found' : 'Not found');
    if (vehicleRecord) {
      console.log('🔍 [DOC GEN DEBUG] Existing vehicle record ID:', vehicleRecord._id);
      console.log('🔍 [DOC GEN DEBUG] Existing vehicle record documents count:', vehicleRecord.generatedDocuments?.length || 0);
    }
    
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // Clear existing documents for retail-pp deals to prevent duplicates
    if (dealData.dealType === 'retail-pp' && vehicleRecord) {
      console.log(`[DOC GEN] 🧹 Clearing existing documents for retail-pp deal to prevent duplicates`);
      console.log(`[DOC GEN] 🧹 Previous document count: ${vehicleRecord.generatedDocuments.length}`);
      vehicleRecord.generatedDocuments = [];
      await vehicleRecord.save();
      console.log(`[DOC GEN] 🧹 Cleared existing documents`);
    }
    
    // Clear existing deal documents for retail-pp deals to prevent duplicates
    if (dealData.dealType === 'retail-pp') {
      console.log(`[DOC GEN] 🧹 Clearing existing deal documents for retail-pp deal to prevent duplicates`);
      console.log(`[DOC GEN] 🧹 Previous deal document count: ${deal.documents ? deal.documents.length : 0}`);
      if (deal.documents) {
        deal.documents = [];
        await deal.save();
        console.log(`[DOC GEN] 🧹 Cleared existing deal documents`);
      } else {
        console.log(`[DOC GEN] 🧹 No documents array found on deal, skipping clear`);
      }
    }
    
    if (!vehicleRecord) {
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('🔍 [DOC GEN DEBUG] CREATING NEW VEHICLE RECORD');
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log(`[DOC GEN] 🚗 No existing vehicle record found, creating new one for deal: ${deal._id}`);
      console.log(`[DOC GEN] 📋 Deal details for vehicle record:`, {
        vin: deal.vin,
        year: deal.year,
        make: deal.make,
        model: deal.model,
        stockNumber: deal.stockNumber,
        dealType: deal.dealType,
        dealType2: req.body.dealType2 || dealData.dealType2,
        dealType2SubType: req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType || 'buy',
        purchasePrice: deal.purchasePrice,
        listPrice: deal.listPrice,
        wholesalePrice: deal.wholesalePrice,
        instantOffer: deal.instantOffer,
        salesperson: deal.salesperson,
        seller: deal.seller,
        buyer: {
          ...deal.buyer,
          name: req.body.buyerName || deal.buyer?.name || 'N/A',
          type: req.body.buyerType || deal.buyer?.type || 'private'
        },
        brokerFee: deal.brokerFee,
        brokerFeePaidTo: deal.brokerFeePaidTo,
        payoffBalance: deal.payoffBalance,
        amountDueToCustomer: deal.amountDueToCustomer,
        amountDueToRP: deal.amountDueToRP,
        paymentMethod: deal.paymentMethod,
        paymentTerms: deal.paymentTerms,
        fundingSource: deal.fundingSource,
        vehicleDescription: deal.vehicleDescription,
        generalNotes: deal.generalNotes,
        rpStockNumber: deal.rpStockNumber
      });
      
      // Create vehicle record if it doesn't exist
      console.log(`[DOC GEN] 🏗️ Creating new VehicleRecord with data:`, {
        vin: deal.vin,
        year: deal.year,
        make: deal.make,
        model: deal.model,
        stockNumber: deal.stockNumber,
        color: deal.color,
        exteriorColor: deal.exteriorColor,
        interiorColor: deal.interiorColor,
        mileage: deal.mileage,
        dealId: deal._id,
        dealType: deal.dealType,
        dealType2: req.body.dealType2 || dealData.dealType2,
        dealType2SubType: req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType || 'buy',
        purchasePrice: deal.purchasePrice,
        listPrice: deal.listPrice,
        wholesalePrice: req.body.wholesalePrice || deal.wholesalePrice || 0,
        instantOffer: deal.instantOffer,
        commission: {
          rate: req.body.commissionRate,
          amount: req.body.commissionRate ? (deal.purchasePrice * req.body.commissionRate / 100) : 0
        },
        brokerFee: deal.brokerFee,
        brokerFeePaidTo: deal.brokerFeePaidTo,
        payoffBalance: deal.payoffBalance,
        amountDueToCustomer: deal.amountDueToCustomer,
        amountDueToRP: deal.amountDueToRP,
        seller: deal.seller,
        buyer: {
          ...deal.buyer,
          name: req.body.buyerName || deal.buyer?.name || 'N/A',
          type: req.body.buyerType || deal.buyer?.type || 'private'
        },
        paymentMethod: deal.paymentMethod,
        paymentTerms: deal.paymentTerms,
        fundingSource: deal.fundingSource,
        vehicleDescription: req.body.vehicleDescription || deal.vehicleDescription,
        generalNotes: req.body.generalNotes || deal.generalNotes || deal.notes,
        rpStockNumber: deal.rpStockNumber,
        generatedDocuments: [],
        createdBy: userId,
        salesperson: deal.salesperson
      });
      
      // Handle buyer/seller info for wholesale D2D buy deals
      let vehicleRecordSeller = deal.seller;
      let vehicleRecordBuyer = {
        ...deal.buyer,
        name: req.body.buyerName || deal.buyer?.name || 'N/A',
        type: req.body.buyerType || deal.buyer?.type || 'private'
      };
      
      // For wholesale D2D buy: RP Exotics is the buyer, selling dealer is the seller
      if (dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Buy' || (req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType) === 'buy')) {
        const parseAddress = (addr) => {
          if (!addr) return {};
          if (typeof addr === 'object') return addr;
          const parts = addr.split(',').map(s => s.trim());
          return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || ''
          };
        };
        
        vehicleRecordSeller = {
          ...deal.seller,
          name: deal.seller?.name || 'N/A',
          type: req.body.sellerType || deal.seller?.type || 'dealer',
          licenseNumber: req.body.sellerLicenseNumber || deal.seller?.licenseNumber || '',
          tier: req.body.sellerTier || deal.seller?.tier || 'Tier 1',
          contact: {
            address: req.body.sellerAddress ? parseAddress(req.body.sellerAddress) : (deal.seller?.contact?.address || {}),
            phone: req.body.sellerPhone || deal.seller?.contact?.phone || 'N/A',
            email: req.body.sellerEmail || deal.seller?.contact?.email || 'N/A'
          }
        };
        
        vehicleRecordBuyer = {
          name: 'RP Exotics',
          type: 'dealer',
          licenseNumber: 'D4865',
          tier: 'Tier 1',
          contact: {
            address: {
              street: '1155 N Warson Rd',
              city: 'Saint Louis',
              state: 'MO',
              zip: '63132'
            },
            phone: '(314) 970-2427',
            email: 'titling@rpexotics.com'
          }
        };
        
        console.log(`[DOC GEN] 🔧 Vehicle Record Creation - Selling dealer (seller):`, vehicleRecordSeller);
        console.log(`[DOC GEN] 🔧 Vehicle Record Creation - RP Exotics (buyer):`, vehicleRecordBuyer);
      }
      // For wholesale D2D sale: RP Exotics is the seller, purchasing dealer is the buyer
      else if (dealData.dealType === 'wholesale-d2d' && ((req.body.dealType2 || dealData.dealType2) === 'Sale' || (req.body.dealType2SubType || dealData.dealType2SubType || deal.dealType2SubType) === 'sale')) {
        console.log(`[DOC GEN][VEHICLE_RECORD][DEBUG] 🔍 ENHANCED DEBUGGING FOR WHOLESALE D2D SALE VEHICLE RECORD`);
        console.log(`[DOC GEN][VEHICLE_RECORD][DEBUG] 🔍 Original deal.buyer:`, JSON.stringify(deal.buyer, null, 2));
        console.log(`[DOC GEN][VEHICLE_RECORD][DEBUG] 🔍 Request body buyer info:`, {
          buyerName: req.body.buyerName,
          buyerType: req.body.buyerType,
          buyerLicenseNumber: req.body.buyerLicenseNumber,
          buyerTier: req.body.buyerTier,
          buyerAddress: req.body.buyerAddress,
          buyerPhone: req.body.buyerPhone,
          buyerEmail: req.body.buyerEmail
        });
        
        const parseAddress = (addr) => {
          if (!addr) return {};
          if (typeof addr === 'object') return addr;
          const parts = addr.split(',').map(s => s.trim());
          return {
            street: parts[0] || '',
            city: parts[1] || '',
            state: parts[2] || '',
            zip: parts[3] || ''
          };
        };
        
        vehicleRecordSeller = {
          name: 'RP Exotics',
          type: 'dealer',
          licenseNumber: 'D4865',
          tier: 'Tier 1',
          contact: {
            address: {
              street: '1155 N Warson Rd',
              city: 'Saint Louis',
              state: 'MO',
              zip: '63132'
            },
            phone: '(314) 970-2427',
            email: 'titling@rpexotics.com'
          }
        };
        
        vehicleRecordBuyer = {
          ...deal.buyer,
          name: req.body.buyerName || deal.buyer?.name || 'N/A',
          type: req.body.buyerType || deal.buyer?.type || 'dealer',
          licenseNumber: req.body.buyerLicenseNumber || deal.buyer?.licenseNumber || '',
          tier: req.body.buyerTier || deal.buyer?.tier || 'Tier 1',
          contact: {
            address: req.body.buyerAddress ? parseAddress(req.body.buyerAddress) : (deal.buyer?.contact?.address || {}),
            phone: req.body.buyerPhone || deal.buyer?.contact?.phone || 'N/A',
            email: req.body.buyerEmail || deal.buyer?.contact?.email || 'N/A'
          }
        };
        
        console.log(`[DOC GEN] 🔧 Vehicle Record Creation - RP Exotics (seller):`, vehicleRecordSeller);
        console.log(`[DOC GEN] 🔧 Vehicle Record Creation - Purchasing dealer (buyer):`, vehicleRecordBuyer);
        console.log(`[DOC GEN][VEHICLE_RECORD][DEBUG] 🔍 Final vehicleRecordSeller:`, JSON.stringify(vehicleRecordSeller, null, 2));
        console.log(`[DOC GEN][VEHICLE_RECORD][DEBUG] 🔍 Final vehicleRecordBuyer:`, JSON.stringify(vehicleRecordBuyer, null, 2));
      }
      
      console.log(`[DOC GEN][VEHICLE_RECORD] 🔧 Creating vehicle record with dealType2:`, dealData.dealType2);
      console.log(`[DOC GEN][VEHICLE_RECORD] 🔧 dealData for vehicle record:`, {
        dealType: dealData.dealType,
        dealType2SubType: dealData.dealType2SubType,
        dealType2: dealData.dealType2
      });
      console.log(`[DOC GEN][VEHICLE_RECORD] 🔧 dealData object keys:`, Object.keys(dealData));
      console.log(`[DOC GEN][VEHICLE_RECORD] 🔧 dealData.dealType2 type:`, typeof dealData.dealType2);
      
      vehicleRecord = new VehicleRecord({
        vin: deal.vin,
        year: deal.year,
        make: deal.make,
        model: deal.model,
        stockNumber: deal.stockNumber,
        color: deal.color,
        exteriorColor: deal.exteriorColor,
        interiorColor: deal.interiorColor,
        mileage: deal.mileage,
        dealId: deal._id,
        dealType: deal.dealType,
        dealType2: req.body.dealType2 || dealData.dealType2,
        // 🔧 DEBUG VEHICLE RECORD DEAL TYPE 2
                 dealType2SubType: (() => {
           // Use dynamic values from request body or dealData
           const dynamicSubType = (req.body.dealType2 || dealData.dealType2)?.toLowerCase() || 'buy';
           console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] 🔍 Vehicle Record dealType2SubType calculation:');
           console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - req.body.dealType2:', req.body.dealType2);
           console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - dealData.dealType2:', dealData.dealType2);
           console.log('[DOC GEN][VEHICLE_RECORD_DEBUG] - Final dynamic result (lowercase):', dynamicSubType);
           return dynamicSubType;
         })(),
        purchasePrice: deal.purchasePrice,
        listPrice: deal.listPrice,
        wholesalePrice: req.body.wholesalePrice || deal.wholesalePrice || 0,
        instantOffer: deal.instantOffer,
        commission: {
          rate: req.body.commissionRate,
          amount: req.body.commissionRate ? (deal.purchasePrice * req.body.commissionRate / 100) : 0
        },
        brokerFee: deal.brokerFee,
        brokerFeePaidTo: deal.brokerFeePaidTo,
        payoffBalance: deal.payoffBalance,
        amountDueToCustomer: deal.amountDueToCustomer,
        amountDueToRP: deal.amountDueToRP,
        seller: vehicleRecordSeller,
        buyer: vehicleRecordBuyer,
        paymentMethod: deal.paymentMethod,
        paymentTerms: deal.paymentTerms,
        fundingSource: deal.fundingSource,
        vehicleDescription: req.body.vehicleDescription || deal.vehicleDescription,
        generalNotes: req.body.generalNotes || deal.generalNotes || deal.notes,
        rpStockNumber: deal.rpStockNumber,
        generatedDocuments: [],
        createdBy: userId,
        salesperson: deal.salesperson
      });

      console.log(`[DOC GEN] 📝 New vehicle record object created:`, {
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        color: vehicleRecord.color,
        exteriorColor: vehicleRecord.exteriorColor,
        interiorColor: vehicleRecord.interiorColor,
        mileage: vehicleRecord.mileage,
        dealId: vehicleRecord.dealId,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        seller: vehicleRecord.seller,
        buyer: vehicleRecord.buyer,
        wholesalePrice: vehicleRecord.wholesalePrice
      });

      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('🔍 [DOC GEN DEBUG] SAVING NEW VEHICLE RECORD');
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('🔍 [DOC GEN DEBUG] About to save new vehicle record...');
      console.log('🔍 [DOC GEN DEBUG] Vehicle record data before save:', {
        vin: vehicleRecord.vin,
        year: vehicleRecord.year,
        make: vehicleRecord.make,
        model: vehicleRecord.model,
        dealId: vehicleRecord.dealId,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        dealType2SubType: vehicleRecord.dealType2SubType,
        seller: vehicleRecord.seller,
        buyer: vehicleRecord.buyer
      });
      
      try {
        console.log(`[DOC GEN] 💾 Attempting to save vehicle record...`);
        await vehicleRecord.save();
        console.log('🔍 [DOC GEN DEBUG] ✅ Vehicle record saved successfully');
        console.log(`[DOC GEN] ✅ New vehicle record saved successfully: ${vehicleRecord._id}`);
        
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log('🔍 [DOC GEN DEBUG] NEW VEHICLE RECORD SAVED SUCCESSFULLY');
        console.log('🔍 [DOC GEN DEBUG] ===========================================');
        console.log(`[DOC GEN] 📊 New vehicle record details:`, {
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
          dealType2SubType: vehicleRecord.dealType2SubType,
          purchasePrice: vehicleRecord.purchasePrice,
          listPrice: vehicleRecord.listPrice,
          wholesalePrice: vehicleRecord.wholesalePrice,
          instantOffer: vehicleRecord.instantOffer,
          seller: vehicleRecord.seller,
          buyer: vehicleRecord.buyer,
          brokerFee: vehicleRecord.brokerFee,
          brokerFeePaidTo: vehicleRecord.brokerFeePaidTo,
          payoffBalance: vehicleRecord.payoffBalance,
          amountDueToCustomer: vehicleRecord.amountDueToCustomer,
          amountDueToRP: vehicleRecord.amountDueToRP,
          paymentMethod: vehicleRecord.paymentMethod,
          paymentTerms: vehicleRecord.paymentTerms,
          fundingSource: vehicleRecord.fundingSource,
          vehicleDescription: vehicleRecord.vehicleDescription,
          generalNotes: vehicleRecord.generalNotes,
          rpStockNumber: vehicleRecord.rpStockNumber,
          generatedDocuments: vehicleRecord.generatedDocuments.length,
          createdAt: vehicleRecord.createdAt
        });
      } catch (saveError) {
        console.error(`[DOC GEN] ❌ Error saving new vehicle record:`, saveError);
        console.error(`[DOC GEN] ❌ Save error details:`, {
          message: saveError.message,
          code: saveError.code,
          name: saveError.name,
          stack: saveError.stack
        });
        throw saveError;
      }
      
      // Update the deal with vehicle record reference
      console.log(`[DOC GEN] 🔗 Linking new vehicle record ${vehicleRecord._id} to deal ${deal._id}`);
      deal.vehicleRecordId = vehicleRecord._id;
    } else {
      console.log(`[DOC GEN] ✅ Found existing vehicle record: ${vehicleRecord._id}`);
      console.log(`[DOC GEN] 📊 Existing vehicle record details:`, {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        existingDocuments: vehicleRecord.generatedDocuments.length
      });
    }

    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] ATTACHING VEHICLE RECORD PDF');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] vehicleRecordResult exists:', !!vehicleRecordResult);
    console.log('🔍 [DOC GEN DEBUG] vehicleRecordResult:', vehicleRecordResult);
    console.log('🔍 [DOC GEN DEBUG] vehicleRecord exists:', !!vehicleRecord);
    console.log('🔍 [DOC GEN DEBUG] vehicleRecord ID:', vehicleRecord?._id);
    
    // Add the vehicle record PDF to the vehicle record
    if (vehicleRecordResult) {
      vehicleRecord.generatedDocuments.push({
        documentType: 'vehicle_record_pdf',
        fileName: vehicleRecordResult.fileName,
        filePath: vehicleRecordResult.filePath,
        fileSize: vehicleRecordResult.fileSize,
        generatedBy: userId,
        documentNumber: vehicleRecordResult.documentNumber,
        status: 'draft'
      });
      // Also add to deal documents
      if (!deal.documents) {
        deal.documents = [];
      }
      deal.documents.push({
        type: 'vehicle_record_pdf',
        fileName: vehicleRecordResult.fileName,
        filePath: vehicleRecordResult.filePath,
        fileSize: vehicleRecordResult.fileSize,
        mimeType: 'application/pdf',
        uploaded: true,
        uploadedAt: new Date(),
        uploadedBy: userId,
        approved: false,
        required: true,
        notes: '',
        version: 1
      });
      console.log('[DEBUG] After push: deal.documents (vehicle_record_pdf):', JSON.stringify(deal.documents, null, 2));
    }
        // Add all generated documents to the deal documents and vehicle record
    console.log(`[DOC GEN] 📄 Processing ${documentResults.length} document results`);
    
    for (const documentResult of documentResults) {
      // Skip documents without a valid document type
      if (!documentResult?.documentType) {
        console.warn(`[DOC GEN] ⚠️ Skipping document result without documentType:`, documentResult);
        continue;
      }
      
      const documentType = documentResult.documentType;
      const party = documentResult?.party || 'main';
      
      console.log(`[DOC GEN] 📄 Processing document result:`, {
        fileName: documentResult.fileName,
        filePath: documentResult.filePath,
        fileSize: documentResult.fileSize,
        documentNumber: documentResult.documentNumber,
        documentType: documentResult.documentType,
        party: party
      });
      
      console.log(`[DOC GEN] 📄 Final document type determined: ${documentType}`);
      console.log(`[DOC GEN] 📄 Adding ${documentType} document to deal:`, documentResult.fileName);
      
      // Add to deal documents
      console.log(`[DOC GEN] 📄 Adding document to deal.documents:`, {
        type: documentType,
        fileName: documentResult.fileName,
        fileSize: documentResult.fileSize,
        party: party
      });
      
      if (!deal.documents) {
        deal.documents = [];
      }
      
      deal.documents.push({
        type: documentType,
        fileName: documentResult.fileName,
        filePath: documentResult.filePath,
        fileSize: documentResult.fileSize,
        mimeType: 'application/pdf',
        uploaded: true,
        uploadedAt: new Date(),
        uploadedBy: userId,
        approved: false,
        required: true,
        notes: `Generated for ${party}`,
        version: 1,
        party: party
      });
      
      console.log(`[DOC GEN] 📄 Deal documents count after push: ${deal.documents.length}`);
      
      // Add to vehicle record generated documents
      console.log(`[DOC GEN] 📄 Adding document to vehicleRecord.generatedDocuments:`, {
        documentType: documentType,
        fileName: documentResult.fileName,
        fileSize: documentResult.fileSize,
        documentNumber: documentResult.documentNumber,
        party: party
      });
      
      vehicleRecord.generatedDocuments.push({
        documentType: documentType,
        fileName: documentResult.fileName,
        filePath: documentResult.filePath,
        fileSize: documentResult.fileSize,
        generatedBy: userId,
        documentNumber: documentResult.documentNumber,
        status: 'draft',
        party: party
      });
      
      console.log(`[DOC GEN] 📄 Vehicle record generated documents count after push: ${vehicleRecord.generatedDocuments.length}`);
    }
    
    if (documentResults.length === 0) {
      console.log(`[DOC GEN] ⚠️ No document results available`);
    }
    
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] FINAL VEHICLE RECORD SAVE');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] About to save vehicle record with documents...');
    console.log('🔍 [DOC GEN DEBUG] Vehicle record documents count:', vehicleRecord.generatedDocuments.length);
    console.log('🔍 [DOC GEN DEBUG] Vehicle record documents:', vehicleRecord.generatedDocuments.map(d => ({documentType: d.documentType, fileName: d.fileName})));
    
    console.log(`[DOC GEN] 💾 Saving vehicle record with ${vehicleRecord.generatedDocuments.length} documents...`);
    await vehicleRecord.save();
    console.log('🔍 [DOC GEN DEBUG] ✅ Vehicle record saved successfully');
    console.log(`[DOC GEN] ✅ Vehicle record saved successfully`);
    
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] FINAL VEHICLE RECORD SAVE COMPLETED');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // --- FINAL CHECK: Ensure Vehicle Record PDF is always present in deal.documents and vehicleRecord.generatedDocuments ---
    if (vehicleRecordResult && vehicleRecord) {
      console.log('[DOC GEN][DEBUG] Final v-record check: vehicleRecordResult:', JSON.stringify(vehicleRecordResult, null, 2));
      console.log('[DOC GEN][DEBUG] deal.documents before v-record push:', JSON.stringify((deal.documents || []).map(d => ({type: d.type, fileName: d.fileName})), null, 2));
      console.log('[DOC GEN][DEBUG] vehicleRecord.generatedDocuments before v-record push:', JSON.stringify(vehicleRecord.generatedDocuments.map(d => ({documentType: d.documentType, fileName: d.fileName})), null, 2));
      const alreadyInDealDocs = (deal.documents || []).some(doc => doc.fileName === vehicleRecordResult.fileName && doc.type === 'vehicle_record_pdf');
      if (!alreadyInDealDocs) {
        if (!deal.documents) {
          deal.documents = [];
        }
        deal.documents.push({
          type: 'vehicle_record_pdf',
          fileName: vehicleRecordResult.fileName,
          filePath: vehicleRecordResult.filePath,
          fileSize: vehicleRecordResult.fileSize,
          mimeType: 'application/pdf',
          uploaded: true,
          uploadedAt: new Date(),
          uploadedBy: userId,
          approved: false,
          required: true,
          notes: '',
          version: 1
        });
        console.log('[DOC GEN][FIX] Added vehicle_record_pdf to deal.documents:', vehicleRecordResult.fileName);
      } else {
        console.log('[DOC GEN][DEBUG] vehicle_record_pdf already present in deal.documents:', vehicleRecordResult.fileName);
      }
      const alreadyInVRecDocs = vehicleRecord.generatedDocuments.some(doc => doc.fileName === vehicleRecordResult.fileName && doc.documentType === 'vehicle_record_pdf');
      if (!alreadyInVRecDocs) {
        vehicleRecord.generatedDocuments.push({
          documentType: 'vehicle_record_pdf',
          fileName: vehicleRecordResult.fileName,
          filePath: vehicleRecordResult.filePath,
          fileSize: vehicleRecordResult.fileSize,
          generatedBy: userId,
          documentNumber: vehicleRecordResult.documentNumber,
          status: 'draft'
        });
        console.log('[DOC GEN][FIX] Added vehicle_record_pdf to vehicleRecord.generatedDocuments:', vehicleRecordResult.fileName);
      } else {
        console.log('[DOC GEN][DEBUG] vehicle_record_pdf already present in vehicleRecord.generatedDocuments:', vehicleRecordResult.fileName);
      }
      console.log('[DOC GEN][DEBUG] deal.documents after v-record push:', JSON.stringify((deal.documents || []).map(d => ({type: d.type, fileName: d.fileName})), null, 2));
      console.log('[DOC GEN][DEBUG] vehicleRecord.generatedDocuments after v-record push:', JSON.stringify(vehicleRecord.generatedDocuments.map(d => ({documentType: d.documentType, fileName: d.fileName})), null, 2));
      // Also ensure v record is in documentResults for API/UI
      const alreadyInDocResults = documentResults.some(doc => doc.fileName === vehicleRecordResult.fileName && doc.documentType === 'vehicle_record_pdf');
      if (!alreadyInDocResults) {
        documentResults.push({
          ...vehicleRecordResult,
          documentType: 'vehicle_record_pdf',
          party: 'main'
        });
        console.log('[DOC GEN][FIX] Added vehicle_record_pdf to documentResults for API/UI:', vehicleRecordResult.fileName);
      } else {
        console.log('[DOC GEN][DEBUG] vehicle_record_pdf already present in documentResults:', vehicleRecordResult.fileName);
      }
    }

    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] FINAL DEAL SAVE');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] About to save deal with documents...');
    console.log('🔍 [DOC GEN DEBUG] Deal documents count:', deal.documents ? deal.documents.length : 0);
    console.log('🔍 [DOC GEN DEBUG] Deal documents:', (deal.documents || []).map(d => ({type: d.type, fileName: d.fileName})));
    
    try {
      console.log(`[DOC GEN] 💾 Saving deal with ${deal.documents ? deal.documents.length : 0} documents...`);
      await deal.save();
      console.log('🔍 [DOC GEN DEBUG] ✅ Deal saved successfully');
      console.log('[DOC GEN] ✅ Deal saved successfully');
      
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('🔍 [DOC GEN DEBUG] FINAL DEAL SAVE COMPLETED');
      console.log('🔍 [DOC GEN DEBUG] ===========================================');
      console.log('[DOC GEN] 📄 Final deal.documents:', JSON.stringify((deal.documents || []).map(d => ({
        type: d.type,
        fileName: d.fileName,
        fileSize: d.fileSize,
        uploaded: d.uploaded,
        approved: d.approved
      })), null, 2));
    } catch (err) {
      console.error('[DOC GEN] ❌ Error on deal.save():', err);
      console.error('[DOC GEN] ❌ Deal save error details:', {
        message: err.message,
        code: err.code,
        name: err.name,
        stack: err.stack
      });
      throw err;
    }
    // Log full deal and vehicle record after save
    console.log('[DOC GEN] Deal after save:', JSON.stringify(deal, null, 2));
    console.log('[DOC GEN] VehicleRecord after save:', JSON.stringify(vehicleRecord, null, 2));

    // Before sending response, log the final documentResults array
    console.log('[DOC GEN][DEBUG] Final documentResults for API/UI:', JSON.stringify(documentResults.map(d => ({type: d.documentType, fileName: d.fileName})), null, 2));

    // Update document generation status to completed
    deal.documentGenerationStatus = 'completed';
    deal.documentGenerationError = null;
    try {
      await deal.save();
      console.log('[DOC GEN] ✅ Deal status updated to completed successfully');
    } catch (saveError) {
      console.error('[DOC GEN] ❌ Error saving deal with completed status:', saveError);
      // Don't throw here, just log the error
    }
    
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] SENDING SUCCESS RESPONSE');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] Final documentResults count:', documentResults.length);
    console.log('🔍 [DOC GEN DEBUG] Final vehicleRecord ID:', vehicleRecord?._id);
    console.log('🔍 [DOC GEN DEBUG] Final deal ID:', deal._id);
    console.log('🔍 [DOC GEN DEBUG] Response data:', {
      success: true,
      message: 'Document(s) generated and vehicle record created successfully',
      vehicleRecord: {
        recordId: vehicleRecord.recordId,
        id: vehicleRecord._id,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2
      },
      documents: documentResults.map(doc => ({
        fileName: doc.fileName,
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        party: doc.party
      })),
      documentCount: documentResults.length
    });
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // Add CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.json({
      success: true,
      message: 'Document(s) generated and vehicle record created successfully',
      vehicleRecord: {
        recordId: vehicleRecord.recordId,
        id: vehicleRecord._id,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2
      },
      documents: documentResults.map(doc => ({
        fileName: doc.fileName,
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        party: doc.party,
        downloadUrl: `/api/documents/download/${doc.fileName}`
      })),
      documentCount: documentResults.length
    });

  } catch (error) {
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.log('🔍 [DOC GEN DEBUG] ❌ DOCUMENT GENERATION FAILED');
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    console.error('[DOC GEN] Error generating document:', error, error?.stack);
    console.error('[DOC GEN] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    
    console.log('🔍 [DOC GEN DEBUG] Error occurred at:', new Date().toISOString());
    console.log('🔍 [DOC GEN DEBUG] Deal ID:', deal?._id);
    console.log('🔍 [DOC GEN DEBUG] User ID:', userId);
    console.log('🔍 [DOC GEN DEBUG] ===========================================');
    
    // Update document generation status to failed
    if (deal) {
      deal.documentGenerationStatus = 'failed';
      deal.documentGenerationError = error.message;
      await deal.save();
    }
    
    // Add CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ 
      error: 'Failed to generate document', 
      details: error?.message || error,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate wholesale purchase order specifically
router.post('/generate-wholesale/:dealId', auth, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.id;

    console.log(`[WHOLESALE DOC] Received request to generate wholesale purchase order for dealId: ${dealId} by user: ${userId}`);

    // Find the deal
    const deal = await Deal.findById(dealId);
    if (!deal) {
      console.error(`[WHOLESALE DOC] Deal not found for dealId: ${dealId}`);
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[WHOLESALE DOC] User not found for userId: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare deal data for wholesale purchase order
    const seller = deal.seller || {};
    const sellerInfo = {
      name: seller.name,
      email: seller.email || (seller.contact && seller.contact.email),
      phone: seller.phone || (seller.contact && seller.contact.phone),
      address: seller.address || (seller.contact && seller.contact.address),
      licenseNumber: seller.licenseNumber || '',
      tier: seller.tier || 'Tier 1',
      type: seller.type,
    };
    
    const dealData = {
      year: deal.year,
      make: deal.make,
      model: deal.model,
      vin: deal.vin,
      stockNumber: deal.stockNumber || 'N/A',
      color: deal.color || deal.exteriorColor || 'N/A',
      exteriorColor: deal.exteriorColor || deal.color || 'N/A',
      interiorColor: deal.interiorColor || 'N/A',
      mileage: deal.mileage,
      purchasePrice: deal.purchasePrice,
      dealType: 'wholesale', // Force wholesale type
      sellerInfo: sellerInfo,
      paymentMethod: req.body.paymentMethod || 'N/A',
      paymentTerms: req.body.paymentTerms || 'N/A',
      titleStatus: req.body.titleStatus || 'N/A',
      deliveryDate: req.body.deliveryDate || 'N/A',
      notes: deal.notes || req.body.notes || 'N/A',
      vehicleDescription: req.body.vehicleDescription || 'N/A'
    };

    console.log(`[WHOLESALE DOC] Prepared dealData:`, dealData);

    // Generate wholesale purchase order
    let documentResult;
    try {
      documentResult = await documentGenerator.generateBillOfSale(dealData, user);
      console.log(`[WHOLESALE DOC] Document generated:`, documentResult);
    } catch (docGenErr) {
      console.error(`[WHOLESALE DOC] Error in documentGenerator.generateBillOfSale:`, docGenErr);
      throw docGenErr;
    }

    // After generating the main contract document, always generate a vehicle record PDF
    let vehicleRecordResult;
    try {
      vehicleRecordResult = await documentGenerator.generateVehicleRecordPDF(dealData, user);
      console.log('[DOC GEN][V-RECORD] Generated vehicle record PDF:', vehicleRecordResult.fileName);
      // Attach to deal.documents if not already present
      const alreadyInDealDocs = (deal.documents || []).some(doc => doc.fileName === vehicleRecordResult.fileName && doc.type === 'vehicle_record_pdf');
      if (!alreadyInDealDocs) {
        if (!deal.documents) {
          deal.documents = [];
        }
        deal.documents.push({
          type: 'vehicle_record_pdf',
          fileName: vehicleRecordResult.fileName,
          filePath: vehicleRecordResult.filePath,
          fileSize: vehicleRecordResult.fileSize,
          mimeType: 'application/pdf',
          uploaded: true,
          uploadedAt: new Date(),
          uploadedBy: user && user._id ? user._id : undefined,
          approved: false,
          required: true,
          notes: 'Generated for main',
          version: 1
        });
        console.log('[DOC GEN][V-RECORD] Added vehicle record PDF to deal.documents');
      } else {
        console.log('[DOC GEN][V-RECORD] Vehicle record PDF already present in deal.documents');
      }
      // Attach to vehicleRecord.generatedDocuments if not already present
      if (vehicleRecord) {
        const alreadyInVehicleDocs = vehicleRecord.generatedDocuments.some(doc => doc.fileName === vehicleRecordResult.fileName && doc.documentType === 'vehicle_record_pdf');
        if (!alreadyInVehicleDocs) {
          vehicleRecord.generatedDocuments.push({
            documentType: 'vehicle_record_pdf',
            fileName: vehicleRecordResult.fileName,
            filePath: vehicleRecordResult.filePath,
            fileSize: vehicleRecordResult.fileSize,
            generatedBy: user && user._id ? user._id : undefined,
            generatedAt: new Date(),
            status: 'draft'
          });
          console.log('[DOC GEN][V-RECORD] Added vehicle record PDF to vehicleRecord.generatedDocuments');
        } else {
          console.log('[DOC GEN][V-RECORD] Vehicle record PDF already present in vehicleRecord.generatedDocuments');
        }
      }
    } catch (err) {
      console.error('[DOC GEN][V-RECORD] Error generating vehicle record PDF:', err);
    }

    // Check if vehicle record already exists for this deal
    console.log(`[WHOLESALE DOC] 🔍 Checking for existing vehicle record for deal: ${deal._id}`);
    let vehicleRecord = await VehicleRecord.findOne({ dealId: deal._id });
    
    if (!vehicleRecord) {
      console.log(`[WHOLESALE DOC] 🚗 No existing vehicle record found, creating new one for deal: ${deal._id}`);
      // Create vehicle record if it doesn't exist
      vehicleRecord = new VehicleRecord({
        vin: deal.vin,
        year: deal.year,
        make: deal.make,
        model: deal.model,
        stockNumber: deal.stockNumber,
        color: deal.color,
        exteriorColor: deal.exteriorColor,
        interiorColor: deal.interiorColor,
        mileage: deal.mileage,
        dealId: deal._id,
        dealType: deal.dealType,
        dealType2: req.body.dealType2 || '',
        purchasePrice: deal.purchasePrice,
        listPrice: deal.listPrice,
        commission: {
          rate: req.body.commissionRate || 0,
          amount: req.body.commissionRate ? (deal.purchasePrice * req.body.commissionRate / 100) : 0
        },
        generatedDocuments: [],
        createdBy: userId,
        salesperson: deal.salesperson
      });
      
      console.log(`[WHOLESALE DOC] 📝 New vehicle record object created:`, {
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
        console.log(`[WHOLESALE DOC] ✅ New vehicle record saved successfully: ${vehicleRecord._id}`);
        console.log(`[WHOLESALE DOC] 📊 New vehicle record details:`, {
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
        console.error(`[WHOLESALE DOC] ❌ Error saving new vehicle record:`, saveError);
        throw saveError;
      }
      
      // Update the deal with vehicle record reference
      console.log(`[WHOLESALE DOC] 🔗 Linking new vehicle record ${vehicleRecord._id} to deal ${deal._id}`);
      deal.vehicleRecordId = vehicleRecord._id;
    } else {
      console.log(`[WHOLESALE DOC] ✅ Found existing vehicle record: ${vehicleRecord._id}`);
      console.log(`[WHOLESALE DOC] 📊 Existing vehicle record details:`, {
        id: vehicleRecord._id,
        recordId: vehicleRecord.recordId,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2,
        existingDocuments: vehicleRecord.generatedDocuments.length
      });
    }

    // Add the generated document to the vehicle record
    console.log(`[WHOLESALE DOC] 📄 Adding bill of sale to vehicle record documents`);
    vehicleRecord.generatedDocuments.push({
      documentType: 'bill_of_sale',
      fileName: documentResult.fileName,
      filePath: documentResult.filePath,
      fileSize: documentResult.fileSize,
      generatedBy: userId,
      documentNumber: documentResult.documentNumber,
      status: 'draft'
    });
    
    try {
      await vehicleRecord.save();
      console.log(`[WHOLESALE DOC] ✅ Vehicle record updated with new document: ${vehicleRecord._id}`);
      console.log(`[WHOLESALE DOC] 📊 Updated vehicle record has ${vehicleRecord.generatedDocuments.length} documents`);
    } catch (saveError) {
      console.error(`[WHOLESALE DOC] ❌ Error updating vehicle record:`, saveError);
      throw saveError;
    }

    // Attach generated PDF to deal documents
    if (!deal.documents) {
      deal.documents = [];
    }
    deal.documents.push({
      type: 'bill_of_sale',
      fileName: documentResult.fileName,
      filePath: documentResult.filePath,
      fileSize: documentResult.fileSize,
      mimeType: 'application/pdf',
      uploaded: true,
      uploadedAt: new Date(),
      uploadedBy: userId,
      approved: false,
      required: true,
      notes: 'Bill of Sale',
      version: 1
    });
    await deal.save();
    console.log(`[WHOLESALE DOC] Deal updated with wholesale purchase order:`, documentResult.fileName);

    res.json({
      success: true,
      message: 'Bill of Sale generated successfully',
      vehicleRecord: vehicleRecord ? {
        recordId: vehicleRecord.recordId,
        id: vehicleRecord._id,
        vin: vehicleRecord.vin,
        stockNumber: vehicleRecord.stockNumber,
        dealType: vehicleRecord.dealType,
        dealType2: vehicleRecord.dealType2
      } : null,
      document: {
        fileName: documentResult.fileName,
        documentNumber: documentResult.documentNumber,
        documentType: 'bill_of_sale',
        downloadUrl: `/api/documents/download/${documentResult.fileName}`
      }
    });

  } catch (error) {
    console.error('[WHOLESALE DOC] Error generating wholesale purchase order:', error, error?.stack);
    res.status(500).json({ error: 'Failed to generate wholesale purchase order', details: error?.message || error });
  }
});

// Public proxy for signature documents (no auth required)
router.get('/signature-proxy/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    console.log(`[SIGNATURE PROXY] Request received - File: ${fileName}`);

    // Validate fileName parameter
    if (!fileName || fileName.trim() === '') {
      console.warn(`[SIGNATURE PROXY] Invalid fileName parameter: ${fileName}`);
      return res.status(400).json({ error: 'Invalid fileName parameter' });
    }

    // Sanitize fileName to prevent path traversal
    const sanitizedFileName = path.basename(fileName);
    if (sanitizedFileName !== fileName) {
      console.warn(`[SIGNATURE PROXY] Path traversal attempt detected: ${fileName}`);
      return res.status(400).json({ error: 'Invalid fileName format' });
    }

    console.log(`[SIGNATURE PROXY] Sanitized fileName: ${sanitizedFileName}`);

    // Download from cloud storage
    const cloudStorage = require('../services/cloudStorage');
    const downloadResult = await cloudStorage.downloadFile(sanitizedFileName);

    if (!downloadResult.success) {
      console.warn(`[SIGNATURE PROXY] File not found in cloud storage: ${fileName}`);
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set CORS headers for cross-origin access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', downloadResult.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    console.log(`[SIGNATURE PROXY] Headers set with CORS support: Content-Type=${downloadResult.contentType || 'application/pdf'}, Content-Disposition=inline; filename=${fileName}`);

    // Send the file buffer
    res.send(downloadResult.data);

  } catch (error) {
    console.error('[SIGNATURE PROXY] Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Download generated document
router.get('/download/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;

    console.log(`[DOCUMENTS DOWNLOAD] Request received - File: ${fileName}`);
    console.log(`[DOCUMENTS DOWNLOAD] User:`, req.user && { id: req.user._id, email: req.user.email, role: req.user.role });

    // Validate fileName parameter
    if (!fileName || fileName.trim() === '') {
      console.warn(`[DOCUMENTS DOWNLOAD] Invalid fileName parameter: ${fileName}`);
      return res.status(400).json({ error: 'Invalid fileName parameter' });
    }

    // Sanitize fileName to prevent path traversal
    const sanitizedFileName = path.basename(fileName);
    if (sanitizedFileName !== fileName) {
      console.warn(`[DOCUMENTS DOWNLOAD] Path traversal attempt detected: ${fileName}`);
      return res.status(400).json({ error: 'Invalid fileName format' });
    }

    console.log(`[DOCUMENTS DOWNLOAD] Sanitized fileName: ${sanitizedFileName}`);

    // Try to find the document in the database to get the correct filePath
    const Deal = require('../models/Deal');
    let document = null;
    let filePath = null;

    // Search through all deals to find a document with this fileName
    const deals = await Deal.find({
      'documents.fileName': sanitizedFileName
    }).limit(10); // Limit to avoid performance issues

    if (deals.length > 0) {
      for (const deal of deals) {
        const doc = (deal.documents || []).find(d => d.fileName === sanitizedFileName);
        if (doc && doc.filePath) {
          document = doc;
          filePath = doc.filePath;
          console.log(`[DOCUMENTS DOWNLOAD] Found document in deal ${deal._id}:`, {
            type: doc.type,
            fileName: doc.fileName,
            filePath: doc.filePath
          });
          break;
        }
      }
    }

    // Download from cloud storage
    const cloudStorage = require('../services/cloudStorage');
    let downloadResult;

    if (filePath && filePath.startsWith('http')) {
      // This is an S3 URL, extract the path from it
      const url = new URL(filePath);
      const pathParts = url.pathname.split('/');
      // Remove the first empty part and 'documents' prefix
      const s3Path = pathParts.slice(2).join('/');
      console.log(`[DOCUMENTS DOWNLOAD] Extracted S3 path from URL: ${s3Path}`);
      downloadResult = await cloudStorage.downloadFileWithPath(s3Path);
    } else {
      // Use the standard download method
      downloadResult = await cloudStorage.downloadFile(sanitizedFileName);
    }

    if (!downloadResult.success) {
      console.warn(`[DOCUMENTS DOWNLOAD] File not found in cloud storage: ${fileName}`);
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set headers for file viewing
    res.setHeader('Content-Type', downloadResult.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    console.log(`[DOCUMENTS DOWNLOAD] Headers set: Content-Type=${downloadResult.contentType || 'application/pdf'}, Content-Disposition=inline; filename=${fileName}`);

    // Send the file buffer
    res.send(downloadResult.data);

  } catch (error) {
    console.error('[DOCUMENTS DOWNLOAD] Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Get all vehicle records for finance team
router.get('/vehicle-records', auth, async (req, res) => {
  try {
    const { status, dealType, page = 1, limit = 20 } = req.query;
    
    console.log(`[VehicleRecords API] 📋 Fetching vehicle records with filters:`, {
      status,
      dealType,
      page,
      limit,
      userId: req.user.id,
      userRole: req.user.role
    });
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (dealType) query.dealType = dealType;

    // Pagination
    const skip = (page - 1) * limit;

    console.log(`[VehicleRecords API] 🔍 Executing query:`, query);
    console.log(`[VehicleRecords API] 📊 Pagination: skip=${skip}, limit=${limit}`);

    const vehicleRecords = await VehicleRecord.find(query)
      .populate('dealId', 'vehicle vin stockNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('generatedDocuments.generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VehicleRecord.countDocuments(query);

    console.log(`[VehicleRecords API] ✅ Found ${vehicleRecords.length} vehicle records out of ${total} total`);
    console.log(`[VehicleRecords API] 📊 Sample records:`, vehicleRecords.slice(0, 2).map(record => ({
      id: record._id,
      recordId: record.recordId,
      vin: record.vin,
      dealType: record.dealType,
      dealType2: record.dealType2,
      generatedDocuments: record.generatedDocuments.length,
      createdAt: record.createdAt
    })));

    res.json({
      success: true,
      data: vehicleRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('[VehicleRecords API] ❌ Error fetching vehicle records:', error, error?.stack);
    res.status(500).json({ error: 'Failed to fetch vehicle records', details: error?.message || error });
  }
});

// Get specific vehicle record
router.get('/vehicle-records/:recordId', auth, async (req, res) => {
  try {
    const { recordId } = req.params;
    console.log(`[VehicleRecord API] 🔍 Fetching vehicle record by recordId: ${recordId}`);
    console.log(`[VehicleRecord API] 👤 User: ${req.user.id} (${req.user.role})`);

    const vehicleRecord = await VehicleRecord.findOne({ recordId })
      .populate('dealId')
      .populate('createdBy', 'firstName lastName email')
      .populate('generatedDocuments.generatedBy', 'firstName lastName')
      .populate('generatedDocuments.approvedBy', 'firstName lastName');

    if (!vehicleRecord) {
      console.warn(`[VehicleRecord API] ❌ Vehicle record not found for recordId: ${recordId}`);
      return res.status(404).json({ error: 'Vehicle record not found' });
    }

    console.log(`[VehicleRecord API] ✅ Found vehicle record:`, {
      id: vehicleRecord._id,
      recordId: vehicleRecord.recordId,
      vin: vehicleRecord.vin,
      dealType: vehicleRecord.dealType,
      dealType2: vehicleRecord.dealType2,
      generatedDocuments: vehicleRecord.generatedDocuments.length,
      dealId: vehicleRecord.dealId?._id,
      createdAt: vehicleRecord.createdAt
    });

    res.json({
      success: true,
      data: vehicleRecord
    });

  } catch (error) {
    console.error('[VehicleRecord API] ❌ Error fetching vehicle record:', error, error?.stack);
    res.status(500).json({ error: 'Failed to fetch vehicle record', details: error?.message || error });
  }
});

// Get vehicle record by MongoDB _id
router.get('/vehicle-records/by-id/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[VehicleRecord API] 🔍 Fetching vehicle record by _id: ${id}`);
    console.log(`[VehicleRecord API] 👤 User: ${req.user.id} (${req.user.role})`);
    
    const vehicleRecord = await VehicleRecord.findById(id)
      .populate('dealId')
      .populate('createdBy', 'firstName lastName email')
      .populate('generatedDocuments.generatedBy', 'firstName lastName')
      .populate('generatedDocuments.approvedBy', 'firstName lastName');
      
    if (!vehicleRecord) {
      console.warn(`[VehicleRecord API] ❌ Vehicle record not found for _id: ${id}`);
      return res.status(404).json({ error: 'Vehicle record not found' });
    }
    
    console.log(`[VehicleRecord API] ✅ Found vehicle record by _id:`, {
      id: vehicleRecord._id,
      recordId: vehicleRecord.recordId,
      vin: vehicleRecord.vin,
      dealType: vehicleRecord.dealType,
      dealType2: vehicleRecord.dealType2,
      generatedDocuments: vehicleRecord.generatedDocuments.length,
      dealId: vehicleRecord.dealId?._id,
      createdAt: vehicleRecord.createdAt
    });
    
    res.json({ success: true, data: vehicleRecord });
  } catch (error) {
    console.error('[VehicleRecord API] ❌ Error fetching by _id:', error, error?.stack);
    res.status(500).json({ error: 'Failed to fetch vehicle record', details: error?.message || error });
  }
});

// Update document status (for finance team)
router.patch('/vehicle-records/:recordId/documents/:documentIndex/status', auth, async (req, res) => {
  try {
    const { recordId, documentIndex } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    const vehicleRecord = await VehicleRecord.findOne({ recordId });
    if (!vehicleRecord) {
      return res.status(404).json({ error: 'Vehicle record not found' });
    }

    if (!vehicleRecord.generatedDocuments[documentIndex]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document status
    vehicleRecord.generatedDocuments[documentIndex].status = status;
    vehicleRecord.generatedDocuments[documentIndex].notes = notes;

    if (status === 'sent_to_finance') {
      vehicleRecord.generatedDocuments[documentIndex].sentToFinanceAt = new Date();
    } else if (status === 'approved') {
      vehicleRecord.generatedDocuments[documentIndex].approvedAt = new Date();
      vehicleRecord.generatedDocuments[documentIndex].approvedBy = userId;
    }

    vehicleRecord.updatedBy = userId;
    await vehicleRecord.save();

    res.json({
      success: true,
      message: 'Document status updated successfully',
      data: vehicleRecord.generatedDocuments[documentIndex]
    });

  } catch (error) {
    console.error('Error updating document status:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// Get documents pending finance review
router.get('/pending-finance-review', auth, async (req, res) => {
  try {
    const pendingRecords = await VehicleRecord.find({
      'generatedDocuments.status': 'sent_to_finance'
    })
    .populate('dealId', 'vehicle vin stockNumber')
    .populate('createdBy', 'firstName lastName email')
    .populate('generatedDocuments.generatedBy', 'firstName lastName')
    .sort({ 'generatedDocuments.sentToFinanceAt': 1 });

    res.json({
      success: true,
      data: pendingRecords,
      count: pendingRecords.length
    });

  } catch (error) {
    console.error('Error fetching pending finance review:', error);
    res.status(500).json({ error: 'Failed to fetch pending finance review' });
  }
});

// Get document statistics for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const totalRecords = await VehicleRecord.countDocuments();
    const pendingFinance = await VehicleRecord.countDocuments({
      'generatedDocuments.status': 'sent_to_finance'
    });
    const approvedDocuments = await VehicleRecord.countDocuments({
      'generatedDocuments.status': 'approved'
    });
    const draftDocuments = await VehicleRecord.countDocuments({
      'generatedDocuments.status': 'draft'
    });

    // Get recent activity
    const recentRecords = await VehicleRecord.find()
      .populate('createdBy', 'firstName lastName')
      .populate('dealId', 'vehicle stockNumber')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalRecords,
        pendingFinance,
        approvedDocuments,
        draftDocuments
      },
      recentActivity: recentRecords
    });

  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({ error: 'Failed to fetch document stats' });
  }
});

// Utility to format address as a single line
function formatAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') {
    const { street, city, state, zip } = address;
    return [street, city, state, zip].filter(Boolean).join(', ');
  }
  return '';
}

// Serve documents through backend to avoid CORS issues
router.get('/serve/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    console.log(`[DOC SERVE] Serving document: ${fileName}`);
    
    // Download the file from S3
    const downloadResult = await cloudStorage.downloadFile(fileName);
    
    if (!downloadResult.success) {
      console.error(`[DOC SERVE] Failed to download file: ${fileName}`, downloadResult.error);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', downloadResult.contentType || 'application/pdf');
    res.setHeader('Content-Length', downloadResult.contentLength);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the file
    res.send(downloadResult.data);
    
    console.log(`[DOC SERVE] ✅ Document served successfully: ${fileName}`);
    
  } catch (error) {
    console.error(`[DOC SERVE] Error serving document ${req.params.fileName}:`, error);
    res.status(500).json({ error: 'Failed to serve document' });
  }
});

// Get signed URL for document access (alternative to direct serving)
router.get('/url/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour
    
    console.log(`[DOC URL] Generating signed URL for: ${fileName}`);
    
    const signedUrl = await cloudStorage.getSignedUrl(fileName, parseInt(expiresIn));
    
    if (!signedUrl) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({
      success: true,
      url: signedUrl,
      expiresIn: parseInt(expiresIn)
    });
    
  } catch (error) {
    console.error(`[DOC URL] Error generating signed URL for ${req.params.fileName}:`, error);
    res.status(500).json({ error: 'Failed to generate document URL' });
  }
});

// Add this new endpoint for generating signed URLs
router.get('/signed-url/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour
    
    console.log(`[DOCUMENTS] Generating signed URL for: ${fileName}`);
    
    // Validate fileName
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid file name' 
      });
    }
    
    // Generate signed URL using cloudStorage service
    const signedUrl = await cloudStorage.getSignedUrl(fileName, parseInt(expiresIn));
    
    if (!signedUrl) {
      return res.status(404).json({ 
        success: false, 
        error: 'Failed to generate signed URL' 
      });
    }
    
    console.log(`[DOCUMENTS] ✅ Signed URL generated for: ${fileName}`);
    
    res.json({
      success: true,
      signedUrl: signedUrl,
      expiresIn: parseInt(expiresIn),
      fileName: fileName
    });
    
  } catch (error) {
    console.error('[DOCUMENTS] ❌ Error generating signed URL:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate signed URL' 
    });
  }
});

module.exports = router; 