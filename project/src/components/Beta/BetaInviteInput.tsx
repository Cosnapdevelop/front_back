import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Star,
  Gift,
  ArrowRight,
  Crown
} from 'lucide-react';
import { useBeta } from '../../context/BetaContext';

interface BetaInviteInputProps {
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
}

const BetaInviteInput: React.FC<BetaInviteInputProps> = ({ 
  onClose, 
  autoFocus = true, 
  className = "" 
}) => {
  const { joinBeta, loading, error } = useBeta();
  const [inviteCode, setInviteCode] = useState('');
  const [step, setStep] = useState<'input' | 'validating' | 'success' | 'error'>('input');
  const [codeError, setCodeError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Format invite code as user types (e.g., ABC-DEF-123)
  const formatInviteCode = (code: string): string => {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const groups = cleanCode.match(/.{1,3}/g) || [];
    return groups.join('-').slice(0, 11); // Max length: XXX-XXX-XXX
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInviteCode(e.target.value);
    setInviteCode(formatted);
    setCodeError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode || inviteCode.length < 11) {
      setCodeError('Please enter a valid invite code');
      return;
    }

    setStep('validating');
    
    try {
      const success = await joinBeta(inviteCode.replace(/-/g, ''), {
        // Additional user info can be added here
      });
      
      if (success) {
        setStep('success');
        // Auto-close after success animation
        setTimeout(() => {
          onClose?.();
        }, 2500);
      } else {
        setStep('error');
        setCodeError(error || 'Invalid invite code. Please check and try again.');
        setTimeout(() => setStep('input'), 2000);
      }
    } catch (err) {
      setStep('error');
      setCodeError('Network error. Please try again.');
      setTimeout(() => setStep('input'), 2000);
    }
  };

  const betaFeatures = [
    { icon: Sparkles, text: "Advanced AI Effects", premium: false },
    { icon: Crown, text: "Premium Filters", premium: true },
    { icon: Users, text: "Beta Community Access", premium: false },
    { icon: Gift, text: "Exclusive Templates", premium: true },
    { icon: Star, text: "Priority Processing", premium: false },
  ];

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Key className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-yellow-800" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Join Cosnap AI Beta
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400">
                Enter your exclusive invitation code to unlock premium features
              </p>
            </div>

            {/* Beta Features Preview */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                <Crown className="w-4 h-4 mr-2 text-purple-600" />
                Beta Features
              </h3>
              
              <div className="space-y-2">
                {betaFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <feature.icon className={`w-4 h-4 ${
                      feature.premium 
                        ? 'text-yellow-500' 
                        : 'text-purple-600 dark:text-purple-400'
                    }`} />
                    <span className={`text-sm ${
                      feature.premium 
                        ? 'text-gray-900 dark:text-white font-medium' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {feature.text}
                    </span>
                    {feature.premium && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Code Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invitation Code
                </label>
                
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inviteCode}
                    onChange={handleCodeChange}
                    placeholder="XXX-XXX-XXX"
                    maxLength={11}
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-center text-lg font-mono tracking-widest transition-all duration-300 min-h-[44px] text-base ${
                      codeError 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                    } text-gray-900 dark:text-white placeholder-gray-400`}
                    disabled={loading}
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  
                  {inviteCode.length === 11 && !codeError && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                
                {codeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {codeError}
                  </motion.div>
                )}
                
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Code format: 3 groups of 3 characters (e.g., ABC-DEF-123)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !inviteCode || inviteCode.length < 11}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 min-h-[48px] ${
                  loading || !inviteCode || inviteCode.length < 11
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Join Beta Program</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Don't have an invitation code?{' '}
                <a 
                  href="mailto:beta@cosnap.ai" 
                  className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Request access
                </a>
              </p>
            </div>
          </motion.div>
        )}

        {step === 'validating' && (
          <motion.div
            key="validating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              <Key className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Validating Code
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we verify your invitation...
            </p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to Beta!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You now have access to exclusive beta features
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 flex items-center justify-center space-x-1 text-yellow-500"
            >
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </motion.div>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invalid Code
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {codeError || 'Please check your invitation code and try again'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BetaInviteInput;