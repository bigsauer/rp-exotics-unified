// backend/scripts/backfillDealDocuments.js

const mongoose = require('mongoose');
const Deal = require('../models/Deal');
const DocumentType = require('../models/DocumentType');
const docGen = require('../services/documentGenerator'); // Use the instance, not the class
const User = require('../models/User');

async function backfillDocuments() {
  try {
    console.log('[BACKFILL] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[BACKFILL] Connected!');

    const docTypes = await DocumentType.find({ isActive: true }).lean();
    if (!docTypes.length) {
      console.warn('[BACKFILL] No active document types found!');
      return;
    }
    console.log(`[BACKFILL] Found ${docTypes.length} active document types.`);

    const deals = await Deal.find();
    console.log(`[BACKFILL] Found ${deals.length} deals.`);

    // Use the first admin or finance user as the 'user' for document generation
    const user = await User.findOne({ role: { $in: ['admin', 'finance'] } });
    if (!user) {
      console.error('[BACKFILL] No admin or finance user found for document generation!');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    for (const deal of deals) {
      try {
        // Defensive checks for required fields
        if (!deal.seller || !deal.seller.tier) {
          console.warn(`[BACKFILL] Skipping deal ${deal._id}: Missing seller or seller.tier`);
          skippedCount++;
          continue;
        }
        if (!deal.buyer || !deal.buyer.tier) {
          console.warn(`[BACKFILL] Skipping deal ${deal._id}: Missing buyer or buyer.tier`);
          skippedCount++;
          continue;
        }
        // Add missing placeholders as before
        for (const docType of docTypes) {
          if (!deal.documents.some(doc => doc.type === docType.type)) {
            deal.documents.push({
              type: docType.type,
              required: docType.required,
              uploaded: false,
              approved: false,
              version: 1,
            });
            updatedCount++;
            console.log(`[BACKFILL] Added placeholder for doc type '${docType.type}' to deal ${deal._id}`);
          }
        }
        // Generate real documents if missing
        // Use docGen directly
        const seller = deal.seller || {};
        const buyer = deal.buyer || {};
        const financial = deal.financial || {};
        const dealTypeStr = (deal.dealType || '').toLowerCase();
        const sellerType = (seller.type || '').toLowerCase();
        const buyerType = (buyer.type || '').toLowerCase();
        const stockNumber = deal.rpStockNumber || 'N_A';
        // Helper to check if a doc is already present
        const hasDoc = (type) => deal.documents.some(doc => doc.type === type && doc.uploaded);
        // Flip deal: both dealer
        if (dealTypeStr.includes('flip') && sellerType === 'dealer' && buyerType === 'dealer') {
          if (!hasDoc('vehicle_record')) {
            const pdfInfo = await docGen.generateWholesaleFlipVehicleRecord({
              ...deal.toObject(), seller, buyer, financial, stockNumber,
            }, user);
            if (pdfInfo && pdfInfo.fileName) {
              deal.documents.push({
                type: 'vehicle_record',
                fileName: pdfInfo.fileName,
                filePath: pdfInfo.filePath,
                fileSize: pdfInfo.fileSize,
                mimeType: 'application/pdf',
                uploaded: true,
                approved: false,
                required: true,
                version: 1,
              });
              updatedCount++;
              console.log(`[BACKFILL] Generated vehicle_record PDF for deal ${deal._id}`);
            }
          }
          if (!hasDoc('wholesale_bos')) {
            const pdfInfo = await docGen.generateWholesalePurchaseOrder({
              ...deal.toObject(), seller, buyer, financial, stockNumber,
            }, user);
            if (pdfInfo && pdfInfo.fileName) {
              deal.documents.push({
                type: 'wholesale_bos',
                fileName: pdfInfo.fileName,
                filePath: pdfInfo.filePath,
                fileSize: pdfInfo.fileSize,
                mimeType: 'application/pdf',
                uploaded: true,
                approved: false,
                required: true,
                version: 1,
              });
              updatedCount++;
              console.log(`[BACKFILL] Generated wholesale_bos PDF for deal ${deal._id}`);
            }
          }
        } else if (sellerType === 'dealer') {
          if (!hasDoc('wholesale_bos')) {
            const pdfInfo = await docGen.generateWholesalePurchaseOrder({
              ...deal.toObject(), seller, buyer, financial, stockNumber,
            }, user);
            if (pdfInfo && pdfInfo.fileName) {
              deal.documents.push({
                type: 'wholesale_bos',
                fileName: pdfInfo.fileName,
                filePath: pdfInfo.filePath,
                fileSize: pdfInfo.fileSize,
                mimeType: 'application/pdf',
                uploaded: true,
                approved: false,
                required: true,
                version: 1,
              });
              updatedCount++;
              console.log(`[BACKFILL] Generated wholesale_bos PDF for deal ${deal._id}`);
            }
          }
        } else if (sellerType === 'private') {
          if (!hasDoc('retail_pp_buy')) {
            const pdfInfo = await docGen.generateRetailPPBuy({
              ...deal.toObject(), seller, buyer, financial, stockNumber,
            }, user);
            if (pdfInfo && pdfInfo.fileName) {
              deal.documents.push({
                type: 'retail_pp_buy',
                fileName: pdfInfo.fileName,
                filePath: pdfInfo.filePath,
                fileSize: pdfInfo.fileSize,
                mimeType: 'application/pdf',
                uploaded: true,
                approved: false,
                required: true,
                version: 1,
              });
              updatedCount++;
              console.log(`[BACKFILL] Generated retail_pp_buy PDF for deal ${deal._id}`);
            }
          }
        }
        if (updatedCount) {
          await deal.save();
          console.log(`[BACKFILL] Updated deal ${deal._id} with real documents.`);
        }
      } catch (err) {
        console.error(`[BACKFILL] Error processing deal ${deal._id}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`[BACKFILL] Backfill complete! Updated ${updatedCount} deals with real documents. Skipped ${skippedCount} deals due to errors.`);
    mongoose.disconnect();
  } catch (err) {
    console.error('[BACKFILL] Error during backfill:', err);
    process.exit(1);
  }
}

backfillDocuments(); 