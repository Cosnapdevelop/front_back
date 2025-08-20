import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Zap
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  description: string;
}

interface MobilePaymentProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (paymentData: any) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const MobilePayment: React.FC<MobilePaymentProps> = ({
  amount,
  currency = 'CNY',
  description = '支付订单',
  onSuccess,
  onCancel,
  onError
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [paymentStep, setPaymentStep] = useState<'select' | 'qr' | 'processing' | 'success' | 'error'>('select');
  const [qrCode, setQrCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes countdown
  const [errorMessage, setErrorMessage] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'wechat',
      name: '微信支付',
      icon: '💬',
      color: '#1aad19',
      gradient: 'from-green-500 to-green-600',
      description: '使用微信扫码支付'
    },
    {
      id: 'alipay',
      name: '支付宝',
      icon: '💙',
      color: '#1677ff',
      gradient: 'from-blue-500 to-blue-600',
      description: '使用支付宝扫码支付'
    },
    {
      id: 'unionpay',
      name: '银联云闪付',
      icon: '💳',
      color: '#e21f2f',
      gradient: 'from-red-500 to-red-600',
      description: '银联卡快速支付'
    }
  ];

  // Start countdown timer for QR code
  useEffect(() => {
    if (paymentStep === 'qr') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setPaymentStep('error');
            setErrorMessage('支付超时，请重新发起支付');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [paymentStep]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    // Add haptic feedback simulation
    document.body.classList.add('haptic-medium');
    setTimeout(() => document.body.classList.remove('haptic-medium'), 150);
  };

  const handlePayment = async () => {
    if (!selectedMethod) return;

    setPaymentStep('processing');

    try {
      // Simulate API call to generate QR code
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock QR code data
      const mockQrData = `${selectedMethod}://pay?amount=${amount}&merchant=cosnap&order=${Date.now()}`;
      setQrCode(mockQrData);
      setPaymentStep('qr');
      setTimeLeft(300);

      // Simulate payment confirmation (in real app, this would be server-sent events)
      setTimeout(() => {
        setPaymentStep('success');
        onSuccess({
          method: selectedMethod,
          amount: amount,
          transactionId: `TXN${Date.now()}`,
          timestamp: new Date().toISOString()
        });
      }, 8000);

    } catch (error) {
      setPaymentStep('error');
      setErrorMessage('支付请求失败，请重试');
      onError('支付请求失败');
    }
  };

  const handleBack = () => {
    if (paymentStep === 'qr') {
      setPaymentStep('select');
      setSelectedMethod('');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      onCancel();
    }
  };

  const renderPaymentMethods = () => (
    <div className="space-y-3">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-obsidian-900 dark:text-pearl-100 mb-2">
          选择支付方式
        </h2>
        <div className="text-2xl font-bold text-mint-600 dark:text-mint-400">
          {formatAmount(amount)}
        </div>
        <p className="text-sm text-obsidian-600 dark:text-pearl-400 mt-1">
          {description}
        </p>
      </div>

      {paymentMethods.map((method) => (
        <motion.button
          key={method.id}
          onClick={() => handleMethodSelect(method.id)}
          whileTap={{ scale: 0.98 }}
          className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 touch-feedback ${
            selectedMethod === method.id
              ? 'border-mint-500 bg-mint-50 dark:bg-mint-900/20'
              : 'border-pearl-200 dark:border-obsidian-700 bg-white dark:bg-obsidian-800'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div 
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-r ${method.gradient}`}
            >
              <span className="text-xl">{method.icon}</span>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-obsidian-900 dark:text-pearl-100">
                {method.name}
              </h3>
              <p className="text-sm text-obsidian-600 dark:text-pearl-400">
                {method.description}
              </p>
            </div>
            {selectedMethod === method.id && (
              <div className="w-6 h-6 rounded-full bg-mint-500 flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </motion.button>
      ))}

      <motion.button
        onClick={handlePayment}
        disabled={!selectedMethod}
        whileTap={{ scale: 0.98 }}
        className={`w-full mt-6 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 ${
          selectedMethod
            ? 'payment-button bg-gradient-to-r from-mint-500 to-cosmic-500 text-white shadow-lg hover:shadow-xl'
            : 'bg-pearl-200 dark:bg-obsidian-700 text-pearl-400 dark:text-obsidian-400 cursor-not-allowed'
        }`}
      >
        立即支付
      </motion.button>

      <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-obsidian-600 dark:text-pearl-400">
        <Shield className="h-4 w-4" />
        <span>支付安全由第三方平台保障</span>
      </div>
    </div>
  );

  const renderQRCode = () => {
    const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
    
    return (
      <div className="text-center space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-obsidian-600 dark:text-pearl-400 hover:text-mint-600 dark:hover:text-mint-400 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回</span>
          </button>
          <div className="text-right">
            <div className="text-sm text-obsidian-600 dark:text-pearl-400">剩余时间</div>
            <div className="text-lg font-mono font-semibold text-sakura-500">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-obsidian-800 p-6 rounded-2xl shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-obsidian-900 dark:text-pearl-100 mb-2">
              {selectedMethodData?.name}支付
            </h3>
            <div className="text-2xl font-bold text-mint-600 dark:text-mint-400">
              {formatAmount(amount)}
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="qr-scanner mx-auto mb-4 bg-white p-4 flex items-center justify-center">
            <div className="w-48 h-48 bg-gradient-to-br from-mint-100 to-cosmic-100 dark:from-mint-900 to-cosmic-900 rounded-lg flex items-center justify-center">
              <QrCode className="h-32 w-32 text-mint-600 dark:text-mint-400" />
            </div>
            {/* QR Corner decorations */}
            <div className="qr-corner top-left"></div>
            <div className="qr-corner top-right"></div>
            <div className="qr-corner bottom-left"></div>
            <div className="qr-corner bottom-right"></div>
          </div>

          <p className="text-sm text-obsidian-600 dark:text-pearl-400 mb-4">
            请使用{selectedMethodData?.name}扫描上方二维码完成支付
          </p>

          <div className="flex items-center justify-center space-x-2 text-sm text-mint-600 dark:text-mint-400">
            <Zap className="h-4 w-4" />
            <span>扫码后将自动完成支付</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2 text-sm text-obsidian-600 dark:text-pearl-400">
            <Smartphone className="h-4 w-4" />
            <span>打开{selectedMethodData?.name}扫一扫功能</span>
          </div>
          
          <button
            onClick={handleBack}
            className="w-full py-3 px-6 rounded-xl border-2 border-pearl-300 dark:border-obsidian-600 text-obsidian-700 dark:text-pearl-300 hover:bg-pearl-100 dark:hover:bg-obsidian-700 transition-colors touch-feedback"
          >
            更换支付方式
          </button>
        </div>
      </div>
    );
  };

  const renderProcessing = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 bg-gradient-to-r from-mint-500 to-cosmic-500 rounded-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-obsidian-900 dark:text-pearl-100 mb-2">
          正在处理支付
        </h3>
        <p className="text-obsidian-600 dark:text-pearl-400">
          请稍候，正在为您生成支付码...
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="w-16 h-16 bg-gradient-to-r from-neon-500 to-mint-500 rounded-full flex items-center justify-center"
        >
          <Check className="h-8 w-8 text-white" />
        </motion.div>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-obsidian-900 dark:text-pearl-100 mb-2">
          支付成功！
        </h3>
        <div className="text-lg font-semibold text-mint-600 dark:text-mint-400 mb-2">
          {formatAmount(amount)}
        </div>
        <p className="text-obsidian-600 dark:text-pearl-400">
          您的订单已支付完成
        </p>
      </div>
      
      <button
        onClick={() => onSuccess({ success: true })}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-mint-500 to-cosmic-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 touch-feedback"
      >
        完成
      </button>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 bg-gradient-to-r from-sakura-500 to-sunset-500 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold text-obsidian-900 dark:text-pearl-100 mb-2">
          支付失败
        </h3>
        <p className="text-obsidian-600 dark:text-pearl-400">
          {errorMessage}
        </p>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => {
            setPaymentStep('select');
            setSelectedMethod('');
            setErrorMessage('');
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-mint-500 to-cosmic-500 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 touch-feedback"
        >
          重新支付
        </button>
        
        <button
          onClick={onCancel}
          className="w-full py-3 px-6 rounded-xl border-2 border-pearl-300 dark:border-obsidian-600 text-obsidian-700 dark:text-pearl-300 hover:bg-pearl-100 dark:hover:bg-obsidian-700 transition-colors touch-feedback"
        >
          取消支付
        </button>
      </div>
    </div>
  );

  return (
    <div className="bottom-sheet open">
      <div className="p-6 max-w-md mx-auto">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-pearl-300 dark:bg-obsidian-600 rounded-full mx-auto mb-6"></div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={paymentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {paymentStep === 'select' && renderPaymentMethods()}
            {paymentStep === 'processing' && renderProcessing()}
            {paymentStep === 'qr' && renderQRCode()}
            {paymentStep === 'success' && renderSuccess()}
            {paymentStep === 'error' && renderError()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobilePayment;