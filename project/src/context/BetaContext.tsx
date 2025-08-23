import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BetaUser {
  id: string;
  email: string;
  username: string;
  inviteCode?: string;
  betaAccessLevel: 'basic' | 'premium' | 'advanced';
  betaJoinDate: string;
  betaFeatures: string[];
  isEarlyAccess: boolean;
}

interface BetaFeatureFlags {
  // New AI Effects
  advancedEffects: boolean;
  experimentalEffects: boolean;
  customWorkflows: boolean;
  
  // UI/UX Features
  newMobileInterface: boolean;
  enhancedImageUploader: boolean;
  betaOnboarding: boolean;
  
  // Community Features
  betaCommunity: boolean;
  privateGallery: boolean;
  betaFeedback: boolean;
  
  // Performance Features
  fasterProcessing: boolean;
  batchProcessing: boolean;
  
  // Analytics & Monitoring
  betaAnalytics: boolean;
  performanceInsights: boolean;
}

interface BetaStats {
  totalBetaUsers: number;
  activeThisWeek: number;
  feedbackSubmitted: number;
  averageSessionLength: number;
  topUsedFeatures: string[];
}

interface BetaContextType {
  // Beta User State
  isBetaUser: boolean;
  betaUser: BetaUser | null;
  betaAccessLevel: 'basic' | 'premium' | 'advanced' | null;
  
  // Feature Flags
  featureFlags: BetaFeatureFlags;
  isFeatureEnabled: (feature: keyof BetaFeatureFlags) => boolean;
  
  // Beta Actions
  joinBeta: (inviteCode: string, userInfo: Partial<BetaUser>) => Promise<boolean>;
  leaveBeta: () => Promise<boolean>;
  submitBetaFeedback: (feedback: string, category: string, rating: number) => Promise<boolean>;
  
  // Beta Stats & Analytics
  betaStats: BetaStats;
  trackBetaEvent: (eventName: string, properties?: Record<string, any>) => void;
  analytics: {
    trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  };
  
  // User Access
  userAccess: {
    accessLevel: 'basic' | 'premium' | 'advanced';
  } | null;
  
  // Beta UI State
  showBetaBadge: boolean;
  betaOnboardingStep: number;
  completeBetaOnboarding: () => void;
  
  // Loading States
  loading: boolean;
  error: string | null;
}

const defaultBetaFeatureFlags: BetaFeatureFlags = {
  // AI Effects
  advancedEffects: true,
  experimentalEffects: false,
  customWorkflows: false,
  
  // UI/UX
  newMobileInterface: true,
  enhancedImageUploader: true,
  betaOnboarding: true,
  
  // Community
  betaCommunity: true,
  privateGallery: false,
  betaFeedback: true,
  
  // Performance
  fasterProcessing: true,
  batchProcessing: false,
  
  // Analytics
  betaAnalytics: true,
  performanceInsights: false,
};

const defaultBetaStats: BetaStats = {
  totalBetaUsers: 0,
  activeThisWeek: 0,
  feedbackSubmitted: 0,
  averageSessionLength: 0,
  topUsedFeatures: [],
};

const BetaContext = createContext<BetaContextType | undefined>(undefined);

export const useBeta = (): BetaContextType => {
  const context = useContext(BetaContext);
  if (!context) {
    throw new Error('useBeta must be used within a BetaProvider');
  }
  return context;
};

interface BetaProviderProps {
  children: ReactNode;
}

export const BetaProvider: React.FC<BetaProviderProps> = ({ children }) => {
  const [isBetaUser, setIsBetaUser] = useState<boolean>(false);
  const [betaUser, setBetaUser] = useState<BetaUser | null>(null);
  const [betaAccessLevel, setBetaAccessLevel] = useState<'basic' | 'premium' | 'advanced' | null>(null);
  const [featureFlags, setFeatureFlags] = useState<BetaFeatureFlags>(defaultBetaFeatureFlags);
  const [betaStats, setBetaStats] = useState<BetaStats>(defaultBetaStats);
  const [showBetaBadge, setShowBetaBadge] = useState<boolean>(false);
  const [betaOnboardingStep, setBetaOnboardingStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // User access object
  const userAccess = betaUser ? {
    accessLevel: betaUser.betaAccessLevel
  } : null;

  // Initialize beta state from localStorage
  useEffect(() => {
    const initializeBetaState = () => {
      try {
        // Check for beta user data in localStorage
        const storedBetaUser = localStorage.getItem('cosnap_beta_user');
        const storedFeatureFlags = localStorage.getItem('cosnap_beta_features');
        const storedOnboardingStep = localStorage.getItem('cosnap_beta_onboarding');

        if (storedBetaUser) {
          const userData = JSON.parse(storedBetaUser);
          setBetaUser(userData);
          setIsBetaUser(true);
          setBetaAccessLevel(userData.betaAccessLevel || 'basic');
          setShowBetaBadge(true);
        }

        if (storedFeatureFlags) {
          const flags = JSON.parse(storedFeatureFlags);
          setFeatureFlags({ ...defaultBetaFeatureFlags, ...flags });
        }

        if (storedOnboardingStep) {
          setBetaOnboardingStep(parseInt(storedOnboardingStep, 10));
        }

        // Fetch beta stats if user is beta
        if (storedBetaUser) {
          fetchBetaStats();
        }
      } catch (error) {
        console.error('Error initializing beta state:', error);
      }
    };

    initializeBetaState();
  }, []);

  // Fetch beta stats from backend
  const fetchBetaStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/beta/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const stats = await response.json();
        setBetaStats(stats);
      }
    } catch (error) {
      console.warn('Could not fetch beta stats:', error);
    }
  };

  // Check if a feature is enabled
  const isFeatureEnabled = (feature: keyof BetaFeatureFlags): boolean => {
    if (!isBetaUser) return false;
    return featureFlags[feature] || false;
  };

  // Join beta program
  const joinBeta = async (inviteCode: string, userInfo: Partial<BetaUser>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/beta/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode,
          ...userInfo,
        }),
      });

      if (response.ok) {
        const betaUserData = await response.json();
        
        // Update state
        setBetaUser(betaUserData);
        setIsBetaUser(true);
        setBetaAccessLevel(betaUserData.betaAccessLevel || 'basic');
        setShowBetaBadge(true);
        setBetaOnboardingStep(1); // Start onboarding
        
        // Update feature flags based on access level
        updateFeatureFlagsForAccessLevel(betaUserData.betaAccessLevel || 'basic');
        
        // Store in localStorage
        localStorage.setItem('cosnap_beta_user', JSON.stringify(betaUserData));
        localStorage.setItem('cosnap_beta_onboarding', '1');
        
        // Track beta join event
        trackBetaEvent('beta_joined', {
          access_level: betaUserData.betaAccessLevel,
          invite_code: inviteCode,
        });

        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join beta program');
        return false;
      }
    } catch (error) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Leave beta program
  const leaveBeta = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/beta/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Reset beta state
        setBetaUser(null);
        setIsBetaUser(false);
        setBetaAccessLevel(null);
        setShowBetaBadge(false);
        setBetaOnboardingStep(0);
        setFeatureFlags(defaultBetaFeatureFlags);
        
        // Clear localStorage
        localStorage.removeItem('cosnap_beta_user');
        localStorage.removeItem('cosnap_beta_features');
        localStorage.removeItem('cosnap_beta_onboarding');
        
        // Track beta leave event
        trackBetaEvent('beta_left');

        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to leave beta program');
        return false;
      }
    } catch (error) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Submit beta feedback
  const submitBetaFeedback = async (feedback: string, category: string, rating: number): Promise<boolean> => {
    if (!isBetaUser) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/beta/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback,
          category,
          rating,
          user_id: betaUser?.id,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Track feedback submission
        trackBetaEvent('beta_feedback_submitted', {
          category,
          rating,
          feedback_length: feedback.length,
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error submitting beta feedback:', error);
      return false;
    }
  };

  // Update feature flags based on access level
  const updateFeatureFlagsForAccessLevel = (accessLevel: 'basic' | 'premium' | 'advanced') => {
    let flags = { ...defaultBetaFeatureFlags };

    switch (accessLevel) {
      case 'advanced':
        flags = {
          ...flags,
          experimentalEffects: true,
          customWorkflows: true,
          privateGallery: true,
          batchProcessing: true,
          performanceInsights: true,
        };
        break;
      case 'premium':
        flags = {
          ...flags,
          customWorkflows: false,
          privateGallery: true,
          batchProcessing: false,
          performanceInsights: false,
        };
        break;
      case 'basic':
      default:
        // Use default flags
        break;
    }

    setFeatureFlags(flags);
    localStorage.setItem('cosnap_beta_features', JSON.stringify(flags));
  };

  // Track beta events
  const trackBetaEvent = (eventName: string, properties?: Record<string, any>) => {
    try {
      // Send to analytics if available
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track(`Beta: ${eventName}`, {
          user_id: betaUser?.id,
          access_level: betaAccessLevel,
          ...properties,
        });
      }

      // Store locally for debugging
      const betaEvents = JSON.parse(localStorage.getItem('cosnap_beta_events') || '[]');
      betaEvents.push({
        event: eventName,
        properties,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 100 events
      if (betaEvents.length > 100) {
        betaEvents.splice(0, betaEvents.length - 100);
      }
      
      localStorage.setItem('cosnap_beta_events', JSON.stringify(betaEvents));
    } catch (error) {
      console.warn('Could not track beta event:', error);
    }
  };

  // Complete beta onboarding
  const completeBetaOnboarding = () => {
    setBetaOnboardingStep(0);
    localStorage.removeItem('cosnap_beta_onboarding');
    
    trackBetaEvent('beta_onboarding_completed', {
      completion_time: Date.now(),
    });
  };

  // Analytics object to match component expectations (defined after trackBetaEvent)
  const analytics = {
    trackEvent: trackBetaEvent
  };

  const value: BetaContextType = {
    // State
    isBetaUser,
    betaUser,
    betaAccessLevel,
    
    // Feature Flags
    featureFlags,
    isFeatureEnabled,
    
    // Actions
    joinBeta,
    leaveBeta,
    submitBetaFeedback,
    
    // Stats & Analytics
    betaStats,
    trackBetaEvent,
    analytics,
    
    // User Access
    userAccess,
    
    // UI State
    showBetaBadge,
    betaOnboardingStep,
    completeBetaOnboarding,
    
    // Loading States
    loading,
    error,
  };

  return <BetaContext.Provider value={value}>{children}</BetaContext.Provider>;
};

export default BetaProvider;