import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Sparkles } from 'lucide-react';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { APP_STRINGS } from '../constants/strings';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSEO } from '../hooks/useSEO';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { loading, error, success, sendResetEmail, clearState } = useForgotPassword();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>('');

  // SEO optimization
  useSEO({
    customSEO: {
      title: 'Reset Password - Cosnap AI | Forgot Password Recovery',
      description: 'Reset your Cosnap AI account password. Enter your email to receive a secure password reset link. Quick and secure account recovery.',
      keywords: [
        'reset password cosnap ai',
        'forgot password recovery',
        'account recovery',
        'password reset link',
        'secure password recovery'
      ],
      canonicalUrl: 'https://cosnap.ai/forgot-password',
      noindex: false
    }
  });

  // Clear state when component mounts
  useEffect(() => {
    clearState();
  }, [clearState]);

  // Redirect to email sent page on success
  useEffect(() => {
    if (success) {
      navigate('/forgot-password/email-sent', { 
        state: { email: email.trim() },
        replace: true 
      });
    }
  }, [success, navigate, email]);

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValidation = validateEmail(email);
    if (emailValidation) {
      setFieldError(emailValidation);
      return;
    }

    setFieldError('');
    await sendResetEmail(email.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear field error when user starts typing
    if (fieldError) {
      setFieldError('');
    }
  };

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
            <span className="text-sm font-medium">Back to Sign In</span>
          </Link>

          {/* Logo and branding */}
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {APP_STRINGS.APP_NAME}
            </span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {APP_STRINGS.AUTH.FORGOT_PASSWORD_TITLE}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {APP_STRINGS.AUTH.FORGOT_PASSWORD_SUBTITLE}
          </p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
        >
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {APP_STRINGS.AUTH.EMAIL_LABEL}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="send"
                  spellCheck={false}
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={APP_STRINGS.AUTH.EMAIL_PLACEHOLDER}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[44px] text-base ${
                    fieldError 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
                  required
                />
              </div>
              {fieldError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 mt-1 flex items-center space-x-1"
                >
                  <span>{fieldError}</span>
                </motion.p>
              )}
            </div>

            {/* Global error message */}
            {error && !fieldError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
              >
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </motion.div>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading || !email.trim()}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>{APP_STRINGS.AUTH.FORGOT_PASSWORD_LOADING}</span>
                </>
              ) : (
                <span>{APP_STRINGS.AUTH.FORGOT_PASSWORD_BUTTON}</span>
              )}
            </motion.button>
          </form>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link 
                to="/login" 
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
              >
                {APP_STRINGS.AUTH.LOGIN}
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}