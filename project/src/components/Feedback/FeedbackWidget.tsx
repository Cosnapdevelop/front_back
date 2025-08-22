import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  StarIcon,
  PaperAirplaneIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';
import { useBeta } from '../../context/BetaContext';
import { useToast } from '../../context/ToastContext';

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'praise' | 'rating';
  rating?: number;
  category: string;
  message: string;
  screenshot?: File;
  metadata: {
    page: string;
    userAgent: string;
    timestamp: string;
    userId?: string;
    sessionId: string;
  };
}

interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoTrigger?: {
    afterActions: number;
    afterTime: number;
  };
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ 
  position = 'bottom-right',
  autoTrigger 
}) => {
  const { user } = useAuth();
  const { analytics } = useBeta();
  const { push: showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'rating' | 'details' | 'thank_you'>('type');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'praise' | 'rating'>('rating');
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  // Auto-trigger logic
  useEffect(() => {
    if (autoTrigger) {
      const timer = setTimeout(() => {
        if (actionCount >= autoTrigger.afterActions) {
          setIsOpen(true);
          analytics.trackEvent('feedback_auto_triggered', {
            trigger: 'action_count',
            actionCount,
            userId: user?.id
          });
        }
      }, autoTrigger.afterTime * 1000);

      return () => clearTimeout(timer);
    }
  }, [autoTrigger, actionCount, analytics, user?.id]);

  // Track user actions for auto-trigger
  useEffect(() => {
    const handleUserAction = () => {
      setActionCount(prev => prev + 1);
    };

    document.addEventListener('click', handleUserAction);
    return () => document.removeEventListener('click', handleUserAction);
  }, []);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const categories = {
    bug: ['UI/UX Issue', 'Processing Error', 'Performance', 'Mobile Issue', 'Authentication', 'Other'],
    suggestion: ['New Feature', 'Improvement', 'Effect Request', 'UI Enhancement', 'Performance', 'Other'],
    praise: ['Great Feature', 'Excellent Results', 'Easy to Use', 'Fast Processing', 'Good Support', 'Other'],
    rating: ['Overall Experience', 'Effect Quality', 'Upload Process', 'User Interface', 'Performance', 'Support']
  };

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    analytics.trackEvent('feedback_widget_opened', {
      trigger: 'manual',
      userId: user?.id,
      page: window.location.pathname
    });
  }, [analytics, user?.id]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setStep('type');
    setFeedbackType('rating');
    setRating(0);
    setCategory('');
    setMessage('');
    setScreenshot(null);
  }, []);

  const handleTypeSelect = useCallback((type: typeof feedbackType) => {
    setFeedbackType(type);
    if (type === 'rating') {
      setStep('rating');
    } else {
      setStep('details');
    }
  }, []);

  const handleRatingSelect = useCallback((selectedRating: number) => {
    setRating(selectedRating);
    setStep('details');
    analytics.trackEvent('feedback_rating_selected', {
      rating: selectedRating,
      userId: user?.id
    });
  }, [analytics, user?.id]);

  const handleScreenshot = useCallback(async () => {
    try {
      // Request permission for screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'screenshot.png', { type: 'image/png' });
            setScreenshot(file);
            showToast('success', 'Screenshot captured successfully');
          }
        });
        
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      showToast('error', 'Could not capture screenshot');
    }
  }, [showToast]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() && feedbackType !== 'rating') {
      showToast('error', 'Please provide feedback details');
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionId = sessionStorage.getItem('sessionId') || 
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('sessionId', sessionId);

      const feedbackData: FeedbackData = {
        type: feedbackType,
        rating: feedbackType === 'rating' ? rating : undefined,
        category: category || categories[feedbackType][0],
        message: message.trim(),
        metadata: {
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: user?.id,
          sessionId
        }
      };

      // Submit to backend API
      const formData = new FormData();
      formData.append('feedback', JSON.stringify(feedbackData));
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Authorization': user ? `Bearer ${localStorage.getItem('token')}` : ''
        },
        body: formData
      });

      if (response.ok) {
        analytics.trackEvent('feedback_submitted', {
          type: feedbackType,
          rating: feedbackType === 'rating' ? rating : undefined,
          category,
          hasScreenshot: !!screenshot,
          userId: user?.id,
          messageLength: message.length
        });

        setStep('thank_you');
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, feedbackType, rating, category, screenshot, user, analytics, showToast, handleClose]);

  const renderTypeSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        How can we help you today?
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleTypeSelect('rating')}
          className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        >
          <StarIcon className="w-8 h-8 text-yellow-500 mb-2" />
          <span className="text-sm font-medium">Rate Experience</span>
        </button>
        <button
          onClick={() => handleTypeSelect('bug')}
          className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 dark:hover:border-red-400 transition-colors"
        >
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mb-2" />
          <span className="text-sm font-medium">Report Bug</span>
        </button>
        <button
          onClick={() => handleTypeSelect('suggestion')}
          className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors"
        >
          <LightBulbIcon className="w-8 h-8 text-green-500 mb-2" />
          <span className="text-sm font-medium">Suggestion</span>
        </button>
        <button
          onClick={() => handleTypeSelect('praise')}
          className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
        >
          <HandThumbUpIcon className="w-8 h-8 text-purple-500 mb-2" />
          <span className="text-sm font-medium">Give Praise</span>
        </button>
      </div>
    </div>
  );

  const renderRatingStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        How would you rate your experience?
      </h3>
      <div className="flex justify-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRatingSelect(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            {star <= rating ? (
              <StarIconSolid className="w-8 h-8 text-yellow-500" />
            ) : (
              <StarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            )}
          </button>
        ))}
      </div>
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {rating === 0 && 'Click a star to rate'}
        {rating === 1 && 'Very Poor'}
        {rating === 2 && 'Poor'}
        {rating === 3 && 'Average'}
        {rating === 4 && 'Good'}
        {rating === 5 && 'Excellent'}
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Tell us more
      </h3>
      
      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Select a category</option>
          {categories[feedbackType].map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {feedbackType === 'rating' ? 'Additional comments (optional)' : 'Describe your feedback'}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Tell us about your ${feedbackType}...`}
          rows={4}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
        />
      </div>

      {/* Screenshot */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {screenshot ? 'Screenshot attached' : 'Attach screenshot (optional)'}
        </span>
        <button
          onClick={handleScreenshot}
          className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        >
          <PhotoIcon className="w-4 h-4" />
          <span>{screenshot ? 'Replace' : 'Capture'}</span>
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || (!message.trim() && feedbackType !== 'rating')}
        className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <PaperAirplaneIcon className="w-4 h-4" />
            <span>Submit Feedback</span>
          </>
        )}
      </button>
    </div>
  );

  const renderThankYou = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
        <HandThumbUpIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Thank you for your feedback!
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Your input helps us improve Cosnap AI for everyone.
      </p>
    </div>
  );

  return (
    <>
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={handleOpen}
            className={`fixed ${positionClasses[position]} z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group`}
          >
            <ChatBubbleBottomCenterTextIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Feedback
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {step === 'type' && renderTypeSelection()}
                {step === 'rating' && renderRatingStep()}
                {step === 'details' && renderDetailsStep()}
                {step === 'thank_you' && renderThankYou()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackWidget;