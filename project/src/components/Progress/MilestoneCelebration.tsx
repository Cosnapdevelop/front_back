/**
 * Milestone Celebration Component
 * Provides engaging celebrations for user achievements with analytics tracking
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Crown, 
  Sparkles, 
  Gift, 
  Users, 
  Award,
  Zap,
  Heart,
  Share2,
  Download,
  X
} from 'lucide-react';
import { UserMilestone } from '../../hooks/useUserProgress';
import { trackConversion, trackFeatureUsage, trackEngagement } from '../../utils/analytics';

interface MilestoneCelebrationProps {
  milestone: UserMilestone;
  isVisible: boolean;
  onClose: () => void;
  onShare?: () => void;
  onContinue?: () => void;
  userLevel: number;
  totalPoints: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
}

const CategoryConfigs = {
  onboarding: {
    icon: Sparkles,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'from-blue-50 to-cyan-50',
    darkBgColor: 'from-blue-900/20 to-cyan-900/20',
    confettiColors: ['#3B82F6', '#06B6D4', '#8B5CF6', '#EC4899']
  },
  engagement: {
    icon: Zap,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'from-green-50 to-emerald-50',
    darkBgColor: 'from-green-900/20 to-emerald-900/20',
    confettiColors: ['#10B981', '#059669', '#34D399', '#6EE7B7']
  },
  mastery: {
    icon: Crown,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'from-purple-50 to-violet-50',
    darkBgColor: 'from-purple-900/20 to-violet-900/20',
    confettiColors: ['#8B5CF6', '#7C3AED', '#A855F7', '#C084FC']
  },
  social: {
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'from-pink-50 to-rose-50',
    darkBgColor: 'from-pink-900/20 to-rose-900/20',
    confettiColors: ['#EC4899', '#F43F5E', '#FB7185', '#FBBF24']
  }
};

const LevelUpMessages = [
  "You're on fire! 🔥",
  "Incredible progress! ⭐",
  "Keep it up! 💪",
  "You're amazing! 🎉",
  "Unstoppable! 🚀"
];

const generateConfetti = (count: number = 50): ConfettiParticle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * window.innerWidth,
    y: -10,
    color: CategoryConfigs.onboarding.confettiColors[Math.floor(Math.random() * 4)],
    size: Math.random() * 6 + 3,
    velocity: {
      x: (Math.random() - 0.5) * 4,
      y: Math.random() * 3 + 2
    },
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10
  }));
};

const ConfettiAnimation: React.FC<{ colors: string[]; duration: number }> = ({ colors, duration }) => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const confetti = generateConfetti(60);
    setParticles(confetti);

    const animate = () => {
      setParticles(prev => 
        prev.map(particle => ({
          ...particle,
          x: particle.x + particle.velocity.x,
          y: particle.y + particle.velocity.y,
          rotation: particle.rotation + particle.rotationSpeed,
          velocity: {
            ...particle.velocity,
            y: particle.velocity.y + 0.1, // gravity
          }
        })).filter(particle => particle.y < window.innerHeight + 50)
      );
    };

    const interval = setInterval(animate, 16); // 60fps
    const cleanup = setTimeout(() => {
      clearInterval(interval);
      setParticles([]);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(cleanup);
    };
  }, [duration, colors]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: particle.color,
            left: particle.x,
            top: particle.y,
            transform: `rotate(${particle.rotation}deg)`,
            width: particle.size,
            height: particle.size
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: duration / 1000, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  milestone,
  isVisible,
  onClose,
  onShare,
  onContinue,
  userLevel,
  totalPoints
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<'entrance' | 'celebration' | 'rewards'>('entrance');
  
  const config = CategoryConfigs[milestone.category];
  const IconComponent = config.icon;
  
  useEffect(() => {
    if (isVisible) {
      // Track milestone celebration view
      trackFeatureUsage('milestone_celebration', 'viewed');
      trackConversion('milestone_celebrated', milestone.points);
      
      // Animation sequence
      setShowConfetti(true);
      setCelebrationPhase('entrance');
      
      const timeline = [
        { phase: 'celebration', delay: 800 },
        { phase: 'rewards', delay: 2000 }
      ];
      
      timeline.forEach(({ phase, delay }) => {
        setTimeout(() => setCelebrationPhase(phase as any), delay);
      });
    }
  }, [isVisible, milestone.points]);

  const handleShare = () => {
    trackEngagement('milestone_shared');
    trackFeatureUsage('social_sharing', 'clicked');
    onShare?.();
  };

  const handleContinue = () => {
    trackFeatureUsage('milestone_celebration', 'completed');
    onContinue?.();
  };

  const handleClose = () => {
    trackFeatureUsage('milestone_celebration', 'closed');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Confetti Animation */}
        {showConfetti && (
          <ConfettiAnimation colors={config.confettiColors} duration={3000} />
        )}
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 100 }}
          transition={{ 
            type: 'spring', 
            duration: 0.6, 
            bounce: 0.3 
          }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-gradient-to-br ${config.bgColor} dark:${config.darkBgColor} rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative`}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Celebration Header */}
          <div className={`relative bg-gradient-to-r ${config.color} p-8 text-white text-center overflow-hidden`}>
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/20" />
              <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/20" />
              <div className="absolute top-4 right-8 w-8 h-8 rounded-full bg-white/20" />
            </div>

            {/* Main celebration icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: celebrationPhase === 'entrance' ? [0, 1.2, 1] : 1,
                rotate: celebrationPhase === 'entrance' ? [-180, 10, 0] : 0 
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative z-10"
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <IconComponent className="h-10 w-10" />
              </div>
            </motion.div>

            {/* Celebration message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative z-10"
            >
              <h2 className="text-2xl font-bold mb-2">Milestone Unlocked!</h2>
              <p className="text-white/90">
                {LevelUpMessages[Math.floor(Math.random() * LevelUpMessages.length)]}
              </p>
            </motion.div>

            {/* Floating sparkles */}
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute top-2 left-4"
            >
              <Sparkles className="h-6 w-6 text-white/60" />
            </motion.div>
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5
              }}
              className="absolute bottom-4 right-6"
            >
              <Star className="h-4 w-4 text-white/60" />
            </motion.div>
          </div>

          {/* Milestone Details */}
          <div className="p-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {milestone.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {milestone.description}
              </p>
            </motion.div>

            {/* Rewards Section */}
            <AnimatePresence mode="wait">
              {celebrationPhase === 'rewards' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Points Reward */}
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Points Earned
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Your progress continues!
                        </div>
                      </div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xl font-bold text-yellow-600 dark:text-yellow-400"
                    >
                      +{milestone.points}
                    </motion.div>
                  </div>

                  {/* Level Progress */}
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center`}>
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          Current Level
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {totalPoints} total points
                        </div>
                      </div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`text-xl font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}
                    >
                      {userLevel}
                    </motion.div>
                  </div>

                  {/* Category Badge */}
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${config.color} text-white rounded-full text-sm font-medium`}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {milestone.category.charAt(0).toUpperCase() + milestone.category.slice(1)} Master
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              {onShare && (
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Achievement</span>
                </button>
              )}
              
              <button
                onClick={handleContinue}
                className={`w-full bg-gradient-to-r ${config.color} hover:opacity-90 text-white py-3 px-4 rounded-xl font-medium transition-opacity`}
              >
                Continue Journey
              </button>
              
              <button
                onClick={handleClose}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MilestoneCelebration;