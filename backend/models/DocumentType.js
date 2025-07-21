const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  required: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['legal', 'financial', 'identification', 'vehicle', 'other'],
    default: 'other'
  },
  allowedFileTypes: [{
    type: String,
    enum: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
  }],
  maxFileSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB default
  },
  expirationDays: {
    type: Number,
    default: 365 // 1 year default
  },
  validationRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
documentTypeSchema.index({ type: 1 });
documentTypeSchema.index({ category: 1 });
documentTypeSchema.index({ isActive: 1 });

module.exports = mongoose.model('DocumentType', documentTypeSchema); 