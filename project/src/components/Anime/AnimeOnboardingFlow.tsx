import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart, Star, ChevronRight, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnimeOnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const AnimeOnboardingFlow: React.FC<AnimeOnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      id: 'welcome',
      title: '欢迎来到二次元世界！🎌',
      description: '专业的AI二次元修图平台，让你的照片瞬间变身精美动漫风格',
      icon: '🌟',
      gradient: 'from-pink-400 to-purple-500'
    },
    {
      id: 'categories',
      title: '选择你的创作风格',
      description: '我们提供多种二次元风格，总有一款适合你',
      icon: '🎨',
      gradient: 'from-blue-400 to-purple-500',
      categories: [
        { name: '二次元头像', emoji: '👧', desc: '萌系头像生成' },
        { name: '动漫风格', emoji: '🎭', desc: '经典动漫画风' },
        { name: 'Kawaii风格', emoji: '🌸', desc: '可爱日系风格' },
        { name: '日系滤镜', emoji: '🌅', desc: '清新日式美学' }
      ]
    },
    {
      id: 'demo',
      title: '看看神奇的转换效果',
      description: '一键上传，AI智能分析，秒变二次元！',
      icon: '✨',
      gradient: 'from-purple-400 to-pink-500'
    },
    {
      id: 'start',
      title: '开始你的创作之旅！',
      description: '立即体验专业的AI二次元修图，创造属于你的作品',
      icon: '🚀',
      gradient: 'from-orange-400 to-pink-500'
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const skipOnboarding = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Progress Bar */}
            <div className="flex space-x-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                    index <= currentStep
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pb-6"
            >
              <div className={`bg-gradient-to-br ${steps[currentStep].gradient} rounded-xl p-6 text-white mb-6`}>
                <div className="text-4xl mb-3">{steps[currentStep].icon}</div>
                <h2 className="text-xl font-bold mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="opacity-90 text-sm leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </div>

              {/* Step-specific content */}
              {currentStep === 1 && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {steps[1].categories?.map((category, index) => (
                    <motion.div
                      key={category.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer"
                    >
                      <div className="text-2xl mb-1">{category.emoji}</div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category.desc}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentStep === 2 && (
                <div className="mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center">
                          <Upload className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">上传照片</div>
                          <div className="text-sm text-gray-500">选择你想要转换的图片</div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">AI魔法转换</div>
                        <div className="text-sm text-purple-600 dark:text-purple-400">瞬间变身二次元！</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {currentStep === steps.length - 1 ? (
                  <Link
                    to="/effects?category=二次元头像"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium text-center hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
                    onClick={onComplete}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Sparkles className="h-5 w-5" />
                      <span>立即开始创作</span>
                    </div>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={skipOnboarding}
                      className="px-6 py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
                    >
                      跳过
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span>继续</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to manage anime onboarding flow
export const useAnimeOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    // Check if user has completed anime onboarding
    const completed = localStorage.getItem('animeOnboardingCompleted');
    if (completed) {
      setHasCompleted(true);
    } else {
      // Show onboarding after a short delay for new users
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('animeOnboardingCompleted', 'true');
    setHasCompleted(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const showOnboarding = () => {
    setIsOpen(true);
  };

  return {
    isOpen,
    hasCompleted,
    handleComplete,
    handleClose,
    showOnboarding
  };
};

export default AnimeOnboardingFlow;