const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;

class PDFSignatureService {
  constructor() {
    this.debugMode = process.env.NODE_ENV !== 'production';
    this.logPrefix = '[PDF SIGNATURE SERVICE]';
  }

  log(message, data = null) {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`${this.logPrefix} [${timestamp}] ${message}`);
      if (data) {
        console.log(`${this.logPrefix} [${timestamp}] Data:`, JSON.stringify(data, null, 2));
      }
    }
  }

  error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`${this.logPrefix} [${timestamp}] ERROR: ${message}`);
    if (error) {
      console.error(`${this.logPrefix} [${timestamp}] Error details:`, error);
    }
  }

  async addSignatureToPDF(pdfBuffer, signatureImageBase64, documentType, options = {}) {
    try {
      this.log('Starting signature addition to PDF', {
        documentType,
        signatureType: options.signatureType || 'unknown',
        hasSignatureImage: !!signatureImageBase64,
        signatureLength: signatureImageBase64 ? signatureImageBase64.length : 0,
        pdfBufferSize: pdfBuffer.length
      });

      // Load the PDF document
      this.log('Loading PDF document...');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      this.log('PDF loaded successfully', {
        pageCount: pdfDoc.getPageCount(),
        documentSize: pdfBuffer.length
      });

      // Get the first page (most documents are single page)
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        throw new Error('PDF has no pages');
      }

      const page = pages[0];
      const { width, height } = page.getSize();
      
      this.log('Page dimensions', {
        width: Math.round(width),
        height: Math.round(height),
        pageIndex: 0
      });

      // Determine signature position based on document type
      const signaturePosition = this.getSignaturePosition(documentType, width, height, options);
      this.log('Calculated signature position', signaturePosition);

      if (signatureImageBase64) {
        // Add image signature
        this.log('Processing image signature...');
        await this.addImageSignature(page, signatureImageBase64, signaturePosition);
      } else if (options.typedSignature) {
        // Add typed signature
        this.log('Processing typed signature...');
        await this.addTypedSignature(page, options.typedSignature, signaturePosition);
      } else {
        throw new Error('No signature data provided (image or typed)');
      }

      // Save the modified PDF
      this.log('Saving modified PDF...');
      const modifiedPdfBytes = await pdfDoc.save();
      
      this.log('PDF signature addition completed successfully', {
        originalSize: pdfBuffer.length,
        modifiedSize: modifiedPdfBytes.length,
        sizeDifference: modifiedPdfBytes.length - pdfBuffer.length
      });

      return modifiedPdfBytes;
    } catch (error) {
      this.error('Failed to add signature to PDF', error);
      throw error;
    }
  }

  getSignaturePosition(documentType, pageWidth, pageHeight, options = {}) {
    this.log('Calculating signature position', {
      documentType,
      pageWidth: Math.round(pageWidth),
      pageHeight: Math.round(pageHeight),
      customPosition: options.customPosition
    });

    // Default signature dimensions
    const signatureWidth = 150;
    const signatureHeight = 60;

    let position;

    // Define signature positions for different document types
    switch (documentType) {
      case 'wholesale_bos':
        position = {
          x: pageWidth - signatureWidth - 50, // Right side, 50px from edge
          y: 100, // Bottom area
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      case 'wholesale_pp_buy':
      case 'wholesale_pp_sale':
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 120,
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      case 'wholesale_purchase_agreement':
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 150,
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      case 'wholesale_purchase_order':
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 80,
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      case 'wholesale_sales_order':
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 90,
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      case 'retail_pp_buy':
      case 'retail_pp_sale':
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 110,
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      case 'vehicle_record':
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 70,
          width: signatureWidth,
          height: signatureHeight
        };
        break;
      
      default:
        // Default position for unknown document types
        position = {
          x: pageWidth - signatureWidth - 50,
          y: 100,
          width: signatureWidth,
          height: signatureHeight
        };
        this.log('Using default signature position for unknown document type', { documentType });
    }

    // Apply custom position if provided
    if (options.customPosition) {
      position = { ...position, ...options.customPosition };
      this.log('Applied custom position override', options.customPosition);
    }

    // Validate position is within page bounds
    if (position.x < 0 || position.y < 0 || 
        position.x + position.width > pageWidth || 
        position.y + position.height > pageHeight) {
      this.error('Signature position out of bounds, adjusting...', {
        originalPosition: position,
        pageBounds: { width: pageWidth, height: pageHeight }
      });
      
      // Adjust position to fit within bounds
      position.x = Math.max(0, Math.min(position.x, pageWidth - position.width));
      position.y = Math.max(0, Math.min(position.y, pageHeight - position.height));
      
      this.log('Adjusted signature position', position);
    }

    this.log('Final signature position calculated', position);
    return position;
  }

  async addImageSignature(page, signatureImageBase64, position) {
    try {
      this.log('Adding image signature to page', {
        position,
        imageDataLength: signatureImageBase64.length
      });

      // Remove data URL prefix if present
      let imageData = signatureImageBase64;
      if (signatureImageBase64.startsWith('data:image/')) {
        imageData = signatureImageBase64.split(',')[1];
        this.log('Removed data URL prefix from image');
      }

      // Decode base64 to buffer
      const imageBuffer = Buffer.from(imageData, 'base64');
      this.log('Decoded image buffer', {
        bufferSize: imageBuffer.length,
        base64Length: imageData.length
      });

      // Embed the image in the PDF
      let image;
      try {
        image = await page.doc.embedPng(imageBuffer);
        this.log('Successfully embedded PNG image');
      } catch (pngError) {
        this.log('PNG embedding failed, trying JPEG...', pngError.message);
        try {
          image = await page.doc.embedJpg(imageBuffer);
          this.log('Successfully embedded JPEG image');
        } catch (jpgError) {
          this.error('Failed to embed image (both PNG and JPEG failed)', {
            pngError: pngError.message,
            jpgError: jpgError.message
          });
          throw new Error('Unsupported image format. Please use PNG or JPEG.');
        }
      }

      // Get image dimensions
      const imageWidth = image.width;
      const imageHeight = image.height;
      
      this.log('Image dimensions', {
        originalWidth: imageWidth,
        originalHeight: imageHeight,
        targetWidth: position.width,
        targetHeight: position.height
      });

      // Calculate scaling to fit the signature in the target area
      const scaleX = position.width / imageWidth;
      const scaleY = position.height / imageHeight;
      const scale = Math.min(scaleX, scaleY);

      const scaledWidth = imageWidth * scale;
      const scaledHeight = imageHeight * scale;

      // Center the signature in the target area
      const centerX = position.x + (position.width - scaledWidth) / 2;
      const centerY = position.y + (position.height - scaledHeight) / 2;

      this.log('Calculated image placement', {
        scale,
        scaledWidth: Math.round(scaledWidth),
        scaledHeight: Math.round(scaledHeight),
        centerX: Math.round(centerX),
        centerY: Math.round(centerY)
      });

      // Draw the image on the page
      page.drawImage(image, {
        x: centerX,
        y: centerY,
        width: scaledWidth,
        height: scaledHeight
      });

      this.log('Image signature successfully added to page');
      
      return {
        success: true,
        position: { x: centerX, y: centerY, width: scaledWidth, height: scaledHeight },
        originalDimensions: { width: imageWidth, height: imageHeight },
        scaledDimensions: { width: scaledWidth, height: scaledHeight }
      };

    } catch (error) {
      this.error('Failed to add image signature', error);
      throw error;
    }
  }

  async addTypedSignature(page, typedSignature, position) {
    try {
      this.log('Adding typed signature to page', {
        signatureText: typedSignature,
        position
      });

      // Load a font
      const font = await page.doc.embedFont(StandardFonts.HelveticaBold);
      
      // Calculate font size to fit the signature in the target area
      const fontSize = Math.min(position.height * 0.6, 24); // Max 24pt, or 60% of height
      
      this.log('Typed signature settings', {
        fontSize,
        targetArea: position,
        textLength: typedSignature.length
      });

      // Calculate text width to center it
      const textWidth = font.widthOfTextAtSize(typedSignature, fontSize);
      const centerX = position.x + (position.width - textWidth) / 2;
      const centerY = position.y + (position.height - fontSize) / 2;

      this.log('Text placement calculation', {
        textWidth: Math.round(textWidth),
        centerX: Math.round(centerX),
        centerY: Math.round(centerY),
        fontSize
      });

      // Draw the signature text
      page.drawText(typedSignature, {
        x: centerX,
        y: centerY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0) // Black color
      });

      this.log('Typed signature successfully added to page');
      
      return {
        success: true,
        position: { x: centerX, y: centerY, width: textWidth, height: fontSize },
        text: typedSignature,
        fontSize
      };

    } catch (error) {
      this.error('Failed to add typed signature', error);
      throw error;
    }
  }

  async addWatermark(pdfBuffer, watermarkText = 'SIGNED') {
    try {
      this.log('Adding watermark to PDF', { watermarkText });

      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      this.log('Processing pages for watermark', { pageCount: pages.length });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        this.log(`Adding watermark to page ${i + 1}`, {
          pageWidth: Math.round(width),
          pageHeight: Math.round(height)
        });

        // Load font for watermark
        const font = await page.doc.embedFont(StandardFonts.Helvetica);
        
        // Create watermark text with timestamp
        const timestamp = new Date().toISOString();
        const watermarkContent = `${watermarkText} - ${timestamp}`;
        
        // Position watermark in center of page
        const fontSize = 12;
        const textWidth = font.widthOfTextAtSize(watermarkContent, fontSize);
        const centerX = (width - textWidth) / 2;
        const centerY = height / 2;

        this.log(`Watermark placement for page ${i + 1}`, {
          text: watermarkContent,
          centerX: Math.round(centerX),
          centerY: Math.round(centerY),
          fontSize
        });

        // Draw watermark with transparency
        page.drawText(watermarkContent, {
          x: centerX,
          y: centerY,
          size: fontSize,
          font: font,
          color: rgb(0.8, 0.8, 0.8), // Light gray
          opacity: 0.3 // 30% opacity
        });
      }

      const watermarkedPdfBytes = await pdfDoc.save();
      
      this.log('Watermark addition completed', {
        originalSize: pdfBuffer.length,
        watermarkedSize: watermarkedPdfBytes.length
      });

      return watermarkedPdfBytes;

    } catch (error) {
      this.error('Failed to add watermark', error);
      throw error;
    }
  }

  async createSignedDocument(originalPdfBuffer, signatureData, documentType, options = {}) {
    try {
      this.log('Starting complete document signing process', {
        documentType,
        hasImageSignature: !!signatureData.imageSignature,
        hasTypedSignature: !!signatureData.typedSignature,
        options
      });

      // Step 1: Add signature to PDF
      this.log('Step 1: Adding signature to PDF...');
      let signedPdfBuffer = await this.addSignatureToPDF(
        originalPdfBuffer,
        signatureData.imageSignature,
        documentType,
        {
          ...options,
          typedSignature: signatureData.typedSignature
        }
      );

      // Step 2: Add watermark
      this.log('Step 2: Adding watermark...');
      const finalPdfBuffer = await this.addWatermark(signedPdfBuffer, 'SIGNED');

      this.log('Document signing process completed successfully', {
        originalSize: originalPdfBuffer.length,
        finalSize: finalPdfBuffer.length,
        totalSizeIncrease: finalPdfBuffer.length - originalPdfBuffer.length
      });

      return {
        success: true,
        signedPdfBuffer: finalPdfBuffer,
        originalSize: originalPdfBuffer.length,
        finalSize: finalPdfBuffer.length,
        signatureType: signatureData.imageSignature ? 'image' : 'typed',
        documentType
      };

    } catch (error) {
      this.error('Failed to create signed document', error);
      throw error;
    }
  }

  // Utility method to validate PDF buffer
  validatePdfBuffer(pdfBuffer) {
    try {
      this.log('Validating PDF buffer', {
        bufferSize: pdfBuffer.length,
        isBuffer: Buffer.isBuffer(pdfBuffer),
        hasContent: pdfBuffer.length > 0
      });

      if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error('PDF buffer must be a Buffer');
      }

      if (pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }

      // Check if it starts with PDF magic number
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      if (pdfHeader !== '%PDF') {
        this.error('Invalid PDF header', { pdfHeader });
        throw new Error('Invalid PDF format');
      }

      this.log('PDF buffer validation passed');
      return true;

    } catch (error) {
      this.error('PDF buffer validation failed', error);
      throw error;
    }
  }

  // Utility method to get document info
  async getDocumentInfo(pdfBuffer) {
    try {
      this.log('Getting document information...');
      
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      const info = {
        pageCount: pages.length,
        documentSize: pdfBuffer.length,
        pages: pages.map((page, index) => {
          const { width, height } = page.getSize();
          return {
            pageNumber: index + 1,
            width: Math.round(width),
            height: Math.round(height)
          };
        })
      };

      this.log('Document information retrieved', info);
      return info;

    } catch (error) {
      this.error('Failed to get document information', error);
      throw error;
    }
  }
}

module.exports = new PDFSignatureService(); 