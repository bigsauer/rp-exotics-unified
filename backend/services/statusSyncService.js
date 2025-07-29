const Deal = require('../models/Deal');
const SalesDeal = require('../models/SalesDeal');

// Unified status titles
const STATUS_TITLES = [
  'contract-received',
  'docs-signed',
  'title-processing',
  'funds-disbursed',
  'title-received',
  'deal-complete'
];

const VALID_STAGES = [
  'contract-received',
  'docs-signed',
  'title-processing',
  'funds-disbursed',
  'title-received',
  'deal-complete'
];

class StatusSyncService {
  /**
   * Sync status from finance system to sales system
   */
  static async syncFinanceToSales(dealId) {
    try {
      console.log(`[STATUS SYNC] Syncing finance deal ${dealId} to sales system`);
      
      const financeDeal = await Deal.findById(dealId);
      if (!financeDeal) {
        console.log(`[STATUS SYNC] Finance deal ${dealId} not found`);
        return null;
      }

      // Find corresponding sales deal by VIN
      const salesDeal = await SalesDeal.findOne({ vin: financeDeal.vin });
      if (!salesDeal) {
        console.log(`[STATUS SYNC] No sales deal found for VIN: ${financeDeal.vin}`);
        return null;
      }

      // Use the same status title
      const unifiedStage = financeDeal.currentStage;
      if (!STATUS_TITLES.includes(unifiedStage)) {
        console.log(`[STATUS SYNC] Invalid unified stage: ${unifiedStage}`);
        return salesDeal;
      }

      // Update sales deal if stage has changed
      if (salesDeal.currentStage !== unifiedStage) {
        console.log(`[STATUS SYNC] Updating sales deal stage from '${salesDeal.currentStage}' to '${unifiedStage}'`);
        salesDeal.previousStage = salesDeal.currentStage;
        salesDeal.currentStage = unifiedStage;
        salesDeal.stageHistory = salesDeal.stageHistory || [];
        salesDeal.stageHistory.push({
          stage: unifiedStage,
          enteredAt: new Date(),
          notes: `Auto-synced from finance system: ${unifiedStage}`
        });
        await salesDeal.save();
        console.log(`[STATUS SYNC] Successfully synced finance deal ${dealId} to sales deal ${salesDeal._id}`);
        return salesDeal;
      } else {
        console.log(`[STATUS SYNC] Stages already match: ${salesDeal.currentStage}`);
      }
      return salesDeal;
    } catch (error) {
      console.error(`[STATUS SYNC] Error syncing finance to sales for deal ${dealId}:`, error);
      throw error;
    }
  }

  /**
   * Sync status from sales system to finance system
   */
  static async syncSalesToFinance(salesDealId) {
    try {
      console.log(`[STATUS SYNC] Syncing sales deal ${salesDealId} to finance system`);
      
      const salesDeal = await SalesDeal.findById(salesDealId);
      if (!salesDeal) {
        console.log(`[STATUS SYNC] Sales deal ${salesDealId} not found`);
        return null;
      }

      // Find corresponding finance deal by VIN
      const financeDeal = await Deal.findOne({ vin: salesDeal.vin });
      if (!financeDeal) {
        console.log(`[STATUS SYNC] No finance deal found for VIN: ${salesDeal.vin}`);
        return null;
      }

      // Use the same status title
      const unifiedStage = salesDeal.currentStage;
      if (!STATUS_TITLES.includes(unifiedStage)) {
        console.log(`[STATUS SYNC] Invalid unified stage: ${unifiedStage}`);
        return financeDeal;
      }

      // Update finance deal if stage has changed
      if (financeDeal.currentStage !== unifiedStage) {
        console.log(`[STATUS SYNC] Updating finance deal stage from '${financeDeal.currentStage}' to '${unifiedStage}'`);
        financeDeal.currentStage = unifiedStage;
        financeDeal.updatedAt = new Date();
        await financeDeal.save();
        console.log(`[STATUS SYNC] Successfully synced sales deal ${salesDealId} to finance deal ${financeDeal._id}`);
      }
      return financeDeal;
    } catch (error) {
      console.error(`[STATUS SYNC] Error syncing sales to finance for deal ${salesDealId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all deals between systems
   */
  static async syncAllDeals() {
    try {
      console.log('[STATUS SYNC] Starting full sync of all deals');
      
      // Get all finance deals
      const financeDeals = await Deal.find({});
      console.log(`[STATUS SYNC] Found ${financeDeals.length} finance deals`);
      
      // Get all sales deals
      const salesDeals = await SalesDeal.find({});
      console.log(`[STATUS SYNC] Found ${salesDeals.length} sales deals`);
      
      let syncCount = 0;
      
      // Sync finance to sales
      for (const financeDeal of financeDeals) {
        try {
          const synced = await this.syncFinanceToSales(financeDeal._id);
          if (synced) syncCount++;
        } catch (error) {
          console.error(`[STATUS SYNC] Error syncing finance deal ${financeDeal._id}:`, error);
        }
      }
      
      // Sync sales to finance
      for (const salesDeal of salesDeals) {
        try {
          const synced = await this.syncSalesToFinance(salesDeal._id);
          if (synced) syncCount++;
        } catch (error) {
          console.error(`[STATUS SYNC] Error syncing sales deal ${salesDeal._id}:`, error);
        }
      }
      
      console.log(`[STATUS SYNC] Full sync completed. ${syncCount} deals synchronized`);
      return syncCount;
    } catch (error) {
      console.error('[STATUS SYNC] Error during full sync:', error);
      throw error;
    }
  }

  /**
   * Get sync status for a specific deal
   */
  static async getSyncStatus(vin) {
    try {
      const financeDeal = await Deal.findOne({ vin });
      const salesDeal = await SalesDeal.findOne({ vin });
      
      if (!financeDeal && !salesDeal) {
        return { error: 'No deals found for this VIN' };
      }
      
      const status = {
        vin,
        financeDeal: financeDeal ? {
          id: financeDeal._id,
          stage: financeDeal.currentStage,
          priority: financeDeal.priority,
          lastUpdated: financeDeal.updatedAt
        } : null,
        salesDeal: salesDeal ? {
          id: salesDeal._id,
          stage: salesDeal.currentStage,
          priority: salesDeal.priority,
          lastUpdated: salesDeal.updatedAt
        } : null,
        inSync: false,
        syncIssues: []
      };
      
      if (financeDeal && salesDeal) {
        // Use unified stage directly
        status.inSync = financeDeal.currentStage === salesDeal.currentStage;
        if (!status.inSync) {
          status.syncIssues.push(`Stage mismatch: Finance (${financeDeal.currentStage}) vs Sales (${salesDeal.currentStage})`);
          if (financeDeal.priority !== salesDeal.priority) {
            status.syncIssues.push(`Priority mismatch: Finance (${financeDeal.priority}) vs Sales (${salesDeal.priority})`);
          }
        }
      } else {
        status.syncIssues.push('Deal exists in only one system');
      }
      
      return status;
    } catch (error) {
      console.error(`[STATUS SYNC] Error getting sync status for VIN ${vin}:`, error);
      throw error;
    }
  }

  /**
   * Sync a specific deal by VIN
   */
  static async syncDealByVin(vin, direction = 'both') {
    try {
      console.log(`[STATUS SYNC] Syncing deal by VIN: ${vin}, direction: ${direction}`);
      
      const financeDeal = await Deal.findOne({ vin });
      const salesDeal = await SalesDeal.findOne({ vin });
      
      if (!financeDeal && !salesDeal) {
        throw new Error(`No deals found for VIN: ${vin}`);
      }
      
      let syncResults = {
        vin,
        financeToSales: null,
        salesToFinance: null,
        success: false
      };
      
      // Sync finance to sales
      if ((direction === 'both' || direction === 'finance-to-sales') && financeDeal && salesDeal) {
        try {
          syncResults.financeToSales = await this.syncFinanceToSales(financeDeal._id);
        } catch (error) {
          console.error(`[STATUS SYNC] Error syncing finance to sales for VIN ${vin}:`, error);
        }
      }
      
      // Sync sales to finance
      if ((direction === 'both' || direction === 'sales-to-finance') && financeDeal && salesDeal) {
        try {
          syncResults.salesToFinance = await this.syncSalesToFinance(salesDeal._id);
        } catch (error) {
          console.error(`[STATUS SYNC] Error syncing sales to finance for VIN ${vin}:`, error);
        }
      }
      
      syncResults.success = syncResults.financeToSales || syncResults.salesToFinance;
      
      return syncResults;
    } catch (error) {
      console.error(`[STATUS SYNC] Error syncing deal by VIN ${vin}:`, error);
      throw error;
    }
  }
}

module.exports = StatusSyncService; 