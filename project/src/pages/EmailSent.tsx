import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Clock, RefreshCw, CheckCircle, Sparkles } from 'lucide-react';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { APP_STRINGS } from '../constants/strings';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSEO } from '../hooks/useSEO';

export default function EmailSent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, error, success, sendResetEmail, clearState } = useForgotPassword();
  const [email, setEmail] = useState<string>('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);

  // SEO optimization
  useSEO({
    customSEO: {
      title: 'Check Your Email - Password Reset | Cosnap AI',
      description: 'We\'ve sent a password reset link to your email. Check your inbox to complete the password reset process for your Cosnap AI account.',
      keywords: [
        'password reset email sent',
        'check email reset link',
        'cosnap ai password recovery'
      ],
      canonicalUrl: 'https://cosnap.ai/forgot-password/email-sent',
      noindex: true // Don't index this page
    }
  });

  // Get email from navigation state or redirect if not available
  useEffect(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) {
      setEmail(stateEmail);
      clearState();
    } else {
      // If no email in state, redirect to forgot password page
      navigate('/forgot-password', { replace: true });
    }
  }, [location.state, navigate, clearState]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Handle resend success
  useEffect(() => {
    if (success) {
      setResendSuccess(true);
      setCanResend(false);
      setCountdown(60);
      
      // Hide success message after 3 seconds
      const timer = setTimeout(() => {
        setResendSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleResendClick = async () => {
    if (canResend && email) {
      await sendResetEmail(email);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Don't render if no email (will redirect)
  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          {/* Back to login link */}
          <Link 
            to="/login" 
            className="inline-flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{APP_STRINGS.AUTH.EMAIL_SENT_BACK_TO_LOGIN}</span>
          </Link>

          {/* Logo and branding */}
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {APP_STRINGS.APP_NAME}
            </span>
          </Link>
        </div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
        >
          {/* Success icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {APP_STRINGS.AUTH.EMAIL_SENT_TITLE}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {APP_STRINGS.AUTH.EMAIL_SENT_SUBTITLE}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium break-all">
                {email}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {APP_STRINGS.AUTH.EMAIL_SENT_INSTRUCTIONS}
            </p>
          </div>

          {/* Resend section */}
          <div className="space-y-4">
            {/* Success message for resend */}
            {resendSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center space-x-3"
              >
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  {APP_STRINGS.AUTH.FORGOT_PASSWORD_SUCCESS}
                </p>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
              >
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </motion.div>
            )}

            {/* Resend section */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {APP_STRINGS.AUTH.EMAIL_SENT_RESEND}
              </p>
              
              <motion.button
                onClick={handleResendClick}
                disabled={!canResend || loading}
                whileHover={{ scale: canResend && !loading ? 1.02 : 1 }}
                whileTap={{ scale: canResend && !loading ? 0.98 : 1 }}
                className={`inline-flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                  canResend && !loading
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Sending...</span>
                  </>
                ) : canResend ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>{APP_STRINGS.AUTH.EMAIL_SENT_RESEND_BUTTON}</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Resend in {formatCountdown(countdown)}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Back to login */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{APP_STRINGS.AUTH.EMAIL_SENT_BACK_TO_LOGIN}</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}