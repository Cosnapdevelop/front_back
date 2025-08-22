import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  XMarkIcon,
  SparklesIcon,
  PhotoIcon,
  AdjustmentsHorizontalIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useBeta } from '../../context/BetaContext';
import { useAuth } from '../../context/AuthContext';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  action?: string;
  nextButtonText?: string;
}

const BetaOnboardingTutorial: React.FC = () => {
  const { user } = useAuth();
  const { userAccess, analytics } = useBeta();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Cosnap AI Beta! 🎉',
      description: 'Discover the future of AI-powered image effects',
      component: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
          >
            <SparklesIcon className="w-12 h-12 text-white" />
          </motion.div>
          <div>
            <h3 className="text-xl font-semibold mb-2">You're now part of our exclusive beta!</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Access level: <span className="font-bold text-blue-600">{userAccess?.accessLevel || 'BASIC'}</span>
            </p>
          </div>
        </div>
      ),
      nextButtonText: 'Let\'s Get Started'
    },
    {
      id: 'upload',
      title: 'Upload Your First Image 📸',
      description: 'Learn how to upload and process images with AI effects',
      component: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <PhotoIcon className="w-12 h-12 text-blue-500 mb-4" />
            <h4 className="font-semibold mb-2">Quick Upload Tips:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Drag & drop images directly onto the upload area</li>
              <li>• Support for JPEG, PNG, WebP formats</li>
              <li>• Maximum file size: 30MB</li>
              <li>• Works best with high-resolution images</li>
            </ul>
          </div>
        </div>
      ),
      action: 'navigate-to-upload',
      nextButtonText: 'Try It Now'
    },
    {
      id: 'effects',
      title: 'Explore AI Effects ✨',
      description: 'Discover our collection of AI-powered image effects',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Portrait Effects</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Face enhancement, style transfer, background removal</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Creative Effects</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Artistic filters, lighting effects, texture transformation</p>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm">
              <strong>Beta Exclusive:</strong> Access to {userAccess?.accessLevel === 'PREMIUM' ? '15+' : '8+'} premium effects!
            </p>
          </div>
        </div>
      ),
      action: 'navigate-to-effects',
      nextButtonText: 'Browse Effects'
    },
    {
      id: 'parameters',
      title: 'Customize Parameters ⚙️',
      description: 'Fine-tune AI effects with advanced parameters',
      component: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <AdjustmentsHorizontalIcon className="w-12 h-12 text-green-500 mb-4" />
            <h4 className="font-semibold mb-2">Parameter Controls:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Strength: Control effect intensity (0-100%)</li>
              <li>• Style: Choose from multiple style variations</li>
              <li>• Quality: Select processing quality level</li>
              <li>• Advanced: Access beta-exclusive parameters</li>
            </ul>
          </div>
        </div>
      ),
      nextButtonText: 'Got It'
    },
    {
      id: 'community',
      title: 'Join the Community 🤝',
      description: 'Share your creations and get feedback',
      component: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-lg">
            <ShareIcon className="w-12 h-12 text-green-500 mb-4" />
            <h4 className="font-semibold mb-2">Community Features:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Share your AI-enhanced images</li>
              <li>• Get feedback from other beta users</li>
              <li>• Participate in weekly challenges</li>
              <li>• Access exclusive beta Discord channel</li>
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm">
              <strong>Beta Perks:</strong> Your feedback directly influences our product development!
            </p>
          </div>
        </div>
      ),
      action: 'navigate-to-community',
      nextButtonText: 'Join Community'
    }
  ];

  useEffect(() => {
    // Show tutorial for new beta users
    if (user && userAccess && !localStorage.getItem(`tutorial_completed_${user.id}`)) {
      setIsVisible(true);
      analytics.trackEvent('tutorial_started', {
        userId: user.id,
        accessLevel: userAccess.accessLevel
      });
    }
  }, [user, userAccess, analytics]);

  const handleNext = useCallback(() => {
    const currentStepData = tutorialSteps[currentStep];
    
    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
    
    // Track step completion
    analytics.trackEvent('tutorial_step_completed', {
      stepId: currentStepData.id,
      stepIndex: currentStep,
      userId: user?.id
    });

    // Execute step action if exists
    if (currentStepData.action) {
      handleStepAction(currentStepData.action);
    }

    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, user?.id, analytics]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepAction = useCallback((action: string) => {
    switch (action) {
      case 'navigate-to-upload':
        // Navigate to upload page (would be handled by router)
        console.log('Navigate to upload');
        break;
      case 'navigate-to-effects':
        // Navigate to effects page
        console.log('Navigate to effects');
        break;
      case 'navigate-to-community':
        // Navigate to community page
        console.log('Navigate to community');
        break;
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (user) {
      localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
      analytics.trackEvent('tutorial_completed', {
        userId: user.id,
        accessLevel: userAccess?.accessLevel,
        completedSteps: Array.from(completedSteps)
      });
    }
    setIsVisible(false);
  }, [user, userAccess, completedSteps, analytics]);

  const handleSkip = useCallback(() => {
    analytics.trackEvent('tutorial_skipped', {
      userId: user?.id,
      stepIndex: currentStep,
      accessLevel: userAccess?.accessLevel
    });
    handleComplete();
  }, [user?.id, currentStep, userAccess?.accessLevel, handleComplete, analytics]);

  if (!isVisible) return null;

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const currentStepData = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="opacity-90 mt-1">{currentStepData.description}</p>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white/20 rounded-full h-2">
            <motion.div
              className="bg-white rounded-full h-2"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-sm mt-2 opacity-90">
            <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
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
            >
              {currentStepData.component}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 p-6 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Previous
          </button>

          <div className="flex gap-2">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            {currentStepData.nextButtonText || 'Next'}
            {currentStep < tutorialSteps.length - 1 && (
              <ChevronRightIcon className="w-5 h-5 ml-1" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BetaOnboardingTutorial;