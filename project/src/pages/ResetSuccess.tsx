import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { APP_STRINGS } from '../constants/strings';
import { useSEO } from '../hooks/useSEO';

export default function ResetSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  // SEO optimization
  useSEO({
    customSEO: {
      title: 'Password Reset Successful - Cosnap AI',
      description: 'Your password has been successfully reset. You can now sign in to your Cosnap AI account with your new password.',
      keywords: [
        'password reset successful',
        'cosnap ai login',
        'password changed successfully'
      ],
      canonicalUrl: 'https://cosnap.ai/reset-password/success',
      noindex: true // Don't index success pages
    }
  });

  // Redirect if no email in state (shouldn't happen in normal flow)
  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true });
    }
  }, [email, navigate]);

  if (!email) {
    return null; // Will redirect
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
          {/* Success animation */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: 0.2, 
                duration: 0.5, 
                type: "spring", 
                stiffness: 150 
              }}
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6"
            >
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {APP_STRINGS.AUTH.RESET_SUCCESS_TITLE}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                {APP_STRINGS.AUTH.RESET_SUCCESS_SUBTITLE}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {APP_STRINGS.AUTH.RESET_SUCCESS_MESSAGE}
              </p>
            </motion.div>
          </div>

          {/* Account info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-8"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Account:
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
              {email}
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="space-y-4"
          >
            {/* Primary CTA - Sign in */}
            <Link
              to="/login"
              className="block w-full"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>{APP_STRINGS.AUTH.RESET_SUCCESS_LOGIN_BUTTON}</span>
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </Link>

            {/* Secondary CTA - Go to home */}
            <Link
              to="/"
              className="block text-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors py-2"
            >
              {APP_STRINGS.ACTIONS.BACK_TO_HOME}
            </Link>
          </motion.div>

          {/* Security note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                <strong>Security tip:</strong> For your account's security, we recommend using a unique password that you don't use elsewhere.
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating success particles animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: Math.random() * window.innerWidth, 
                y: window.innerHeight + 20 
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: -20,
              }}
              transition={{
                delay: 1.2 + i * 0.2,
                duration: 3,
                ease: "easeOut"
              }}
              className="absolute"
            >
              <CheckCircle className="h-4 w-4 text-green-400 opacity-60" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}