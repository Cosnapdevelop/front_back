/**
 * Enhanced user progress tracking hook for Day 3 Sprint
 * Tracks user milestones, provides personalized guidance, and supports beta onboarding
 */

import { useState, useEffect, useCallback } from 'react';
import { trackFeatureUsage, trackConversion } from '../utils/analytics';
import { useAuth } from '../context/AuthContext';
import { useBeta } from '../context/BetaContext';

export interface UserMilestone {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'engagement' | 'mastery' | 'social';
  completed: boolean;
  completedAt?: Date;
  points: number;
  prerequisite?: string[]; // Other milestone IDs required
}

export interface UserProgress {
  totalPoints: number;
  level: number;
  completedMilestones: string[];
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  onboardingComplete: boolean;
  advancedUser: boolean;
}

const DEFAULT_MILESTONES: UserMilestone[] = [
  // Onboarding milestones
  {
    id: 'first_visit',
    name: 'Welcome to Cosnap AI',
    description: 'Your first visit to our AI effects platform',
    category: 'onboarding',
    completed: false,
    points: 10,
  },
  {
    id: 'profile_created',
    name: 'Profile Setup',
    description: 'Created your Cosnap AI account',
    category: 'onboarding',
    completed: false,
    points: 25,
  },
  {
    id: 'first_effect_viewed',
    name: 'Effect Explorer',
    description: 'Viewed your first AI effect',
    category: 'onboarding',
    completed: false,
    points: 15,
    prerequisite: ['first_visit'],
  },
  {
    id: 'first_image_uploaded',
    name: 'First Upload',
    description: 'Uploaded your first image',
    category: 'onboarding',
    completed: false,
    points: 30,
    prerequisite: ['first_effect_viewed'],
  },
  {
    id: 'first_effect_completed',
    name: 'AI Creator',
    description: 'Completed your first AI effect',
    category: 'onboarding',
    completed: false,
    points: 50,
    prerequisite: ['first_image_uploaded'],
  },
  {
    id: 'first_download',
    name: 'Collector',
    description: 'Downloaded your first result',
    category: 'onboarding',
    completed: false,
    points: 20,
    prerequisite: ['first_effect_completed'],
  },

  // Engagement milestones
  {
    id: 'effects_explorer',
    name: 'Effects Explorer',
    description: 'Tried 5 different effects',
    category: 'engagement',
    completed: false,
    points: 75,
    prerequisite: ['first_effect_completed'],
  },
  {
    id: 'daily_user',
    name: 'Daily Creator',
    description: 'Used Cosnap AI for 3 consecutive days',
    category: 'engagement',
    completed: false,
    points: 100,
  },
  {
    id: 'effect_enthusiast',
    name: 'Effect Enthusiast',
    description: 'Created 10 AI effects',
    category: 'engagement',
    completed: false,
    points: 150,
  },

  // Mastery milestones
  {
    id: 'parameter_master',
    name: 'Parameter Master',
    description: 'Customized effect parameters 10 times',
    category: 'mastery',
    completed: false,
    points: 125,
    prerequisite: ['effects_explorer'],
  },
  {
    id: 'advanced_effects',
    name: 'Advanced Creator',
    description: 'Used advanced effects (ComfyUI)',
    category: 'mastery',
    completed: false,
    points: 200,
    prerequisite: ['parameter_master'],
  },

  // Social milestones
  {
    id: 'first_share',
    name: 'Sharer',
    description: 'Shared your first creation',
    category: 'social',
    completed: false,
    points: 40,
    prerequisite: ['first_download'],
  },
  {
    id: 'community_member',
    name: 'Community Member',
    description: 'Joined the Cosnap AI community',
    category: 'social',
    completed: false,
    points: 60,
  },
];

// Calculate user level based on points
const calculateLevel = (points: number): number => {
  if (points < 50) return 1;
  if (points < 150) return 2;
  if (points < 300) return 3;
  if (points < 500) return 4;
  if (points < 750) return 5;
  if (points < 1000) return 6;
  return Math.floor(points / 250) + 3; // Progressive scaling
};

export const useUserProgress = () => {
  const { user } = useAuth();
  const { analytics } = useBeta();
  const userId = user?.id;
  const [milestones, setMilestones] = useState<UserMilestone[]>(DEFAULT_MILESTONES);
  const [progress, setProgress] = useState<UserProgress>({
    totalPoints: 0,
    level: 1,
    completedMilestones: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActivity: new Date(),
    onboardingComplete: false,
    advancedUser: false,
  });
  const [availableMilestones, setAvailableMilestones] = useState<UserMilestone[]>([]);

  // Load progress from localStorage
  useEffect(() => {
    if (userId) {
      const savedProgress = localStorage.getItem(`userProgress_${userId}`);
      const savedMilestones = localStorage.getItem(`userMilestones_${userId}`);
      
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        setProgress({
          ...parsed,
          lastActivity: new Date(parsed.lastActivity),
        });
      }
      
      if (savedMilestones) {
        const parsed = JSON.parse(savedMilestones);
        setMilestones(parsed.map((m: any) => ({
          ...m,
          completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
        })));
      }
    }
  }, [userId]);

  // Calculate available milestones (prerequisites met)
  useEffect(() => {
    const available = milestones.filter(milestone => {
      if (milestone.completed) return false;
      
      if (!milestone.prerequisite) return true;
      
      return milestone.prerequisite.every(reqId => 
        progress.completedMilestones.includes(reqId)
      );
    });
    
    setAvailableMilestones(available);
  }, [milestones, progress.completedMilestones]);

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: UserProgress, newMilestones: UserMilestone[]) => {
    if (userId) {
      localStorage.setItem(`userProgress_${userId}`, JSON.stringify(newProgress));
      localStorage.setItem(`userMilestones_${userId}`, JSON.stringify(newMilestones));
    }
  }, [userId]);

  // Complete a milestone
  const completeMilestone = useCallback((milestoneId: string, metadata?: Record<string, any>) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone || milestone.completed) return false;

    // Check prerequisites
    if (milestone.prerequisite) {
      const prerequisitesMet = milestone.prerequisite.every(reqId => 
        progress.completedMilestones.includes(reqId)
      );
      if (!prerequisitesMet) return false;
    }

    const now = new Date();
    const updatedMilestones = milestones.map(m => 
      m.id === milestoneId 
        ? { ...m, completed: true, completedAt: now }
        : m
    );

    const newProgress: UserProgress = {
      ...progress,
      totalPoints: progress.totalPoints + milestone.points,
      completedMilestones: [...progress.completedMilestones, milestoneId],
      lastActivity: now,
      onboardingComplete: progress.onboardingComplete || (
        milestoneId === 'first_download' && 
        progress.completedMilestones.includes('first_effect_completed')
      ),
      advancedUser: progress.advancedUser || milestoneId === 'advanced_effects',
    };

    // Update level
    newProgress.level = calculateLevel(newProgress.totalPoints);

    // Update streak (simplified - daily usage)
    if (milestone.category === 'engagement' && milestoneId === 'daily_user') {
      newProgress.currentStreak = Math.max(newProgress.currentStreak, 3);
      newProgress.longestStreak = Math.max(newProgress.longestStreak, newProgress.currentStreak);
    }

    setMilestones(updatedMilestones);
    setProgress(newProgress);
    saveProgress(newProgress, updatedMilestones);

    // Track milestone completion with enhanced analytics
    trackFeatureUsage('milestone_completed', 'completed');
    trackConversion('milestone_achieved', milestone.points);
    
    // Enhanced beta analytics tracking
    analytics.trackEvent('milestone_completed', {
      milestoneId,
      milestoneName: milestone.name,
      category: milestone.category,
      points: milestone.points,
      userId,
      metadata
    });

    // Track onboarding completion
    if (newProgress.onboardingComplete && !progress.onboardingComplete) {
      trackConversion('onboarding_completed');
      trackFeatureUsage('user_onboarding', 'completed');
      analytics.trackEvent('onboarding_completed', {
        userId,
        totalPoints: newProgress.totalPoints,
        level: newProgress.level,
        timeToComplete: now.getTime() - (user?.createdAt ? new Date(user.createdAt).getTime() : 0)
      });
    }

    console.log(`🎉 Milestone completed: ${milestone.name} (+${milestone.points} points)`);
    return true;
  }, [milestones, progress, saveProgress]);

  // Enhanced activity tracking for Day 3 Sprint
  const trackActivity = useCallback((activity: string, metadata?: Record<string, any>) => {
    const now = new Date();
    setProgress(prev => ({ ...prev, lastActivity: now }));

    // Enhanced analytics tracking
    analytics.trackEvent('user_activity', {
      activity,
      userId,
      timestamp: now.toISOString(),
      metadata
    });

    // Auto-complete certain milestones based on activity
    switch (activity) {
      case 'page_visit':
        completeMilestone('first_visit', metadata);
        break;
      case 'account_created':
        completeMilestone('profile_created', metadata);
        break;
      case 'effect_viewed':
        completeMilestone('first_effect_viewed', metadata);
        break;
      case 'image_uploaded':
        completeMilestone('first_image_uploaded', metadata);
        break;
      case 'effect_completed':
        completeMilestone('first_effect_completed', metadata);
        break;
      case 'result_downloaded':
        completeMilestone('first_download', metadata);
        break;
      case 'result_shared':
        completeMilestone('first_share', metadata);
        break;
      case 'community_joined':
        completeMilestone('community_member', metadata);
        break;
      case 'tutorial_completed':
        // Track successful tutorial completion
        analytics.trackEvent('tutorial_completed', {
          userId,
          completionTime: metadata?.completionTime,
          stepsCompleted: metadata?.stepsCompleted
        });
        break;
      case 'feedback_submitted':
        // Track feedback submission for Day 3 goals
        analytics.trackEvent('feedback_submitted', {
          userId,
          feedbackType: metadata?.type,
          rating: metadata?.rating
        });
        break;
    }
  }, [completeMilestone, analytics, userId]);

  // Get next milestone suggestion
  const getNextMilestone = useCallback((): UserMilestone | null => {
    const onboardingMilestones = availableMilestones.filter(m => m.category === 'onboarding');
    if (onboardingMilestones.length > 0) {
      return onboardingMilestones[0];
    }
    
    const engagementMilestones = availableMilestones.filter(m => m.category === 'engagement');
    if (engagementMilestones.length > 0) {
      return engagementMilestones[0];
    }
    
    return availableMilestones[0] || null;
  }, [availableMilestones]);

  // Get progress summary for display
  const getProgressSummary = useCallback(() => {
    const totalMilestones = milestones.length;
    const completedCount = progress.completedMilestones.length;
    const onboardingMilestones = milestones.filter(m => m.category === 'onboarding');
    const completedOnboarding = onboardingMilestones.filter(m => m.completed).length;
    
    return {
      completionPercentage: Math.round((completedCount / totalMilestones) * 100),
      onboardingPercentage: Math.round((completedOnboarding / onboardingMilestones.length) * 100),
      nextMilestone: getNextMilestone(),
      currentLevel: progress.level,
      pointsToNextLevel: calculateLevel(progress.totalPoints + 1) > progress.level ? 
        (progress.level * 150) - progress.totalPoints : 0,
    };
  }, [milestones, progress, getNextMilestone]);

  return {
    progress,
    milestones,
    availableMilestones,
    completeMilestone,
    trackActivity,
    getNextMilestone,
    getProgressSummary,
  };
};