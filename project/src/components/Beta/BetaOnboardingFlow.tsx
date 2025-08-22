import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Users, 
  Zap, 
  Camera, 
  MessageSquare, 
  Star,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Gift,
  Rocket,
  Heart
} from 'lucide-react';
import { useBeta } from '../../context/BetaContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  features: {
    icon: React.ComponentType<any>;
    title: string;
    description: string;
    highlight?: boolean;
  }[];
  action?: {
    text: string;
    onClick: () => void;
  };
}

const BetaOnboardingFlow: React.FC = () => {
  const { 
    betaOnboardingStep, 
    completeBetaOnboarding, 
    betaUser, 
    betaAccessLevel,
    isFeatureEnabled,
    trackBetaEvent 
  } = useBeta();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(betaOnboardingStep > 0);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: `Welcome to Beta, ${betaUser?.username || 'Creator'}!`,
      description: 'You\'re now part of an exclusive community of AI photo editing pioneers.',
      icon: Crown,
      features: [
        {
          icon: Sparkles,
          title: 'Advanced AI Effects',
          description: 'Access cutting-edge filters before anyone else',
          highlight: true
        },
        {
          icon: Zap,
          title: 'Priority Processing',
          description: 'Your images get processed faster than standard users',
        },
        {
          icon: Users,
          title: 'Beta Community',
          description: 'Connect with other creators and share feedback',
        }
      ]
    },
    {
      id: 'features',
      title: 'Exclusive Beta Features',
      description: 'Discover what makes your beta experience special.',
      icon: Gift,
      features: [
        {
          icon: Camera,
          title: 'Mobile File Uploader',
          description: 'Enhanced camera integration with professional controls',
          highlight: isFeatureEnabled('enhancedImageUploader')
        },
        {
          icon: Rocket,
          title: 'Experimental Effects',
          description: 'Try unreleased effects and help us perfect them',
          highlight: isFeatureEnabled('experimentalEffects')
        },
        {
          icon: MessageSquare,
          title: 'Direct Feedback Channel',
          description: 'Share your thoughts directly with our development team',
          highlight: isFeatureEnabled('betaFeedback')
        }
      ]
    },
    {
      id: 'community',
      title: 'Join the Beta Community',
      description: 'Connect with fellow creators and help shape the future of AI photo editing.',
      icon: Users,
      features: [
        {
          icon: Heart,
          title: 'Beta Gallery',
          description: 'Showcase your creations in our exclusive beta gallery',
          highlight: isFeatureEnabled('betaCommunity')
        },
        {
          icon: MessageSquare,
          title: 'Feedback Hub',
          description: 'Submit feedback and see what others are saying',
        },
        {
          icon: Star,
          title: 'Beta Badge',
          description: 'Show off your beta status with a special profile badge',
          highlight: true
        }
      ],
      action: {
        text: 'Join Community',
        onClick: () => {
          trackBetaEvent('onboarding_community_joined');
          // Navigate to community or open modal
        }
      }
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start creating with your new beta powers. The future of AI editing awaits!',
      icon: Rocket,
      features: [
        {
          icon: Sparkles,
          title: 'Start Creating',
          description: 'Try your first beta effect right now',
          highlight: true
        },
        {
          icon: Users,
          title: 'Share & Connect',
          description: 'Join discussions with other beta users',
        },
        {
          icon: MessageSquare,
          title: 'Give Feedback',
          description: 'Help us improve by sharing your experience',
        }
      ],
      action: {
        text: 'Start Creating',
        onClick: () => {
          trackBetaEvent('onboarding_start_creating');
          completeBetaOnboarding();
          // Navigate to effects page
        }
      }
    }
  ];

  useEffect(() => {
    if (betaOnboardingStep > 0 && betaOnboardingStep <= onboardingSteps.length) {
      setCurrentStep(betaOnboardingStep - 1);
      setIsVisible(true);
    }
  }, [betaOnboardingStep]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      trackBetaEvent('onboarding_step_completed', {
        step: currentStep + 1,
        step_id: onboardingSteps[currentStep].id
      });
    } else {
      // Complete onboarding
      trackBetaEvent('onboarding_completed');
      completeBetaOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    trackBetaEvent('onboarding_skipped', {
      skipped_at_step: currentStep + 1
    });
    completeBetaOnboarding();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      completeBetaOnboarding();
    }, 300);
  };

  if (!isVisible || !betaUser) return null;

  const currentStepData = onboardingSteps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <currentStepData.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentStepData.title}
                  </h2>
                  {betaAccessLevel && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      betaAccessLevel === 'advanced' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : betaAccessLevel === 'premium'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {betaAccessLevel} beta
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
            {currentStepData.description}
          </p>
        </div>

        {/* Content */}
        <div className="px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {currentStepData.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-200 ${
                    feature.highlight
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    feature.highlight
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {feature.title}
                      </h3>
                      {feature.highlight && (
                        <div className="flex items-center space-x-1">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                            New
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-8 border-t border-gray-200 dark:border-gray-700 mt-8">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors"
            >
              Skip tour
            </button>

            <div className="flex items-center space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={currentStepData.action?.onClick || handleNext}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <span>
                  {currentStepData.action?.text || (currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next')}
                </span>
                {currentStep === onboardingSteps.length - 1 ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BetaOnboardingFlow;