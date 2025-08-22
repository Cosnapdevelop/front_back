/**
 * Tutorial overlay system for feature discovery and guided user experience
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { trackFeatureUsage, trackPerformance } from '../../utils/analytics';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for the element to highlight
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    text: string;
    onClick: () => void;
  };
  optional?: boolean;
}

export interface TutorialConfig {
  id: string;
  name: string;
  steps: TutorialStep[];
  autoStart?: boolean;
  persistent?: boolean; // Show again on subsequent visits
}

interface TutorialOverlayProps {
  config: TutorialConfig;
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepIndex: number) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  config,
  isVisible,
  onComplete,
  onSkip,
  onStepChange,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isTargetVisible, setIsTargetVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const startTime = useRef<number>(0);

  const currentStepData = config.steps[currentStep];

  // Track tutorial start
  useEffect(() => {
    if (isVisible) {
      startTime.current = performance.now();
      trackFeatureUsage(`tutorial_${config.id}`, 'viewed');
    }
  }, [isVisible, config.id]);

  // Update target element position and visibility
  const updateTargetPosition = useCallback(() => {
    if (!currentStepData?.target) {
      setTargetRect(null);
      setIsTargetVisible(false);
      return;
    }

    const element = document.querySelector(currentStepData.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      setTargetRect({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
      });
      setIsTargetVisible(true);

      // Scroll element into view if it's not visible
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetRect(null);
      setIsTargetVisible(false);
    }
  }, [currentStepData]);

  // Update target position when step changes or on resize
  useEffect(() => {
    updateTargetPosition();
    
    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    
    // Update position periodically in case DOM changes
    const interval = setInterval(updateTargetPosition, 1000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, [updateTargetPosition]);

  const handleNext = useCallback(() => {
    if (currentStep < config.steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
      trackFeatureUsage(`tutorial_${config.id}`, 'clicked');
    } else {
      handleComplete();
    }
  }, [currentStep, config.steps.length, config.id, onStepChange]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
      trackFeatureUsage(`tutorial_${config.id}`, 'clicked');
    }
  }, [currentStep, config.id, onStepChange]);

  const handleComplete = useCallback(() => {
    const completionTime = performance.now() - startTime.current;
    trackFeatureUsage(`tutorial_${config.id}`, 'completed');
    trackPerformance('api_response_time', completionTime);
    onComplete();
  }, [config.id, onComplete]);

  const handleSkip = useCallback(() => {
    const skipTime = performance.now() - startTime.current;
    trackFeatureUsage(`tutorial_${config.id}`, 'clicked'); // Track skip
    trackPerformance('api_response_time', skipTime);
    onSkip();
  }, [config.id, onSkip]);

  // Calculate tooltip position based on target and placement
  const getTooltipStyle = useCallback((): React.CSSProperties => {
    if (!targetRect || !isTargetVisible) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const margin = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    switch (currentStepData.placement) {
      case 'top':
        return {
          position: 'absolute',
          top: targetRect.top - tooltipHeight - margin,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          width: tooltipWidth,
        };
      case 'bottom':
        return {
          position: 'absolute',
          top: targetRect.top + targetRect.height + margin,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          width: tooltipWidth,
        };
      case 'left':
        return {
          position: 'absolute',
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - margin,
          width: tooltipWidth,
        };
      case 'right':
        return {
          position: 'absolute',
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left + targetRect.width + margin,
          width: tooltipWidth,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: tooltipWidth,
        };
    }
  }, [targetRect, isTargetVisible, currentStepData]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ pointerEvents: 'none' }}
      >
        {/* Backdrop with spotlight effect */}
        <div className="absolute inset-0 bg-black/60">
          {targetRect && isTargetVisible && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute bg-transparent border-4 border-blue-500 rounded-lg shadow-2xl"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)',
              }}
            />
          )}
        </div>

        {/* Tutorial tooltip */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm"
          style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {currentStepData.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
              {currentStepData.content}
            </p>

            {/* Action button */}
            {currentStepData.action && (
              <button
                onClick={currentStepData.action.onClick}
                className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                {currentStepData.action.text}
              </button>
            )}

            {/* Progress indicator */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              {config.steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentStep + 1} of {config.steps.length}
              </span>

              <button
                onClick={handleNext}
                className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium text-sm transition-colors"
              >
                <span>
                  {currentStep === config.steps.length - 1 ? 'Finish' : 'Next'}
                </span>
                {currentStep === config.steps.length - 1 ? (
                  <Target className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Skip tutorial hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="fixed bottom-4 right-4 text-white/80 text-sm"
          style={{ pointerEvents: 'auto' }}
        >
          <button
            onClick={handleSkip}
            className="hover:text-white transition-colors underline"
          >
            Skip tutorial
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TutorialOverlay;