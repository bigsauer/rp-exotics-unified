const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFImage, PDFPage } = require('pdf-lib');

class PDFSignatureService {
  constructor() {
    this.signaturePositions = {
      'wholesale_bos': { x: 150, y: 200, page: 1 },
      'wholesale_pp_buy': { x: 150, y: 250, page: 1 },
      'retail_pp_buy': { x: 150, y: 300, page: 1 },
      'vehicle_record_pdf': { x: 150, y: 150, page: 1 },
      'default': { x: 150, y: 200, page: 1 }
    };
  }

  /**
   * Add signature to PDF document
   * @param {Buffer} pdfBuffer - Original PDF buffer
   * @param {string} signatureImageBase64 - Base64 encoded signature image
   * @param {string} documentType - Type of document for positioning
   * @param {Object} options - Additional options
   * @returns {Buffer} - Signed PDF buffer
   */
  async addSignatureToPDF(pdfBuffer, signatureImageBase64, documentType, options = {}) {
    try {
      console.log('[PDFSignatureService] Adding signature to PDF...');
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Get signature position based on document type
      const position = this.signaturePositions[documentType] || this.signaturePositions.default;
      const { x, y, page } = position;
      
      // Convert base64 signature to image
      const signatureImage = await this.base64ToImage(signatureImageBase64);
      
      // Get the page to add signature to
      const pages = pdfDoc.getPages();
      const targetPage = pages[page - 1] || pages[0]; // Default to first page if specified page doesn't exist
      
      // Embed the signature image
      const embeddedImage = await pdfDoc.embedPng(signatureImage);
      
      // Calculate signature dimensions (maintain aspect ratio)
      const maxWidth = 200;
      const maxHeight = 80;
      const { width: imgWidth, height: imgHeight } = embeddedImage;
      
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;
      
      // Scale down if too large
      if (imgWidth > maxWidth || imgHeight > maxHeight) {
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        finalWidth = imgWidth * scale;
        finalHeight = imgHeight * scale;
      }
      
      // Add signature to the page
      targetPage.drawImage(embeddedImage, {
        x: x,
        y: targetPage.getHeight() - y - finalHeight, // PDF coordinates are bottom-left
        width: finalWidth,
        height: finalHeight
      });
      
      // Add signature metadata
      const metadata = {
        signedBy: options.signerName || 'Unknown',
        signedAt: new Date().toISOString(),
        documentType: documentType,
        signaturePosition: { x, y, page }
      };
      
      // Add metadata as custom properties
      pdfDoc.setTitle(`${pdfDoc.getTitle() || 'Document'} - SIGNED`);
      pdfDoc.setAuthor(options.signerName || 'Unknown');
      pdfDoc.setSubject(`Signed by ${options.signerName || 'Unknown'} on ${new Date().toLocaleDateString()}`);
      
      // Save the modified PDF
      const signedPdfBytes = await pdfDoc.save();
      
      console.log('[PDFSignatureService] Signature added successfully');
      return Buffer.from(signedPdfBytes);
      
    } catch (error) {
      console.error('[PDFSignatureService] Error adding signature to PDF:', error);
      throw new Error(`Failed to add signature to PDF: ${error.message}`);
    }
  }

  /**
   * Convert base64 image to buffer
   * @param {string} base64String - Base64 encoded image
   * @returns {Buffer} - Image buffer
   */
  async base64ToImage(base64String) {
    try {
      // Remove data URL prefix if present
      const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('[PDFSignatureService] Error converting base64 to image:', error);
      throw new Error('Invalid base64 image data');
    }
  }

  /**
   * Get signature position for a document type
   * @param {string} documentType - Type of document
   * @returns {Object} - Position coordinates
   */
  getSignaturePosition(documentType) {
    return this.signaturePositions[documentType] || this.signaturePositions.default;
  }

  /**
   * Add watermark to signed document
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {string} watermarkText - Watermark text
   * @returns {Buffer} - Watermarked PDF buffer
   */
  async addWatermark(pdfBuffer, watermarkText = 'SIGNED') {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // Add watermark text
        page.drawText(watermarkText, {
          x: width - 100,
          y: height - 30,
          size: 12,
          color: { r: 0.8, g: 0.8, b: 0.8 }, // Light gray
          opacity: 0.5
        });
        
        // Add timestamp
        const timestamp = new Date().toLocaleString();
        page.drawText(timestamp, {
          x: width - 150,
          y: height - 50,
          size: 8,
          color: { r: 0.6, g: 0.6, b: 0.6 },
          opacity: 0.3
        });
      });
      
      const watermarkedPdfBytes = await pdfDoc.save();
      return Buffer.from(watermarkedPdfBytes);
      
    } catch (error) {
      console.error('[PDFSignatureService] Error adding watermark:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  /**
   * Create a signed document with signature and watermark
   * @param {Buffer} originalPdfBuffer - Original PDF buffer
   * @param {string} signatureImageBase64 - Base64 encoded signature
   * @param {string} documentType - Document type
   * @param {Object} options - Additional options
   * @returns {Buffer} - Final signed PDF buffer
   */
  async createSignedDocument(originalPdfBuffer, signatureImageBase64, documentType, options = {}) {
    try {
      console.log('[PDFSignatureService] Creating signed document...');
      
      // Step 1: Add signature to PDF
      let signedPdf = await this.addSignatureToPDF(originalPdfBuffer, signatureImageBase64, documentType, options);
      
      // Step 2: Add watermark
      signedPdf = await this.addWatermark(signedPdf, 'SIGNED');
      
      console.log('[PDFSignatureService] Signed document created successfully');
      return signedPdf;
      
    } catch (error) {
      console.error('[PDFSignatureService] Error creating signed document:', error);
      throw error;
    }
  }
}

module.exports = new PDFSignatureService(); 