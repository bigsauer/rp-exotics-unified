const mongoose = require('mongoose');

const salesDealSchema = new mongoose.Schema({
  // Basic Deal Information (inherited from main deal schema)
  vehicle: { type: String, required: true },
  vin: { type: String, required: true, unique: true },
  stockNumber: { type: String, required: true },
  year: { type: Number, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  
  // Sales-Specific Information
  salesPerson: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  
  customer: {
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['individual', 'dealer', 'business'], 
      default: 'individual' 
    },
    contact: {
      email: { type: String },
      phone: { type: String },
      address: { type: String },
      preferredContact: { 
        type: String, 
        enum: ['email', 'phone', 'text'], 
        default: 'email' 
      }
    },
    notes: { type: String },
    source: { 
      type: String, 
      enum: ['referral', 'website', 'walk-in', 'social-media', 'advertisement', 'other'],
      default: 'other'
    },
    tags: [{ type: String }] // 'vip', 'repeat-customer', etc.
  },
  
  // Financial Information (permission-based visibility)
  financial: {
    purchasePrice: { type: Number },
    listPrice: { type: Number },
    expectedMargin: { type: Number },
    commission: {
      rate: { type: Number, default: 0 },
      estimatedAmount: { type: Number, default: 0 }
    }
  },
  
  // Timeline and Progress
  timeline: {
    purchaseDate: { type: Date, default: Date.now },
    estimatedCompletionDate: { type: Date },
    actualCompletionDate: { type: Date },
    milestones: [{
      stage: { type: String, required: true },
      expectedDate: { type: Date, required: true },
      actualDate: { type: Date },
      status: { 
        type: String, 
        enum: ['pending', 'completed', 'delayed'], 
        default: 'pending' 
      },
      notes: { type: String }
    }]
  },
  
  // Sales Workflow Stages
  currentStage: { 
    type: String, 
    enum: [
      'contract-received',
      'title-processing',
      'funds-disbursed',
      'title-received',
      'deal-complete'
    ],
    default: 'contract-received'
  },
  previousStage: { type: String },
  stageHistory: [{
    stage: { type: String, required: true },
    enteredAt: { type: Date, default: Date.now },
    exitedAt: { type: Date },
    duration: { type: Number, default: 0 }, // in hours
    notes: { type: String }
  }],
  
  // Priority and Status
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'normal', 'low'],
    default: 'medium'
  },
  status: { 
    type: String, 
    enum: ['active', 'on-hold', 'completed', 'cancelled'], 
    default: 'active' 
  },
  
  // Communication and Collaboration
  communications: [{
    type: { 
      type: String, 
      enum: ['message', 'call', 'email', 'meeting'], 
      required: true 
    },
    direction: { 
      type: String, 
      enum: ['inbound', 'outbound', 'internal'], 
      required: true 
    },
    from: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, required: true }
    },
    to: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, required: true }
    }],
    subject: { type: String },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    urgent: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    attachments: [{
      fileName: { type: String },
      filePath: { type: String },
      fileType: { type: String }
    }]
  }],
  
  // Sales Actions and Follow-ups
  salesActions: [{
    action: { 
      type: String, 
      enum: ['follow-up-customer', 'contact-back-office', 'schedule-delivery', 'update-documents', 'verify-information'],
      required: true 
    },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { 
      type: String, 
      enum: ['urgent', 'high', 'normal', 'low'], 
      default: 'normal' 
    },
    notes: { type: String }
  }],
  
  // Customer Interactions
  customerInteractions: [{
    type: { 
      type: String, 
      enum: ['call', 'email', 'meeting', 'text'], 
      required: true 
    },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 }, // in minutes
    outcome: { 
      type: String, 
      enum: ['positive', 'neutral', 'concerned', 'complaint'], 
      required: true 
    },
    summary: { type: String, required: true },
    nextAction: { type: String },
    scheduledFollowUp: { type: Date }
  }],
  
  // Notifications and Alerts
  notifications: [{
    type: { 
      type: String, 
      enum: ['delay', 'milestone', 'action-required', 'customer-inquiry', 'priority-escalation'],
      required: true 
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    actionRequired: { type: Boolean, default: false },
    expiresAt: { type: Date }
  }],
  
  // Performance Metrics
  metrics: {
    daysInCurrentStage: { type: Number, default: 0 },
    totalDaysInProcess: { type: Number, default: 0 },
    customerSatisfactionScore: { type: Number, min: 1, max: 10 },
    stageEfficiency: { type: Map, of: Number }, // time spent in each stage
    communicationCount: { type: Number, default: 0 },
    lastCustomerContact: { type: Date }
  },
  
  // System Fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for better query performance
salesDealSchema.index({ 'salesPerson.id': 1, status: 1 });
salesDealSchema.index({ currentStage: 1, priority: 1 });
salesDealSchema.index({ 'timeline.estimatedCompletionDate': 1 });
salesDealSchema.index({ vin: 1 }, { unique: true });
salesDealSchema.index({ stockNumber: 1 });
salesDealSchema.index({ 'customer.name': 'text', vehicle: 'text', stockNumber: 'text' });

// Pre-save middleware to update metrics
salesDealSchema.pre('save', function(next) {
  // Update days in current stage
  if (this.stageHistory && this.stageHistory.length > 0) {
    const currentStageEntry = this.stageHistory.find(sh => 
      sh.stage === this.currentStage && !sh.exitedAt
    );
    if (currentStageEntry) {
      const now = new Date();
      const enteredAt = new Date(currentStageEntry.enteredAt);
      this.metrics.daysInCurrentStage = Math.ceil((now - enteredAt) / (1000 * 60 * 60 * 24));
    }
  }

  // Update total days in process
  if (this.timeline.purchaseDate) {
    const now = new Date();
    const startDate = new Date(this.timeline.purchaseDate);
    this.metrics.totalDaysInProcess = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  }

  // Update communication count
  this.metrics.communicationCount = this.communications ? this.communications.length : 0;

  // Update last customer contact
  if (this.customerInteractions && this.customerInteractions.length > 0) {
    const lastInteraction = this.customerInteractions[this.customerInteractions.length - 1];
    this.metrics.lastCustomerContact = lastInteraction.timestamp;
  }

  next();
});

// Virtual for progress percentage
salesDealSchema.virtual('progressPercentage').get(function() {
  const stageOrder = ['purchased', 'documentation', 'verification', 'title-processing', 'ready-to-list'];
  const currentIndex = stageOrder.indexOf(this.currentStage);
  return Math.round(((currentIndex + 1) / stageOrder.length) * 100);
});

// Virtual for timeline status
salesDealSchema.virtual('timelineStatus').get(function() {
  if (!this.timeline.estimatedCompletionDate) return 'no-estimate';
  
  const now = new Date();
  const estimated = new Date(this.timeline.estimatedCompletionDate);
  const daysUntilEstimated = Math.ceil((estimated - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilEstimated < 0) return 'overdue';
  if (daysUntilEstimated <= 1) return 'urgent';
  if (daysUntilEstimated <= 3) return 'attention';
  return 'on-track';
});

// Method to move to next stage
salesDealSchema.methods.moveToNextStage = function(newStage, notes = '') {
  // Exit current stage
  if (this.currentStage && this.stageHistory.length > 0) {
    const currentStageEntry = this.stageHistory.find(sh => 
      sh.stage === this.currentStage && !sh.exitedAt
    );
    if (currentStageEntry) {
      currentStageEntry.exitedAt = new Date();
      currentStageEntry.duration = Math.ceil(
        (currentStageEntry.exitedAt - currentStageEntry.enteredAt) / (1000 * 60 * 60)
      );
      currentStageEntry.notes = notes;
    }
  }

  // Set previous stage
  this.previousStage = this.currentStage;
  this.currentStage = newStage;

  // Add new stage entry
  this.stageHistory.push({
    stage: newStage,
    enteredAt: new Date(),
    notes: notes
  });

  return this;
};

// Method to add communication
salesDealSchema.methods.addCommunication = function(communicationData) {
  this.communications.push({
    ...communicationData,
    timestamp: new Date()
  });
  return this;
};

// Method to add customer interaction
salesDealSchema.methods.addCustomerInteraction = function(interactionData) {
  this.customerInteractions.push({
    ...interactionData,
    timestamp: new Date()
  });
  return this;
};

// Method to add sales action
salesDealSchema.methods.addSalesAction = function(actionData) {
  this.salesActions.push({
    ...actionData,
    completed: false
  });
  return this;
};

// Method to add notification
salesDealSchema.methods.addNotification = function(notificationData) {
  this.notifications.push({
    ...notificationData,
    timestamp: new Date(),
    read: false
  });
  return this;
};

// Static method to get deals with filters
salesDealSchema.statics.getDealsWithFilters = function(filters, user) {
  let query = {};

  // Filter by sales person (if not admin/manager, only show their deals)
  if (user.role === 'sales' && !user.permissions?.viewAllDeals) {
    query['salesPerson.id'] = user._id;
  } else if (filters.salesPerson) {
    query['salesPerson.id'] = filters.salesPerson;
  }

  // Search functionality
  if (filters.search) {
    query.$or = [
      { vehicle: new RegExp(filters.search, 'i') },
      { stockNumber: new RegExp(filters.search, 'i') },
      { vin: new RegExp(filters.search, 'i') },
      { 'customer.name': new RegExp(filters.search, 'i') }
    ];
  }

  // Other filters
  if (filters.stage) query.currentStage = filters.stage;
  if (filters.priority) query.priority = filters.priority;
  if (filters.status) query.status = filters.status;
  
  if (filters.dateFrom || filters.dateTo) {
    query['timeline.purchaseDate'] = {};
    if (filters.dateFrom) query['timeline.purchaseDate'].$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query['timeline.purchaseDate'].$lte = new Date(filters.dateTo);
  }

  return query;
};

module.exports = mongoose.model('SalesDeal', salesDealSchema); 