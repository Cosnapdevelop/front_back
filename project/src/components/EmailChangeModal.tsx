import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Lock, Shield, CheckCircle, ArrowLeft, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newEmail: string) => void;
}

type Step = 'current-email' | 'new-email' | 'verification' | 'complete';

interface FormData {
  currentEmail: string;
  newEmail: string;
  password: string;
  currentEmailCode: string;
  newEmailCode: string;
}

const EmailChangeModal: React.FC<EmailChangeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { push } = useToast();
  const { user, accessToken } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('current-email');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  // Form data state
  const [formData, setFormData] = useState<FormData>({
    currentEmail: user?.email || '',
    newEmail: '',
    password: '',
    currentEmailCode: '',
    newEmailCode: ''
  });

  // Countdown timers for verification codes
  const [currentEmailCountdown, setCurrentEmailCountdown] = useState(0);
  const [newEmailCountdown, setNewEmailCountdown] = useState(0);
  const currentEmailTimerRef = useRef<NodeJS.Timeout | null>(null);
  const newEmailTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Code sending states
  const [sendingCurrentEmailCode, setSendingCurrentEmailCode] = useState(false);
  const [sendingNewEmailCode, setSendingNewEmailCode] = useState(false);
  const [currentEmailCodeSent, setCurrentEmailCodeSent] = useState(false);
  const [newEmailCodeSent, setNewEmailCodeSent] = useState(false);

  // Step configuration
  const steps = [
    { id: 'current-email', title: 'Current Email', description: 'Verify your current email address' },
    { id: 'new-email', title: 'New Email', description: 'Enter your new email address' },
    { id: 'verification', title: 'Verification', description: 'Verify both email addresses' },
    { id: 'complete', title: 'Complete', description: 'Email successfully changed' }
  ];

  const stepIndex = steps.findIndex(step => step.id === currentStep);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (currentEmailTimerRef.current) clearInterval(currentEmailTimerRef.current);
      if (newEmailTimerRef.current) clearInterval(newEmailTimerRef.current);
    };
  }, []);

  // Start countdown timer
  const startCountdown = (type: 'current' | 'new', duration = 60) => {
    const setCountdown = type === 'current' ? setCurrentEmailCountdown : setNewEmailCountdown;
    const timerRef = type === 'current' ? currentEmailTimerRef : newEmailTimerRef;

    setCountdown(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Reset modal state
  const resetModal = () => {
    setCurrentStep('current-email');
    setFormData({
      currentEmail: user?.email || '',
      newEmail: '',
      password: '',
      currentEmailCode: '',
      newEmailCode: ''
    });
    setErrors({});
    setCurrentEmailCodeSent(false);
    setNewEmailCodeSent(false);
    setCurrentEmailCountdown(0);
    setNewEmailCountdown(0);
    if (currentEmailTimerRef.current) clearInterval(currentEmailTimerRef.current);
    if (newEmailTimerRef.current) clearInterval(newEmailTimerRef.current);
  };

  // Handle modal close
  const handleClose = () => {
    if (currentStep === 'complete') {
      resetModal();
    }
    onClose();
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: Partial<FormData> = {};

    switch (currentStep) {
      case 'current-email':
        if (!formData.password) {
          newErrors.password = 'Password is required';
        }
        break;
      case 'new-email':
        if (!formData.newEmail) {
          newErrors.newEmail = 'New email is required';
        } else if (!validateEmail(formData.newEmail)) {
          newErrors.newEmail = 'Please enter a valid email address';
        } else if (formData.newEmail === formData.currentEmail) {
          newErrors.newEmail = 'New email must be different from current email';
        }
        break;
      case 'verification':
        if (!formData.currentEmailCode || formData.currentEmailCode.length !== 6) {
          newErrors.currentEmailCode = 'Please enter the 6-digit code from your current email';
        }
        if (!formData.newEmailCode || formData.newEmailCode.length !== 6) {
          newErrors.newEmailCode = 'Please enter the 6-digit code from your new email';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send verification code
  const sendVerificationCode = async (email: string, type: 'current' | 'new') => {
    const setSending = type === 'current' ? setSendingCurrentEmailCode : setSendingNewEmailCode;
    const setCodeSent = type === 'current' ? setCurrentEmailCodeSent : setNewEmailCodeSent;
    
    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: email,
          scene: 'change_email'
        })
      });

      const data = await response.json();
      if (data.success) {
        setCodeSent(true);
        startCountdown(type);
        push('success', `Verification code sent to ${email}`);
      } else {
        push('error', data.error || 'Failed to send verification code');
      }
    } catch (error) {
      push('error', 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  // Handle next step
  const handleNext = async () => {
    if (!validateStep()) return;

    setLoading(true);
    
    try {
      switch (currentStep) {
        case 'current-email':
          // Verify password and send code to current email
          await sendVerificationCode(formData.currentEmail, 'current');
          setCurrentStep('new-email');
          break;
          
        case 'new-email':
          // Send code to new email
          await sendVerificationCode(formData.newEmail, 'new');
          setCurrentStep('verification');
          break;
          
        case 'verification':
          // Submit email change request
          const response = await fetch(`${API_BASE_URL}/auth/change-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              currentEmail: formData.currentEmail,
              newEmail: formData.newEmail,
              password: formData.password,
              currentEmailCode: formData.currentEmailCode,
              newEmailCode: formData.newEmailCode
            })
          });

          const data = await response.json();
          if (data.success) {
            setCurrentStep('complete');
            push('success', 'Email address changed successfully!');
            if (onSuccess) {
              onSuccess(formData.newEmail);
            }
          } else {
            push('error', data.error || 'Failed to change email address');
          }
          break;
      }
    } catch (error) {
      push('error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    switch (currentStep) {
      case 'new-email':
        setCurrentStep('current-email');
        break;
      case 'verification':
        setCurrentStep('new-email');
        break;
    }
  };

  // Update form data
  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Change Email Address
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {steps[stepIndex]?.description}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index < stepIndex
                      ? 'bg-green-500 text-white'
                      : index === stepIndex
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {index < stepIndex ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 transition-colors ${
                      index < stepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`text-xs text-center ${
                  index <= stepIndex
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-500'
                }`}
                style={{ width: `${100 / steps.length}%` }}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 'current-email' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Current Email Address
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {formData.currentEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Your Password
                </label>
                <div className="relative">
                  <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                      errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your current password"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Security Notice</p>
                    <p>We'll send verification codes to both your current and new email addresses to ensure the change is authorized.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'new-email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Email Address
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.newEmail}
                    onChange={(e) => updateFormData('newEmail', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                      errors.newEmail ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your new email address"
                  />
                </div>
                {errors.newEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.newEmail}</p>
                )}
              </div>

              <div className="flex items-start space-x-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <Shield className="h-4 w-4 mr-2" />
                    Current Email
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.currentEmail}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 mt-2" />
                <div className="flex-1">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <Mail className="h-4 w-4 mr-2" />
                    New Email
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.newEmail || 'Not entered yet'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'verification' && (
            <div className="space-y-6">
              {/* Current Email Verification */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Verify Current Email
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
                  Enter the code sent to {formData.currentEmail}
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.currentEmailCode}
                    onChange={(e) => updateFormData('currentEmailCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`flex-1 px-3 py-2 border rounded-lg text-center font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                      errors.currentEmailCode ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <button
                    onClick={() => sendVerificationCode(formData.currentEmail, 'current')}
                    disabled={sendingCurrentEmailCode || currentEmailCountdown > 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {sendingCurrentEmailCode ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : currentEmailCountdown > 0 ? (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{currentEmailCountdown}s</span>
                      </div>
                    ) : (
                      'Resend'
                    )}
                  </button>
                </div>
                {errors.currentEmailCode && (
                  <p className="text-sm text-red-500 mt-2">{errors.currentEmailCode}</p>
                )}
              </div>

              {/* New Email Verification */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Verify New Email
                </h3>
                <p className="text-sm text-green-600 dark:text-green-300 mb-3">
                  Enter the code sent to {formData.newEmail}
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.newEmailCode}
                    onChange={(e) => updateFormData('newEmailCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={`flex-1 px-3 py-2 border rounded-lg text-center font-mono text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                      errors.newEmailCode ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <button
                    onClick={() => sendVerificationCode(formData.newEmail, 'new')}
                    disabled={sendingNewEmailCode || newEmailCountdown > 0}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {sendingNewEmailCode ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : newEmailCountdown > 0 ? (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{newEmailCountdown}s</span>
                      </div>
                    ) : (
                      'Resend'
                    )}
                  </button>
                </div>
                {errors.newEmailCode && (
                  <p className="text-sm text-red-500 mt-2">{errors.newEmailCode}</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Email Changed Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your email address has been updated to:
              </p>
              <p className="font-semibold text-purple-600 dark:text-purple-400">
                {formData.newEmail}
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Important:</strong> Please use your new email address for future logins. 
                  All account notifications will now be sent to your new email.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentStep !== 'complete' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 'current-email' || loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 'current-email' || loading
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {currentStep === 'verification' ? 'Change Email' : 'Continue'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
            <button
              onClick={handleClose}
              className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-2 rounded-lg font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailChangeModal;