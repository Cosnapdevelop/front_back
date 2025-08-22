/**
 * Conversion funnel tracking system for AI effects usage
 * Tracks user journey from effect discovery to completion
 */

import { trackEvent, trackConversion, trackFeatureUsage } from './analytics';

// Funnel step definitions
export enum FunnelStep {
  EFFECT_DISCOVERED = 'effect_discovered',
  EFFECT_VIEWED = 'effect_viewed',
  EFFECT_STARTED = 'effect_started',
  IMAGE_UPLOADED = 'image_uploaded',
  PARAMETERS_SET = 'parameters_set',
  PROCESSING_STARTED = 'processing_started',
  PROCESSING_COMPLETED = 'processing_completed',
  RESULT_DOWNLOADED = 'result_downloaded',
  RESULT_SHARED = 'result_shared',
}

// User actions that indicate engagement
export enum EngagementAction {
  BROWSE_EFFECTS = 'browse_effects',
  SEARCH_EFFECTS = 'search_effects',
  FILTER_EFFECTS = 'filter_effects',
  LIKE_EFFECT = 'like_effect',
  BOOKMARK_EFFECT = 'bookmark_effect',
  SHARE_EFFECT = 'share_effect',
  RATE_RESULT = 'rate_result',
  CREATE_ACCOUNT = 'create_account',
  SUBSCRIBE = 'subscribe',
}

interface FunnelEvent {
  step: FunnelStep;
  effectId?: string;
  effectType?: 'webapp' | 'comfyui';
  sessionId: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface EngagementEvent {
  action: EngagementAction;
  effectId?: string;
  sessionId: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class ConversionFunnelTracker {
  private sessionId: string;
  private userId?: string;
  private currentFunnelSession: Map<string, FunnelEvent[]> = new Map();
  private engagementEvents: EngagementEvent[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking() {
    // Track session start
    trackEvent({
      action: 'funnel_session_started',
      category: 'conversion_funnel',
      custom_parameters: {
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  public setUserId(userId: string) {
    this.userId = userId;
    trackEvent({
      action: 'funnel_user_identified',
      category: 'conversion_funnel',
      custom_parameters: {
        user_id: userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * Track a funnel step for a specific effect
   */
  public trackFunnelStep(
    step: FunnelStep,
    effectId: string,
    effectType: 'webapp' | 'comfyui' = 'webapp',
    metadata?: Record<string, any>
  ) {
    const event: FunnelEvent = {
      step,
      effectId,
      effectType,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      metadata,
    };

    // Store in current session
    if (!this.currentFunnelSession.has(effectId)) {
      this.currentFunnelSession.set(effectId, []);
    }
    this.currentFunnelSession.get(effectId)!.push(event);

    // Track in analytics
    trackEvent({
      action: step,
      category: 'conversion_funnel',
      label: effectType,
      custom_parameters: {
        effect_id: effectId,
        effect_type: effectType,
        session_id: this.sessionId,
        user_id: this.userId,
        step_index: this.getFunnelStepIndex(step),
        funnel_progress: this.calculateFunnelProgress(effectId),
        ...metadata,
      }
    });

    // Track feature usage
    trackFeatureUsage(`funnel_${step}`, 'completed');

    // Check for conversion milestones
    this.checkConversionMilestones(effectId, step);

    // Calculate abandonment risk
    this.calculateAbandonmentRisk(effectId);
  }

  /**
   * Track engagement actions
   */
  public trackEngagement(
    action: EngagementAction,
    effectId?: string,
    metadata?: Record<string, any>
  ) {
    const event: EngagementEvent = {
      action,
      effectId,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      metadata,
    };

    this.engagementEvents.push(event);

    // Track in analytics
    trackEvent({
      action,
      category: 'user_engagement',
      label: effectId ? `effect_${effectId}` : 'general',
      custom_parameters: {
        effect_id: effectId,
        session_id: this.sessionId,
        user_id: this.userId,
        engagement_score: this.calculateEngagementScore(),
        ...metadata,
      }
    });

    trackFeatureUsage(`engagement_${action}`, 'clicked');
  }

  /**
   * Get funnel step index for ordering
   */
  private getFunnelStepIndex(step: FunnelStep): number {
    const stepOrder = [
      FunnelStep.EFFECT_DISCOVERED,
      FunnelStep.EFFECT_VIEWED,
      FunnelStep.EFFECT_STARTED,
      FunnelStep.IMAGE_UPLOADED,
      FunnelStep.PARAMETERS_SET,
      FunnelStep.PROCESSING_STARTED,
      FunnelStep.PROCESSING_COMPLETED,
      FunnelStep.RESULT_DOWNLOADED,
      FunnelStep.RESULT_SHARED,
    ];
    return stepOrder.indexOf(step);
  }

  /**
   * Calculate funnel progress as percentage
   */
  private calculateFunnelProgress(effectId: string): number {
    const events = this.currentFunnelSession.get(effectId) || [];
    if (events.length === 0) return 0;

    const maxStepIndex = Math.max(...events.map(e => this.getFunnelStepIndex(e.step)));
    const totalSteps = Object.values(FunnelStep).length;
    return Math.round((maxStepIndex / (totalSteps - 1)) * 100);
  }

  /**
   * Check for conversion milestones and track them
   */
  private checkConversionMilestones(effectId: string, step: FunnelStep) {
    switch (step) {
      case FunnelStep.EFFECT_STARTED:
        trackConversion('trial_started', 1);
        break;
      case FunnelStep.PROCESSING_COMPLETED:
        trackConversion('effect_completed', 1);
        break;
      case FunnelStep.RESULT_DOWNLOADED:
        trackConversion('result_obtained', 1);
        break;
      case FunnelStep.RESULT_SHARED:
        trackConversion('content_shared', 1);
        break;
    }
  }

  /**
   * Calculate engagement score based on user actions
   */
  private calculateEngagementScore(): number {
    const actionWeights = {
      [EngagementAction.BROWSE_EFFECTS]: 1,
      [EngagementAction.SEARCH_EFFECTS]: 2,
      [EngagementAction.FILTER_EFFECTS]: 2,
      [EngagementAction.LIKE_EFFECT]: 3,
      [EngagementAction.BOOKMARK_EFFECT]: 4,
      [EngagementAction.SHARE_EFFECT]: 5,
      [EngagementAction.RATE_RESULT]: 4,
      [EngagementAction.CREATE_ACCOUNT]: 10,
      [EngagementAction.SUBSCRIBE]: 15,
    };

    return this.engagementEvents.reduce((score, event) => {
      return score + (actionWeights[event.action] || 1);
    }, 0);
  }

  /**
   * Calculate abandonment risk for an effect
   */
  private calculateAbandonmentRisk(effectId: string): 'low' | 'medium' | 'high' {
    const events = this.currentFunnelSession.get(effectId) || [];
    if (events.length === 0) return 'high';

    const lastEvent = events[events.length - 1];
    const timeSinceLastEvent = Date.now() - lastEvent.timestamp;
    const currentProgress = this.calculateFunnelProgress(effectId);

    // High risk if no activity for 5 minutes and low progress
    if (timeSinceLastEvent > 300000 && currentProgress < 30) {
      trackEvent({
        action: 'abandonment_risk_high',
        category: 'conversion_funnel',
        custom_parameters: {
          effect_id: effectId,
          session_id: this.sessionId,
          time_since_last_event: timeSinceLastEvent,
          current_progress: currentProgress,
        }
      });
      return 'high';
    }

    // Medium risk if stuck on same step for 2 minutes
    if (timeSinceLastEvent > 120000 && currentProgress < 70) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get funnel analytics summary
   */
  public getFunnelSummary() {
    const summary = {
      sessionId: this.sessionId,
      userId: this.userId,
      totalEffectsExplored: this.currentFunnelSession.size,
      engagementScore: this.calculateEngagementScore(),
      avgFunnelProgress: 0,
      completedFunnels: 0,
      abandonedFunnels: 0,
    };

    // Calculate averages
    const progressValues = Array.from(this.currentFunnelSession.keys()).map(effectId => 
      this.calculateFunnelProgress(effectId)
    );

    summary.avgFunnelProgress = progressValues.length > 0 
      ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
      : 0;

    summary.completedFunnels = progressValues.filter(p => p >= 80).length;
    summary.abandonedFunnels = progressValues.filter(p => p < 30).length;

    return summary;
  }

  /**
   * Track funnel completion rate by effect type
   */
  public trackCompletionRate() {
    const summary = this.getFunnelSummary();
    
    trackEvent({
      action: 'funnel_summary',
      category: 'conversion_analytics',
      custom_parameters: {
        ...summary,
        completion_rate: summary.totalEffectsExplored > 0 
          ? (summary.completedFunnels / summary.totalEffectsExplored) * 100 
          : 0,
        abandonment_rate: summary.totalEffectsExplored > 0 
          ? (summary.abandonedFunnels / summary.totalEffectsExplored) * 100 
          : 0,
      }
    });
  }
}

// Create singleton instance
const conversionFunnel = new ConversionFunnelTracker();

// Export tracking functions
export const trackFunnelStep = (
  step: FunnelStep,
  effectId: string,
  effectType: 'webapp' | 'comfyui' = 'webapp',
  metadata?: Record<string, any>
) => conversionFunnel.trackFunnelStep(step, effectId, effectType, metadata);

export const trackEngagementAction = (
  action: EngagementAction,
  effectId?: string,
  metadata?: Record<string, any>
) => conversionFunnel.trackEngagement(action, effectId, metadata);

export const setFunnelUserId = (userId: string) => conversionFunnel.setUserId(userId);

export const getFunnelSummary = () => conversionFunnel.getFunnelSummary();

export const trackFunnelCompletionRate = () => conversionFunnel.trackCompletionRate();

export default conversionFunnel;