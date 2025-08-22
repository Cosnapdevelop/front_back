import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Upload, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  X,
  Check,
  Camera,
  Wand2,
  Share2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_STRINGS } from '../../constants/strings';
import { trackFeatureUsage, trackConversion, trackPerformance } from '../../utils/analytics';
import { useUserProgress } from '../../hooks/useUserProgress';
import { useAuth } from '../../context/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  illustration: React.ReactNode;
  cta?: {
    text: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  };
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
  isVisible: boolean;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onSkip,
  isVisible
}) => {
  const { user } = useAuth();
  const { progress, trackActivity, getProgressSummary } = useUserProgress(user?.id);
  const [currentStep, setCurrentStep] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  
  const progressSummary = getProgressSummary();
  
  useEffect(() => {
    if (isVisible) {
      setStartTime(performance.now());
      trackFeatureUsage('onboarding', 'viewed');
      trackActivity('page_visit');
    }
  }, [isVisible, trackActivity]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: APP_STRINGS.ONBOARDING.WELCOME_TITLE,
      description: APP_STRINGS.ONBOARDING.WELCOME_SUBTITLE,
      icon: <Sparkles className="h-8 w-8" />,
      illustration: (
        <div className="relative w-64 h-64 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full animate-pulse delay-300" />
          <div className="absolute inset-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full animate-pulse delay-700" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl">
              <Sparkles className="h-12 w-12 text-purple-500 mx-auto animate-bounce" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'discover',
      title: APP_STRINGS.ONBOARDING.STEP_1_TITLE,
      description: APP_STRINGS.ONBOARDING.STEP_1_DESC,
      icon: <Camera className="h-8 w-8" />,
      illustration: (
        <div className="grid grid-cols-3 gap-3 w-64 mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="aspect-square bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg shadow-lg"
            >
              <div className="w-full h-full bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </motion.div>
          ))}
        </div>
      ),
      cta: {
        text: 'Browse Effects',
        action: () => {
          // Navigate to effects page
          setIsClosing(true);
          setTimeout(() => {
            window.location.href = '/effects';
          }, 300);
        },
        variant: 'secondary'
      }
    },
    {
      id: 'transform',
      title: APP_STRINGS.ONBOARDING.STEP_2_TITLE,
      description: APP_STRINGS.ONBOARDING.STEP_2_DESC,
      icon: <Wand2 className="h-8 w-8" />,
      illustration: (
        <div className="relative w-64 h-40 mx-auto">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute left-0 top-0 w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-lg shadow-lg"
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
              <Upload className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="bg-purple-500 p-3 rounded-full shadow-lg">
              <Wand2 className="h-6 w-6 text-white animate-pulse" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg"
          >
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white animate-spin" />
            </div>
          </motion.div>
        </div>
      )
    },
    {
      id: 'share',
      title: APP_STRINGS.ONBOARDING.STEP_3_TITLE,
      description: APP_STRINGS.ONBOARDING.STEP_3_DESC,
      icon: <Share2 className="h-8 w-8" />,
      illustration: (
        <div className="relative w-64 h-48 mx-auto">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-32 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg"
            />
          </div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-12 left-1/2 transform -translate-x-1/2"
          >
            <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg">
              <Share2 className="h-6 w-6 text-purple-500" />
            </div>
          </motion.div>
          
          <div className="absolute bottom-0 flex justify-center space-x-4 w-full">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full shadow-lg flex items-center justify-center"
              >
                <Users className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </motion.div>
            ))}
          </div>
        </div>
      ),
      cta: {
        text: 'Join Community',
        action: () => {
          setIsClosing(true);
          setTimeout(() => {
            window.location.href = '/community';
          }, 300);
        },
        variant: 'secondary'
      }
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      trackFeatureUsage('onboarding', 'clicked');
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      trackFeatureUsage('onboarding', 'clicked');
    }
  };

  const handleComplete = () => {
    const completionTime = performance.now() - startTime;
    trackFeatureUsage('onboarding', 'completed');
    trackConversion('trial_started');
    trackPerformance('api_response_time', completionTime);
    
    setIsClosing(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleSkip = () => {
    const skipTime = performance.now() - startTime;
    trackFeatureUsage('onboarding', 'clicked'); // Track skip as clicked
    trackPerformance('api_response_time', skipTime);
    
    setIsClosing(true);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: isClosing ? 0.9 : 1, opacity: isClosing ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <motion.div
                key={currentStep}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4"
              >
                {currentStepData.icon}
              </motion.div>
              
              <h2 className="text-xl font-bold mb-2">{currentStepData.title}</h2>
              <p className="text-white/90 text-sm">{currentStepData.description}</p>
              
              {/* Progress indicator */}
              {user && (
                <div className="mt-4 flex items-center justify-center space-x-2 text-white/80 text-xs">
                  <div className="flex items-center space-x-1">
                    <span>Level {progress.level}</span>
                    <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white/60 transition-all duration-300"
                        style={{ width: `${progressSummary.onboardingPercentage}%` }}
                      />
                    </div>
                    <span>{progress.totalPoints} pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                {currentStepData.illustration}
              </motion.div>
            </AnimatePresence>

            {/* CTA Button */}
            {currentStepData.cta && (
              <div className="mb-6">
                <button
                  onClick={currentStepData.cta.action}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    currentStepData.cta.variant === 'primary'
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {currentStepData.cta.text}
                </button>
              </div>
            )}

            {/* Progress dots */}
            <div className="flex justify-center space-x-2 mb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-purple-500 w-6'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-500'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{APP_STRINGS.ONBOARDING.PREVIOUS}</span>
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentStep + 1} of {steps.length}
              </span>

              <button
                onClick={handleNext}
                className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                <span>
                  {currentStep === steps.length - 1 
                    ? APP_STRINGS.ONBOARDING.FINISH 
                    : APP_STRINGS.ONBOARDING.NEXT
                  }
                </span>
                {currentStep === steps.length - 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingFlow;