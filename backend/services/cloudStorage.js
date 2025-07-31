const AWS = require('aws-sdk');
const fs = require('fs-extra');
const path = require('path');

class CloudStorage {
  constructor() {
    this.s3 = null;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'rp-exotics-document-storage';
    this.region = process.env.AWS_REGION || 'us-east-2';
    
    // Always use S3, never fall back to local storage
    this.isLocal = false;
    this.initializeS3();
    
    console.log(`[CLOUD STORAGE] Initialized - S3 only mode, Bucket: ${this.bucketName}`);
    console.log(`[CLOUD STORAGE] Environment check:`, {
      NODE_ENV: process.env.NODE_ENV,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'DEFAULT',
      AWS_REGION: process.env.AWS_REGION || 'DEFAULT'
    });
  }

  initializeS3() {
    try {
      // Try to use environment variables first, then fall back to CLI config
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        this.s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: this.region,
          // Add timeout and retry configuration for production
          httpOptions: {
            timeout: 30000, // 30 seconds
            connectTimeout: 10000 // 10 seconds
          },
          maxRetries: 3
        });
        console.log('[CLOUD STORAGE] S3 initialized with environment variables');
      } else {
        // Use AWS CLI configuration
        const credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
        this.s3 = new AWS.S3({
          credentials: credentials,
          region: this.region,
          // Add timeout and retry configuration for production
          httpOptions: {
            timeout: 30000, // 30 seconds
            connectTimeout: 10000 // 10 seconds
          },
          maxRetries: 3
        });
        console.log('[CLOUD STORAGE] S3 initialized with AWS CLI configuration');
      }
      
      // Test S3 connection
      this.testS3Connection();
    } catch (error) {
      console.error('[CLOUD STORAGE] Failed to initialize S3:', error);
      throw new Error('S3 initialization failed - cloud storage is required');
    }
  }

  async testS3Connection() {
    try {
      console.log('[CLOUD STORAGE] Testing S3 connection...');
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log('[CLOUD STORAGE] ✅ S3 connection test successful');
    } catch (error) {
      console.error('[CLOUD STORAGE] ❌ S3 connection test failed:', error.message);
      if (error.code === 'NoSuchBucket') {
        console.error('[CLOUD STORAGE] ❌ Bucket does not exist:', this.bucketName);
      } else if (error.code === 'AccessDenied') {
        console.error('[CLOUD STORAGE] ❌ Access denied - check AWS credentials and permissions');
      }
      // Don't throw here, let the system continue but log the issue
    }
  }

  async uploadFile(filePath, fileName, contentType = 'application/pdf') {
    try {
      console.log(`[CLOUD STORAGE] Starting file upload: ${fileName}`);
      console.log(`[CLOUD STORAGE] File path: ${filePath}`);
      console.log(`[CLOUD STORAGE] Content type: ${contentType}`);
      
      // Check if file exists
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      // Get file stats
      const stats = await fs.stat(filePath);
      console.log(`[CLOUD STORAGE] File size: ${stats.size} bytes`);
      
      // Read file from local storage (temporary)
      const fileContent = await fs.readFile(filePath);
      
      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: `documents/${fileName}`,
        Body: fileContent,
        ContentType: contentType,
        Metadata: {
          'original-filename': fileName,
          'uploaded-at': new Date().toISOString(),
          'file-size': stats.size.toString()
        }
        // Removed ACL since bucket doesn't support it
      };

      console.log(`[CLOUD STORAGE] Uploading to S3 with params:`, {
        Bucket: uploadParams.Bucket,
        Key: uploadParams.Key,
        ContentType: uploadParams.ContentType,
        FileSize: uploadParams.Metadata['file-size']
      });

      const result = await this.s3.upload(uploadParams).promise();
      
      console.log(`[CLOUD STORAGE] ✅ File uploaded successfully: ${result.Location}`);
      console.log(`[CLOUD STORAGE] S3 Key: ${result.Key}`);
      console.log(`[CLOUD STORAGE] ETag: ${result.ETag}`);
      
      // Clean up local file after successful S3 upload
      try {
        await fs.remove(filePath);
        console.log(`[CLOUD STORAGE] ✅ Local file cleaned up: ${filePath}`);
      } catch (cleanupError) {
        console.warn(`[CLOUD STORAGE] ⚠️ Could not clean up local file: ${cleanupError.message}`);
      }
      
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        localPath: null, // No local path since we clean up
        etag: result.ETag,
        size: stats.size
      };
    } catch (error) {
      console.error('[CLOUD STORAGE] ❌ Upload failed:', error);
      console.error('[CLOUD STORAGE] Error details:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        requestId: error.requestId
      });
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async uploadBuffer(buffer, fileName, contentType = 'application/pdf') {
    try {
      console.log(`[CLOUD STORAGE] Starting buffer upload: ${fileName}`);
      console.log(`[CLOUD STORAGE] Content-Type: ${contentType}`);
      console.log(`[CLOUD STORAGE] Buffer size: ${buffer.length} bytes`);
      
      // Upload buffer directly to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: `documents/${fileName}`,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          'original-filename': fileName,
          'uploaded-at': new Date().toISOString(),
          'file-size': buffer.length.toString(),
          'upload-type': 'buffer'
        }
        // Removed ACL since bucket doesn't support it
      };

      console.log(`[CLOUD STORAGE] Uploading buffer to S3 with params:`, {
        Bucket: uploadParams.Bucket,
        Key: uploadParams.Key,
        ContentType: uploadParams.ContentType,
        FileSize: uploadParams.Metadata['file-size']
      });

      const result = await this.s3.upload(uploadParams).promise();
      
      console.log(`[CLOUD STORAGE] ✅ Buffer uploaded successfully to S3: ${result.Location}`);
      console.log(`[CLOUD STORAGE] S3 Key: ${result.Key}`);
      console.log(`[CLOUD STORAGE] ETag: ${result.ETag}`);
      
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        localPath: null,
        etag: result.ETag,
        size: buffer.length
      };
    } catch (error) {
      console.error('[CLOUD STORAGE] ❌ Buffer upload failed:', error);
      console.error('[CLOUD STORAGE] Error details:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        requestId: error.requestId
      });
      throw new Error(`Failed to upload buffer to S3: ${error.message}`);
    }
  }

  async downloadFile(fileName) {
    try {
      console.log(`[CLOUD STORAGE] Downloading file: ${fileName}`);
      
      // Download from S3
      const downloadParams = {
        Bucket: this.bucketName,
        Key: `documents/${fileName}`
      };

      const result = await this.s3.getObject(downloadParams).promise();
      
      console.log(`[CLOUD STORAGE] ✅ File downloaded successfully: ${fileName}`);
      console.log(`[CLOUD STORAGE] Content-Type: ${result.ContentType}`);
      console.log(`[CLOUD STORAGE] Content-Length: ${result.ContentLength}`);
      
      return {
        success: true,
        data: result.Body,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified
      };
    } catch (error) {
      console.error('[CLOUD STORAGE] ❌ Download failed:', error);
      console.error('[CLOUD STORAGE] Error details:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      });
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async deleteFile(fileName) {
    try {
      console.log(`[CLOUD STORAGE] Deleting file: ${fileName}`);
      
      // Delete from S3
      const deleteParams = {
        Bucket: this.bucketName,
        Key: `documents/${fileName}`
      };

      await this.s3.deleteObject(deleteParams).promise();
      console.log(`[CLOUD STORAGE] ✅ S3 file deleted: ${fileName}`);
      
      return { success: true };
    } catch (error) {
      console.error('[CLOUD STORAGE] ❌ Delete failed:', error);
      console.error('[CLOUD STORAGE] Error details:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      });
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async fileExists(fileName) {
    try {
      console.log(`[CLOUD STORAGE] Checking if file exists: ${fileName}`);
      
      // Check if file exists in S3
      const headParams = {
        Bucket: this.bucketName,
        Key: `documents/${fileName}`
      };

      await this.s3.headObject(headParams).promise();
      console.log(`[CLOUD STORAGE] ✅ File exists: ${fileName}`);
      return true;
    } catch (error) {
      if (error.code === 'NotFound' || error.statusCode === 404) {
        console.log(`[CLOUD STORAGE] ❌ File not found: ${fileName}`);
        return false;
      }
      console.error('[CLOUD STORAGE] ❌ File existence check failed:', error);
      return false;
    }
  }

  getFileUrl(fileName) {
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/documents/${fileName}`;
    console.log(`[CLOUD STORAGE] Generated URL: ${url}`);
    return url;
  }

  // New method to get bucket information
  async getBucketInfo() {
    try {
      const result = await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log(`[CLOUD STORAGE] ✅ Bucket accessible: ${this.bucketName}`);
      return {
        success: true,
        bucketName: this.bucketName,
        region: this.region
      };
    } catch (error) {
      console.error('[CLOUD STORAGE] ❌ Bucket check failed:', error);
      return {
        success: false,
        error: error.message,
        bucketName: this.bucketName,
        region: this.region
      };
    }
  }
}

module.exports = new CloudStorage(); 