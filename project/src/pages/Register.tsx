import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_STRINGS } from '../constants/strings';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Register() {
  const navigate = useNavigate();
  const { register, requestRegisterCode } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{email?: string; username?: string; password?: string; confirmPassword?: string}>({});

  const validateForm = () => {
    const errors: {email?: string; username?: string; password?: string; confirmPassword?: string} = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setFieldErrors({});
    
    try {
      const ok = await register(email.trim(), username.trim(), password, code.trim() || undefined);
      
      if (ok) {
        // Add a small delay for better UX
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        setError(APP_STRINGS.AUTH.REGISTER_ERROR);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {APP_STRINGS.APP_NAME}
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {APP_STRINGS.AUTH.REGISTER}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join our community and start creating amazing AI art!
          </p>
        </div>

        {/* Register form */}
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder={APP_STRINGS.AUTH.EMAIL_PLACEHOLDER}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                    fieldErrors.email 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 mt-1"
                >
                  {fieldErrors.email}
                </motion.p>
              )}
            </div>

            {/* Username field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {APP_STRINGS.AUTH.USERNAME_LABEL}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) {
                      setFieldErrors(prev => ({ ...prev, username: undefined }));
                    }
                  }}
                  placeholder={APP_STRINGS.AUTH.USERNAME_PLACEHOLDER}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                    fieldErrors.username 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
                />
              </div>
              {fieldErrors.username && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 mt-1"
                >
                  {fieldErrors.username}
                </motion.p>
              )}
            </div>

            {/* Email verification code */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                邮箱验证码（可选，若后端已开启）
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="输入收到的6位验证码"
                  className="flex-1 w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={async ()=>{
                    if (!email || !/\S+@\S+\.\S+/.test(email)) {
                      setFieldErrors(prev=>({ ...prev, email: '请输入有效邮箱后再获取验证码' }));
                      return;
                    }
                    setCodeSending(true);
                    try {
                      const ok = await requestRegisterCode(email.trim());
                      if (!ok) {
                        setError('验证码发送失败或未开通');
                      }
                    } finally {
                      setCodeSending(false);
                    }
                  }}
                  className="whitespace-nowrap px-4 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-500"
                  disabled={loading || codeSending}
                >{codeSending ? '发送中...' : '获取验证码'}</button>
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {APP_STRINGS.AUTH.PASSWORD_LABEL}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder={APP_STRINGS.AUTH.PASSWORD_PLACEHOLDER}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                    fieldErrors.password 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
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
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  placeholder="Confirm your password"
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                    fieldErrors.confirmPassword 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
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
            {error && (
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
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>{APP_STRINGS.AUTH.LOADING_REGISTER}</span>
                </>
              ) : (
                <span>{APP_STRINGS.AUTH.REGISTER_BUTTON}</span>
              )}
            </motion.button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {APP_STRINGS.AUTH.HAVE_ACCOUNT}{' '}
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


