import { BaseError, ErrorCode, ErrorSeverity } from '../types/errors';

interface OfflineAction {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  dependencies?: string[];
  expiresAt?: number;
}

interface OfflineCapability {
  features: {
    viewHistory: boolean;
    editProfile: boolean;
    saveDrafts: boolean;
    cacheResults: boolean;
    queueActions: boolean;
    offlineMode: boolean;
  };
  syncStrategies: {
    immediate: string[];
    batch: string[];
    manual: string[];
  };
  storage: {
    maxSize: number;
    currentSize: number;
    cleanupThreshold: number;
  };
}

interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    actionId: string;
    error: Error;
  }>;
}

class OfflineManager {
  private isOnline: boolean = navigator.onLine;
  private pendingActions: Map<string, OfflineAction> = new Map();
  private offlineData: Map<string, any> = new Map();
  private syncInProgress: boolean = false;
  private lastSyncTime: number = 0;
  private syncListeners: Array<(result: SyncResult) => void> = [];
  private statusListeners: Array<(isOnline: boolean) => void> = [];
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  
  private readonly STORAGE_KEYS = {
    PENDING_ACTIONS: 'offline_pending_actions',
    OFFLINE_DATA: 'offline_data',
    LAST_SYNC: 'offline_last_sync'
  };
  
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB
  
  constructor() {
    this.init();
  }
  
  private async init(): Promise<void> {
    // Set up network event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Load persisted data
    await this.loadPersistedData();
    
    // Register service worker for offline functionality
    await this.registerServiceWorker();
    
    // Set up periodic sync
    this.setupPeriodicSync();
    
    console.log('[OfflineManager] Initialized', {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.size,
      hasServiceWorker: !!this.serviceWorkerRegistration
    });
  }
  
  private async loadPersistedData(): Promise<void> {
    try {
      // Load pending actions
      const pendingActionsData = localStorage.getItem(this.STORAGE_KEYS.PENDING_ACTIONS);
      if (pendingActionsData) {
        const actions = JSON.parse(pendingActionsData);
        this.pendingActions = new Map(Object.entries(actions));
      }
      
      // Load offline data
      const offlineData = localStorage.getItem(this.STORAGE_KEYS.OFFLINE_DATA);
      if (offlineData) {
        const data = JSON.parse(offlineData);
        this.offlineData = new Map(Object.entries(data));
      }
      
      // Load last sync time
      const lastSync = localStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      if (lastSync) {
        this.lastSyncTime = parseInt(lastSync, 10);
      }
    } catch (error) {
      console.error('[OfflineManager] Failed to load persisted data:', error);
    }
  }
  
  private async persistData(): Promise<void> {
    try {
      // Persist pending actions
      const actionsObj = Object.fromEntries(this.pendingActions);
      localStorage.setItem(this.STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(actionsObj));
      
      // Persist offline data (with size limit)
      const dataObj = Object.fromEntries(this.offlineData);
      const dataSize = new Blob([JSON.stringify(dataObj)]).size;
      
      if (dataSize <= this.MAX_STORAGE_SIZE) {
        localStorage.setItem(this.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(dataObj));
      } else {
        await this.cleanupOfflineData();
      }
      
      // Persist last sync time
      localStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, this.lastSyncTime.toString());
    } catch (error) {
      console.error('[OfflineManager] Failed to persist data:', error);
    }
  }
  
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.serviceWorkerRegistration = registration;
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        
        console.log('[OfflineManager] Service worker registered successfully');
      } catch (error) {
        console.error('[OfflineManager] Service worker registration failed:', error);
      }
    }
  }
  
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        console.log('[OfflineManager] Cache updated:', data);
        break;
      case 'BACKGROUND_SYNC':
        this.syncPendingActions();
        break;
      default:
        console.log('[OfflineManager] Unknown service worker message:', type, data);
    }
  }
  
  private setupPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline && this.pendingActions.size > 0 && !this.syncInProgress) {
        this.syncPendingActions();
      }
    }, this.SYNC_INTERVAL);
  }
  
  private handleOnline(): void {
    this.isOnline = true;
    console.log('[OfflineManager] Network connection restored');
    
    // Notify listeners
    this.statusListeners.forEach(listener => listener(true));
    
    // Trigger sync if we have pending actions
    if (this.pendingActions.size > 0) {
      setTimeout(() => this.syncPendingActions(), 1000);
    }
  }
  
  private handleOffline(): void {
    this.isOnline = false;
    console.log('[OfflineManager] Network connection lost');
    
    // Notify listeners
    this.statusListeners.forEach(listener => listener(false));
  }
  
  public async handleOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'nextRetryAt'>): Promise<{
    success: boolean;
    actionId?: string;
    message: string;
    estimatedSync?: string;
  }> {
    if (this.isOnline && this.canExecuteOnline(action.type)) {
      // Try to execute immediately if online
      try {
        const result = await this.executeOnline(action);
        return {
          success: true,
          message: 'Action completed successfully'
        };
      } catch (error) {
        console.warn('[OfflineManager] Online execution failed, queuing for later:', error);
        // Fall through to offline handling
      }
    }
    
    // Check if action can be handled offline
    if (this.canHandleOffline(action.type)) {
      try {
        const result = await this.executeOffline(action);
        const actionId = this.queueForSync(action);
        
        return {
          success: true,
          actionId,
          message: 'Action saved locally and will sync when online',
          estimatedSync: this.getEstimatedSyncTime()
        };
      } catch (error) {
        throw new BaseError(
          `Failed to handle offline action: ${error.message}`,
          ErrorCode.STORAGE_ERROR,
          ErrorSeverity.MEDIUM,
          true
        );
      }
    }
    
    // Queue action for when online
    const actionId = this.queueForLater(action);
    
    return {
      success: false,
      actionId,
      message: 'Action will be completed when you\'re back online',
      estimatedSync: this.getEstimatedSyncTime()
    };
  }
  
  private canExecuteOnline(actionType: string): boolean {
    // Always try online execution for these actions
    const onlinePreferredActions = [
      'ai_processing',
      'payment',
      'auth_login',
      'auth_register'
    ];
    
    return onlinePreferredActions.includes(actionType);
  }
  
  private canHandleOffline(actionType: string): boolean {
    const offlineCapableActions = [
      'save_draft',
      'bookmark_effect',
      'rate_result',
      'edit_profile',
      'view_history',
      'delete_result',
      'update_settings',
      'add_favorite'
    ];
    
    return offlineCapableActions.includes(actionType);
  }
  
  private async executeOnline(action: any): Promise<any> {
    // This would execute the action via network request
    // Implementation depends on the specific action type
    
    switch (action.type) {
      case 'ai_processing':
        return this.executeAIProcessing(action.data);
      case 'save_draft':
        return this.saveDraftOnline(action.data);
      default:
        throw new Error(`Unknown action type for online execution: ${action.type}`);
    }
  }
  
  private async executeOffline(action: any): Promise<any> {
    switch (action.type) {
      case 'save_draft':
        return this.saveDraftOffline(action.data);
      case 'bookmark_effect':
        return this.bookmarkEffectOffline(action.data);
      case 'edit_profile':
        return this.editProfileOffline(action.data);
      case 'rate_result':
        return this.rateResultOffline(action.data);
      default:
        throw new Error(`Action type ${action.type} cannot be handled offline`);
    }
  }
  
  private queueForSync(action: any): string {
    const offlineAction: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3,
      nextRetryAt: Date.now(),
      ...action
    };
    
    this.pendingActions.set(offlineAction.id, offlineAction);
    this.persistData();
    
    return offlineAction.id;
  }
  
  private queueForLater(action: any): string {
    const offlineAction: OfflineAction = {
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 5,
      nextRetryAt: Date.now() + 60000, // Retry in 1 minute
      priority: action.priority || 'normal',
      ...action
    };
    
    this.pendingActions.set(offlineAction.id, offlineAction);
    this.persistData();
    
    return offlineAction.id;
  }
  
  public async syncPendingActions(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: []
      };
    }
    
    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    };
    
    try {
      const now = Date.now();
      const actionsToSync = Array.from(this.pendingActions.values())
        .filter(action => action.nextRetryAt <= now)
        .sort((a, b) => {
          // Sort by priority and timestamp
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
          const aPriority = priorityOrder[a.priority] || 2;
          const bPriority = priorityOrder[b.priority] || 2;
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          
          return a.timestamp - b.timestamp;
        });
      
      console.log(`[OfflineManager] Syncing ${actionsToSync.length} pending actions`);
      
      for (const action of actionsToSync) {
        try {
          await this.syncAction(action);
          this.pendingActions.delete(action.id);
          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            actionId: action.id,
            error: error instanceof Error ? error : new Error(String(error))
          });
          
          // Update retry information
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            console.warn(`[OfflineManager] Action ${action.id} exceeded max retries, removing`);
            this.pendingActions.delete(action.id);
          } else {
            // Exponential backoff
            const backoffDelay = Math.min(30000 * Math.pow(2, action.retryCount), 300000); // Max 5 minutes
            action.nextRetryAt = now + backoffDelay;
            this.pendingActions.set(action.id, action);
          }
        }
      }
      
      this.lastSyncTime = now;
      await this.persistData();
      
      if (result.failed > 0) {
        result.success = false;
      }
      
    } catch (error) {
      console.error('[OfflineManager] Sync failed:', error);
      result.success = false;
    } finally {
      this.syncInProgress = false;
    }
    
    // Notify listeners
    this.syncListeners.forEach(listener => listener(result));
    
    return result;
  }
  
  private async syncAction(action: OfflineAction): Promise<void> {
    console.log(`[OfflineManager] Syncing action ${action.id} (${action.type})`);
    
    // Check dependencies
    if (action.dependencies) {
      for (const depId of action.dependencies) {
        if (this.pendingActions.has(depId)) {
          throw new Error(`Dependency ${depId} not yet synced`);
        }
      }
    }
    
    // Check expiration
    if (action.expiresAt && Date.now() > action.expiresAt) {
      throw new Error('Action expired');
    }
    
    await this.executeOnline(action);
  }
  
  // Offline execution methods
  private async saveDraftOffline(data: any): Promise<any> {
    const draftId = data.id || `draft_${Date.now()}`;
    this.offlineData.set(`draft_${draftId}`, {
      ...data,
      savedAt: Date.now(),
      offline: true
    });
    return { success: true, id: draftId };
  }
  
  private async bookmarkEffectOffline(data: any): Promise<any> {
    const bookmarks = this.offlineData.get('bookmarks') || [];
    bookmarks.push({
      ...data,
      bookmarkedAt: Date.now(),
      offline: true
    });
    this.offlineData.set('bookmarks', bookmarks);
    return { success: true };
  }
  
  private async editProfileOffline(data: any): Promise<any> {
    const currentProfile = this.offlineData.get('profile') || {};
    const updatedProfile = {
      ...currentProfile,
      ...data,
      lastModified: Date.now(),
      offline: true
    };
    this.offlineData.set('profile', updatedProfile);
    return { success: true, profile: updatedProfile };
  }
  
  private async rateResultOffline(data: any): Promise<any> {
    const ratings = this.offlineData.get('ratings') || {};
    ratings[data.resultId] = {
      rating: data.rating,
      ratedAt: Date.now(),
      offline: true
    };
    this.offlineData.set('ratings', ratings);
    return { success: true };
  }
  
  // Online execution methods (simplified)
  private async executeAIProcessing(data: any): Promise<any> {
    // This would make actual API call
    const response = await fetch('/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async saveDraftOnline(data: any): Promise<any> {
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save draft: ${response.status}`);
    }
    
    return response.json();
  }
  
  // Utility methods
  private getEstimatedSyncTime(): string {
    if (this.isOnline) {
      return 'Next sync in 30 seconds';
    }
    
    return 'Will sync when back online';
  }
  
  private async cleanupOfflineData(): Promise<void> {
    // Remove oldest data to free up space
    const entries = Array.from(this.offlineData.entries());
    entries.sort((a, b) => {
      const aTime = (a[1] as any)?.timestamp || 0;
      const bTime = (b[1] as any)?.timestamp || 0;
      return aTime - bTime;
    });
    
    // Remove oldest 25% of entries
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.25));
    toRemove.forEach(([key]) => this.offlineData.delete(key));
    
    console.log(`[OfflineManager] Cleaned up ${toRemove.length} old offline data entries`);
  }
  
  // Public API methods
  public isOnlineStatus(): boolean {
    return this.isOnline;
  }
  
  public getPendingActionsCount(): number {
    return this.pendingActions.size;
  }
  
  public getOfflineData(key: string): any {
    return this.offlineData.get(key);
  }
  
  public setOfflineData(key: string, value: any): void {
    this.offlineData.set(key, value);
    this.persistData();
  }
  
  public clearOfflineData(): void {
    this.offlineData.clear();
    this.persistData();
  }
  
  public onSync(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }
  
  public onStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }
  
  public getCapabilities(): OfflineCapability {
    const currentSize = new Blob([JSON.stringify(Object.fromEntries(this.offlineData))]).size;
    
    return {
      features: {
        viewHistory: true,
        editProfile: true,
        saveDrafts: true,
        cacheResults: true,
        queueActions: true,
        offlineMode: !!this.serviceWorkerRegistration
      },
      syncStrategies: {
        immediate: ['ai_processing', 'payment'],
        batch: ['save_draft', 'bookmark_effect'],
        manual: ['edit_profile', 'update_settings']
      },
      storage: {
        maxSize: this.MAX_STORAGE_SIZE,
        currentSize,
        cleanupThreshold: this.MAX_STORAGE_SIZE * 0.8
      }
    };
  }
  
  public async forcSync(): Promise<SyncResult> {
    return this.syncPendingActions();
  }
  
  public cancelAction(actionId: string): boolean {
    return this.pendingActions.delete(actionId);
  }
  
  public getActionStatus(actionId: string): OfflineAction | undefined {
    return this.pendingActions.get(actionId);
  }
}

// Create and export singleton instance
export const offlineManager = new OfflineManager();

export default offlineManager;