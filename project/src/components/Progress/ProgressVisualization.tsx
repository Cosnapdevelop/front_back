/**
 * Enhanced Progress Visualization Component
 * Builds on existing useUserProgress hook with visual milestone celebrations
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Award, 
  Users, 
  TrendingUp, 
  Zap,
  Crown,
  Gift,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useUserProgress, UserMilestone } from '../../hooks/useUserProgress';
import { useAuth } from '../../context/AuthContext';
import { trackFeatureUsage, trackEngagement } from '../../utils/analytics';

interface ProgressVisualizationProps {
  showCompactView?: boolean;
  showMilestoneCards?: boolean;
  onMilestoneClick?: (milestone: UserMilestone) => void;
}

interface LevelBadgeProps {
  level: number;
  points: number;
  nextLevelPoints: number;
  className?: string;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ level, points, nextLevelPoints, className = '' }) => {
  const progressPercentage = nextLevelPoints > 0 ? (points / nextLevelPoints) * 100 : 100;
  
  return (
    <div className={`relative ${className}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg"
      >
        <div className="text-center">
          <Crown className="h-6 w-6 mx-auto mb-1" />
          <div className="text-sm font-bold">{level}</div>
        </div>
      </motion.div>
      
      {/* Progress ring */}
      <svg className="absolute inset-0 w-20 h-20 transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="3"
          fill="none"
        />
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 36}`}
          strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercentage / 100)}`}
          initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - progressPercentage / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
};

const CategoryIcons = {
  onboarding: <Sparkles className="h-5 w-5" />,
  engagement: <TrendingUp className="h-5 w-5" />,
  mastery: <Award className="h-5 w-5" />,
  social: <Users className="h-5 w-5" />
};

const CategoryColors = {
  onboarding: 'from-blue-400 to-cyan-400',
  engagement: 'from-green-400 to-emerald-400', 
  mastery: 'from-purple-400 to-violet-400',
  social: 'from-pink-400 to-rose-400'
};

interface MilestoneCardProps {
  milestone: UserMilestone;
  onClick?: () => void;
  showProgress?: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({ milestone, onClick, showProgress = false }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ${
        milestone.completed 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800'
          : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${CategoryColors[milestone.category]}`}>
          {CategoryIcons[milestone.category]}
        </div>
        <div className="flex items-center space-x-2">
          {milestone.completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Trophy className="h-4 w-4 text-white" />
            </motion.div>
          )}
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            +{milestone.points}
          </span>
        </div>
      </div>
      
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
        {milestone.name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        {milestone.description}
      </p>
      
      {milestone.completedAt && (
        <div className="mt-3 text-xs text-green-600 dark:text-green-400">
          Completed {milestone.completedAt.toLocaleDateString()}
        </div>
      )}
      
      {showProgress && !milestone.completed && milestone.prerequisite && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Prerequisites: {milestone.prerequisite.length} required
          </div>
          {/* Progress indicator could be added here */}
        </div>
      )}
    </motion.div>
  );
};

const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({
  showCompactView = false,
  showMilestoneCards = true,
  onMilestoneClick
}) => {
  const { user } = useAuth();
  const { progress, milestones, getProgressSummary, getNextMilestone } = useUserProgress(user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCelebration, setShowCelebration] = useState(false);
  
  const progressSummary = getProgressSummary();
  const nextMilestone = getNextMilestone();
  
  // Track progress view
  useEffect(() => {
    if (user) {
      trackFeatureUsage('progress_visualization', 'viewed');
    }
  }, [user]);
  
  // Show celebration for recent completions
  useEffect(() => {
    const recentCompletions = milestones.filter(m => 
      m.completed && m.completedAt && 
      Date.now() - m.completedAt.getTime() < 60000 // Last minute
    );
    
    if (recentCompletions.length > 0) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [milestones]);
  
  const categories = ['all', 'onboarding', 'engagement', 'mastery', 'social'];
  
  const filteredMilestones = milestones.filter(milestone => {
    if (selectedCategory === 'all') return true;
    return milestone.category === selectedCategory;
  });
  
  const completedMilestones = filteredMilestones.filter(m => m.completed);
  const availableMilestones = filteredMilestones.filter(m => !m.completed);
  
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    trackFeatureUsage('progress_category_filter', 'clicked');
  };
  
  const handleMilestoneCardClick = (milestone: UserMilestone) => {
    trackEngagement('milestone_viewed');
    onMilestoneClick?.(milestone);
  };
  
  if (showCompactView) {
    return (
      <div className="flex items-center space-x-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <LevelBadge 
          level={progress.level}
          points={progress.totalPoints}
          nextLevelPoints={progressSummary.pointsToNextLevel}
          className="flex-shrink-0"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Level {progress.level}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {progress.totalPoints} points
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div 
              className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressSummary.completionPercentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {completedMilestones.length} of {milestones.length} milestones
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-xl shadow-2xl"
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy className="h-8 w-8" />
              </motion.div>
              <div>
                <div className="font-semibold">Milestone Unlocked!</div>
                <div className="text-sm opacity-90">Great progress!</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Progress Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-6 mb-6">
          <LevelBadge 
            level={progress.level}
            points={progress.totalPoints}
            nextLevelPoints={progressSummary.pointsToNextLevel}
          />
          
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Level {progress.level}
            </h2>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <div>{progress.totalPoints} total points</div>
              <div>{completedMilestones.length} of {milestones.length} milestones</div>
              {progress.currentStreak > 0 && (
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>{progress.currentStreak} day streak</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progressSummary.completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <motion.div 
              className="h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressSummary.completionPercentage}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
      
      {/* Next Milestone Suggestion */}
      {nextMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  Next: {nextMilestone.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  +{nextMilestone.points} points
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </motion.div>
      )}
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => handleCategorySelect(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Milestone Cards */}
      {showMilestoneCards && (
        <div className="space-y-6">
          {/* Completed Milestones */}
          {completedMilestones.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                Completed ({completedMilestones.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {completedMilestones.map(milestone => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      onClick={() => handleMilestoneCardClick(milestone)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          
          {/* Available Milestones */}
          {availableMilestones.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Star className="h-5 w-5 text-blue-500 mr-2" />
                Available ({availableMilestones.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {availableMilestones.map(milestone => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      onClick={() => handleMilestoneCardClick(milestone)}
                      showProgress={true}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {progress.level}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Current Level</div>
        </div>
        
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {progress.totalPoints}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Points</div>
        </div>
        
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {progress.currentStreak}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Day Streak</div>
        </div>
        
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
            {completedMilestones.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Milestones</div>
        </div>
      </div>
    </div>
  );
};

export default ProgressVisualization;