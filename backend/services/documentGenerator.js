const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');
const cloudStorage = require('./cloudStorage');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'https://slipstreamdocs.com',
  'https://rp-exotics-frontend.railway.app',
  'https://my-app.up.railway.app',
  process.env.FRONTEND_URL
].filter(Boolean);

class DocumentGenerator {
  constructor() {
    // Debug: Log the current working directory and __dirname
    console.log(`[PDF GEN] Current working directory: ${process.cwd()}`);
    console.log(`[PDF GEN] __dirname: ${__dirname}`);
    
    // Use absolute path from project root
    this.uploadsDir = path.resolve(__dirname, '../uploads/documents');
    console.log(`[PDF GEN] Resolved uploads directory: ${this.uploadsDir}`);
    
    this.ensureUploadsDirectorySync();
    
    // Performance optimizations - ENHANCED
    this.browserPool = [];
    this.maxBrowserPoolSize = 5; // Increased from 3
    this.browserPoolTimeout = 60000; // 60 seconds (increased from 30)
    this.lastBrowserCleanup = Date.now();
    this.browserCleanupInterval = 60000; // 1 minute
    
    // Template caching
    this.templateCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    
    // Performance monitoring
    this.performanceMetrics = {
      totalDocuments: 0,
      averageGenerationTime: 0,
      browserReuses: 0,
      cacheHits: 0
    };
  }

  ensureUploadsDirectorySync() {
    try {
      fs.ensureDirSync(this.uploadsDir);
      console.log(`[PDF GEN] Uploads directory ensured: ${this.uploadsDir}`);
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
  }

  // Save document to S3 and clean up local file
  async saveDocumentToCloud(filePath, fileName) {
    try {
      console.log(`[PDF GEN] Saving document to cloud: ${fileName}`);
      
      // Upload to S3
      const result = await cloudStorage.uploadFile(filePath, fileName, 'application/pdf');
      
      if (result.success) {
        console.log(`[PDF GEN] Document saved to S3: ${result.url}`);
        
        // Clean up local file
        try {
          await fs.remove(filePath);
          console.log(`[PDF GEN] Local file cleaned up: ${filePath}`);
        } catch (cleanupError) {
          console.warn(`[PDF GEN] Could not clean up local file: ${cleanupError.message}`);
        }
        
        return result.url;
      } else {
        throw new Error('Failed to upload to S3');
      }
    } catch (error) {
      console.error(`[PDF GEN] Error saving document to cloud: ${error.message}`);
      throw error;
    }
  }

  // Wrapper method to ensure all documents are saved to cloud storage
  async ensureCloudStorage(filePath, fileName, documentType, documentNumber) {
    try {
      console.log(`[PDF GEN] 🔄 Starting cloud storage process for: ${fileName}`);
      console.log(`[PDF GEN] 📁 Local file path: ${filePath}`);
      console.log(`[PDF GEN] 📄 Document type: ${documentType}`);
      console.log(`[PDF GEN] 🔢 Document number: ${documentNumber}`);
      
      // Check if file exists
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw new Error(`Local file does not exist: ${filePath}`);
      }
      
      const stats = await fs.stat(filePath);
      console.log(`[PDF GEN] 📊 File size: ${stats.size} bytes`);
      
      // Upload to cloud storage
      console.log(`[PDF GEN] ☁️ Uploading to cloud storage...`);
      const cloudResult = await this.saveDocumentToCloud(filePath, fileName);
      
      console.log(`[PDF GEN] ✅ Cloud storage successful for: ${fileName}`);
      console.log(`[PDF GEN] 🌐 Cloud URL: ${cloudResult}`);
      
      return {
        fileName,
        filePath: cloudResult, // Use cloud URL instead of local path
        fileSize: stats.size,
        documentNumber,
        documentType,
        cloudUrl: cloudResult,
        cloudKey: `documents/${fileName}`,
        uploadedAt: new Date(),
        storageType: 'cloud'
      };
    } catch (error) {
      console.error(`[PDF GEN] ❌ Cloud storage failed for ${fileName}:`, error);
      console.error(`[PDF GEN] ❌ Error details:`, {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // In production, we should fail if cloud storage fails
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Cloud storage is required in production. Failed to upload ${fileName}: ${error.message}`);
      }
      
      // In development, we can fall back to local storage
      console.warn(`[PDF GEN] ⚠️ Falling back to local storage for development`);
      const stats = await fs.stat(filePath);
      return {
        fileName,
        filePath: filePath, // Keep local path as fallback
        fileSize: stats.size,
        documentNumber,
        documentType,
        cloudUrl: null,
        cloudKey: null,
        uploadedAt: new Date(),
        storageType: 'local'
      };
    }
  }

  // Browser pool management for better performance
  async getBrowserFromPool() {
    // Clean up old browsers periodically
    this.cleanupBrowserPool();
    
    // Try to get an existing browser from the pool
    if (this.browserPool.length > 0) {
      const browser = this.browserPool.pop();
      try {
        // Test if browser is still responsive
        const pages = await browser.pages();
        if (pages.length > 0) {
          this.performanceMetrics.browserReuses++;
          console.log(`[PDF GEN] 🚀 Reusing browser from pool (${this.browserPool.length} remaining)`);
          return browser;
        }
      } catch (error) {
        console.log('[PDF GEN] Browser from pool is unresponsive, creating new one');
      }
    }
    
    // Create new browser if pool is empty or browser is unresponsive
    console.log(`[PDF GEN] 🚀 Creating new browser (pool size: ${this.browserPool.length})`);
    return await this.launchOptimizedBrowser();
  }

  async returnBrowserToPool(browser) {
    if (!browser) return;
    
    try {
      // Close all pages except one to save memory
      const pages = await browser.pages();
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
      
      // Add to pool if we haven't reached max size
      if (this.browserPool.length < this.maxBrowserPoolSize) {
        this.browserPool.push(browser);
        console.log(`[PDF GEN] 🔄 Browser returned to pool (${this.browserPool.length}/${this.maxBrowserPoolSize})`);
      } else {
        await browser.close();
        console.log('[PDF GEN] 🔄 Pool full, closing browser');
      }
    } catch (error) {
      console.error('[PDF GEN] Error returning browser to pool:', error);
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF GEN] Error closing browser:', closeError);
      }
    }
  }

  cleanupBrowserPool() {
    const now = Date.now();
    if (now - this.lastBrowserCleanup > this.browserCleanupInterval) {
      console.log('[PDF GEN] 🧹 Cleaning up browser pool...');
      this.browserPool.forEach(async (browser) => {
        try {
          await browser.close();
        } catch (error) {
          console.error('[PDF GEN] Error closing browser during cleanup:', error);
        }
      });
      this.browserPool = [];
      this.lastBrowserCleanup = now;
    }
  }

  // Template caching for better performance
  async getCachedTemplate(templateKey, templateGenerator) {
    const now = Date.now();
    const cached = this.templateCache.get(templateKey);
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      this.performanceMetrics.cacheHits++;
      console.log(`[PDF GEN] 📋 Using cached template: ${templateKey}`);
      return cached.template;
    }
    
    console.log(`[PDF GEN] 📋 Generating new template: ${templateKey}`);
    const template = await templateGenerator();
    this.templateCache.set(templateKey, {
      template,
      timestamp: now
    });
    
    return template;
  }

  // Performance monitoring
  logPerformanceMetrics() {
    console.log(`[PDF GEN] 📊 Performance Metrics:`);
    console.log(`[PDF GEN] 📊 - Total Documents: ${this.performanceMetrics.totalDocuments}`);
    console.log(`[PDF GEN] 📊 - Average Generation Time: ${this.performanceMetrics.averageGenerationTime.toFixed(2)}ms`);
    console.log(`[PDF GEN] 📊 - Browser Reuses: ${this.performanceMetrics.browserReuses}`);
    console.log(`[PDF GEN] 📊 - Cache Hits: ${this.performanceMetrics.cacheHits}`);
    console.log(`[PDF GEN] 📊 - Browser Pool Size: ${this.browserPool.length}`);
  }

  // Parallel document generation for better performance
  async generateDocumentsParallel(documentTasks) {
    console.log(`[PDF GEN] 🚀 Starting parallel document generation for ${documentTasks.length} documents`);
    const startTime = Date.now();
    
    try {
      // Generate documents in parallel with concurrency limit
      const concurrencyLimit = Math.min(3, documentTasks.length); // Max 3 concurrent documents
      const results = [];
      
      for (let i = 0; i < documentTasks.length; i += concurrencyLimit) {
        const batch = documentTasks.slice(i, i + concurrencyLimit);
        console.log(`[PDF GEN] 🚀 Processing batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(documentTasks.length / concurrencyLimit)}`);
        
        const batchPromises = batch.map(async (task) => {
          try {
            const result = await task();
            console.log(`[PDF GEN] ✅ Document generated successfully: ${result.documentType}`);
            return result;
          } catch (error) {
            console.error(`[PDF GEN] ❌ Document generation failed:`, error);
            throw error;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`[PDF GEN] 🎉 Parallel document generation completed in ${totalTime}ms`);
      console.log(`[PDF GEN] 📊 Generated ${results.length} documents in parallel`);
      
      return results;
    } catch (error) {
      console.error('[PDF GEN] ❌ Parallel document generation failed:', error);
      throw error;
    }
  }

  // Optimized Puppeteer launch configuration for better performance
  async launchOptimizedBrowser() {
    const puppeteer = require('puppeteer');
    return await puppeteer.launch({ 
      headless: 'new', 
      args: [
        '--no-sandbox', 
        '--font-render-hinting=none',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--single-process',
        '--no-zygote'
      ] 
    });
  }

  generateDocumentNumber(dealType, stockNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const prefix = dealType === 'retail' ? 'PA' : 'BS';
    return `${prefix}-${stockNumber}-${timestamp}`;
  }

  generateEnhancedDocumentNumber(dealType, dealType2SubType, baseType, stockNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    
    // Determine the deal type identifier
    let dealTypeId = '';
    if (dealType === 'wholesale-flip') {
      dealTypeId = 'F'; // Flip
    } else if (dealType === 'wholesale-d2d' || dealType === 'wholesale-pp') {
      if (dealType2SubType === 'sale') {
        dealTypeId = 'S'; // Sale
      } else if (dealType2SubType === 'buy') {
        dealTypeId = 'B'; // Buy
      }
    } else if (dealType === 'retail-pp' || dealType === 'retail-d2d') {
      if (dealType2SubType === 'sale') {
        dealTypeId = 'S'; // Sale
      } else if (dealType2SubType === 'buy') {
        dealTypeId = 'B'; // Buy
      }
    } else if (dealType === 'finance') {
      dealTypeId = 'F'; // Finance
    }
    
    // Create enhanced document number
    const enhancedNumber = `${baseType}-${dealTypeId}-${stockNumber || 'N/A'}-${timestamp}`;
    console.log(`[DOC GEN] Generated enhanced document number: ${enhancedNumber} (dealType: ${dealType}, dealType2SubType: ${dealType2SubType})`);
    
    return enhancedNumber;
  }

  async generatePurchaseAgreement(dealData, user) {
    console.log('[PDF GEN] Generating Purchase Agreement with dealData:', dealData);
    // Defensive check for required fields
    const requiredFields = ['year', 'make', 'model', 'vin', 'dealType', 'sellerInfo'];
    const missingFields = requiredFields.filter(f => !dealData[f]);
    if (missingFields.length > 0) {
      console.warn('[PDF GEN] Missing required fields for Purchase Agreement:', missingFields);
      throw new Error('Missing required fields for Purchase Agreement: ' + missingFields.join(', '));
    }
    if (!dealData.stockNumber) {
      console.warn('[PDF GEN] Optional field stockNumber is missing for Purchase Agreement. Proceeding with N/A.');
      dealData.stockNumber = 'N/A';
    }
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    const fileName = `purchase_agreement_${dealData.stockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    console.log(`[PDF GEN] Purchase Agreement file path: ${filePath}`);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('PURCHASE AGREEMENT', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Document #: ${this.generateDocumentNumber('retail', dealData.stockNumber)}`, { align: 'center' })
       .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' })
       .moveDown(2);

    // Vehicle Information Section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('VEHICLE INFORMATION')
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Year: ${dealData.year}`)
       .text(`Make: ${dealData.make}`)
       .text(`Model: ${dealData.model}`)
       .text(`VIN: ${dealData.vin}`)
       .text(`Stock Number: ${dealData.stockNumber}`)
       .text(`Color: ${dealData.color || 'N/A'}`)
       .text(`Mileage: ${dealData.mileage ? dealData.mileage.toLocaleString() : 'N/A'}`)
       .moveDown(1);

    // Purchase Terms
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('PURCHASE TERMS')
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Purchase Price: $${dealData.purchasePrice ? dealData.purchasePrice.toLocaleString() : 'N/A'}`)
       .text(`List Price: $${dealData.listPrice ? dealData.listPrice.toLocaleString() : 'N/A'}`)
       .moveDown(1);

    // Seller Information
    if (dealData.sellerInfo) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('SELLER INFORMATION')
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Name: ${dealData.sellerInfo.name || 'N/A'}`)
         .text(`Address: ${dealData.sellerInfo.address || 'N/A'}`)
         .text(`Phone: ${dealData.sellerInfo.phone || 'N/A'}`)
         .text(`Email: ${dealData.sellerInfo.email || 'N/A'}`)
         .moveDown(1);
    }

    // Buyer Information (RP Exotics)
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('BUYER INFORMATION')
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text('RP Exotics')
       .text('Professional Vehicle Management')
       .text('Contact: Sales Team')
       .moveDown(1);

    // Terms and Conditions
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('TERMS AND CONDITIONS')
       .moveDown(0.5);

    doc.fontSize(10)
       .font('Helvetica')
       .text('1. This agreement constitutes a binding contract between the seller and RP Exotics.')
       .text('2. The vehicle is being sold "as-is" with no warranties expressed or implied.')
       .text('3. Payment will be made upon completion of all required documentation.')
       .text('4. Title transfer will be completed within 30 days of payment.')
       .text('5. All applicable taxes and fees are the responsibility of the buyer.')
       .moveDown(2);

    // Signature Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('SIGNATURES')
       .moveDown(1);

    // Seller Signature
    doc.fontSize(12)
       .font('Helvetica')
       .text('Seller Signature:')
       .moveDown(2)
       .text('_________________________')
       .text('Date: ___________________')
       .moveDown(1);

    // Buyer Signature
    doc.text('Buyer Signature (RP Exotics):')
       .moveDown(2)
       .text('_________________________')
       .text('Date: ___________________')
       .moveDown(1);

    // Footer
    doc.fontSize(10)
       .font('Helvetica')
       .text('Generated by RP Exotics Management System', { align: 'center' })
       .text(`Generated by: ${user.firstName} ${user.lastName}`, { align: 'center' })
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const stats = fs.statSync(filePath);
        console.log(`[PDF GEN] Purchase Agreement written: ${fileName}, size: ${stats.size} bytes`);
        resolve({
          fileName,
          filePath,
          fileSize: stats.size,
          documentNumber: this.generateDocumentNumber('retail', dealData.stockNumber)
        });
      });
      writeStream.on('error', (err) => {
        console.error('[PDF GEN] Error writing Purchase Agreement:', err);
        reject(err);
      });
    });
  }

  async generateBillOfSale(dealData, user) {
    console.log('[PDF GEN] === generateBillOfSale called ===');
    console.log('[PDF GEN] Vehicle Info:', {
      year: dealData.year,
      make: dealData.make,
      model: dealData.model,
      vin: dealData.vin,
      stockNumber: dealData.stockNumber,
      mileage: dealData.mileage,
      exteriorColor: dealData.exteriorColor,
      interiorColor: dealData.interiorColor,
      color: dealData.color
    });
    console.log('[PDF GEN] dealData:', dealData);
    console.log('[PDF GEN] user:', user);
    if (!dealData.stockNumber) dealData.stockNumber = 'N/A';
    const doc = new PDFDocument({ size: 'A4', margins: { top: 36, bottom: 36, left: 36, right: 36 } });
    const safeStockNumber = String(dealData.stockNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `bill_of_sale_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    fs.ensureDirSync(this.uploadsDir);
    fs.accessSync(this.uploadsDir, fs.constants.W_OK);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header box
    doc.roundedRect(36, 36, 523, 40, 8).stroke();
    let y = 44;
    doc.fontSize(11).font('Helvetica-Bold').text('Sales Order Date:', 44, y).font('Helvetica').text(dealData.date || new Date().toLocaleDateString(), 160, y);
    doc.font('Helvetica-Bold').text('Stock Number:', 300, y).font('Helvetica').text(dealData.stockNumber, 420, y);
    y += 30;
    // WHOLESALE badge
    doc.roundedRect(450, 36, 100, 20, 10).fill('#7c3aed');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white').text('WHOLESALE', 460, 42, { align: 'center' });
    doc.fillColor('black');
    doc.moveDown(2);

    // Purchasing Dealer Section
    doc.fontSize(14).font('Helvetica-Bold').text('PURCHASING DEALER', 44, y + 10);
    doc.roundedRect(36, doc.y + 5, 523, 80, 8).stroke();
    y = doc.y + 13;
    // Dealer Name (left) and License # (right)
    doc.fontSize(11).font('Helvetica-Bold').text('Dealer Name:', 44, y).font('Helvetica').text(dealData.sellerInfo?.name || 'N/A', 130, y);
    doc.font('Helvetica-Bold').text('License #:', 400, y).font('Helvetica').text(dealData.sellerInfo?.licenseNumber || 'N/A', 470, y);
    y += 18;
    doc.font('Helvetica-Bold').text('Email:', 44, y).font('Helvetica').text(dealData.sellerInfo?.email || 'N/A', 130, y, { width: 300 });
    y += 18;
    doc.font('Helvetica-Bold').text('Phone:', 44, y).font('Helvetica').text(dealData.sellerInfo?.phone || 'N/A', 130, y);
    y += 18;
    doc.font('Helvetica-Bold').text('Address:', 44, y).font('Helvetica').text(dealData.sellerInfo?.address || 'N/A', 130, y, { width: 350 });
    doc.moveDown(2);

    // Selling Dealer Section (RP Exotics)
    doc.fontSize(14).font('Helvetica-Bold').text('SELLING DEALER (RP EXOTICS)', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 60, 8).stroke();
    y = doc.y + 13;
    doc.fontSize(11).font('Helvetica-Bold').text('Company Name:', 44, y).font('Helvetica').text('RP Exotics', 160, y);
    doc.font('Helvetica-Bold').text('Dealer License #:', 300, y).font('Helvetica').text('D4865', 420, y);
    y += 18;
    doc.font('Helvetica-Bold').text('Address:', 44, y).font('Helvetica').text('1155 N Warson Rd, Saint Louis, MO 63132', 160, y);
    y += 18;
    doc.font('Helvetica-Bold').text('Phone:', 44, y).font('Helvetica').text('(314) 970-2427', 160, y);
    doc.moveDown(2);

    // --- Financial Information Section ---
    // Add vertical space before financial info
    doc.moveDown(1.2);
    doc.fontSize(13).font('Helvetica-Bold').text('FINANCIAL INFORMATION', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 32, 8).stroke();
    y = doc.y + 13;
    doc.fontSize(10).font('Helvetica-Bold').text('Sale Price:', 44, y).font('Helvetica').text(`$${dealData.purchasePrice ? dealData.purchasePrice.toLocaleString() : 'N/A'}`, 120, y);
    doc.moveDown(2);

    // --- Vehicle Information Section (clean grid) ---
    doc.fontSize(13).font('Helvetica-Bold').text('VEHICLE INFORMATION', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 60, 8).stroke();
    y = doc.y + 13;
    // Row 1
    doc.fontSize(9).font('Helvetica-Bold').text('VIN:', 44, y).font('Helvetica').text(dealData.vin, 80, y, { width: 150 });
    doc.font('Helvetica-Bold').text('Year:', 250, y).font('Helvetica').text(dealData.year, 285, y);
    doc.font('Helvetica-Bold').text('Stock #:', 350, y).font('Helvetica').text(dealData.stockNumber, 410, y);
    y += 15;
    // Row 2
    doc.font('Helvetica-Bold').text('Make:', 44, y).font('Helvetica').text(dealData.make, 80, y, { width: 100 });
    doc.font('Helvetica-Bold').text('Model:', 180, y).font('Helvetica').text(dealData.model, 230, y, { width: 100 });
    doc.font('Helvetica-Bold').text('Mileage:', 350, y).font('Helvetica').text(dealData.mileage !== undefined ? dealData.mileage.toLocaleString() : 'N/A', 410, y);
    y += 15;
    // Row 3
    doc.font('Helvetica-Bold').text('Exterior Color:', 44, y).font('Helvetica').text(dealData.exteriorColor || dealData.color || 'N/A', 120, y, { width: 100 });
    doc.font('Helvetica-Bold').text('Interior Color:', 250, y).font('Helvetica').text(dealData.interiorColor || 'N/A', 340, y, { width: 100 });
    doc.moveDown(2);

    // Terms and Conditions Section
    doc.fontSize(14).font('Helvetica-Bold').text('WHOLESALE TRANSACTION TERMS & CONDITIONS', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 100, 8).stroke();
    y = doc.y + 13;
    const isTier2Dealer = dealData.sellerInfo.tier === 'Tier 2';
    const paymentTerms = isTier2Dealer ? 'Payment terms: Pay upon title.' : 'Payment terms: Pay upon release.';
    const termsText =
      '• This is a DEALER-TO-DEALER wholesale transaction. Purchasing dealer acknowledges this is a business-to-business sale.\n' +
      '• Vehicle is sold AS-IS, WHERE-IS with no warranties expressed or implied unless specifically noted.\n' +
      paymentTerms + '\n' +
      '• Title will be clear and transferable. Any liens will be properly disclosed and handled.\n' +
      '• Any disputes shall be resolved through arbitration in St. Louis County, Missouri.\n' +
      '• This agreement constitutes the entire understanding between the parties.';
    doc.fontSize(9).font('Helvetica').text(
      termsText,
      44, y, { width: 500, align: 'left' }
    );
    doc.moveDown(3);

    // Signature Section
    doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES', 44, doc.y);
    doc.moveDown(1);
    // Buyer Signature
    doc.fontSize(11).font('Helvetica-Bold').text('Purchasing Dealer Signature:', 44, doc.y);
    doc.moveDown(1);
    doc.moveTo(44, doc.y).lineTo(280, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('Print Name: _____________________', 44, doc.y);
    doc.moveDown(1);
    doc.moveTo(44, doc.y).lineTo(164, doc.y).stroke();
    doc.fontSize(9).font('Helvetica').text('Date', 44, doc.y + 5);
    // RP Exotics Signature
    doc.fontSize(11).font('Helvetica-Bold').text('RP Exotics Signature:', 300, doc.y - 40);
    doc.moveDown(1);
    doc.moveTo(300, doc.y).lineTo(536, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('Print Name: _____________________', 300, doc.y);
    doc.moveDown(1);
    doc.moveTo(300, doc.y).lineTo(420, doc.y).stroke();
    doc.fontSize(9).font('Helvetica').text('Date', 300, doc.y + 5);

    // Footer
    doc.moveDown(3);
    doc.fontSize(9).font('Helvetica').text('Generated by RP Exotics Management System', { align: 'center' })
      .text(`Generated by: ${user.firstName} ${user.lastName} | ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const stats = fs.statSync(filePath);
        console.log(`[PDF GEN] Bill of Sale written: ${fileName}, size: ${stats.size} bytes`);
        resolve({
          fileName,
          filePath,
          fileSize: stats.size,
          documentNumber: this.generateDocumentNumber('wholesale', safeStockNumber)
        });
      });
      writeStream.on('error', (err) => {
        console.error('[PDF GEN] Error writing Bill of Sale:', err);
        reject(err);
      });
    });
  }

  // REMOVED: Duplicate generateWholesaleBOS function - using the complete one at line 2179

  async generateWholesaleFlipVehicleRecord(dealData, user) {
    console.log('[PDF GEN] === generateWholesaleFlipVehicleRecord called ===');
    const sellerType = (dealData.seller?.type || '').toLowerCase();
    const buyerType = (dealData.buyer?.type || '').toLowerCase();
    const dealType = (dealData.dealType || '').toLowerCase();
    console.log('[PDF GEN] [VREC DEBUG] sellerType:', sellerType, 'buyerType:', buyerType, 'dealType:', dealType);
    
    if (dealType.includes('flip') && sellerType === 'dealer' && buyerType === 'dealer') {
      console.log('[PDF GEN] [VREC] Using custom dealer-to-dealer flip vehicle record template');
      
      // Generate document number and file info
      const docNumber = this.generateEnhancedDocumentNumber(
        dealData.dealType, 
        dealData.dealType2SubType, 
        'VR', 
        dealData.stockNumber || 'N/A'
      );
      const fileName = `vehicle_record_${dealData.stockNumber || 'N_A'}_${Date.now()}.pdf`;
      const filePath = path.join(this.uploadsDir, fileName);
      
      // Prepare data
      const seller = dealData.seller || {};
      const buyer = dealData.buyer || {};
      const vehicle = dealData;
      
      // Helper functions
      function formatAddress(addr) {
        if (!addr) return 'N/A';
        if (typeof addr === 'string') return addr;
        if (typeof addr === 'object') {
          return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
        }
        return String(addr);
      }
      
      function safeNum(val) {
        if (!val || isNaN(val)) return 'N/A';
        return val.toLocaleString();
      }
      
      // Create HTML template for dealer-to-dealer flip
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vehicle Record - Dealer to Dealer Flip</title>
        <style>
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; }
            .no-print { display: none !important; }
            .page-break { break-before: page; page-break-before: always; }
          }
          body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; background: white; color: black; }
          .page { width: 8.5in; height: 11in; margin: 0 auto; padding: 0.75in; background: white; position: relative; box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid black; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .form-section { margin: 20px 0; }
          .field-group { margin-bottom: 15px; }
          .field-label { font-weight: bold; display: inline-block; width: 120px; }
          .field-value { display: inline-block; min-width: 200px; border-bottom: 1px solid #ccc; padding: 2px 5px; }
          .wide-field { min-width: 300px; }
          .extra-wide-field { min-width: 400px; }
          .footer { position: absolute; bottom: 20px; left: 20px; right: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="title">VEHICLE RECORD</div>
            <div class="subtitle">Dealer to Dealer Flip Transaction</div>
          </div>
          
          <!-- Vehicle Information -->
          <div class="form-section">
            <div class="field-group">
              <span class="field-label">VIN:</span>
              <span class="field-value wide-field">${vehicle.vin || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">YEAR:</span>
              <span class="field-value">${vehicle.year || 'N/A'}</span>
              <span class="field-label" style="margin-left: 20px;">MAKE:</span>
              <span class="field-value">${vehicle.make || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">MODEL:</span>
              <span class="field-value wide-field">${vehicle.model || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">STOCK #:</span>
              <span class="field-value">${vehicle.stockNumber || 'N/A'}</span>
              <span class="field-label" style="margin-left: 20px;">MILEAGE:</span>
              <span class="field-value">${safeNum(vehicle.mileage)}</span>
            </div>
          </div>
          
          <!-- Seller Information (Selling Dealer) -->
          <div class="form-section">
            <div class="field-group">
              <span class="field-label">SELLER:</span>
              <span class="field-value wide-field">${seller.name || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">SELLER ADDRESS:</span>
              <span class="field-value extra-wide-field">${formatAddress(seller.contact?.address)}</span>
            </div>
            <div class="field-group">
              <span class="field-label">SELLER PHONE:</span>
              <span class="field-value">${seller.contact?.phone || 'N/A'}</span>
              <span class="field-label" style="margin-left: 20px;">EMAIL:</span>
              <span class="field-value">${seller.contact?.email || 'N/A'}</span>
            </div>
          </div>
          
          <!-- Buyer Information (RP Exotics) -->
          <div class="form-section">
            <div class="field-group">
              <span class="field-label">BUYER:</span>
              <span class="field-value wide-field">${buyer.name || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">BUYER ADDRESS:</span>
              <span class="field-value extra-wide-field">${formatAddress(buyer.contact?.address)}</span>
            </div>
            <div class="field-group">
              <span class="field-label">BUYER PHONE:</span>
              <span class="field-value">${buyer.contact?.phone || 'N/A'}</span>
              <span class="field-label" style="margin-left: 20px;">EMAIL:</span>
              <span class="field-value">${buyer.contact?.email || 'N/A'}</span>
            </div>
          </div>
          
          <!-- Financial Information -->
          <div class="form-section">
            <div class="field-group">
              <span class="field-label">PURCHASE PRICE:</span>
              <span class="field-value">$${safeNum(vehicle.purchasePrice)}</span>
            </div>
            <div class="field-group">
              <span class="field-label">LIST PRICE:</span>
              <span class="field-value">$${safeNum(vehicle.listPrice)}</span>
            </div>
          </div>
          
          <!-- Deal Information -->
          <div class="form-section">
            <div class="field-group">
              <span class="field-label">DEAL TYPE:</span>
              <span class="field-value">${dealData.dealType || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">DEAL TYPE 2:</span>
              <span class="field-value">${dealData.dealType2SubType || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">SALES PERSON:</span>
              <span class="field-value">${vehicle.salesperson || 'N/A'}</span>
            </div>
          </div>
          
          <!-- Notes Section -->
          <div class="form-section">
            <div class="field-group">
              <span class="field-label">NOTES:</span>
              <span class="field-value extra-wide-field">${vehicle.notes || vehicle.generalNotes || 'N/A'}</span>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            Generated by RP Exotics Management System<br>
            Generated by: ${user.firstName || ''} ${user.lastName || ''}<br>
            Generated on: ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
      `;
      
      // Generate PDF using Puppeteer
      const puppeteer = require('puppeteer');
      let browser;
      try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({ path: filePath, format: 'A4', printBackground: true });
        await browser.close();
        
        // Get file size before uploading
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        // Upload to cloud storage
        const cloudResult = await this.ensureCloudStorage(filePath, fileName, 'vehicle_record', docNumber);
        
        return {
          fileName,
          filePath: cloudResult.filePath,
          fileSize: fileSize,
          documentNumber: docNumber,
          documentType: 'vehicle_record',
          generatedBy: user && user._id ? user._id : undefined,
          generatedAt: new Date(),
          status: 'draft',
          cloudUrl: cloudResult.cloudUrl
        };
      } catch (err) {
        if (browser) await browser.close();
        console.error('[PDF GEN][WholesaleFlipVehicleRecord] Error generating PDF:', err);
        throw err;
      }
    } else {
      console.log('[PDF GEN] [VREC] Using fallback standard vehicle record template');
      return await this.generateStandardVehicleRecord(dealData, user);
    }
  }

  async generateStandardVehicleRecord(dealData, user) {
    console.log('[PDF GEN][StandardVehicleRecord] Starting standard vehicle record generation');
    console.log('[PDF GEN][StandardVehicleRecord] Deal data:', {
      dealType: dealData.dealType,
      dealType2SubType: dealData.dealType2SubType,
      stockNumber: dealData.stockNumber,
      vin: dealData.vin
    });
    
    // 🔍 ADDITIONAL LOGGING FOR DEAL TYPE 2 DEBUGGING
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔍 DEAL TYPE 2 INVESTIGATION START');
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Original dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] dealType:', dealData.dealType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] sellerType:', dealData.sellerType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] buyerType:', dealData.buyerType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Full dealData keys:', Object.keys(dealData));
    
    // Check if dealType2SubType is 'buy' when it shouldn't be
    if (dealData.dealType2SubType === 'buy') {
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] ⚠️ WARNING: dealType2SubType is "buy"');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] This might be incorrect for the following scenarios:');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - wholesale-d2d sale deals (should be "sale")');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - wholesale-pp sale deals (should be "sale")');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - wholesale-flip buy-sell deals (should be "buy-sell")');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - retail-pp buy-sell deals (should be "buy-sell")');
    }
    
    // --- DEBUG: Log all deal type fields and price/label logic ---
    console.log('[PDF GEN] [DEBUG] dealType:', dealData.dealType);
    console.log('[PDF GEN] [DEBUG] dealType2:', dealData.dealType2);
    console.log('[PDF GEN] [DEBUG] dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN] [DEBUG] Raw seller:', JSON.stringify(dealData.seller, null, 2));
    console.log('[PDF GEN] [DEBUG] Raw buyer:', JSON.stringify(dealData.buyer, null, 2));
    console.log('[PDF GEN] dealData:', dealData);
    console.log('[PDF GEN] user:', user);
    console.log(`[PDF GEN] [DEBUG] dealType: ${dealData.dealType}, dealType2SubType: ${dealData.dealType2SubType}`);
    console.log('[PDF GEN] [DEBUG] Raw seller:', JSON.stringify(dealData.seller, null, 2));
    console.log('[PDF GEN] [DEBUG] Raw buyer:', JSON.stringify(dealData.buyer, null, 2));

    // Helper for RP Exotics info
    const rpExoticsInfo = {
      name: 'RP Exotics',
      email: 'titling@rpexotics.com',
      phone: '(314) 970-2427',
      address: '1155 N Warson Rd, Saint Louis, MO 63132',
      licenseNumber: 'D4865',
      tier: 'Tier 1',
      type: 'dealer'
    };

    // Prepare seller and buyer objects only once at the top of the function
    let seller = dealData.seller || {};
    let buyer = dealData.buyer || {};
    
    // Wholesale D2D Sale/Buy: force correct mapping
    if (dealData.dealType === 'wholesale-d2d') {
      if (dealData.dealType2SubType === 'sale') {
        // RP Exotics is selling to another dealer
        seller = rpExoticsInfo;
        buyer = dealData.buyer || {}; // Use the actual purchasing dealer
      } else if (dealData.dealType2SubType === 'buy') {
        // RP Exotics is buying from another dealer
        seller = dealData.seller || {}; // Use the actual selling dealer
        buyer = rpExoticsInfo;
      }
      // else fallback to default mapping
    }
    console.log('[PDF GEN] [DEBUG] seller after mapping:', JSON.stringify(seller, null, 2));
    console.log('[PDF GEN] [DEBUG] buyer after mapping:', JSON.stringify(buyer, null, 2));
    
    // Generate document number
    const docNumber = this.generateEnhancedDocumentNumber(
      dealData.dealType, 
      dealData.dealType2SubType, 
      'VR', 
      dealData.stockNumber || 'N/A'
    );
    const fileName = `vehicle_record_${dealData.stockNumber || 'N_A'}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    
    console.log('[PDF GEN] [StandardVehicleRecord] Generated docNumber:', docNumber);
    console.log('[PDF GEN] [StandardVehicleRecord] Generated fileName:', fileName);
    console.log('[PDF GEN] [StandardVehicleRecord] Generated filePath:', filePath);
    
    // Helper functions
    function safeNum(val) {
      if (!val || isNaN(val)) return 'N/A';
      return val.toLocaleString();
    }
    
    function formatAddress(addr) {
      if (!addr) return 'N/A';
      if (typeof addr === 'string') return addr;
      const { street, city, state, zip } = addr;
      return [street, city, state, zip].filter(Boolean).join(', ');
    }
    
    // Extract data
    const vehicle = {
      year: dealData.year || 'N/A',
      make: dealData.make || 'N/A',
      model: dealData.model || 'N/A',
      vin: dealData.vin || 'N/A',
      stockNumber: dealData.stockNumber || 'N/A',
      color: dealData.color || dealData.exteriorColor || 'N/A',
      mileage: dealData.mileage || 'N/A'
    };
    
    const financial = dealData.financial || {};
    
    // --- License number extraction helper ---
    function extractLicenseNumber(seller, mergedDealer) {
      return (
        seller.licenseNumber ||
        (seller.contact && seller.contact.licenseNumber) ||
        (mergedDealer && mergedDealer.licenseNumber) ||
        'N/A'
      );
    }
    
    
    // --- Force dealType2SubType to 'sale' for wholesale-d2d sale ---
    if (dealData.dealType === 'wholesale-d2d' && (dealData.dealType2 === 'sale' || dealData.dealType2SubType === 'sale')) {
      const oldValue = dealData.dealType2SubType;
      dealData.dealType2SubType = 'sale';
      console.log('[PDF GEN] [DEBUG] Forced dealType2SubType to sale for wholesale-d2d sale');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] Changed dealType2SubType from', oldValue, 'to', dealData.dealType2SubType);
    }
    
    // Prepare seller and buyer objects only once at the top of the function
    // For any remapping (e.g., D2D logic), use mappedSeller and mappedBuyer only
    let mappedSeller = seller;
    let mappedBuyer = buyer;
    // Wholesale D2D Sale: force correct mapping
    if (dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale') {
      // For D2D sale, RP Exotics is always the seller, actual dealer is the buyer
      mappedSeller = {
        name: 'RP Exotics',
        email: 'titling@rpexotics.com',
        phone: '(314) 970-2427',
        address: '1155 N Warson Rd, Saint Louis, MO 63132',
        licenseNumber: 'D4865',
        tier: 'Tier 1',
        type: 'dealer'
      };
      mappedBuyer = buyer; // The actual buyer is the purchasing dealer
    } else if (dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'buy') {
      // For D2D buy, RP Exotics is the buyer, selling dealer is the seller
      mappedSeller = seller; // The original seller is the selling dealer
      mappedBuyer = {
        name: 'RP Exotics',
        email: 'titling@rpexotics.com',
        phone: '(314) 970-2427',
        address: '1155 N Warson Rd, Saint Louis, MO 63132',
        licenseNumber: 'D4865',
        tier: 'Tier 1',
        type: 'dealer'
      };
      console.log('[PDF GEN] [DEBUG] Wholesale D2D Buy mapping applied:');
      console.log('[PDF GEN] [DEBUG] - Seller (selling dealer):', mappedSeller.name);
      console.log('[PDF GEN] [DEBUG] - Buyer (RP Exotics):', mappedBuyer.name);
    } else if (dealData.dealType === 'wholesale-flip') {
      // For wholesale flip deals, handle buyer data properly
      console.log('[PDF GEN] [DEBUG] Wholesale Flip deal detected in vehicle record generation');
      console.log('[PDF GEN] [DEBUG] Original buyer data:', JSON.stringify(buyer, null, 2));
      
      // If buyer data is incomplete, try to get buyer info from buyerFromDB
      // Only fallback if buyer has no name or if contact is completely missing
      const hasValidBuyerName = buyer.name && buyer.name !== 'N/A' && buyer.name.trim() !== '';
      const hasValidContact = buyer.contact && typeof buyer.contact === 'object';
      
      if (!hasValidBuyerName || !hasValidContact) {
        console.log('[PDF GEN] [DEBUG] Incomplete buyer data detected, checking for buyerFromDB...');
        console.log('[PDF GEN] [DEBUG] Buyer name valid:', hasValidBuyerName, 'Buyer contact valid:', hasValidContact);
        console.log('[PDF GEN] [DEBUG] Original buyer data:', JSON.stringify(buyer, null, 2));
        
        // Try to get buyer info from buyerFromDB if available
        if (dealData.buyerFromDB && dealData.buyerFromDB.name) {
          console.log('[PDF GEN] [DEBUG] Using buyerFromDB data:', dealData.buyerFromDB.name);
          mappedBuyer = {
            name: dealData.buyerFromDB.name,
            email: dealData.buyerFromDB.email || 'N/A',
            phone: dealData.buyerFromDB.phone || 'N/A',
            address: dealData.buyerFromDB.address ? 
              (typeof dealData.buyerFromDB.address === 'string' ? 
                dealData.buyerFromDB.address : 
                `${dealData.buyerFromDB.address.street || ''}, ${dealData.buyerFromDB.address.city || ''}, ${dealData.buyerFromDB.address.state || ''} ${dealData.buyerFromDB.address.zip || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
              ) : 'N/A',
            licenseNumber: dealData.buyerFromDB.licenseNumber || 'N/A',
            tier: dealData.buyerFromDB.tier || 'Tier 1',
            type: dealData.buyerFromDB.type || 'dealer'
          };
        } else {
          console.log('[PDF GEN] [DEBUG] No buyerFromDB available, using RP Exotics as purchasing dealer');
          mappedBuyer = {
            name: 'RP Exotics',
            email: 'titling@rpexotics.com',
            phone: '(314) 970-2427',
            address: '1155 N Warson Rd, Saint Louis, MO 63132',
            licenseNumber: 'D4865',
            tier: 'Tier 1',
            type: 'dealer'
          };
        }
      } else {
        // Use the buyer data as is
        console.log('[PDF GEN] [DEBUG] Using actual buyer data for wholesale-flip vehicle record:', buyer.name);
        mappedBuyer = buyer;
      }
      
      console.log('[PDF GEN] [DEBUG] Wholesale Flip mapping applied:');
      console.log('[PDF GEN] [DEBUG] - Seller:', mappedSeller.name);
      console.log('[PDF GEN] [DEBUG] - Buyer (purchasing dealer):', mappedBuyer.name);
      console.log('[PDF GEN] [DEBUG] Final mappedBuyer for vehicle record:', {
        name: mappedBuyer.name,
        email: mappedBuyer.email,
        phone: mappedBuyer.phone,
        address: mappedBuyer.address,
        licenseNumber: mappedBuyer.licenseNumber,
        type: mappedBuyer.type
      });
    }
    // Declare sellerInfo and buyerInfo as let so they can be reassigned if needed
    let sellerInfo = {
      name: mappedSeller.name || 'N/A',
      email: mappedSeller.email || (mappedSeller.contact && mappedSeller.contact.email) || 'N/A',
      phone: mappedSeller.phone || (mappedSeller.contact && mappedSeller.contact.phone) || 'N/A',
      address: formatAddress(mappedSeller.address || (mappedSeller.contact && mappedSeller.contact.address)) || 'N/A',
      licenseNumber: 'N/A', // placeholder, will assign below
      tier: mappedSeller.tier || 'N/A',
      type: mappedSeller.type || 'N/A'
    };
    let buyerInfo = {
      name: mappedBuyer.name || 'N/A',
      email: mappedBuyer.email || (mappedBuyer.contact && mappedBuyer.contact.email) || 'N/A',
      phone: mappedBuyer.phone || (mappedBuyer.contact && mappedBuyer.contact.phone) || 'N/A',
      address: formatAddress(mappedBuyer.address || (mappedBuyer.contact && mappedBuyer.contact.address)) || 'N/A',
      licenseNumber: 'N/A', // placeholder, will assign below
      tier: mappedBuyer.tier || 'N/A',
      type: mappedBuyer.type || 'N/A'
    };
    // Now do all assignments, debug logs, and logic
    const mergedSellerDealer = dealData.sellerFromDB || {};
    const mergedBuyerDealer = dealData.buyerFromDB || {};
    // Debug: Log mapped seller and buyer before extracting license numbers
    console.log('[PDF GEN][DEBUG] mappedSeller:', JSON.stringify(mappedSeller, null, 2));
    console.log('[PDF GEN][DEBUG] mappedBuyer:', JSON.stringify(mappedBuyer, null, 2));
    console.log('[PDF GEN][DEBUG] mergedSellerDealer:', JSON.stringify(mergedSellerDealer, null, 2));
    console.log('[PDF GEN][DEBUG] mergedBuyerDealer:', JSON.stringify(mergedBuyerDealer, null, 2));
    // Extract license numbers and log them
    const extractedSellerLicense = extractLicenseNumber(mappedSeller, mergedSellerDealer);
    const extractedBuyerLicense = extractLicenseNumber(mappedBuyer, mergedBuyerDealer);
    console.log('[PDF GEN][DEBUG] extractedSellerLicense:', extractedSellerLicense);
    console.log('[PDF GEN][DEBUG] extractedBuyerLicense:', extractedBuyerLicense);
    sellerInfo.licenseNumber = extractedSellerLicense;
    buyerInfo.licenseNumber = extractedBuyerLicense;
    console.log('[PDF GEN] [DEBUG] sellerInfo licenseNumber sources:', {
      sellerLicense: mappedSeller.licenseNumber,
      contactLicense: mappedSeller.contact && mappedSeller.contact.licenseNumber,
      mergedDealerLicense: mergedSellerDealer.licenseNumber
    });
    console.log('[PDF GEN] [DEBUG] buyerInfo licenseNumber sources:', {
      buyerLicense: mappedBuyer.licenseNumber,
      contactLicense: mappedBuyer.contact && mappedBuyer.contact.licenseNumber,
      mergedDealerLicense: mergedBuyerDealer.licenseNumber
    });
    // --- Force dealType2SubType to 'sale' for wholesale-d2d sale ---
    if (dealData.dealType === 'wholesale-d2d' && (dealData.dealType2 === 'sale' || dealData.dealType2SubType === 'sale')) {
      const oldValue = dealData.dealType2SubType;
      dealData.dealType2SubType = 'sale';
      console.log('[PDF GEN] [DEBUG] Forced dealType2SubType to sale for wholesale-d2d sale');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] Changed dealType2SubType from', oldValue, 'to', dealData.dealType2SubType);
    }
    
    const financialInfo = {
      purchasePrice: safeNum(financial.purchasePrice || dealData.purchasePrice),
      listPrice: safeNum(financial.listPrice || dealData.listPrice),
      instantOffer: safeNum(financial.instantOffer || dealData.instantOffer),
      wholesalePrice: safeNum(financial.wholesalePrice || dealData.wholesalePrice),
      payoffBalance: safeNum(financial.payoffBalance || dealData.payoffBalance),
      amountDueToCustomer: safeNum(financial.amountDueToCustomer || dealData.amountDueToCustomer),
      amountDueToRP: safeNum(financial.amountDueToRP || dealData.amountDueToRP),
      commissionRate: safeNum(financial.commissionRate || dealData.commissionRate),
      brokerFee: safeNum(financial.brokerFee || dealData.brokerFee),
      brokerFeePaidTo: financial.brokerFeePaidTo || dealData.brokerFeePaidTo || 'N/A'
    };
    
    console.log('[PDF GEN] [StandardVehicleRecord] Extracted data:', {
      vehicle,
      sellerInfo,
      buyerInfo,
      financialInfo
    });
    
    // Determine price label and value
    let priceLabel = 'Purchase Price';
    let priceValue = dealData.purchasePrice;
    if (dealData.dealType2SubType === 'sale') {
      priceLabel = 'Sale Price';
      priceValue = dealData.wholesalePrice || dealData.salePrice || dealData.purchasePrice;
    } else if (dealData.dealType2SubType === 'buy-sell') {
      priceLabel = 'Buy-Sell Price';
      priceValue = dealData.purchasePrice;
    }
    console.log(`[PDF GEN] [VREC DEBUG] Price label: ${priceLabel}, value: ${priceValue}`);
    
    // 🔍 FINAL DEAL TYPE 2 LOGGING BEFORE HTML GENERATION
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔍 FINAL DEAL TYPE 2 VALUE BEFORE HTML:');
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] dealType2SubType that will be displayed:', dealData.dealType2SubType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] This value will appear as "Deal Type 2" in the vehicle record');
    
    // 🔧 ENSURE CORRECT DEAL TYPE 2 FOR VEHICLE RECORD DISPLAY
    let displayDealType2 = dealData.dealType2SubType || 'N/A';
    
    // Auto-correct deal type 2 for specific scenarios
    if (dealData.dealType === 'wholesale-d2d') {
      if (dealData.dealType2SubType === 'sale') {
        displayDealType2 = 'sale';
      } else if (dealData.dealType2SubType === 'buy') {
        displayDealType2 = 'buy';
      }
    } else if (dealData.dealType === 'wholesale-flip') {
      if (dealData.dealType2SubType === 'buy-sell') {
        displayDealType2 = 'buy-sell';
      } else {
        // For wholesale flip deals, determine based on seller/buyer types
        const sellerType = dealData.sellerType || dealData.seller?.type || 'private';
        const buyerType = dealData.buyerType || dealData.buyer?.type || 'private';
        
        if (sellerType === 'dealer' && buyerType === 'dealer') {
          displayDealType2 = 'buy-sell'; // Dealer-to-dealer flip
        } else if (sellerType === 'private' && buyerType === 'dealer') {
          displayDealType2 = 'buy'; // Private seller to dealer (RP buying)
        } else if (sellerType === 'dealer' && buyerType === 'private') {
          displayDealType2 = 'sale'; // Dealer to private buyer (RP selling)
        } else {
          displayDealType2 = 'buy'; // Default for private-to-private
        }
      }
    } else if (dealData.dealType === 'wholesale-pp') {
      if (dealData.dealType2SubType === 'sale') {
        displayDealType2 = 'sale';
      } else {
        displayDealType2 = 'buy';
      }
    } else if (dealData.dealType === 'retail-pp') {
      displayDealType2 = 'buy'; // Retail PP deals are always buy transactions
    }
    
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔧 CORRECTED DEAL TYPE 2 FOR DISPLAY:', displayDealType2);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Original dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Corrected displayDealType2:', displayDealType2);
    
    // Generate HTML
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RP Exotics - Vehicle Record</title>
        <style>
            @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; }
                .no-print { display: none !important; }
            }

            body {
                font-family: Arial, sans-serif;
                font-size: 11px;
                line-height: 1.3;
                margin: 0;
                padding: 20px;
                background: white;
                color: black;
            }

            .container {
                width: 8.5in;
                margin: 0 auto;
                background: white;
                padding: 20px;
                box-sizing: border-box;
            }

            .header {
                display: flex;
                align-items: flex-start;
                margin-bottom: 20px;
            }

            .logo {
                width: 60px;
                height: 75px;
                border: 2px solid black;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 24px;
                margin-right: 15px;
            }

            .header-info {
                flex: 1;
            }

            .company-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .contact-info {
                font-size: 10px;
                text-align: right;
            }

            .title {
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                margin: 20px 0;
                letter-spacing: 2px;
            }

            .form-section {
                border: 2px solid black;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 15px;
            }

            .section-title {
                font-weight: bold;
                font-size: 12px;
                margin-bottom: 10px;
                color: #333;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .section-row {
                display: flex;
                gap: 20px;
                margin-bottom: 10px;
                align-items: center;
            }

            .field-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .field-label {
                font-weight: bold;
                white-space: nowrap;
            }

            .field-value {
                border-bottom: 1px solid black;
                min-width: 100px;
                padding: 2px 5px;
                display: inline-block;
            }

            .wide-field {
                min-width: 200px;
            }

            .extra-wide-field {
                min-width: 300px;
            }

            .top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .deal-info {
                display: flex;
                gap: 40px;
            }

            .date-info {
                text-align: right;
            }

            .vehicle-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 10px;
            }

            .vehicle-row {
                display: flex;
                gap: 15px;
                align-items: center;
            }

            .seller-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .buyer-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .financial-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
            }

            .status-row {
                display: flex;
                gap: 40px;
                margin-top: 15px;
            }

            .notes-section {
                margin-top: 10px;
            }

            .footer {
                text-align: center;
                font-size: 9px;
                margin-top: 30px;
                line-height: 1.4;
            }

            input[type="text"], input[type="email"], input[type="tel"], input[type="number"] {
                border: none;
                border-bottom: 1px solid black;
                background: transparent;
                padding: 2px 5px;
                font-family: inherit;
                font-size: inherit;
            }

            select {
                border: none;
                border-bottom: 1px solid black;
                background: transparent;
                padding: 2px 5px;
                font-family: inherit;
                font-size: inherit;
            }

            .checkbox-group {
                display: flex;
                gap: 15px;
                align-items: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo">RP</div>
                <div class="header-info">
                    <div class="company-name">RP EXOTICS</div>
                    <div class="contact-info">
                        1155 N. Warson Rd, St. Louis, MO 63132<br>
                        Phone: (314) 970-2427
                    </div>
                </div>
            </div>

            <!-- Title -->
            <div class="title">VEHICLE RECORD SUMMARY</div>

            <!-- Top Section -->
            <div class="top-section">
                <div class="deal-info">
                    <div class="field-group">
                        <span class="field-label">DEAL ID:</span>
                        <span class="field-value">${dealData.rpStockNumber || 'N/A'}</span>
                    </div>
                </div>
                <div class="date-info">
                    <div class="field-group">
                        <span class="field-label">DATE:</span>
                        <span class="field-value">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <!-- Deal Type Section -->
            <div class="form-section">
                <div class="section-row">
                    <div class="field-group">
                        <span class="field-label">DEAL TYPE:</span>
                        <span class="field-value">${dealData.dealType || 'N/A'}</span>
                    </div>
                    <div class="field-group">
                        <span class="field-label">DEAL TYPE 2:</span>
                        <span class="field-value">${displayDealType2}</span>
                    </div>
                    <div class="field-group">
                        <span class="field-label">ASSIGNED TO:</span>
                        <span class="field-value">${dealData.salesperson || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Vehicle Information Section -->
            <div class="form-section">
                <div class="section-title">Vehicle Information</div>
                <div class="vehicle-grid">
                    <div>
                        <div class="vehicle-row">
                            <div class="field-group">
                                <span class="field-label">YEAR:</span>
                                <span class="field-value">${vehicle.year}</span>
                            </div>
                            <div class="field-group">
                                <span class="field-label">MAKE:</span>
                                <span class="field-value">${vehicle.make}</span>
                            </div>
                        </div>
                        <div class="vehicle-row" style="margin-top: 10px;">
                            <div class="field-group">
                                <span class="field-label">STOCK #:</span>
                                <span class="field-value">${vehicle.stockNumber}</span>
                            </div>
                            <div class="field-group">
                                <span class="field-label">COLOR:</span>
                                <span class="field-value">${vehicle.color}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="vehicle-row">
                            <div class="field-group">
                                <span class="field-label">MODEL:</span>
                                <span class="field-value wide-field">${vehicle.model}</span>
                            </div>
                        </div>
                        <div class="vehicle-row" style="margin-top: 10px;">
                            <div class="field-group">
                                <span class="field-label">MILEAGE:</span>
                                <span class="field-value">${vehicle.mileage !== undefined ? vehicle.mileage.toLocaleString() : ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="section-row">
                    <div class="field-group">
                        <span class="field-label">VIN:</span>
                        <span class="field-value extra-wide-field">${vehicle.vin}</span>
                    </div>
                </div>
            </div>

            <!-- Seller Information Section -->
            <div class="form-section">
                <div class="section-title">Seller Information</div>
                <div class="seller-section">
                    <div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">SELLER NAME:</span>
                            <span class="field-value wide-field">${sellerInfo.name}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">CONTACT:</span>
                            <span class="field-value wide-field">${sellerInfo.phone}</span>
                        </div>
                        <div class="field-group">
                            <span class="field-label">ADDRESS:</span>
                            <span class="field-value wide-field">${sellerInfo.address}</span>
                        </div>
                    </div>
                    <div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">EMAIL:</span>
                            <span class="field-value wide-field">${sellerInfo.email}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">SELLER LICENSE #:</span>
                            <span class="field-value wide-field">${sellerInfo.licenseNumber}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Buyer Information Section -->
            <div class="form-section">
                <div class="section-title">Buyer Information</div>
                <div class="buyer-section">
                    <div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">DEALER NAME:</span>
                            <span class="field-value wide-field">${buyerInfo.name}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">PHONE:</span>
                            <span class="field-value wide-field">${buyerInfo.phone}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">ADDRESS:</span>
                            <span class="field-value wide-field">${buyerInfo.address}</span>
                        </div>
                    </div>
                    <div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">EMAIL:</span>
                            <span class="field-value wide-field">${buyerInfo.email}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 10px;">
                            <span class="field-label">DEALER LICENSE #:</span>
                            <span class="field-value wide-field">${buyerInfo.licenseNumber}</span>
                    </div>
                </div>
            </div>
            </div>

            <!-- Financial Information Section -->
            <div class="form-section">
                <div class="section-title">Financial Information</div>
                <div class="financial-grid">
                    <div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">${priceLabel}:</span>
                            <span class="field-value">$${priceValue ? priceValue.toLocaleString() : 'N/A'}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">LIST PRICE:</span>
                            <span class="field-value">${financialInfo.listPrice}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">INSTANT OFFER:</span>
                            <span class="field-value">${financialInfo.instantOffer}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">WHOLESALE PRICE:</span>
                            <span class="field-value">${financialInfo.wholesalePrice}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">PAYOFF AMOUNT:</span>
                            <span class="field-value">${financialInfo.payoffBalance}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">AMOUNT DUE TO CUSTOMER:</span>
                            <span class="field-value">${financialInfo.amountDueToCustomer}</span>
                        </div>
                    </div>
                    <div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">COMMISSION RATE:</span>
                            <span class="field-value">${financialInfo.commissionRate}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">BROKER FEE:</span>
                            <span class="field-value">${financialInfo.brokerFee}</span>
                        </div>
                        <div class="field-group" style="margin-bottom: 15px;">
                            <span class="field-label">AMOUNT DUE TO RP:</span>
                            <span class="field-value">${financialInfo.amountDueToRP}</span>
                        </div>
                    </div>
                </div>
                <div class="field-group" style="margin-bottom: 15px;">
                    <span class="field-label">BROKER FEE PAID TO:</span>
                    <span class="field-value extra-wide-field">${financialInfo.brokerFeePaidTo}</span>
                </div>
                <div class="status-row">
                    <div class="field-group">
                        <span class="field-label">TITLE STATUS:</span>
                        <span class="field-value">N/A</span>
                    </div>
                </div>
            </div>

            <!-- Notes Section -->
            <div class="form-section">
                <div class="field-group">
                    <span class="field-label">NOTES/COMMENTS:</span>
                    <span class="field-value extra-wide-field">${dealData.notes || dealData.generalNotes || 'N/A'}</span>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                Generated by RP Exotics Management System<br>
                Generated by: ${user.firstName} ${user.lastName}<br>
                Generated on: ${new Date().toLocaleString()}
            </div>
        </div>
    </body>
    </html>
    `;
    
    console.log('[PDF GEN] [StandardVehicleRecord] 🖨️ Starting PDF generation with Puppeteer...');
    
    // Ensure uploads directory exists
    this.ensureUploadsDirectorySync();
    
    // Use Puppeteer to render HTML to PDF
    const puppeteer = require('puppeteer');
    let browser;
    
    try {
      browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--font-render-hinting=none', '--disable-dev-shm-usage'] 
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ path: filePath, format: 'A4', printBackground: true });
      console.log('[PDF GEN] [StandardVehicleRecord] ✅ PDF generated successfully');
      
      // Verify file was created
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('[PDF GEN] [StandardVehicleRecord] 📊 Generated file stats:', {
          fileName,
          filePath,
          fileSize: stats.size,
          documentNumber: docNumber
        });
        // Save document to S3 and clean up local file
        const cloudResult = await this.ensureCloudStorage(filePath, fileName, 'vehicle_record', docNumber);
        
        return {
          fileName,
          filePath: cloudResult.filePath, // Use cloud URL instead of local path
          fileSize: stats.size,
          documentNumber: docNumber,
          cloudUrl: cloudResult.cloudUrl
        };
      } else {
        throw new Error(`PDF file was not created at ${filePath}`);
      }
    } catch (error) {
      console.error('[PDF GEN][StandardVehicleRecord] Error generating PDF:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async generateWholesalePurchaseOrder(dealData, user) {
    console.log('[PDF GEN] === generateWholesalePurchaseOrder called ===');
    console.log('[PDF GEN] Vehicle Info:', {
      year: dealData.year,
      make: dealData.make,
      model: dealData.model,
      vin: dealData.vin,
      stockNumber: dealData.stockNumber,
      mileage: dealData.mileage,
      exteriorColor: dealData.exteriorColor,
      interiorColor: dealData.interiorColor,
      color: dealData.color
    });
    console.log('[PDF GEN] Generating Wholesale Purchase Order with dealData:', dealData);
    
    // Defensive check for required fields
    const requiredFields = ['year', 'make', 'model', 'vin', 'dealType'];
    const missingFields = requiredFields.filter(f => !dealData[f]);
    if (missingFields.length > 0) {
      console.warn('[PDF GEN] Missing required fields for Wholesale Purchase Order:', missingFields);
      throw new Error('Missing required fields for Wholesale Purchase Order: ' + missingFields.join(', '));
    }

    // Helper function to format addresses
    function formatAddress(addr) {
      if (!addr) return 'N/A';
      if (typeof addr === 'string') return addr;
      const { street, city, state, zip } = addr;
      return [street, city, state, zip].filter(Boolean).join(', ');
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, bottom: 36, left: 36, right: 36 }
    });

    const stockNumber = dealData.stockNumber || 'N/A';
    const safeStockNumber = String(stockNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `wholesale_purchase_order_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    console.log(`[PDF GEN] Wholesale Purchase Order file path: ${filePath}`);
    
    fs.ensureDirSync(this.uploadsDir);
    fs.accessSync(this.uploadsDir, fs.constants.W_OK);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header with gradient background effect
    doc.rect(36, 36, 523, 80).fill('#1e3a8a');
    
    // Logo and company info
    const logoPath = path.join(__dirname, '../assets/rpexotics-logo.png');
    console.log(`[PDF GEN] Logo path: ${logoPath}`);
    
    try {
      // Check if logo file exists
      if (fs.existsSync(logoPath)) {
        console.log('[PDF GEN] Logo file found, adding to PDF');
        doc.image(logoPath, 50, 50, { width: 40 });
      } else {
        console.warn('[PDF GEN] Logo file not found, using text fallback');
        doc.fontSize(16).font('Helvetica-Bold').fillColor('white').text('RP', 50, 50);
      }
    } catch (error) {
      console.warn('[PDF GEN] Could not load logo, using text fallback:', error.message);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('white').text('RP', 50, 50);
    }
    
    doc.fontSize(16).font('Helvetica-Bold').fillColor('white').text('RP EXOTICS', 100, 50);
    doc.fontSize(9).font('Helvetica').fillColor('white').text('1155 N Warson Rd', 100, 70);
    doc.fontSize(9).font('Helvetica').fillColor('white').text('Saint Louis, MO 63132', 100, 85);
    doc.fontSize(9).font('Helvetica').fillColor('white').text('(314) 970-2427', 100, 100);

    // Document title
    doc.fontSize(20).font('Helvetica-Bold').fillColor('white').text('WHOLESALE SALES ORDER', 36, 130, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('white').text('Dealer-to-Dealer Vehicle Transaction', 36, 150, { align: 'center' });
    
    // Wholesale badge
    doc.roundedRect(450, 140, 100, 18, 8).fill('#7c3aed');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white').text('WHOLESALE', 460, 146, { align: 'center' });

    // Reset colors
    doc.fillColor('black');

    // Document info section
    doc.moveDown(1.5);
    doc.roundedRect(36, doc.y, 523, 35, 8).stroke();
    let y = doc.y + 6;
    doc.fontSize(10).font('Helvetica-Bold').text('Sales Order Date:', 44, y).font('Helvetica').text(new Date().toLocaleDateString(), 160, y);
    doc.font('Helvetica-Bold').text('Stock Number:', 300, y).font('Helvetica').text(`RP-WS-${safeStockNumber}`, 420, y);
    doc.moveDown(1.5);

    // Purchasing Dealer Section
    doc.fontSize(12).font('Helvetica-Bold').text('PURCHASING DEALER', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 50, 8).stroke();
    y = doc.y + 10;
    doc.fontSize(9).font('Helvetica-Bold').text('Dealer Name:', 44, y).font('Helvetica').text(dealData.sellerInfo?.name || 'N/A', 160, y);
    y += 15;
    doc.font('Helvetica-Bold').text('Email:', 44, y).font('Helvetica').text(dealData.sellerInfo?.email || 'N/A', 160, y, { width: 350 });
    y += 15;
    doc.font('Helvetica-Bold').text('Phone:', 44, y).font('Helvetica').text(dealData.sellerInfo?.phone || 'N/A', 160, y);
    doc.font('Helvetica-Bold').text('License #:', 300, y).font('Helvetica').text(dealData.sellerInfo?.licenseNumber || 'N/A', 380, y);
    y += 15;
    doc.font('Helvetica-Bold').text('Address:', 44, y).font('Helvetica').text(formatAddress(dealData.sellerInfo?.address), 160, y, { width: 350 });
    doc.moveDown(0.5);

    // Selling Dealer Section (RP Exotics) - Compact
    doc.fontSize(12).font('Helvetica-Bold').text('SELLING DEALER (RP EXOTICS)', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 35, 8).stroke();
    y = doc.y + 10;
    doc.fontSize(9).font('Helvetica-Bold').text('Company Name:', 44, y).font('Helvetica').text('RP Exotics', 160, y);
    doc.font('Helvetica-Bold').text('Dealer License #:', 300, y).font('Helvetica').text('D4865', 420, y);
    y += 15;
    doc.font('Helvetica-Bold').text('Address:', 44, y).font('Helvetica').text('1155 N Warson Rd, Saint Louis, MO 63132', 160, y);
    doc.font('Helvetica-Bold').text('Phone:', 300, y).font('Helvetica').text('(314) 970-2427', 380, y);
    doc.moveDown(0.5);

    // Vehicle Information Section - Compact
    doc.fontSize(12).font('Helvetica-Bold').text('VEHICLE INFORMATION', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 65, 8).stroke();
    y = doc.y + 10;
    
    // Row 1: VIN and Year
    doc.fontSize(9).font('Helvetica-Bold').text('VIN:', 44, y).font('Helvetica').text(dealData.vin, 90, y, { width: 200 });
    doc.font('Helvetica-Bold').text('Year:', 320, y).font('Helvetica').text(dealData.year, 360, y);
    doc.font('Helvetica-Bold').text('Stock #:', 420, y).font('Helvetica').text(stockNumber, 480, y);
    
    // Row 2: Make and Model
    y += 15;
    doc.font('Helvetica-Bold').text('Make:', 44, y).font('Helvetica').text(dealData.make, 90, y, { width: 120 });
    doc.font('Helvetica-Bold').text('Model:', 230, y).font('Helvetica').text(dealData.model, 280, y, { width: 150 });
    doc.font('Helvetica-Bold').text('Mileage:', 450, y).font('Helvetica').text(dealData.mileage !== undefined ? dealData.mileage.toLocaleString() : 'N/A', 500, y);
    
    // Row 3: Colors
    y += 15;
    doc.font('Helvetica-Bold').text('Exterior Color:', 44, y).font('Helvetica').text(dealData.exteriorColor || dealData.color || 'N/A', 140, y, { width: 150 });
    doc.font('Helvetica-Bold').text('Interior Color:', 320, y).font('Helvetica').text(dealData.interiorColor || 'N/A', 420, y, { width: 120 });
    
    doc.moveDown(0.5);

    // Financial Information Section - Compact
    doc.fontSize(12).font('Helvetica-Bold').text('FINANCIAL INFORMATION', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 25, 8).stroke();
    y = doc.y + 10;
    doc.fontSize(9).font('Helvetica-Bold').text('Sale Price:', 44, y).font('Helvetica').text(`$${dealData.purchasePrice ? dealData.purchasePrice.toLocaleString() : 'N/A'}`, 160, y);
    doc.moveDown(0.5);

    // Terms and Conditions Section - Compact
    doc.fontSize(12).font('Helvetica-Bold').text('WHOLESALE TRANSACTION TERMS & CONDITIONS', 44, doc.y);
    doc.roundedRect(36, doc.y + 5, 523, 70, 8).stroke();
    y = doc.y + 10;
    // Determine payment terms based on dealer tier
    const sellerTier = dealData.sellerInfo?.tier || dealData.seller?.tier || 'Tier 1';
    const isTier2Dealer = sellerTier === 'Tier 2';
    const paymentTerms = isTier2Dealer ? 'Payment terms: Pay upon title.' : 'Payment terms: Pay upon release.';
    const termsText =
      '• This is a DEALER-TO-DEALER wholesale transaction. Purchasing dealer acknowledges this is a business-to-business sale.\n' +
      '• Vehicle is sold AS-IS, WHERE-IS with no warranties expressed or implied unless specifically noted.\n' +
      paymentTerms + '\n' +
      '• Title will be clear and transferable. Any liens will be properly disclosed and handled.\n' +
      '• Any disputes shall be resolved through arbitration in St. Louis County, Missouri.\n' +
      '• This agreement constitutes the entire understanding between the parties.';
    doc.fontSize(8).font('Helvetica').text(
      termsText,
      44, y, { width: 500, align: 'left' }
    );
    doc.moveDown(1.5);

    // Signature Section - Compact
    doc.fontSize(12).font('Helvetica-Bold').text('SIGNATURES', 44, doc.y);
    doc.moveDown(0.3);

    // RP Exotics Signature
    doc.fontSize(9).font('Helvetica-Bold').text('RP Exotics Representative (Seller):', 44, doc.y);
    doc.moveTo(44, doc.y + 3).lineTo(280, doc.y + 3).stroke();
    doc.fontSize(8).font('Helvetica').text('Print Name: _____________________', 44, doc.y + 8);
    doc.moveTo(44, doc.y + 16).lineTo(164, doc.y + 16).stroke();
    doc.fontSize(8).font('Helvetica').text('Date', 44, doc.y + 20);

    // Purchasing Dealer Signature
    doc.fontSize(9).font('Helvetica-Bold').text('Purchasing Dealer Representative:', 300, doc.y - 28);
    doc.moveTo(300, doc.y + 3).lineTo(536, doc.y + 3).stroke();
    doc.fontSize(8).font('Helvetica').text('Print Name: _____________________', 300, doc.y + 8);
    doc.moveTo(300, doc.y + 16).lineTo(420, doc.y + 16).stroke();
    doc.fontSize(8).font('Helvetica').text('Date', 300, doc.y + 20);

    // Footer - Compact
    doc.moveDown(1.5);
    doc.fontSize(7).font('Helvetica').text('RP Exotics Wholesale Division | Professional Vehicle Sales & Distribution', { align: 'center' });
    doc.fontSize(7).font('Helvetica').text('This document represents a binding wholesale sales agreement between licensed dealers.', { align: 'center' });
    // Generate enhanced document number
    const enhancedDocNumber = this.generateEnhancedDocumentNumber(
      dealData.dealType, 
      dealData.dealType2SubType, 
      'WS-SO', 
      dealData.stockNumber
    );
    
    doc.fontSize(7).font('Helvetica').text(`Document Reference: ${enhancedDocNumber}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        const stats = fs.statSync(filePath);
        console.log(`[PDF GEN] Wholesale Purchase Order written: ${fileName}, size: ${stats.size} bytes`);
        
        // Upload to cloud storage
        try {
          console.log(`[PDF GEN][WholesalePurchaseOrder] 🔄 Uploading to cloud storage: ${fileName}`);
          const cloudUrl = await this.saveDocumentToCloud(filePath, fileName);
          console.log(`[PDF GEN][WholesalePurchaseOrder] ✅ Successfully uploaded to cloud storage: ${cloudUrl}`);
          
          resolve({
            fileName,
            filePath: cloudUrl, // Return cloud URL instead of local path
            fileSize: stats.size,
            documentNumber: enhancedDocNumber
          });
        } catch (uploadError) {
          console.error(`[PDF GEN][WholesalePurchaseOrder] ❌ Failed to upload to cloud storage: ${uploadError.message}`);
          // Return local file info if cloud upload fails
          resolve({
            fileName,
            filePath,
            fileSize: stats.size,
            documentNumber: enhancedDocNumber
          });
        }
      });
      writeStream.on('error', (err) => {
        console.error('[PDF GEN] Error writing Wholesale Purchase Order:', err);
        reject(err);
      });
    });
  }

  async generateRetailPPBuy(dealData, user) {
    // 🔍 ENHANCED DEBUGGING FOR LENGTH ERROR DETECTION
    console.log('[PDF GEN][RetailPPBuy][DEBUG] 🔍 === RETAIL PP BUY DEBUG START ===');
    console.log('[PDF GEN][RetailPPBuy][DEBUG] 🔍 sellerInfo:', JSON.stringify(dealData.sellerInfo, null, 2));
    console.log('[PDF GEN][RetailPPBuy][DEBUG] 🔍 seller.address:', dealData.sellerInfo?.address);
    console.log('[PDF GEN][RetailPPBuy][DEBUG] 🔍 seller.address type:', typeof dealData.sellerInfo?.address);
    console.log('[PDF GEN][RetailPPBuy][DEBUG] 🔍 vehicle.make:', dealData.make);
    console.log('[PDF GEN][RetailPPBuy][DEBUG] 🔍 vehicle.vin:', dealData.vin);
    
    // PATCH: Always trust dealData.sellerType and dealData.buyerType if present
    if (dealData.sellerType) {
      if (dealData.seller) dealData.seller.type = dealData.sellerType;
      if (dealData.sellerInfo) dealData.sellerInfo.type = dealData.sellerType;
      console.log('[PDF GEN][PATCH] seller.type forcibly set from dealData.sellerType:', dealData.sellerType);
    }
    if (dealData.buyerType) {
      if (dealData.buyer) dealData.buyer.type = dealData.buyerType;
      if (dealData.buyerInfo) dealData.buyerInfo.type = dealData.buyerType;
      console.log('[PDF GEN][PATCH] buyer.type forcibly set from dealData.buyerType:', dealData.buyerType);
    }
    const puppeteer = require('puppeteer');
    const logoPath = path.resolve(__dirname, '../assets/rpexotics-logo.png');
    const fs = require('fs-extra');
    const safeStockNumber = (dealData.stockNumber && dealData.stockNumber !== 'N/A') ? dealData.stockNumber : 
      (dealData.vin && dealData.vin !== 'N/A') ? dealData.vin : 
      (dealData.vehicleRecordId) ? dealData.vehicleRecordId : 
      `DEAL-${Date.now().toString(36).toUpperCase()}`;
    const fileName = `retail_pp_buy_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    
    // Debug logging for filename generation
    console.log('[PDF GEN][RetailPPBuy] 📁 Filename generation debug:', {
      stockNumber: dealData.stockNumber,
      rpStockNumber: dealData.rpStockNumber,
      vin: dealData.vin,
      vehicleRecordId: dealData.vehicleRecordId,
      safeStockNumber,
      fileName,
      filePath
    });
    
    // Prepare dynamic fields (robust extraction)
    const seller = dealData.sellerInfo || dealData.seller || {};
    const vehicle = dealData;
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const shortDate = today.toLocaleDateString('en-US');
    const yearShort = today.getFullYear().toString().slice(-2);
    const docNumber = this.generateEnhancedDocumentNumber(
      dealData.dealType, 
      dealData.dealType2SubType, 
      'PP', 
      safeStockNumber
    );

    // Robust financial field extraction
    function safeNum(val) {
      if (val === undefined || val === null || val === '' || isNaN(val)) return 0;
      return Number(val);
    }
    const payoff = safeNum(dealData.payoffBalance || dealData.payoffAmount || (dealData.financial && (dealData.financial.payoffBalance || dealData.financial.payoffAmount)));
    const amountDueToCustomer = safeNum(dealData.amountDueToCustomer || (dealData.financial && dealData.financial.amountDueToCustomer));
    const amountDueToRP = safeNum(dealData.amountDueToRP || (dealData.financial && dealData.financial.amountDueToRP));
    const brokerFee = safeNum(dealData.brokerFee || dealData.brokerageFee || (dealData.financial && (dealData.financial.brokerFee || dealData.financial.brokerageFee)));
    const brokerFeePaidTo = dealData.brokerageFeePaidTo || dealData.brokerFeePaidTo || (dealData.financial && (dealData.financial.brokerageFeePaidTo || dealData.financial.brokerFeePaidTo)) || 'N/A';
    const listPrice = safeNum(dealData.listPrice || (dealData.financial && dealData.financial.listPrice));
    // Debug logging
    console.log('[PDF GEN] [RetailPPBuy] Seller:', seller);
    console.log('[PDF GEN] [RetailPPBuy] payoff:', payoff, 'amountDueToCustomer:', amountDueToCustomer, 'amountDueToRP:', amountDueToRP, 'brokerFee:', brokerFee, 'brokerFeePaidTo:', brokerFeePaidTo, 'listPrice:', listPrice);

    // Helper for address formatting
    function formatAddress(addr) {
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ').replace(/, ,/g, ',').replace(/, $/, '');
      }
      return String(addr);
    }

    // Read logo as base64
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUrl = `data:image/png;base64,${logoBase64}`;

    // Fill the HTML template
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RP Exotics - Private Party Purchase Agreement</title>
      <style>
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; }
          .no-print { display: none !important; }
          .page-break { break-before: page; page-break-before: always; }
        }
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; background: white; color: black; }
        .page { width: 8.5in; height: 11in; margin: 0 auto; padding: 0.75in; background: white; position: relative; box-sizing: border-box; break-after: page; }
        .header-section { display: flex; align-items: flex-start; margin-bottom: 25px; }
        .logo-section { width: 80px; margin-right: 15px; }
        .logo { width: 60px; height: 75px; border: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; margin-bottom: 5px; }
        .header-text { font-size: 9px; line-height: 1.2; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0; }
        .date-line { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
        .agreement-text { margin-bottom: 15px; text-align: justify; line-height: 1.5; }
        .field-section { margin: 15px 0; }
        .field-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .field-table td { padding: 4px 8px; border-bottom: 1px solid black; vertical-align: bottom; }
        .field-label { border-bottom: none !important; font-size: 9px; padding-top: 8px; vertical-align: top; }
        .filled-field { font-weight: bold; min-height: 20px; }
        .address-box { min-height: 32px; font-size: 12px; font-weight: bold; border: 1.5px solid #000; padding: 6px 10px; width: 100%; box-sizing: border-box; word-break: break-all; }
        .address-box.shrink { font-size: 10px; }
        .terms-section { margin: 10px 0; }
        .terms-title { font-weight: bold; margin-bottom: 6px; font-size: 11px; }
        .term-item { margin-bottom: 7px; text-align: justify; font-size: 10px; }
        .signature-section { margin-top: 20px; }
        .signature-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .signature-table td { padding: 8px; border-bottom: 1px solid black; width: 33.33%; }
        .signature-label { border-bottom: none !important; font-size: 9px; text-align: center; padding-top: 5px; }
        .footer { text-align: center; font-size: 9px; color: #666; margin-top: 30px; }
        .poa-section { margin-top: 30px; }
        .poa-title { text-align: center; font-weight: bold; font-size: 16px; margin: 30px 0; }
        .poa-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .poa-field { margin: 8px 0; }
        .poa-field label { font-weight: bold; margin-right: 10px; }
        .notary-box { border: 2px solid black; padding: 15px; margin-top: 20px; }
        .notary-title { font-weight: bold; margin-bottom: 10px; }
        .underline { border-bottom: 1px solid black; display: inline-block; min-width: 200px; padding: 2px 5px; }
        .small-underline { border-bottom: 1px solid black; display: inline-block; min-width: 100px; padding: 2px 5px; }
        .vin-box { font-size: 12px; font-weight: bold; word-break: break-all; max-width: 100%; }
        .vin-box.shrink { font-size: 9px; }
        .make-box { font-size: 12px; font-weight: bold; word-break: break-all; max-width: 100%; }
        .make-box.shrink { font-size: 9px; }
        .financial-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .financial-table td { padding: 4px 8px; border-bottom: 1px solid black; vertical-align: bottom; }
        .financial-label { border-bottom: none !important; font-size: 9px; padding-top: 8px; vertical-align: top; }
      </style>
    </head>
    <body>
      <!-- Page 1 -->
      <div class="page">
        <div class="header-section">
          <div class="logo-section">
            <img src='${logoDataUrl}' alt="RP Exotics Logo" style="width:60px;height:75px;border:2px solid black;object-fit:contain;display:block;margin-bottom:5px;" />
            <div class="header-text"><strong>EXOTICS</strong></div>
          </div>
          <div class="header-text">
            1155 N. Warson Rd.<br>
            St. Louis, MO. 63132<br>
            PH: (314) 970 2427
          </div>
        </div>
        <div class="title">Private Party Purchase Agreement</div>
        <div class="date-line">${dateString}</div>
        <div class="agreement-text">
          This Agreement is made this <strong>${dateString}</strong> by and between RP Exotics, LLC, in St.<br>
          Louis, MO and <span class="underline"><strong>${seller.name || ''}</strong></span> hereinafter referred to as "Seller(s)" and RP<br>
          Exotics, LLC hereinafter referred to as "Buyer".
        </div>
        <div class="address-box${(formatAddress(seller.address) || '').length > 40 ? ' shrink' : ''}" style="word-break: break-all; white-space: pre-line; font-size:${(formatAddress(seller.address) || '').length > 60 ? '8px' : (formatAddress(seller.address) || '').length > 40 ? '10px' : '12px'};"><strong>${formatAddress(seller.address) || ''}</strong></div>
        <div style="font-size:9px; margin-bottom:8px;">Address of the Seller(s)</div>
        <table class="field-table">
          <tr>
            <td class="filled-field" colspan="3" style="width: 100%;"><strong>${seller.name || ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label" colspan="3">Seller Name</td>
          </tr>
          <tr>
            <td class="filled-field" style="width: 25%;"><strong>${seller.phone || ''}</strong></td>
            <td class="filled-field" style="width: 35%;"></td>
            <td class="filled-field" style="width: 40%;"><strong>${seller.email || ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label">Home/Main Phone Number</td>
            <td class="field-label">Mobile Phone Number</td>
            <td class="field-label">Email Address</td>
          </tr>
        </table>
        <div style="margin: 20px 0;"><strong>Description of the Vehicle (the \"Vehicle\"):</strong></div>
        <table class="field-table">
          <tr>
            <td class="filled-field" style="width: 20%;"><strong>Sedan</strong></td>
            <td class="filled-field" style="width: 15%;"><strong>${vehicle.year || ''}</strong></td>
            <td class="filled-field make-box${(vehicle.make && vehicle.make.length > 12) ? ' shrink' : ''}" style="width: 20%; word-break: break-all; white-space: pre-line; font-size:${(vehicle.make && vehicle.make.length > 18) ? '8px' : (vehicle.make && vehicle.make.length > 12) ? '10px' : '12px'};"><strong>${vehicle.make || ''}</strong></td>
            <td class="filled-field" style="width: 45%;"><strong>${vehicle.model || ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label">Body Type</td>
            <td class="field-label">Year</td>
            <td class="field-label">Make</td>
            <td class="field-label">Model</td>
          </tr>
        </table>
        <table class="field-table">
          <tr>
            <td class="filled-field vin-box${(vehicle.vin && vehicle.vin.length > 17) ? ' shrink' : ''}" style="width: 60%; word-break: break-all; white-space: pre-line; font-size:${(vehicle.vin && vehicle.vin.length > 20) ? '8px' : (vehicle.vin && vehicle.vin.length > 17) ? '10px' : '12px'};"><strong>${vehicle.vin || ''}</strong></td>
            <td class="filled-field" style="width: 40%;"><strong>${vehicle.mileage ? vehicle.mileage.toLocaleString() : ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label">Vehicle Identification Number</td>
            <td class="field-label">Mileage</td>
          </tr>
        </table>
        <div style="margin: 20px 0;"><strong>Financial Information:</strong></div>
        <table class="financial-table">
          <tr>
            <td class="filled-field" style="width: 50%;"><strong>Purchase Price: $${vehicle.purchasePrice ? vehicle.purchasePrice.toLocaleString() : 'N/A'}</strong></td>
            <td class="filled-field" style="width: 50%;"><strong>Payoff Amount: $${payoff ? payoff.toLocaleString() : 'N/A'}</strong></td>
          </tr>
          <tr>
            <td class="filled-field" style="width: 50%;"><strong>Amount Due to Customer: $${amountDueToCustomer ? amountDueToCustomer.toLocaleString() : 'N/A'}</strong></td>
            <td class="filled-field" style="width: 50%;"><strong>Amount Due to RP Exotics: $${amountDueToRP ? amountDueToRP.toLocaleString() : 'N/A'}</strong></td>
          </tr>
        </table>
        <div class="terms-section">
          <div class="terms-title">General Terms of the Agreement:</div>
          <div class="term-item"><strong>1. Possession and Inspection:</strong> Seller(s) shall transfer possession of the vehicle to RP Exotics upon execution of this Agreement.</div>
          <div class="term-item"><strong>2. Vehicle Condition:</strong> If the vehicle's condition is wrongfully described by the Seller(s), RP Exotics retains the right to cancel the purchase within five (5) business days or be reimbursed the original purchase amount if Seller(s) have already received payment.</div>
          <div class="term-item"><strong>3. Seller Representations:</strong> Seller(s) represents that the vehicle is in good working order and has disclosed any known issues or defects, mechanical and/or cosmetic. This includes accurate odometer and mileage disclosure.</div>
          <div class="term-item"><strong>4. Transfer of Ownership:</strong> Seller(s) is the transferor of the vehicle and is responsible for ensuring all necessary disclosures are made in accordance with state and federal law.</div>
          <div class="term-item"><strong>5. Payment Terms:</strong> All payments will be sent out within five (5) business days of the execution of this agreement. Please refer to the Additional Terms outlined below for details based on your individual circumstances.</div>
        </div>
        <div class="terms-section" style="margin-bottom:0;">
          <div class="terms-title">Additional Terms for Vehicles with Title in Hand and No Lien:</div>
          <div class="term-item"><strong>1. Delivery of Payment:</strong> RP Exotics will send the Seller(s) an overnight envelope containing a check for the agreed purchase price of the vehicle. This envelope will also include a prepaid return label and envelope for the Seller(s) to use.</div>
          <div class="term-item"><strong>2. Title Transfer Requirements:</strong> The Seller(s) is required to sign and place their title in the provided return envelope and send it back to RP Exotics using the provided label. The title must be received at RP Exotics before the Seller(s) is authorized to deposit the check. <em>Note: For inquiries on title execution, contact your RP Exotics onboarding specialist.</em></div>
          <div class="term-item"><strong>3. Check Deposit and Positive Pay System:</strong> RP Exotics employs the Positive Pay banking system to ensure security and proper sequence in the transaction. Should the check be deposited before the title is received by RP Exotics, the deposit will be denied. A new check will be issued once the title is received in-house.</div>
          <div class="term-item"><strong>4. Vehicle Pickup Coordination:</strong> Once the check is delivered to the Seller(s), your RP Exotics onboarding specialist will contact the Seller(s) to schedule the pickup of the vehicle. Arrangements will be made for a transport truck to arrive within (72) hours of check delivery.</div>
        </div>
        <div class="footer">A Cseris Holdings LLC Company</div>
      </div>
      <!-- Page 2 -->
      <div class="page page-break">
        <div class="terms-section">
          <div class="terms-title">Additional Terms for Vehicle Transactions Involving Liens:</div>
          <div class="term-item">1. Documentation and Payment Envelope: Upon execution of the Buyer's Order, RP Exotics will send the payoff to the lienholder through their preferred payment method (i.e. check, wire transfer, ACH). If applicable, a check representing the Seller's positive equity will be sent directly to the Seller(s).<br>a. For Seller(s) in title holding states (Kentucky, Maryland, Michigan, Minnesota, Missouri, Montana, New York, Oklahoma, and Wyoming), RP Exotics will provide a shipping envelope and label to facilitate the direct sending of the title to RP Exotics.</div>
          <div class="term-item">2. Check Deposit Conditions: The positive equity check should not be deposited until the title has been signed and received at RP Exotics. If the check is deposited prematurely, it will be voided, and a new check will be issued once the title has been received.</div>
          <div class="term-item">3. Lien Payoff Process: RP Exotics will send payment directly to the lienholder using their preferred method (e.g., ACH transfer, wire, or check).</div>
          <div class="term-item">4. Proof of Payment and Tracking: RP Exotics will provide the Seller(s) with copies of the payment confirmation and, if applicable, a tracking number for the payment sent to the lienholder.</div>
          <div class="term-item">5. Negative Equity Payment: If the Seller(s) has negative equity, this amount must be resolved before any payoff payments are made to the lienholder. The Controller at RP Exotics will manage the collection of these funds.</div>
          <div class="term-item">6. Title Transfer Instructions: RP Exotics will instruct the lienholder to send the title directly to RP Exotics once it is paid off and released by the bank.<br>a. Should the lienholder send the title directly to the Seller(s), please notify your onboarding specialist immediately.</div>
          <div class="term-item">7. Vehicle Pickup Scheduling and Coordination: Vehicle pickup will be scheduled within (72) hours of the execution of this agreement and upon receiving proof of the payment being sent to the lienholder (except for banks utilizing DealerTrack). Lienholders can take up to (4) weeks to reflect a completed payoff. Pickup shall not be delayed by Seller(s) pending the lienholder's internal processing of the payoff.</div>
        </div>
        <div style="margin: 30px 0; text-align: justify;">We, the undersigned, confirm this comprises the entire agreement affecting the purchase of the Vehicle and no other agreement or understanding of any nature concerning the same has been made or entered into, or will be recognized. Further, we certify that all information in this agreement and all information furnished in support of this agreement is accurate and complete to the best of my/our knowledge and belief.</div>
        <div class="signature-section">
          <table class="signature-table">
            <tr><td></td><td></td><td></td></tr>
            <tr><td class="signature-label">Seller Signature</td><td class="signature-label">Date</td><td class="signature-label"></td></tr>
          </table>
          <table class="signature-table">
            <tr><td></td><td></td><td></td></tr>
            <tr><td class="signature-label">Co-Seller Signature</td><td class="signature-label">Date</td><td class="signature-label"></td></tr>
          </table>
          <table class="signature-table">
            <tr><td></td><td></td><td></td></tr>
            <tr><td class="signature-label">Dealer Authorized Representative</td><td class="signature-label">Date</td><td class="signature-label"></td></tr>
          </table>
        </div>
        <div class="footer">A Cseris Holdings LLC Company</div>
      </div>
      <!-- Page 3 -->
      <div class="page page-break">
        <div class="header-section">
          <div class="logo-section">
            <img src='${logoDataUrl}' alt="RP Exotics Logo" style="width:60px;height:75px;border:2px solid black;object-fit:contain;display:block;margin-bottom:5px;" />
            <div class="header-text"><strong>EXOTICS</strong></div>
          </div>
          <div class="header-text">
            1155 N. Warson Rd.<br>
            St. Louis, MO. 63132<br>
            PH: (314) 970 2427<br>
            info@rpexotics.com
          </div>
        </div>
        <div class="poa-title">POWER OF ATTORNEY</div>
        <div class="poa-header">
          <div><strong>DATE:</strong> <span class="underline"><strong>${shortDate}</strong></span></div>
          <div><strong>STOCK #:</strong> <span class="underline"><strong>${safeStockNumber}</strong></span></div>
        </div>
        <div class="poa-field"><strong>CUSTOMER:</strong> <span class="underline"><strong>${seller.name || ''}</strong></span></div>
        <div class="poa-field" style="margin: 20px 0;"><strong>I/WE</strong> <span class="underline"><strong>${seller.name || ''}</strong></span><br><strong>OF</strong> <span class="underline"><strong>${formatAddress(seller.address) || ''}</strong></span></div>
        <div style="margin: 20px 0;">
          <div class="poa-field"><strong>YEAR:</strong> <span class="small-underline"><strong>${vehicle.year || ''}</strong></span> &nbsp;&nbsp;&nbsp;&nbsp; <strong>MAKE:</strong> <span class="small-underline"><strong>${vehicle.make || ''}</strong></span></div>
          <div class="poa-field"><strong>MODEL:</strong> <span class="underline"><strong>${vehicle.model || ''}</strong></span></div>
          <div class="poa-field"><strong>VIN:</strong> <span class="underline vin-box${(vehicle.vin && vehicle.vin.length > 17) ? ' shrink' : ''}"><strong>${vehicle.vin || ''}</strong></span></div>
          <div class="poa-field"><strong>MILEAGE:</strong> <span class="small-underline"><strong>${vehicle.mileage ? vehicle.mileage.toLocaleString() : ''}</strong></span></div>
        </div>
        <div style="margin: 30px 0; text-align: justify;">Constitute and appoint RP Exotics my (our) true and lawful attorney-in-fact for the purpose of transferring title and registration, assignment of title, and applications for titles to the above described motor vehicle with full authority to sign on my (our) behalf all papers and documents and to do all things necessary to this appointment.</div>
        <div style="margin: 20px 0;">Executed on this <span class="small-underline"></span>day of <span class="underline"></span> , <span class="small-underline"></span> .</div>
        <div style="margin: 30px 0;">Signed: <span class="underline"></span></div>
        <div style="margin: 20px 0;">Co-Signer:<span class="underline"></span></div>
        <div class="notary-box">
          <div class="notary-title">Notary Information</div>
          <div style="margin: 10px 0;">Subscribed and sworn before me, this</div>
          <div style="margin: 10px 0;"><span class="small-underline"></span> day of <span class="underline"></span> Year<span class="small-underline"></span></div>
          <div style="margin: 10px 0;">State <span class="underline"></span> County<span class="underline"></span></div>
          <div style="margin: 15px 0;">My commission Expires (<span class="small-underline"></span>/<span class="small-underline"></span>/<span class="small-underline"></span>)</div>
          <div style="margin: 15px 0;">Notary Public Signature<br><span class="underline"></span></div>
          <div style="margin: 15px 0;">Notary Public Name (Typed or Printed)<br><span class="underline"></span></div>
        </div>
        <div class="footer">A Cseris Holdings LLC Company</div>
      </div>
    </body>
    </html>
    `;

    // Use Puppeteer to render HTML to PDF
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: filePath, format: 'A4', printBackground: true });
    await browser.close();

    const stats = fs.statSync(filePath);
    
    // Upload to cloud storage
    try {
      console.log(`[PDF GEN][RetailPPBuy] 🔄 Uploading to cloud storage: ${fileName}`);
      const cloudUrl = await this.saveDocumentToCloud(filePath, fileName);
      console.log(`[PDF GEN][RetailPPBuy] ✅ Successfully uploaded to cloud storage: ${cloudUrl}`);
      
      return {
        fileName,
        filePath: cloudUrl, // Return cloud URL instead of local path
        fileSize: stats.size,
        documentType: 'purchase_agreement',
        documentNumber: docNumber
      };
    } catch (uploadError) {
      console.error(`[PDF GEN][RetailPPBuy] ❌ Failed to upload to cloud storage: ${uploadError.message}`);
      // Return local file info if cloud upload fails
      return {
        fileName,
        filePath,
        fileSize: stats.size,
        documentType: 'purchase_agreement',
        documentNumber: docNumber
      };
    }
  }

  async generateWholesalePPBuy(dealData, user) {
    console.log('[PDF GEN][WholesalePPBuy] 🎯 ENTERING generateWholesalePPBuy function');
    console.log('[PDF GEN][WholesalePPBuy] 🔍 Input dealData:', {
      dealType: dealData.dealType,
      dealType2SubType: dealData.dealType2SubType,
      seller: dealData.seller,
      buyer: dealData.buyer,
      sellerInfo: dealData.sellerInfo,
      buyerInfo: dealData.buyerInfo
    });
    
    // PATCH: Always trust dealData.sellerType and dealData.buyerType if present
    if (dealData.sellerType) {
      if (dealData.seller) dealData.seller.type = dealData.sellerType;
      if (dealData.sellerInfo) dealData.sellerInfo.type = dealData.sellerType;
      console.log('[PDF GEN][PATCH] seller.type forcibly set from dealData.sellerType:', dealData.sellerType);
    }
    if (dealData.buyerType) {
      if (dealData.buyer) dealData.buyer.type = dealData.buyerType;
      if (dealData.buyerInfo) dealData.buyerInfo.type = dealData.buyerType;
      console.log('[PDF GEN][PATCH] buyer.type forcibly set from dealData.buyerType:', dealData.buyerType);
    }
    const puppeteer = require('puppeteer');
    const logoPath = path.resolve(__dirname, '../assets/rpexotics-logo.png');
    const fs = require('fs-extra');
    const safeStockNumber = (dealData.stockNumber && dealData.stockNumber !== 'N/A') ? dealData.stockNumber : 
      (dealData.rpStockNumber && dealData.rpStockNumber !== 'N/A') ? dealData.rpStockNumber : 
      (dealData.vin && dealData.vin !== 'N/A') ? dealData.vin : 
      (dealData.vehicleRecordId) ? dealData.vehicleRecordId : 
      `DEAL-${Date.now().toString(36).toUpperCase()}`;
    const fileName = `wholesale_purchase_agreement_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    
    console.log('[PDF GEN][WholesalePPBuy] 📁 File generation details:', {
      stockNumber: dealData.stockNumber,
      rpStockNumber: dealData.rpStockNumber,
      vin: dealData.vin,
      vehicleRecordId: dealData.vehicleRecordId,
      safeStockNumber,
      fileName,
      filePath
    });
    
    // Prepare dynamic fields (robust extraction)
    const rawSeller = dealData.sellerInfo || dealData.seller || {};
    const seller = {
      name: rawSeller.name || '',
      phone: rawSeller.phone || (rawSeller.contact && rawSeller.contact.phone) || '',
      email: rawSeller.email || (rawSeller.contact && rawSeller.contact.email) || '',
      address: rawSeller.address || (rawSeller.contact && rawSeller.contact.address) || '',
      tier: rawSeller.tier || 'Tier 1',
      type: rawSeller.type || 'dealer'
    };
    
    console.log('[PDF GEN][WholesalePPBuy] 🔍 Raw seller data:', rawSeller);
    console.log('[PDF GEN][WholesalePPBuy] 🔍 Processed seller data:', seller);
    const vehicle = dealData;
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const shortDate = today.toLocaleDateString('en-US');
    const yearShort = today.getFullYear().toString().slice(-2);
    const docNumber = this.generateEnhancedDocumentNumber(
      dealData.dealType, 
      dealData.dealType2SubType, 
      'WPP', 
      safeStockNumber
    );

    // Robust financial field extraction
    function safeNum(val) {
      if (val === undefined || val === null || val === '' || isNaN(val)) return 0;
      return Number(val);
    }
    const payoff = safeNum(dealData.payoffBalance || dealData.payoffAmount || (dealData.financial && (dealData.financial.payoffBalance || dealData.financial.payoffAmount)));
    const amountDueToCustomer = safeNum(dealData.amountDueToCustomer || (dealData.financial && dealData.financial.amountDueToCustomer));
    const amountDueToRP = safeNum(dealData.amountDueToRP || (dealData.financial && dealData.financial.amountDueToRP));
    const brokerFee = safeNum(dealData.brokerFee || dealData.brokerageFee || (dealData.financial && (dealData.financial.brokerFee || dealData.financial.brokerageFee)));
    const brokerFeePaidTo = dealData.brokerageFeePaidTo || dealData.brokerFeePaidTo || (dealData.financial && (dealData.financial.brokerageFeePaidTo || dealData.financial.brokerFeePaidTo)) || 'N/A';
    const listPrice = safeNum(dealData.listPrice || (dealData.financial && dealData.financial.listPrice));
    
    // Dealer tier information for payment terms
    const dealerTier = seller.tier || 'Tier 1';
    const isTier2Dealer = dealerTier === 'Tier 2';
    const paymentTerms = isTier2Dealer ? 'Payment terms: Pay upon title.' : 'Payment terms: Pay upon release.';
    
    // Debug logging
    console.log('[PDF GEN] [WholesalePPBuy] Seller:', seller);
    console.log('[PDF GEN] [WholesalePPBuy] Dealer Tier:', dealerTier, 'Payment Terms:', paymentTerms);
    console.log('[PDF GEN] [WholesalePPBuy] payoff:', payoff, 'amountDueToCustomer:', amountDueToCustomer, 'amountDueToRP:', amountDueToRP, 'brokerFee:', brokerFee, 'brokerFeePaidTo:', brokerFeePaidTo, 'listPrice:', listPrice);
    console.log('[PDF GEN] [WholesalePPBuy][DEBUG] Template modifications: Financial fields removed (only purchase price remains), lien terms section will be replaced');

    // Helper for address formatting
    function formatAddress(addr) {
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ').replace(/, ,/g, ',').replace(/, $/, '');
      }
      return String(addr);
    }

    // Read logo as base64
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUrl = `data:image/png;base64,${logoBase64}`;

    // Fill the HTML template
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RP Exotics - Wholesale Purchase Agreement</title>
      <style>
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; }
          .no-print { display: none !important; }
          .page-break { break-before: page; page-break-before: always; }
        }
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; margin: 0; padding: 0; background: white; color: black; }
        .page { width: 8.5in; height: 11in; margin: 0 auto; padding: 0.75in; background: white; position: relative; box-sizing: border-box; break-after: page; }
        .header-section { display: flex; align-items: flex-start; margin-bottom: 25px; }
        .logo-section { width: 80px; margin-right: 15px; }
        .logo { width: 60px; height: 75px; border: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; margin-bottom: 5px; }
        .header-text { font-size: 9px; line-height: 1.2; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0; }
        .date-line { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
        .agreement-text { margin-bottom: 15px; text-align: justify; line-height: 1.5; }
        .field-section { margin: 15px 0; }
        .field-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .field-table td { padding: 4px 8px; border-bottom: 1px solid black; vertical-align: bottom; }
        .field-label { border-bottom: none !important; font-size: 9px; padding-top: 8px; vertical-align: top; }
        .filled-field { font-weight: bold; min-height: 20px; }
        .address-box { min-height: 32px; font-size: 12px; font-weight: bold; border: 1.5px solid #000; padding: 6px 10px; width: 100%; box-sizing: border-box; word-break: break-all; }
        .address-box.shrink { font-size: 10px; }
        .terms-section { margin: 10px 0; }
        .terms-title { font-weight: bold; margin-bottom: 6px; font-size: 11px; }
        .term-item { margin-bottom: 7px; text-align: justify; font-size: 10px; }
        .signature-section { margin-top: 20px; }
        .signature-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .signature-table td { padding: 8px; border-bottom: 1px solid black; width: 33.33%; }
        .signature-label { border-bottom: none !important; font-size: 9px; text-align: center; padding-top: 5px; }
        .footer { text-align: center; font-size: 9px; color: #666; margin-top: 30px; }
        .vin-box { font-size: 12px; font-weight: bold; word-break: break-all; max-width: 100%; }
        .vin-box.shrink { font-size: 9px; }
        .make-box { font-size: 12px; font-weight: bold; word-break: break-all; max-width: 100%; }
        .make-box.shrink { font-size: 9px; }
        .financial-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .financial-table td { padding: 4px 8px; border-bottom: 1px solid black; vertical-align: bottom; }
        .financial-label { border-bottom: none !important; font-size: 9px; padding-top: 8px; vertical-align: top; }
      </style>
    </head>
    <body>
      <!-- Page 1 -->
      <div class="page">
        <div class="header-section">
          <div class="logo-section">
            <img src='${logoDataUrl}' alt="RP Exotics Logo" style="width:60px;height:75px;border:2px solid black;object-fit:contain;display:block;margin-bottom:5px;" />
            <div class="header-text"><strong>EXOTICS</strong></div>
          </div>
          <div class="header-text">
            1155 N. Warson Rd.<br>
            St. Louis, MO. 63132<br>
            PH: (314) 970 2427
          </div>
        </div>
        <div class="title">Wholesale Purchase Agreement</div>
        <div class="date-line">${dateString}</div>
        <div class="agreement-text">
          This Agreement is made this <strong>${dateString}</strong> by and between RP Exotics, LLC, in St.<br>
          Louis, MO and <span class="underline"><strong>${seller.name || ''}</strong></span> hereinafter referred to as "Seller(s)" and RP<br>
          Exotics, LLC hereinafter referred to as "Buyer".
        </div>
        <div class="address-box${(formatAddress(seller.address) || '').length > 40 ? ' shrink' : ''}" style="word-break: break-all; white-space: pre-line; font-size:${(formatAddress(seller.address) || '').length > 60 ? '8px' : (formatAddress(seller.address) || '').length > 40 ? '10px' : '12px'};"><strong>${formatAddress(seller.address) || ''}</strong></div>
        <div style="font-size:9px; margin-bottom:8px;">Address of the Seller(s)</div>
        <table class="field-table">
          <tr>
            <td class="filled-field" colspan="3" style="width: 100%;"><strong>${seller.name || ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label" colspan="3">Seller Name</td>
          </tr>
          <tr>
            <td class="filled-field" style="width: 25%;"><strong>${seller.phone || ''}</strong></td>
            <td class="filled-field" style="width: 35%;"></td>
            <td class="filled-field" style="width: 40%;"><strong>${seller.email || ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label">Home/Main Phone Number</td>
            <td class="field-label">Mobile Phone Number</td>
            <td class="field-label">Email Address</td>
          </tr>
        </table>
        <div style="margin: 20px 0;"><strong>Description of the Vehicle (the \"Vehicle\"):</strong></div>
        <table class="field-table">
          <tr>
            <td class="filled-field" style="width: 20%;"><strong>Sedan</strong></td>
            <td class="filled-field" style="width: 15%;"><strong>${vehicle.year || ''}</strong></td>
            <td class="filled-field make-box${(vehicle.make && vehicle.make.length > 12) ? ' shrink' : ''}" style="width: 20%; word-break: break-all; white-space: pre-line; font-size:${(vehicle.make && vehicle.make.length > 18) ? '8px' : (vehicle.make && vehicle.make.length > 12) ? '10px' : '12px'};"><strong>${vehicle.make || ''}</strong></td>
            <td class="filled-field" style="width: 45%;"><strong>${vehicle.model || ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label">Body Type</td>
            <td class="field-label">Year</td>
            <td class="field-label">Make</td>
            <td class="field-label">Model</td>
          </tr>
        </table>
        <table class="field-table">
          <tr>
            <td class="filled-field vin-box${(vehicle.vin && vehicle.vin.length > 17) ? ' shrink' : ''}" style="width: 60%; word-break: break-all; white-space: pre-line; font-size:${(vehicle.vin && vehicle.vin.length > 20) ? '8px' : (vehicle.vin && vehicle.vin.length > 17) ? '10px' : '12px'};"><strong>${vehicle.vin || ''}</strong></td>
            <td class="filled-field" style="width: 40%;"><strong>${vehicle.mileage ? vehicle.mileage.toLocaleString() : ''}</strong></td>
          </tr>
          <tr>
            <td class="field-label">Vehicle Identification Number</td>
            <td class="field-label">Mileage</td>
          </tr>
        </table>
        <div style="margin: 20px 0;"><strong>Financial Information:</strong></div>
        <table class="financial-table">
          <tr>
            <td class="filled-field" style="width: 100%;"><strong>Sale Price: $${vehicle.purchasePrice ? vehicle.purchasePrice.toLocaleString() : 'N/A'}</strong></td>
          </tr>
          <tr>
            <td class="financial-label">Sale Price ($)</td>
          </tr>
        </table>
        <div style="font-size: 9px; color: #666; margin-top: 5px; font-style: italic;">Note: Only sale price is shown for wholesale purchase agreements. Other financial details are handled separately.</div>
        <div class="terms-section">
          <div class="terms-title">General Terms of the Agreement:</div>
          <div class="term-item"><strong>1. Possession and Inspection:</strong> Seller(s) shall transfer possession of the vehicle to RP Exotics upon execution of this Agreement.</div>
          <div class="term-item"><strong>2. Vehicle Condition:</strong> If the vehicle's condition is wrongfully described by the Seller(s), RP Exotics retains the right to cancel the purchase within five (5) business days or be reimbursed the original purchase amount if Seller(s) have already received payment.</div>
          <div class="term-item"><strong>3. Seller Representations:</strong> Seller(s) represents that the vehicle is in good working order and has disclosed any known issues or defects, mechanical and/or cosmetic. This includes accurate odometer and mileage disclosure.</div>
          <div class="term-item"><strong>4. Transfer of Ownership:</strong> Seller(s) is the transferor of the vehicle and is responsible for ensuring all necessary disclosures are made in accordance with state and federal law.</div>
          <div class="term-item"><strong>5. Payment Terms:</strong> All payments will be sent out within five (5) business days of the execution of this agreement.</div>
        </div>

        <div class="footer">A Cseris Holdings LLC Company</div>
      </div>
      <!-- Page 2 -->
      <div class="page page-break">
        <div class="terms-section">
          <div class="terms-title">Additional Terms for Wholesale Purchase Agreements:</div>
          <div class="term-item"><strong>1. Dealer-to-Dealer Transaction:</strong> This is a wholesale transaction between licensed dealers. All terms and conditions are subject to dealer agreements and industry standards.</div>
          <div class="term-item"><strong>2. Payment Processing:</strong> Payment will be processed according to the agreed payment terms between the parties.</div>
          <div class="term-item"><strong>3. Title Transfer:</strong> Title transfer will be handled according to standard wholesale procedures and applicable state regulations.</div>
          <div class="term-item"><strong>4. Vehicle Condition:</strong> Vehicle is sold AS-IS, WHERE-IS with no warranties expressed or implied unless specifically noted in writing.</div>
          <div class="term-item"><strong>5. Dispute Resolution:</strong> Any disputes shall be resolved through arbitration in St. Louis County, Missouri, in accordance with the laws of the State of Missouri.</div>
        </div>
        <div style="margin: 30px 0; text-align: justify;">We, the undersigned, confirm this comprises the entire agreement affecting the purchase of the Vehicle and no other agreement or understanding of any nature concerning the same has been made or entered into, or will be recognized. Further, we certify that all information in this agreement and all information furnished in support of this agreement is accurate and complete to the best of my/our knowledge and belief.</div>
        <div class="signature-section">
          <table class="signature-table">
            <tr><td></td><td></td><td></td></tr>
            <tr><td class="signature-label">Seller Signature</td><td class="signature-label">Date</td><td class="signature-label"></td></tr>
          </table>
          <table class="signature-table">
            <tr><td></td><td></td><td></td></tr>
            <tr><td class="signature-label">Dealer Authorized Representative</td><td class="signature-label">Date</td><td class="signature-label"></td></tr>
          </table>
        </div>
        <div class="footer">A Cseris Holdings LLC Company</div>
      </div>
    </body>
    </html>
    `;

    // Use Puppeteer with browser pool for better performance
    const startTime = Date.now();
    let browser;
    
    try {
      // Get browser from pool for better performance
      browser = await this.getBrowserFromPool();
      console.log('[PDF GEN] Browser acquired from pool for Wholesale PP Buy');
      
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      
      // Write to file
      await fs.writeFile(filePath, pdfBuffer);
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Update performance metrics
      this.performanceMetrics.totalDocuments++;
      this.performanceMetrics.averageGenerationTime = 
        (this.performanceMetrics.averageGenerationTime * (this.performanceMetrics.totalDocuments - 1) + generationTime) / this.performanceMetrics.totalDocuments;
      
      console.log(`[PDF GEN] Wholesale PP Buy generation completed in ${generationTime}ms`);
      this.logPerformanceMetrics();
      
    } catch (error) {
      console.error('[PDF GEN] Error generating Wholesale PP Buy:', error);
      throw error;
    } finally {
      // Return browser to pool instead of closing
      await this.returnBrowserToPool(browser);
    }

    const stats = fs.statSync(filePath);
    console.log('[DEBUG] Returning from generateWholesalePPBuy:', fileName, '| Should be wholesale purchase agreement');
    
    // Upload to cloud storage
    try {
      const uploadResult = await cloudStorage.uploadFile(filePath, fileName);
      console.log('[CLOUD STORAGE] Upload result:', uploadResult);
      
      return {
        fileName,
        filePath: uploadResult.url, // Use cloud URL instead of local path
        fileSize: stats.size,
        documentNumber: docNumber,
        documentType: 'wholesale_purchase_agreement',
        cloudUrl: uploadResult.url,
        cloudKey: uploadResult.key
      };
    } catch (uploadError) {
      console.error('[CLOUD STORAGE] Upload failed, using local path:', uploadError);
    return {
      fileName,
      filePath,
      fileSize: stats.size,
      documentNumber: docNumber,
      documentType: 'wholesale_purchase_agreement'
    };
    }
  }

  async generateWholesaleBOS(dealData, user) {
    console.log('[PDF GEN] === generateWholesaleBOS called ===');
    console.log('[PDF GEN] Generating Wholesale BOS with dealData:', dealData);
    
    // Helper function to format addresses
    function formatAddress(addr) {
      if (!addr) return 'N/A';
      if (typeof addr === 'string') return addr;
      const { street, city, state, zip } = addr;
      return [street, city, state, zip].filter(Boolean).join(', ');
    }

    // Helper function to safely format currency
    function safeCurrency(val) {
      if (!val || isNaN(val)) return 'N/A';
      return `$${parseFloat(val).toLocaleString()}`;
    }

    // Helper function to safely format numbers
    function safeNum(val) {
      if (!val || isNaN(val)) return 'N/A';
      return parseFloat(val).toLocaleString();
    }

    const stockNumber = dealData.stockNumber || 'N/A';
    const safeStockNumber = String(stockNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `wholesale_bos_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    
    console.log(`[PDF GEN] Wholesale BOS file path: ${filePath}`);
    
    // Determine purchasing dealer (buyer) and selling dealer (seller)
    let purchasingDealer = dealData.buyer || {};
    let sellingDealer = dealData.seller || {};
    
    // For wholesale D2D sale: buyer is purchasing dealer, RP Exotics is selling dealer
    if (dealData.dealType === 'wholesale-d2d' && (dealData.dealType2SubType === 'sale' || dealData.dealType2 === 'Sale')) {
      console.log('[PDF GEN][WHOLESALE_D2D_SALE][DEBUG] 🔍 ENHANCED DEBUGGING FOR WHOLESALE D2D SALE IN BOS GENERATION');
      console.log('[PDF GEN][WHOLESALE_D2D_SALE][DEBUG] 🔍 Original dealData.buyer:', JSON.stringify(dealData.buyer, null, 2));
      console.log('[PDF GEN][WHOLESALE_D2D_SALE][DEBUG] 🔍 Original dealData.seller:', JSON.stringify(dealData.seller, null, 2));
      console.log('[PDF GEN][WHOLESALE_D2D_SALE][DEBUG] 🔍 dealData.purchasingDealer:', JSON.stringify(dealData.purchasingDealer, null, 2));
      
      // Use the explicitly set purchasingDealer if available, otherwise fall back to buyer
      purchasingDealer = dealData.purchasingDealer || dealData.buyer || {};
      sellingDealer = {
        name: 'RP Exotics',
        licenseNumber: 'D4865',
        contact: {
          address: '1155 N Warson Rd, Saint Louis, MO 63132',
          phone: '(314) 970-2427',
          email: 'titling@rpexotics.com'
        }
      };
      console.log('[PDF GEN][WHOLESALE_D2D_SALE] Using purchasingDealer as purchasing dealer:', purchasingDealer.name);
      console.log('[PDF GEN][WHOLESALE_D2D_SALE] Using RP Exotics as selling dealer');
      console.log('[PDF GEN][WHOLESALE_D2D_SALE] Purchasing dealer details:', JSON.stringify(purchasingDealer, null, 2));
      console.log('[PDF GEN][WHOLESALE_D2D_SALE][DEBUG] 🔍 Final purchasingDealer assigned:', JSON.stringify(purchasingDealer, null, 2));
      console.log('[PDF GEN][WHOLESALE_D2D_SALE][DEBUG] 🔍 Final sellingDealer assigned:', JSON.stringify(sellingDealer, null, 2));
    }
    // For wholesale flip with dealer buyer: buyer is purchasing dealer, seller is selling dealer
    else if (dealData.dealType === 'wholesale-flip' && dealData.buyerType === 'dealer') {
      purchasingDealer = dealData.buyer || {};
      sellingDealer = dealData.seller || {};
    }
    // Default: use buyer as purchasing dealer, seller as selling dealer
    else {
      purchasingDealer = dealData.buyer || {};
      sellingDealer = dealData.seller || {};
    }

    // Create HTML content with the template
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wholesale Sales Order</title>
    <style>
        @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
        }
        
        .header h2 {
            margin: 5px 0 0 0;
            font-size: 14px;
            color: #666;
        }
        
        .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            background: #f8f8f8;
            padding: 8px;
            border: 1px solid #ccc;
        }
        
        .section {
            margin-bottom: 15px;
            border: 1px solid #333;
            padding: 8px;
        }
        
        .section-header {
            background: #333;
            color: white;
            padding: 4px 8px;
            margin: -8px -8px 8px -8px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .two-column {
            display: flex;
            gap: 15px;
        }
        
        .column {
            flex: 1;
        }
        
        .field-row {
            display: flex;
            margin-bottom: 6px;
            align-items: center;
        }
        
        .field-label {
            font-weight: bold;
            min-width: 80px;
            margin-right: 10px;
        }
        
        .field-value {
            border-bottom: 1px solid #333;
            flex: 1;
            min-height: 16px;
            padding: 2px 4px;
        }
        
        .terms {
            font-size: 10px;
            line-height: 1.4;
        }
        
        .terms ul {
            margin: 5px 0;
            padding-left: 15px;
        }
        
        .signatures {
            margin-top: 20px;
        }
        
        .signature-row {
            display: flex;
            gap: 30px;
            margin-top: 15px;
        }
        
        .signature-block {
            flex: 1;
        }
        
        .signature-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 20px;
        }
        
        .wholesale-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            background: #7c3aed;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .vehicle-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .financial-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="wholesale-badge">WHOLESALE</div>
        
        <div class="header">
            <h1>WHOLESALE SALES ORDER</h1>
            <h2>Dealer-to-Dealer Vehicle Transaction</h2>
        </div>
        
        <div class="order-info">
            <div><strong>Sales Order Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Stock Number:</strong> RP-WS-${safeStockNumber}</div>
        </div>
        
        <div class="section">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span>PURCHASING DEALER</span>
                <span style="font-size: 11px; background: white; color: black; padding: 2px 8px; border-radius: 3px;">License #: ${purchasingDealer.licenseNumber || 'N/A'}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Dealer Name:</span>
                <span class="field-value">${purchasingDealer.name || 'N/A'}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Email:</span>
                <span class="field-value">${purchasingDealer.contact?.email || purchasingDealer.email || 'N/A'}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Phone:</span>
                <span class="field-value">${purchasingDealer.contact?.phone || purchasingDealer.phone || 'N/A'}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Address:</span>
                <span class="field-value">${formatAddress(purchasingDealer.contact?.address || purchasingDealer.address)}</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">SELLING DEALER (RP EXOTICS)</div>
            <div class="two-column">
                <div class="column">
                    <div class="field-row">
                        <span class="field-label">Company:</span>
                        <span class="field-value">RP Exotics</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Address:</span>
                        <span class="field-value">1155 N Warson Rd, Saint Louis, MO 63132</span>
                    </div>
                </div>
                <div class="column">
                    <div class="field-row">
                        <span class="field-label">License #:</span>
                        <span class="field-value">D4865</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Phone:</span>
                        <span class="field-value">(314) 970-2427</span>
                    </div>
                    <div class="field-row">
                        <span class="field-label">Email:</span>
                        <span class="field-value">titling@rpexotics.com</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">VEHICLE INFORMATION</div>
            <div class="vehicle-grid">
                <div class="field-row">
                    <span class="field-label">VIN:</span>
                    <span class="field-value">${dealData.vin || 'N/A'}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Year:</span>
                    <span class="field-value">${dealData.year || 'N/A'}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Stock #:</span>
                    <span class="field-value">${stockNumber}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Make:</span>
                    <span class="field-value">${dealData.make || 'N/A'}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Model:</span>
                    <span class="field-value">${dealData.model || 'N/A'}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Mileage:</span>
                    <span class="field-value">${safeNum(dealData.mileage)}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Exterior:</span>
                    <span class="field-value">${dealData.exteriorColor || dealData.color || 'N/A'}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Interior:</span>
                    <span class="field-value">${dealData.interiorColor || 'N/A'}</span>
                </div>
                <div></div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">FINANCIAL INFORMATION</div>
            <div class="field-row">
                <span class="field-label">Sale Price:</span>
                <span class="field-value">${safeCurrency(dealData.purchasePrice)}</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">WHOLESALE TRANSACTION TERMS & CONDITIONS</div>
            <div class="terms">
                <ul>
                    <li>This is a DEALER-TO-DEALER wholesale transaction. Purchasing dealer acknowledges this is a business-to-business sale.</li>
                    <li>Vehicle is sold AS-IS, WHERE-IS with no warranties expressed or implied unless specifically noted.</li>
                    <li>Payment terms: Pay upon release.</li>
                    <li>Title will be clear and transferable. Any liens will be properly disclosed and handled.</li>
                    <li>Any disputes shall be resolved through arbitration in St. Louis County, Missouri.</li>
                    <li>This agreement constitutes the entire understanding between the parties.</li>
                </ul>
            </div>
        </div>
        
        <div class="signatures">
            <div class="section-header" style="background: #333; color: white; padding: 4px 8px; margin-bottom: 15px;">SIGNATURES</div>
            <div class="signature-row">
                <div class="signature-block">
                    <div><strong>RP Exotics Representative (Seller):</strong></div>
                    <div class="signature-line"></div>
                    <div style="font-size: 10px;">Signature</div>
                    <div style="margin-top: 10px;">
                        Print Name: ________________
                    </div>
                    <div style="margin-top: 10px;">
                        Date: ________________
                    </div>
                </div>
                <div class="signature-block">
                    <div><strong>Purchasing Dealer Representative:</strong></div>
                    <div class="signature-line"></div>
                    <div style="font-size: 10px;">Signature</div>
                    <div style="margin-top: 10px;">
                        Print Name: ________________
                    </div>
                    <div style="margin-top: 10px;">
                        Date: ________________
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
            RP Exotics Wholesale Division | Professional Vehicle Sales & Distribution<br>
            This document represents a binding wholesale sales agreement between licensed dealers.
        </div>
    </div>
</body>
</html>`;

    // Generate PDF using Puppeteer with browser pool for better performance
    const startTime = Date.now();
    let browser;
    
    try {
      // Get browser from pool for better performance
      browser = await this.getBrowserFromPool();
      console.log('[PDF GEN] Browser acquired from pool for Wholesale BOS');
      
      console.log('[PDF GEN] Creating new page...');
      const page = await browser.newPage();
      
      console.log('[PDF GEN] Setting content...');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      console.log('[PDF GEN] Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      
      console.log('[PDF GEN] Writing PDF to file...');
      await fs.writeFile(filePath, pdfBuffer);
      console.log(`[PDF GEN] Wholesale BOS written: ${fileName}, size: ${pdfBuffer.length} bytes`);
      
      // Upload to cloud storage
      try {
        console.log('[PDF GEN] Uploading to cloud storage...');
        const uploadResult = await cloudStorage.uploadFile(filePath, fileName);
        console.log('[CLOUD STORAGE] Upload result:', uploadResult);
        
        const endTime = Date.now();
        const generationTime = endTime - startTime;
        
        // Update performance metrics
        this.performanceMetrics.totalDocuments++;
        this.performanceMetrics.averageGenerationTime = 
          (this.performanceMetrics.averageGenerationTime * (this.performanceMetrics.totalDocuments - 1) + generationTime) / this.performanceMetrics.totalDocuments;
        
        const result = {
          fileName: fileName,
          filePath: uploadResult.url, // Use cloud URL instead of local path
          fileSize: pdfBuffer.length,
          documentType: 'wholesale_bos',
          documentNumber: this.generateEnhancedDocumentNumber(
            dealData.dealType, 
            dealData.dealType2SubType, 
            'WS-BOS', 
            dealData.stockNumber
          ),
          cloudUrl: uploadResult.url,
          cloudKey: uploadResult.key,
          generationTime
        };
        
        console.log(`[PDF GEN] Wholesale BOS generation successful in ${generationTime}ms:`, result);
        this.logPerformanceMetrics();
        return result;
      } catch (uploadError) {
        console.error('[CLOUD STORAGE] Upload failed, using local path:', uploadError);
        const endTime = Date.now();
        const generationTime = endTime - startTime;
        
        const result = {
          fileName: fileName,
          filePath: filePath,
          fileSize: pdfBuffer.length,
          documentType: 'wholesale_bos',
          documentNumber: this.generateEnhancedDocumentNumber(
            dealData.dealType, 
            dealData.dealType2SubType, 
            'WS-BOS', 
            dealData.stockNumber
          ),
          generationTime
        };
        
        console.log(`[PDF GEN] Wholesale BOS generation successful (local) in ${generationTime}ms:`, result);
        return result;
      }
      
    } catch (error) {
      console.error('[PDF GEN] Error in generateWholesaleBOS:', error);
      console.error('[PDF GEN] Error stack:', error.stack);
      throw error;
    } finally {
      // Return browser to pool instead of closing
      await this.returnBrowserToPool(browser);
    }
  }

  async generateWholesaleFlipBuySellDocuments(dealData, user) {
    console.log('[PDF GEN] === generateWholesaleFlipBuySellDocuments called ===');
    console.log('[PDF GEN] 🔍 Deal data for wholesale flip buy-sell:', {
      dealType: dealData.dealType,
      dealType2SubType: dealData.dealType2SubType,
      sellerType: dealData.sellerType,
      buyerType: dealData.buyerType,
      isSellerDocument: dealData.isSellerDocument,
      isBuyerDocument: dealData.isBuyerDocument
    });
    
    // Determine which document to generate based on the context
    if (dealData.isSellerDocument) {
      // Check seller type to determine the correct document
      const sellerType = dealData.sellerType || dealData.seller?.type || 'private';
      console.log('[PDF GEN] 🔍 Seller type for wholesale flip:', sellerType);
      
      if (sellerType === 'private') {
        // Generate retail private party purchase contract for private seller
        console.log('[PDF GEN] -> Generating retail private party purchase contract for private seller...');
        const result = await this.generateRetailPPBuy(dealData, user);
        return {
          ...result,
          documentType: 'retail_pp_buy'
        };
      } else {
        // Generate wholesale purchase agreement for dealer seller
        console.log('[PDF GEN] -> Generating wholesale purchase agreement for dealer seller...');
        const result = await this.generateWholesalePPBuy(dealData, user);
        return {
          ...result,
          documentType: 'wholesale_purchase_agreement'
        };
      }
    } else {
      // Generate wholesale BOS for the buyer
      console.log('[PDF GEN] -> Generating WHOLESALE BOS for buyer...');
      const result = await this.generateWholesaleBOS(dealData, user);
      return {
        ...result,
        documentType: 'wholesale_bos'
      };
    }
  }

  async generateWholesaleSalesOrder(dealData, user) {
    console.log('[PDF GEN] === generateWholesaleSalesOrder called ===');
    console.log('[PDF GEN] Generating Wholesale Sales Order with dealData:', dealData);

    function formatAddress(addr) {
      if (!addr) return 'N/A';
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
      }
      return String(addr);
    }

    function safeCurrency(val) {
      if (!val || isNaN(val)) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(val);
    }

    function safeNum(val) {
      if (!val || isNaN(val)) return 'N/A';
      return Number(val).toLocaleString();
    }

    const stockNumber = dealData.stockNumber || 'N/A';
    const safeStockNumber = String(stockNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `wholesale_sales_order_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Extract buyer and seller information
    const buyer = dealData.buyer || {};
    const seller = dealData.seller || {};

    // For wholesale flip buy-sell, RP Exotics is always the seller
    const rpExoticsInfo = {
      name: 'RP Exotics',
      email: 'titling@rpexotics.com',
      phone: '(314) 970-2427',
      address: '1155 N Warson Rd, Saint Louis, MO 63132',
      licenseNumber: 'D4865'
    };

    const htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wholesale Sales Order</title>
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .container {
            max-width: 8.5in;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
        }
        
        .header h2 {
            margin: 5px 0 0 0;
            font-size: 14px;
            color: #666;
        }
        
        .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            background: #f8f8f8;
            padding: 8px;
            border: 1px solid #ccc;
        }
        
        .section {
            margin-bottom: 15px;
            border: 1px solid #333;
            padding: 8px;
        }
        
        .section-header {
            background: #333;
            color: white;
            padding: 4px 8px;
            margin: -8px -8px 8px -8px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .two-column {
            display: flex;
            gap: 15px;
        }
        
        .column {
            flex: 1;
        }
        
        .field-row {
            display: flex;
            margin-bottom: 6px;
            align-items: center;
        }
        
        .field-label {
            font-weight: bold;
            min-width: 80px;
            margin-right: 10px;
        }
        
        .field-value {
            border-bottom: 1px solid #333;
            flex: 1;
            min-height: 16px;
            padding: 2px 4px;
        }
        
        .terms {
            font-size: 10px;
            line-height: 1.4;
        }
        
        .terms ul {
            margin: 5px 0;
            padding-left: 15px;
        }
        
        .signatures {
            margin-top: 20px;
        }
        
        .signature-row {
            display: flex;
            gap: 30px;
            margin-top: 15px;
        }
        
        .signature-block {
            flex: 1;
        }
        
        .signature-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 20px;
        }
        
        .wholesale-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            background: #7c3aed;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .vehicle-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .financial-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wholesale-badge">WHOLESALE</div>
        
        <div class="header">
          <h1>WHOLESALE SALES ORDER</h1>
          <h2>Dealer-to-Dealer Vehicle Transaction</h2>
        </div>
        
        <div class="order-info">
            <div><strong>Sales Order Date:</strong> ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="section">
          <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
            <span>PURCHASING DEALER</span>
                <span style="font-size: 11px; background: white; color: black; padding: 2px 8px; border-radius: 3px;">License #: ${buyer.licenseNumber || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Dealer Name:</span>
                <span class="field-value">${buyer.name || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Email:</span>
                <span class="field-value">${buyer.email || (buyer.contact && buyer.contact.email) || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Phone:</span>
                <span class="field-value">${buyer.phone || (buyer.contact && buyer.contact.phone) || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Address:</span>
                <span class="field-value">${formatAddress(buyer.address || (buyer.contact && buyer.contact.address))}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">SELLING DEALER (RP EXOTICS)</div>
          <div class="two-column">
            <div class="column">
              <div class="field-row">
                <span class="field-label">Company:</span>
                        <span class="field-value">${rpExoticsInfo.name}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Address:</span>
                        <span class="field-value">${rpExoticsInfo.address}</span>
              </div>
            </div>
            <div class="column">
              <div class="field-row">
                <span class="field-label">License #:</span>
                        <span class="field-value">${rpExoticsInfo.licenseNumber}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Phone:</span>
                        <span class="field-value">${rpExoticsInfo.phone}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Email:</span>
                        <span class="field-value">${rpExoticsInfo.email}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">VEHICLE INFORMATION</div>
          <div class="vehicle-grid">
            <div class="field-row">
              <span class="field-label">VIN:</span>
                    <span class="field-value">${dealData.vin || 'N/A'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Year:</span>
                    <span class="field-value">${dealData.year || 'N/A'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Stock #:</span>
                    <span class="field-value">${dealData.stockNumber || 'N/A'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Make:</span>
                    <span class="field-value">${dealData.make || 'N/A'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Model:</span>
                    <span class="field-value">${dealData.model || 'N/A'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Mileage:</span>
                    <span class="field-value">${safeNum(dealData.mileage)}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Exterior:</span>
                    <span class="field-value">${dealData.exteriorColor || dealData.color || 'N/A'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Interior:</span>
                    <span class="field-value">${dealData.interiorColor || 'N/A'}</span>
            </div>
            <div></div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">FINANCIAL INFORMATION</div>
          <div class="field-row">
            <span class="field-label">Sale Price:</span>
                <span class="field-value">${safeCurrency(dealData.purchasePrice)}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">WHOLESALE TRANSACTION TERMS & CONDITIONS</div>
          <div class="terms">
            <ul>
              <li>This is a DEALER-TO-DEALER wholesale transaction. Purchasing dealer acknowledges this is a business-to-business sale.</li>
              <li>Vehicle is sold AS-IS, WHERE-IS with no warranties expressed or implied unless specifically noted.</li>
                    <li>Payment terms: Pay upon release.</li>
              <li>Title will be clear and transferable. Any liens will be properly disclosed and handled.</li>
              <li>Any disputes shall be resolved through arbitration in St. Louis County, Missouri.</li>
              <li>This agreement constitutes the entire understanding between the parties.</li>
            </ul>
          </div>
        </div>
        
        <div class="signatures">
          <div class="section-header" style="background: #333; color: white; padding: 4px 8px; margin-bottom: 15px;">SIGNATURES</div>
          <div class="signature-row">
            <div class="signature-block">
              <div><strong>RP Exotics Representative (Seller):</strong></div>
              <div class="signature-line"></div>
              <div style="font-size: 10px;">Signature</div>
                    <div style="margin-top: 10px;">
                        Print Name: ________________
                    </div>
                    <div style="margin-top: 10px;">
                        Date: ________________
                    </div>
            </div>
            <div class="signature-block">
              <div><strong>Purchasing Dealer Representative:</strong></div>
              <div class="signature-line"></div>
              <div style="font-size: 10px;">Signature</div>
                    <div style="margin-top: 10px;">
                        Print Name: ________________
            </div>
                    <div style="margin-top: 10px;">
                        Date: ________________
          </div>
        </div>
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          RP Exotics Wholesale Division | Professional Vehicle Sales & Distribution<br>
          This document represents a binding wholesale sales agreement between licensed dealers.
        </div>
      </div>
    </body>
</html>`;

    const puppeteer = require('puppeteer');
    const browser = await this.launchOptimizedBrowser();

    try {
    const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      
      await fs.writeFile(filePath, pdfBuffer);
      console.log('[PDF GEN] Wholesale Sales Order written:', fileName, ', size:', pdfBuffer.length, 'bytes');
      
      // Ensure cloud storage
      const docNumber = this.generateDocumentNumber('wholesale', stockNumber);
      return await this.ensureCloudStorage(filePath, fileName, 'wholesale_sales_order', docNumber);
    } finally {
      await browser.close();
    }
  }

  async generateDocument(dealData, user) {
    // 🔍 ENHANCED DEBUGGING FOR LENGTH ERROR DETECTION
    console.log('[PDF GEN][DEBUG] 🔍 === ENHANCED DEBUGGING START ===');
    console.log('[PDF GEN][DEBUG] 🔍 Input dealData keys:', Object.keys(dealData));
    console.log('[PDF GEN][DEBUG] 🔍 sellerInfo:', JSON.stringify(dealData.sellerInfo, null, 2));
    console.log('[PDF GEN][DEBUG] 🔍 seller.address type:', typeof dealData.sellerInfo?.address);
    console.log('[PDF GEN][DEBUG] 🔍 seller.address value:', dealData.sellerInfo?.address);
    console.log('[PDF GEN][DEBUG] 🔍 vehicle fields:', {
      make: dealData.make,
      makeType: typeof dealData.make,
      vin: dealData.vin,
      vinType: typeof dealData.vin
    });
    
    // 🔍 DEAL TYPE 2 TRACKING IN MAIN DOCUMENT GENERATION
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔍 MAIN DOCUMENT GENERATION - DEAL TYPE 2 TRACKING');
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Initial dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] dealType:', dealData.dealType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] sellerType:', dealData.sellerType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] buyerType:', dealData.buyerType);
    
    // 🔧 ROBUST VEHICLE FIELD EXTRACTION - Ensure vehicle fields are always at root level
    if (dealData.vehicle && typeof dealData.vehicle === 'object') {
      console.log('[PDF GEN][ROBUST] Vehicle object found, extracting fields to root level');
      // Extract vehicle fields to root level if they're missing
      if (!dealData.year && dealData.vehicle.year) {
        dealData.year = dealData.vehicle.year;
        console.log('[PDF GEN][ROBUST] Extracted year from vehicle object:', dealData.year);
      }
      if (!dealData.make && dealData.vehicle.make) {
        dealData.make = dealData.vehicle.make;
        console.log('[PDF GEN][ROBUST] Extracted make from vehicle object:', dealData.make);
      }
      if (!dealData.model && dealData.vehicle.model) {
        dealData.model = dealData.vehicle.model;
        console.log('[PDF GEN][ROBUST] Extracted model from vehicle object:', dealData.model);
      }
      if (!dealData.color && dealData.vehicle.color) {
        dealData.color = dealData.vehicle.color;
        console.log('[PDF GEN][ROBUST] Extracted color from vehicle object:', dealData.color);
      }
      if (!dealData.exteriorColor && dealData.vehicle.exteriorColor) {
        dealData.exteriorColor = dealData.vehicle.exteriorColor;
        console.log('[PDF GEN][ROBUST] Extracted exteriorColor from vehicle object:', dealData.exteriorColor);
      }
      if (!dealData.interiorColor && dealData.vehicle.interiorColor) {
        dealData.interiorColor = dealData.vehicle.interiorColor;
        console.log('[PDF GEN][ROBUST] Extracted interiorColor from vehicle object:', dealData.interiorColor);
      }
      if (!dealData.mileage && dealData.vehicle.mileage) {
        dealData.mileage = dealData.vehicle.mileage;
        console.log('[PDF GEN][ROBUST] Extracted mileage from vehicle object:', dealData.mileage);
      }
    }
    
    // 🔧 VALIDATE REQUIRED VEHICLE FIELDS
    const requiredVehicleFields = ['year', 'make', 'model', 'vin'];
    const missingVehicleFields = requiredVehicleFields.filter(field => !dealData[field]);
    if (missingVehicleFields.length > 0) {
      console.error('[PDF GEN][ROBUST] ❌ Missing required vehicle fields:', missingVehicleFields);
      console.error('[PDF GEN][ROBUST] ❌ Available fields:', Object.keys(dealData).filter(key => ['year', 'make', 'model', 'vin', 'vehicle'].includes(key)));
      console.error('[PDF GEN][ROBUST] ❌ Vehicle object:', dealData.vehicle);
      throw new Error(`Missing required vehicle fields for document generation: ${missingVehicleFields.join(', ')}`);
    }
    
    console.log('[PDF GEN][ROBUST] ✅ All required vehicle fields present:', {
      year: dealData.year,
      make: dealData.make,
      model: dealData.model,
      vin: dealData.vin
    });
    
    // Check for potential issues and auto-correct wholesale sale deals
    if (dealData.dealType2SubType === 'buy') {
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] ⚠️ POTENTIAL ISSUE: dealType2SubType is "buy" in main generation');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] This might be incorrect for sale scenarios');
      
      // Auto-correct wholesale sale deals that have incorrect dealType2SubType
      if (dealData.dealType === 'wholesale-d2d' || dealData.dealType === 'wholesale-pp' || dealData.dealType === 'wholesale-flip') {
        // Check if this is actually a sale scenario based on seller/buyer types
        const sellerType = dealData.sellerType || dealData.seller?.type || 'private';
        const buyerType = dealData.buyerType || dealData.buyer?.type || 'private';
        
        // If RP Exotics is the seller (selling to someone), this should be a sale
        const isRPSelling = sellerType === 'dealer' && 
                           (dealData.seller?.name === 'RP Exotics' || dealData.sellerInfo?.name === 'RP Exotics');
        
        // For wholesale-d2d deals, DISABLE auto-correction to prevent interference
        if (dealData.dealType === 'wholesale-d2d') {
          console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔧 AUTO-CORRECTION DISABLED for wholesale-d2d deals');
          console.log('[PDF GEN][DEAL_TYPE_DEBUG] Using original dealType2SubType:', dealData.dealType2SubType);
          console.log('[PDF GEN][DEAL_TYPE_DEBUG] Using original dealType2:', dealData.dealType2);
          // Auto-correction disabled to prevent interference with frontend data
        } else {
          // For other deal types, use the original logic
          if (isRPSelling || (dealData.dealType === 'wholesale-d2d' && sellerType === 'dealer' && buyerType === 'dealer')) {
            console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔧 AUTO-CORRECTING: Changing dealType2SubType from "buy" to "sale"');
            console.log('[PDF GEN][DEAL_TYPE_DEBUG] Reason: This appears to be a wholesale sale deal');
            dealData.dealType2SubType = 'sale';
            if (dealData.dealType2) {
              dealData.dealType2 = 'Sale';
            }
          }
        }
      }
    }
    
    // PATCH: Always trust dealData.sellerType and dealData.buyerType if present
    if (dealData.sellerType) {
      if (dealData.seller) dealData.seller.type = dealData.sellerType;
      if (dealData.sellerInfo) dealData.sellerInfo.type = dealData.sellerType;
      console.log('[PDF GEN][PATCH] seller.type forcibly set from dealData.sellerType:', dealData.sellerType);
    }
    if (dealData.buyerType) {
      if (dealData.buyer) dealData.buyer.type = dealData.buyerType;
      if (dealData.buyerInfo) dealData.buyerInfo.type = dealData.buyerType;
      console.log('[PDF GEN][PATCH] buyer.type forcibly set from dealData.buyerType:', dealData.buyerType);
    }
    console.log('[PDF GEN] === generateDocument called ===');
    console.log('[PDF GEN] dealData:', dealData);
    console.log('[PDF GEN] dealType:', dealData.dealType);
    console.log('[PDF GEN] dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN] isBuyerDocument:', dealData.isBuyerDocument);
    console.log('[PDF GEN] isSellerDocument:', dealData.isSellerDocument);
    console.log('[PDF GEN] user:', user);
    console.log('[PDF GEN] Checking conditions:');
    console.log('[PDF GEN] - dealType === "retail" || dealType === "retail-pp":', dealData.dealType === 'retail' || dealData.dealType === 'retail-pp');
    console.log('[PDF GEN] - dealType === "wholesale-d2d" && dealType2SubType === "buy":', dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'buy');
    console.log('[PDF GEN] - dealType === "wholesale-flip" && dealType2SubType === "buy-sell":', dealData.dealType === 'wholesale-flip' && dealData.dealType2SubType === 'buy-sell');
    console.log('[PDF GEN] - dealType === "wholesale":', dealData.dealType === 'wholesale');
    
    console.log('[PDF GEN] - dealData.seller:', dealData.seller);
    console.log('[PDF GEN] - dealData.buyer:', dealData.buyer);
    console.log('[PDF GEN] - dealData.sellerInfo:', dealData.sellerInfo);
    
    // Special handling for wholesale flip buy-sell deals
    if (dealData.dealType === 'wholesale-flip' && dealData.dealType2SubType === 'buy-sell') {
      console.log('[PDF GEN] 🎯 WHOLESALE FLIP BUY-SELL DEAL DETECTED');
      return await this.generateWholesaleFlipBuySellDocuments(dealData, user);
    }
    
    try {
      let documentResult;
      
      // Handle wholesale D2D buy deals FIRST (before other document type checks)
      if (dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'buy') {
        console.log('[PDF GEN] 🎯 WHOLESALE D2D BUY DEAL DETECTED');
        console.log('[PDF GEN] 🔍 Document flags:', {
          isSellerDocument: dealData.isSellerDocument,
          isBuyerDocument: dealData.isBuyerDocument
        });
        console.log('[PDF GEN] 🔍 Party info:', {
          seller: dealData.seller,
          buyer: dealData.buyer,
          sellerInfo: dealData.sellerInfo
        });
        console.log('[PDF GEN] 🔍 Deal data for wholesale D2D buy:', {
          dealType: dealData.dealType,
          dealType2SubType: dealData.dealType2SubType,
          sellerType: dealData.sellerType,
          buyerType: dealData.buyerType
        });
        
        // For wholesale D2D buy deals, only generate seller document (wholesale purchase agreement)
        console.log('[PDF GEN] -> Calling generateWholesalePPBuy for wholesale d2d buy seller (dealer)...');
        documentResult = await this.generateWholesalePPBuy(dealData, user);
        console.log('[PDF GEN] <- generateWholesalePPBuy complete:', documentResult.filePath);
        console.log('[PDF GEN][DEBUG] generateWholesalePPBuy returned:', {
          fileName: documentResult.fileName,
          documentType: documentResult.documentType,
          filePath: documentResult.filePath
        });
        console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_purchase_agreement for wholesale d2d buy seller');
        return {
          ...documentResult,
          documentType: 'wholesale_purchase_agreement'
        };
      }
      
      // Handle wholesale D2D deals where buyer is dealer - create wholesale purchase agreement
      if (dealData.dealType === 'wholesale-d2d' && dealData.buyerType === 'dealer' && dealData.dealType2SubType !== 'sale') {
        console.log('[PDF GEN] 🎯 WHOLESALE D2D DEAL WITH DEALER BUYER DETECTED');
        console.log('[PDF GEN] 🔍 Document flags:', {
          isSellerDocument: dealData.isSellerDocument,
          isBuyerDocument: dealData.isBuyerDocument
        });
        console.log('[PDF GEN] 🔍 Party info:', {
          seller: dealData.seller,
          buyer: dealData.buyer,
          sellerInfo: dealData.sellerInfo
        });
        console.log('[PDF GEN] 🔍 Deal data for wholesale D2D with dealer buyer:', {
          dealType: dealData.dealType,
          dealType2SubType: dealData.dealType2SubType,
          sellerType: dealData.sellerType,
          buyerType: dealData.buyerType
        });
        
        // For wholesale D2D deals with dealer buyer, generate wholesale purchase agreement (same as wholesale d2d buy)
        console.log('[PDF GEN] -> Calling generateWholesalePPBuy for wholesale d2d with dealer buyer...');
        documentResult = await this.generateWholesalePPBuy(dealData, user);
        console.log('[PDF GEN] <- generateWholesalePPBuy complete:', documentResult.filePath);
        console.log('[PDF GEN][DEBUG] generateWholesalePPBuy returned:', {
          fileName: documentResult.fileName,
          documentType: documentResult.documentType,
          filePath: documentResult.filePath
        });
        console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_purchase_agreement for wholesale d2d with dealer buyer');
        return {
          ...documentResult,
          documentType: 'wholesale_purchase_agreement'
        };
      }
      
      // Handle wholesale D2D sale deals (including auto-corrected ones)
      if (dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale') {
        console.log('[PDF GEN] 🎯 WHOLESALE D2D SALE DEAL DETECTED');
        console.log('[PDF GEN][DEBUG] 🔍 ENHANCED DEBUGGING FOR WHOLESALE D2D SALE IN DOCUMENT GENERATOR');
        console.log('[PDF GEN][DEBUG] 🔍 Full dealData received:', JSON.stringify(dealData, null, 2));
        console.log('[PDF GEN] 🔍 Document flags:', {
          isSellerDocument: dealData.isSellerDocument,
          isBuyerDocument: dealData.isBuyerDocument
        });
        console.log('[PDF GEN] 🔍 Party info:', {
          seller: dealData.seller,
          buyer: dealData.buyer,
          sellerInfo: dealData.sellerInfo
        });
        console.log('[PDF GEN] 🔍 Deal data for wholesale D2D sale:', {
          dealType: dealData.dealType,
          dealType2SubType: dealData.dealType2SubType,
          sellerType: dealData.sellerType,
          buyerType: dealData.buyerType
        });
        console.log('[PDF GEN] 🔍 Condition check: dealData.dealType === "wholesale-d2d" && dealData.dealType2SubType === "sale"');
        console.log('[PDF GEN] 🔍 Condition result:', dealData.dealType === 'wholesale-d2d' && dealData.dealType2SubType === 'sale');
        console.log('[PDF GEN][DEBUG] 🔍 Key fields for BOS generation:');
        console.log('[PDF GEN][DEBUG] 🔍 - purchasingDealer:', dealData.purchasingDealer);
        console.log('[PDF GEN][DEBUG] 🔍 - buyer.name:', dealData.buyer?.name);
        console.log('[PDF GEN][DEBUG] 🔍 - buyer.type:', dealData.buyer?.type);
        console.log('[PDF GEN][DEBUG] 🔍 - seller.name:', dealData.seller?.name);
        console.log('[PDF GEN][DEBUG] 🔍 - seller.type:', dealData.seller?.type);
        
        // For wholesale D2D sale deals, generate wholesale BOS (not purchase agreement)
        console.log('[PDF GEN] -> Calling generateWholesaleBOS for wholesale d2d sale...');
        documentResult = await this.generateWholesaleBOS(dealData, user);
        console.log('[PDF GEN] <- generateWholesaleBOS complete:', documentResult.filePath);
        console.log('[PDF GEN][DEBUG] generateWholesaleBOS returned:', {
          fileName: documentResult.fileName,
          documentType: documentResult.documentType,
          filePath: documentResult.filePath
        });
        console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_bos for wholesale d2d sale');
        return {
          ...documentResult,
          documentType: 'wholesale_bos'
        };
      }
      

      
          // Handle wholesale flip deals (excluding buy-sell which is handled separately)
      if (dealData.dealType === 'wholesale-flip' && dealData.dealType2SubType !== 'buy-sell') {
        console.log('[PDF GEN] 🎯 Generating document for wholesale flip deal (non-buy-sell)');
        console.log('[PDF GEN] 🔍 Seller type:', dealData.seller?.type);
        console.log('[PDF GEN] 🔍 Buyer type:', dealData.buyer?.type);
        console.log('[PDF GEN] 🔍 sellerType from data:', dealData.sellerType);
        console.log('[PDF GEN] 🔍 buyerType from data:', dealData.buyerType);
        
        // Determine the actual types to use
        const sellerType = dealData.sellerType || dealData.seller?.type || 'private';
        const buyerType = dealData.buyerType || dealData.buyer?.type || 'private';
        
        console.log('[PDF GEN] 🔍 Final seller type:', sellerType);
        console.log('[PDF GEN] 🔍 Final buyer type:', buyerType);
        
        // For wholesale flip deals, generate documents based on the party types
        if (sellerType === 'dealer' && buyerType === 'private') {
          // Seller is dealer, buyer is private - generate wholesale purchase order
          console.log('[PDF GEN] -> Using generateWholesalePurchaseOrder for dealer seller with private buyer...');
          documentResult = await this.generateWholesalePurchaseOrder(dealData, user);
          console.log('[PDF GEN] <- generateWholesalePurchaseOrder complete:', documentResult.filePath);
          console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_purchase_order for dealer seller');
          return {
            ...documentResult,
            documentType: 'wholesale_purchase_order'
          };
        } else if (sellerType === 'private' && buyerType === 'dealer') {
          // Seller is private, buyer is dealer - check if this is seller or buyer document
          if (dealData.isSellerDocument) {
            // Generate Private Party Purchase Contract for the seller
            console.log('[PDF GEN] -> Using generateRetailPPBuy for private seller document...');
          documentResult = await this.generateRetailPPBuy(dealData, user);
          console.log('[PDF GEN] <- generateRetailPPBuy complete:', documentResult.filePath);
            console.log('[PDF GEN][DEBUG] Returning documentType: retail_pp_buy for private seller document');
          return {
            ...documentResult,
            documentType: 'retail_pp_buy'
          };
          } else {
            // Generate Wholesale BOS for the buyer (dealer)
            console.log('[PDF GEN] -> Using generateWholesaleBOS for dealer buyer document...');
            documentResult = await this.generateWholesaleBOS(dealData, user);
            console.log('[PDF GEN] <- generateWholesaleBOS complete:', documentResult.filePath);
            console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_bos for dealer buyer document');
            return {
              ...documentResult,
              documentType: 'wholesale_bos'
            };
          }
        } else if (sellerType === 'dealer' && buyerType === 'dealer') {
          // Both parties are dealers - generate wholesale purchase order for seller and BOS for buyer
          console.log('[PDF GEN] 🎯 WHOLESALE FLIP DEALER-TO-DEALER DETECTED');
          console.log('[PDF GEN] 🔍 Document flags:', {
            isSellerDocument: dealData.isSellerDocument,
            isBuyerDocument: dealData.isBuyerDocument
          });
          
          if (dealData.isSellerDocument) {
            // Generate wholesale purchase agreement for the seller (same as wholesale D2D buy)
            console.log('[PDF GEN] -> Generating WHOLESALE PURCHASE AGREEMENT for dealer seller...');
          documentResult = await this.generateWholesalePPBuy(dealData, user);
          console.log('[PDF GEN] <- generateWholesalePPBuy complete:', documentResult.filePath);
            console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_purchase_agreement for dealer seller');
          return {
            ...documentResult,
            documentType: 'wholesale_purchase_agreement'
          };
          } else {
            // Generate BOS for the buyer (default)
            console.log('[PDF GEN] -> Generating WHOLESALE BOS for dealer buyer...');
            documentResult = await this.generateWholesaleBOS(dealData, user);
            console.log('[PDF GEN] <- generateWholesaleBOS complete:', documentResult.filePath);
            console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_bos for dealer buyer');
            return {
              ...documentResult,
              documentType: 'wholesale_bos'
            };
          }
        } else if (sellerType === 'private' && buyerType === 'private') {
          // Both parties are private - generate retail private party purchase agreement
          console.log('[PDF GEN] -> Using generateRetailPPBuy for private parties...');
          documentResult = await this.generateRetailPPBuy(dealData, user);
          console.log('[PDF GEN] <- generateRetailPPBuy complete:', documentResult.filePath);
          console.log('[PDF GEN][DEBUG] Returning documentType: retail_pp_buy for private parties');
          return {
            ...documentResult,
            documentType: 'retail_pp_buy'
          };
        } else {
          // Fallback for any other combination
          console.log('[PDF GEN] -> Using generateRetailPPBuy as fallback for wholesale flip...');
          documentResult = await this.generateRetailPPBuy(dealData, user);
          console.log('[PDF GEN] <- generateRetailPPBuy complete:', documentResult.filePath);
          console.log('[PDF GEN][DEBUG] Returning documentType: retail_pp_buy as fallback');
          return {
            ...documentResult,
            documentType: 'retail_pp_buy'
          };
        }
      } else if (dealData.dealType === 'retail' || dealData.dealType === 'retail-pp' || dealData.dealType === 'retail-d2d') {
        console.log('[PDF GEN] -> Calling generateRetailPPBuy...');
        documentResult = await this.generateRetailPPBuy(dealData, user);
        console.log('[PDF GEN] <- generateRetailPPBuy complete:', documentResult.filePath);
        console.log('[PDF GEN][DEBUG] Returning documentType: retail_pp_buy for retail deal');
        return {
          ...documentResult,
          documentType: 'retail_pp_buy'
        };

              } else if (dealData.dealType === 'wholesale') {
          console.log('[PDF GEN] -> Calling generateBillOfSale (compact style for wholesale)...');
          documentResult = await this.generateBillOfSale(dealData, user);
          console.log('[PDF GEN] <- generateBillOfSale complete:', documentResult.filePath);
          console.log('[PDF GEN][DEBUG] Returning documentType: bill_of_sale for wholesale deal');
          return {
            ...documentResult,
            documentType: 'bill_of_sale'
          };
        } else if (dealData.dealType === 'wholesale-pp') {
          // For wholesale-pp deals, check if it's a sale scenario
          if (dealData.dealType2SubType === 'sale') {
            console.log('[PDF GEN] -> Calling generateWholesaleBOS for wholesale-pp sale...');
            documentResult = await this.generateWholesaleBOS(dealData, user);
            console.log('[PDF GEN] <- generateWholesaleBOS complete:', documentResult.filePath);
            console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_bos for wholesale-pp sale');
            return {
              ...documentResult,
              documentType: 'wholesale_bos'
            };
          } else {
            // For wholesale-pp buy scenarios, use purchase agreement
            console.log('[PDF GEN] -> Calling generateWholesalePPBuy for wholesale-pp buy...');
          documentResult = await this.generateWholesalePPBuy(dealData, user);
          console.log('[PDF GEN] <- generateWholesalePPBuy complete:', documentResult.filePath);
            console.log('[PDF GEN][DEBUG] Returning documentType: wholesale_purchase_agreement for wholesale-pp buy');
          return {
            ...documentResult,
            documentType: 'wholesale_purchase_agreement'
          };
          }
        } else if (dealData.dealType === 'consignment') {
          console.log('[PDF GEN] -> Calling generateRetailPPBuy for consignment...');
          documentResult = await this.generateRetailPPBuy(dealData, user);
          console.log('[PDF GEN] <- generateRetailPPBuy complete:', documentResult.filePath);
          console.log('[PDF GEN][DEBUG] Returning documentType: retail_pp_buy for consignment deal');
          return {
            ...documentResult,
            documentType: 'retail_pp_buy'
          };
        } else if (dealData.dealType === 'auction') {
          console.log('[PDF GEN] -> Calling generateStandardVehicleRecord for auction...');
          documentResult = await this.generateStandardVehicleRecord(dealData, user);
          console.log('[PDF GEN] <- generateStandardVehicleRecord complete:', documentResult.filePath);
          console.log('[PDF GEN][DEBUG] Returning documentType: vehicle_record for auction deal');
          return {
            ...documentResult,
            documentType: 'vehicle_record'
          };
      } else {
        // No matching deal type found - this should not happen with proper deal types
        console.error('[PDF GEN] ❌ No matching deal type found for:', dealData.dealType);
        console.error('[PDF GEN] ❌ Available deal types: wholesale, wholesale-d2d, wholesale-pp, wholesale-flip, retail, retail-pp, retail-d2d, consignment, auction');
        throw new Error(`Unsupported deal type: ${dealData.dealType}`);
      }
    } catch (error) {
      console.error('[PDF GEN] ❌ Error in generateDocument:', error);
      console.error('[PDF GEN] ❌ Error stack:', error.stack);
      console.error('[PDF GEN] ❌ Deal data that caused error:', {
        dealType: dealData.dealType,
        dealType2SubType: dealData.dealType2SubType,
        sellerType: dealData.sellerType,
        buyerType: dealData.buyerType,
        isSellerDocument: dealData.isSellerDocument,
        isBuyerDocument: dealData.isBuyerDocument,
        year: dealData.year,
        make: dealData.make,
        model: dealData.model,
        vin: dealData.vin
      });
      throw new Error(`Failed to generate document: ${error.message}`);
    }
  }

  async generateRetailPPVehicleRecord(dealData, user) {
    const puppeteer = require('puppeteer');
    const logoPath = path.resolve(__dirname, '../assets/rpexotics-logo.png');
    const fs = require('fs-extra');
    // Debug: Log notes fields before rendering
    console.log('[PDF GEN][RetailPPVehicleRecord] Notes debug:', {
      notes: dealData.notes,
      generalNotes: dealData.generalNotes
    });
    // Use VIN or recordId as fallback for file name
    const safeStockNumber = (dealData.stockNumber && dealData.stockNumber !== 'N/A') ? dealData.stockNumber : 
      (dealData.rpStockNumber && dealData.rpStockNumber !== 'N/A') ? dealData.rpStockNumber : 
      (dealData.vin && dealData.vin !== 'N/A') ? dealData.vin : 
      (dealData.vehicleRecordId) ? dealData.vehicleRecordId : 
      `DEAL-${Date.now().toString(36).toUpperCase()}`;
    const fileName = `vehicle_record_${safeStockNumber}_${Date.now()}.pdf`;
    const filePath = path.join(this.uploadsDir, fileName);
    console.log('[PDF GEN][RetailPPVehicleRecord] 📁 Filename generation debug:', {
      stockNumber: dealData.stockNumber,
      rpStockNumber: dealData.rpStockNumber,
      vin: dealData.vin,
      vehicleRecordId: dealData.vehicleRecordId,
      safeStockNumber,
      fileName,
      filePath
    });

    // Helper for address formatting
    function formatAddress(addr) {
      if (!addr) return 'N/A';
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
      }
      return String(addr);
    }

    // Helper for safe number formatting
    function safeNum(val) {
      if (!val || isNaN(val)) return 'N/A';
      return Number(val).toLocaleString();
    }

    // 🔧 ENSURE CORRECT DEAL TYPE 2 FOR RETAIL PP VEHICLE RECORD DISPLAY
    let displayDealType2 = dealData.dealType2SubType || 'N/A';
    
    // For retail PP deals, always show as "buy" since they are buy transactions
    if (dealData.dealType === 'retail-pp') {
      displayDealType2 = 'buy';
    }
    
    console.log('[PDF GEN][RetailPPVehicleRecord] 🔧 CORRECTED DEAL TYPE 2 FOR DISPLAY:', displayDealType2);
    console.log('[PDF GEN][RetailPPVehicleRecord] Original dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN][RetailPPVehicleRecord] Corrected displayDealType2:', displayDealType2);

    // Extract seller info
    const seller = dealData.sellerInfo || dealData.seller || {};
    const vehicle = dealData;
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Read logo as base64 (if available)
    let logoDataUrl = '';
    try {
      if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        logoDataUrl = `data:image/png;base64,${logoBase64}`;
      }
    } catch (e) {
      logoDataUrl = '';
    }

    // Fill the HTML template with dynamic data
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RP Exotics - Vehicle Record Summary</title>
      <style>
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; }
          .no-print { display: none !important; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          margin: 0;
          padding: 20px;
          background: white;
          color: black;
        }
        .container {
          width: 8.5in;
          margin: 0 auto;
          background: white;
          padding: 20px;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .logo {
          width: 60px;
          height: 75px;
          border: 2px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 24px;
          margin-right: 15px;
        }
        .header-info {
          flex: 1;
        }
        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .contact-info {
          font-size: 10px;
          text-align: right;
        }
        .title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
          letter-spacing: 2px;
        }
        .form-section {
          border: 2px solid black;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
        }
        .section-row {
          display: flex;
          gap: 20px;
          margin-bottom: 10px;
          align-items: center;
        }
        .field-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .field-label {
          font-weight: bold;
          white-space: nowrap;
        }
        .field-value {
          border-bottom: 1px solid black;
          min-width: 100px;
          padding: 2px 5px;
          display: inline-block;
        }
        .wide-field {
          min-width: 200px;
        }
        .extra-wide-field {
          min-width: 300px;
        }
        .top-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .deal-info {
          display: flex;
          gap: 40px;
        }
        .date-info {
          text-align: right;
        }
        .vehicle-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 10px;
        }
        .vehicle-row {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .seller-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .financial-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }
        .status-row {
          display: flex;
          gap: 40px;
          margin-top: 15px;
        }
        .notes-section {
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          font-size: 9px;
          margin-top: 30px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo">${logoDataUrl ? `<img src='${logoDataUrl}' alt='RP Exotics Logo' style='width:60px;height:75px;object-fit:contain;' />` : 'RP'}</div>
          <div class="header-info">
            <div class="company-name">RP EXOTICS</div>
            <div class="contact-info">
              1155 N. Warson Rd, St. Louis, MO 63132<br>
              Phone: (314) 970-2427
            </div>
          </div>
        </div>
        <!-- Title -->
        <div class="title">VEHICLE RECORD SUMMARY</div>
        <!-- Top Section -->
        <div class="top-section">
          <div class="deal-info">
            <div class="field-group">
              <span class="field-label">DEAL ID:</span>
              <span class="field-value">${dealData.rpStockNumber || 'N/A'}</span>
            </div>
          </div>
          <div class="date-info">
            <div class="field-group">
              <span class="field-label">DATE:</span>
              <span class="field-value">${dateString}</span>
            </div>
          </div>
        </div>
        <!-- Deal Type Section -->
        <div class="form-section">
          <div class="section-row">
            <div class="field-group">
              <span class="field-label">DEAL TYPE:</span>
              <span class="field-value">${dealData.dealType || 'N/A'}</span>
            </div>
            <div class="field-group">
              <span class="field-label">DEAL TYPE 2:</span>
              <span class="field-value">${displayDealType2}</span>
            </div>
            <div class="field-group">
              <span class="field-label">ASSIGNED TO:</span>
              <span class="field-value">${dealData.salesperson || 'N/A'}</span>
            </div>
          </div>
        </div>
        <!-- Vehicle Information Section -->
        <div class="form-section">
          <div class="vehicle-grid">
            <div>
              <div class="vehicle-row">
                <div class="field-group">
                  <span class="field-label">YEAR:</span>
                  <span class="field-value">${vehicle.year || 'N/A'}</span>
                </div>
                <div class="field-group">
                  <span class="field-label">MAKE:</span>
                  <span class="field-value">${vehicle.make || 'N/A'}</span>
                </div>
              </div>
              <div class="vehicle-row" style="margin-top: 10px;">
                <div class="field-group">
                  <span class="field-label">STOCK #:</span>
                  <span class="field-value">${vehicle.stockNumber || 'N/A'}</span>
                </div>
                <div class="field-group">
                  <span class="field-label">COLOR:</span>
                  <span class="field-value">${vehicle.color || vehicle.exteriorColor || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div>
              <div class="vehicle-row">
                <div class="field-group">
                  <span class="field-label">MODEL:</span>
                  <span class="field-value wide-field">${vehicle.model || 'N/A'}</span>
                </div>
              </div>
              <div class="vehicle-row" style="margin-top: 10px;">
                <div class="field-group">
                  <span class="field-label">MILEAGE:</span>
                  <span class="field-value">${vehicle.mileage !== undefined ? safeNum(vehicle.mileage) : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="section-row">
            <div class="field-group">
              <span class="field-label">VIN:</span>
              <span class="field-value extra-wide-field">${vehicle.vin || 'N/A'}</span>
            </div>
          </div>
        </div>
        <!-- Seller Information Section -->
        <div class="form-section">
          <div class="seller-section">
            <div>
              <div class="field-group" style="margin-bottom: 10px;">
                <span class="field-label">SELLER NAME:</span>
                <span class="field-value wide-field">${seller.name || 'N/A'}</span>
              </div>
              <div class="field-group" style="margin-bottom: 10px;">
                <span class="field-label">CONTACT:</span>
                <span class="field-value wide-field">${seller.phone || 'N/A'}</span>
              </div>
              <div class="field-group">
                <span class="field-label">ADDRESS:</span>
                <span class="field-value wide-field">${formatAddress(seller.address)}</span>
              </div>
            </div>
            <div>
              <div class="field-group">
                <span class="field-label">EMAIL:</span>
                <span class="field-value wide-field">${seller.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Buyer Information Section (for retail-pp buy deals) -->
        <div class="form-section">
          <div class="seller-section">
            <div>
              <div class="field-group" style="margin-bottom: 10px;">
                <span class="field-label">BUYER NAME:</span>
                <span class="field-value wide-field">RP Exotics</span>
              </div>
              <div class="field-group" style="margin-bottom: 10px;">
                <span class="field-label">CONTACT:</span>
                <span class="field-value wide-field">(314) 970-2427</span>
              </div>
              <div class="field-group">
                <span class="field-label">ADDRESS:</span>
                <span class="field-value wide-field">1155 N. Warson Rd, St. Louis, MO 63132</span>
              </div>
            </div>
            <div>
              <div class="field-group">
                <span class="field-label">EMAIL:</span>
                <span class="field-value wide-field">info@rpexotics.com</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Financial Information Section -->
        <div class="form-section">
          <div class="financial-grid">
            <div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">PURCHASE PRICE:</span>
                <span class="field-value">$${safeNum(vehicle.purchasePrice)}</span>
              </div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">LIST PRICE:</span>
                <span class="field-value">$${safeNum(vehicle.listPrice)}</span>
              </div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">PAYOFF AMOUNT:</span>
                <span class="field-value">$${safeNum(vehicle.payoffBalance)}</span>
              </div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">AMOUNT DUE TO CUSTOMER:</span>
                <span class="field-value">$${safeNum(vehicle.amountDueToCustomer)}</span>
              </div>
            </div>
            <div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">COMMISSION RATE:</span>
                <span class="field-value">${vehicle.commissionRate || 'N/A'}</span>
              </div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">BROKER FEE:</span>
                <span class="field-value">$${safeNum(vehicle.brokerFee)}</span>
              </div>
              <div class="field-group" style="margin-bottom: 15px;">
                <span class="field-label">AMOUNT DUE TO RP:</span>
                <span class="field-value">$${safeNum(vehicle.amountDueToRP)}</span>
              </div>
            </div>
          </div>
          <div class="field-group" style="margin-bottom: 15px;">
            <span class="field-label">BROKER FEE PAID TO:</span>
            <span class="field-value extra-wide-field">${vehicle.brokerFeePaidTo || 'N/A'}</span>
          </div>
          <div class="status-row">
            <div class="field-group">
              <span class="field-label">TITLE STATUS:</span>
              <span class="field-value">${vehicle.titleStatus || 'N/A'}</span>
            </div>
          </div>
        </div>
        <!-- Notes Section -->
        <div class="form-section">
          <div class="field-group">
            <span class="field-label">NOTES/COMMENTS:</span>
            <span class="field-value extra-wide-field">${dealData.notes || dealData.generalNotes || 'N/A'}</span>
          </div>
        </div>
        <!-- Footer -->
        <div class="footer">
          Generated by RP Exotics Management System<br>
          Generated by: ${user.firstName || ''} ${user.lastName || ''}<br>
          Generated on: ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
    `;

    // Generate PDF
    let browser;
    try {
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ path: filePath, format: 'A4', printBackground: true });
      await browser.close();
      console.log('[PDF GEN][RetailPPVehicleRecord] PDF generated successfully:', filePath);
      
      // Get file size before uploading to S3
      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      // Return result object for downstream logic
      // Save document to S3 and clean up local file
      const cloudResult = await this.ensureCloudStorage(filePath, fileName, 'vehicle_record_pdf', this.generateEnhancedDocumentNumber(
      dealData.dealType, 
      dealData.dealType2SubType, 
      'VR', 
      dealData.stockNumber || 'N/A'
    ));
      
      return {
        fileName,
        filePath: cloudResult.filePath, // Use cloud URL instead of local path
        fileSize: fileSize,
        documentType: 'vehicle_record',
        generatedBy: user && user._id ? user._id : undefined,
        generatedAt: new Date(),
        status: 'draft',
        cloudUrl: cloudResult.cloudUrl
      };
    } catch (err) {
      if (browser) await browser.close();
      console.error('[PDF GEN][RetailPPVehicleRecord] Error generating PDF:', err);
      throw err;
    }
  }

  async generateVehicleRecordPDF(dealData, user) {
    console.log('[PDF GEN][VehicleRecordPDF] Starting vehicle record PDF generation');
    console.log('[PDF GEN][VehicleRecordPDF] Deal data:', {
      dealType: dealData.dealType,
      dealType2SubType: dealData.dealType2SubType,
      stockNumber: dealData.stockNumber,
      vin: dealData.vin
    });
    
    // 🔍 DEAL TYPE 2 TRACKING IN VEHICLE RECORD GENERATION
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] 🔍 VEHICLE RECORD GENERATION - DEAL TYPE 2 TRACKING');
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Vehicle Record dealType2SubType:', dealData.dealType2SubType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] Vehicle Record dealType:', dealData.dealType);
    console.log('[PDF GEN][DEAL_TYPE_DEBUG] This value will be displayed as "Deal Type 2" in the vehicle record');
    
    // Check for potential issues in vehicle record
    if (dealData.dealType2SubType === 'buy') {
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] ⚠️ VEHICLE RECORD ISSUE: dealType2SubType is "buy"');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] This will show as "Deal Type 2: buy" in the vehicle record');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] Expected values:');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - wholesale-d2d sale: should be "sale"');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - wholesale-pp sale: should be "sale"');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - wholesale-flip buy-sell: should be "buy-sell"');
      console.log('[PDF GEN][DEAL_TYPE_DEBUG] - retail-pp buy-sell: should be "buy-sell"');
    }
    
    try {
      // Retail-pp buy or retail-d2d buy: use custom template
      if ((dealData.dealType === 'retail-pp' || dealData.dealType === 'retail-d2d') && dealData.dealType2SubType === 'buy') {
        console.log('[PDF GEN][VehicleRecordPDF] Using retail PP vehicle record template');
        const result = await this.generateRetailPPVehicleRecord(dealData, user);
        console.log('[PDF GEN][VehicleRecordPDF] Retail PP vehicle record generated successfully:', result.fileName);
        return result;
      }
      // Otherwise, use standard logic
      console.log('[PDF GEN][VehicleRecordPDF] Using standard vehicle record template');
      const result = await this.generateStandardVehicleRecord(dealData, user);
      console.log('[PDF GEN][VehicleRecordPDF] Standard vehicle record generated successfully:', result.fileName);
      return result;
    } catch (error) {
      console.error('[PDF GEN][VehicleRecordPDF] Error generating vehicle record PDF:', error);
      console.error('[PDF GEN][VehicleRecordPDF] Error stack:', error.stack);
      throw error;
    }
  }
}

module.exports = new DocumentGenerator(); 