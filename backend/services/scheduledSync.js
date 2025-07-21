const StatusSyncService = require('./statusSyncService');

class ScheduledSync {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncIntervalMinutes = 5; // Sync every 5 minutes
  }

  /**
   * Start the scheduled sync
   */
  start() {
    if (this.syncInterval) {
      console.log('[SCHEDULED SYNC] Already running');
      return;
    }

    console.log(`[SCHEDULED SYNC] Starting scheduled sync every ${this.syncIntervalMinutes} minutes`);
    
    this.syncInterval = setInterval(async () => {
      await this.runSync();
    }, this.syncIntervalMinutes * 60 * 1000);

    // Run initial sync
    this.runSync();
  }

  /**
   * Stop the scheduled sync
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SCHEDULED SYNC] Stopped');
    }
  }

  /**
   * Run a sync cycle
   */
  async runSync() {
    if (this.isRunning) {
      console.log('[SCHEDULED SYNC] Sync already in progress, skipping');
      return;
    }

    try {
      this.isRunning = true;
      console.log('[SCHEDULED SYNC] Starting sync cycle...');
      
      const startTime = Date.now();
      const syncCount = await StatusSyncService.syncAllDeals();
      const duration = Date.now() - startTime;
      
      this.lastSyncTime = new Date();
      
      console.log(`[SCHEDULED SYNC] Sync completed in ${duration}ms. ${syncCount} deals synchronized.`);
      
    } catch (error) {
      console.error('[SCHEDULED SYNC] Error during sync cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncIntervalMinutes: this.syncIntervalMinutes,
      isActive: !!this.syncInterval
    };
  }

  /**
   * Update sync interval
   */
  updateInterval(minutes) {
    this.syncIntervalMinutes = minutes;
    
    if (this.syncInterval) {
      // Restart with new interval
      this.stop();
      this.start();
    }
  }
}

// Create singleton instance
const scheduledSync = new ScheduledSync();

module.exports = scheduledSync; 