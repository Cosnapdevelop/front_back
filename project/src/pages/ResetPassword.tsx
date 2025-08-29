import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, AlertTriangle, Sparkles, CheckCircle } from 'lucide-react';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { APP_STRINGS } from '../constants/strings';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useSEO } from '../hooks/useSEO';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loading, error, success, verifyResetToken, resetPassword, clearState } = useForgotPassword();
  
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  // SEO optimization
  useSEO({
    customSEO: {
      title: 'Reset Password - Create New Password | Cosnap AI',
      description: 'Create a new password for your Cosnap AI account. Secure password reset process with validation and confirmation.',
      keywords: [
        'reset password cosnap ai',
        'create new password',
        'password recovery form',
        'secure password reset'
      ],
      canonicalUrl: 'https://cosnap.ai/reset-password',
      noindex: true // Don't index password reset pages
    }
  });

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
      return;
    }

    const verifyToken = async () => {
      clearState();
      const result = await verifyResetToken(token);
      setTokenValid(result.valid);
      if (result.email) {
        setEmail(result.email);
      }
    };

    verifyToken();
  }, [token, navigate, verifyResetToken, clearState]);

  // Redirect to success page on successful reset
  useEffect(() => {
    if (success) {
      navigate('/reset-password/success', { 
        state: { email },
        replace: true 
      });
    }
  }, [success, navigate, email]);

  const validatePassword = (password: string): string => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasLetter || !hasNumber) {
      return 'Password must contain at least one letter and one number';
    }
    
    return '';
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  const validateForm = (): boolean => {
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    
    setFieldErrors({
      password: passwordError || undefined,
      confirmPassword: confirmPasswordError || undefined,
    });
    
    return !passwordError && !confirmPasswordError;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !token) return;
    
    await resetPassword(token, password, confirmPassword);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Clear field errors when user starts typing
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    
    // Clear field errors when user starts typing
    if (fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      letter: /[a-zA-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?\":{}|<>]/.test(password),
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
    };
    
    // Basic requirements
    if (checks.length && checks.letter && checks.number) strength = 1;
    
    // Medium strength
    if (strength === 1 && (checks.special || (checks.uppercase && checks.lowercase))) {
      strength = 2;
    }
    
    // Strong
    if (strength === 2 && checks.special && checks.uppercase && checks.lowercase) {
      strength = 3;
    }
    
    const strengthMap = {
      0: { label: 'Too weak', color: 'text-red-500' },
      1: { label: 'Fair', color: 'text-yellow-500' },
      2: { label: 'Good', color: 'text-blue-500' },
      3: { label: 'Strong', color: 'text-green-500' },
    };
    
    return { strength, ...strengthMap[strength as keyof typeof strengthMap] };
  };

  // Show loading state during token verification
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error state for invalid token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || APP_STRINGS.AUTH.RESET_PASSWORD_TOKEN_INVALID}
            </p>
            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Request New Reset Link
              </Link>
              <Link
                to="/login"
                className="block text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(password);

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
            {APP_STRINGS.AUTH.RESET_PASSWORD_TITLE}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {APP_STRINGS.AUTH.RESET_PASSWORD_SUBTITLE}
          </p>
          {email && (
            <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium break-all">
                {email}
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
        >
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Password field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {APP_STRINGS.AUTH.PASSWORD_LABEL}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  enterKeyHint="next"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder={APP_STRINGS.AUTH.PASSWORD_PLACEHOLDER}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[44px] text-base ${
                    fieldErrors.password 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.strength === 1 ? 'bg-yellow-500 w-1/4' :
                          passwordStrength.strength === 2 ? 'bg-blue-500 w-2/3' :
                          passwordStrength.strength === 3 ? 'bg-green-500 w-full' :
                          'bg-red-500 w-1/6'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
              
              {fieldErrors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 mt-1"
                >
                  {fieldErrors.password}
                </motion.p>
              )}
            </div>

            {/* Confirm Password field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {APP_STRINGS.AUTH.CONFIRM_PASSWORD_LABEL}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder={APP_STRINGS.AUTH.CONFIRM_PASSWORD_PLACEHOLDER}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-h-[44px] text-base ${
                    fieldErrors.confirmPassword 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : confirmPassword && password === confirmPassword
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                
                {/* Match indicator */}
                {confirmPassword && password === confirmPassword && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              
              {fieldErrors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 mt-1"
                >
                  {fieldErrors.confirmPassword}
                </motion.p>
              )}
            </div>

            {/* Global error message */}
            {error && !fieldErrors.password && !fieldErrors.confirmPassword && (
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
              disabled={loading || !password || !confirmPassword || !!fieldErrors.password || !!fieldErrors.confirmPassword}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>{APP_STRINGS.AUTH.RESET_PASSWORD_LOADING}</span>
                </>
              ) : (
                <span>{APP_STRINGS.AUTH.RESET_PASSWORD_BUTTON}</span>
              )}
            </motion.button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}