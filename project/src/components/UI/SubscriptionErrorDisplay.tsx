import React from 'react';
import { AlertCircle, Crown, Clock, ArrowRight } from 'lucide-react';

interface SubscriptionErrorDisplayProps {
  errorCode: 'MONTHLY_LIMIT_EXCEEDED' | 'SUBSCRIPTION_EXPIRED' | 'EXCLUSIVE_FEATURE_REQUIRED';
  currentUsage?: number;
  limit?: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export const SubscriptionErrorDisplay: React.FC<SubscriptionErrorDisplayProps> = ({
  errorCode,
  currentUsage,
  limit,
  onUpgrade,
  onDismiss
}) => {
  const getNextResetDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const renderErrorContent = () => {
    switch (errorCode) {
      case 'MONTHLY_LIMIT_EXCEEDED':
        const usagePercentage = currentUsage && limit ? (currentUsage / limit) * 100 : 100;
        return (
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                本月使用次数已达上限
              </h3>
              <p className="text-orange-700 dark:text-orange-300 text-sm mb-4">
                您本月已使用 {currentUsage || limit || 20} 次AI特效处理额度，已达到免费版限制。
              </p>
              
              {/* Usage Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400 mb-1">
                  <span>使用进度</span>
                  <span>{currentUsage || limit || 20}/{limit || 20}</span>
                </div>
                <div className="w-full bg-orange-200 dark:bg-orange-800/30 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>

              <p className="text-orange-600 dark:text-orange-400 text-sm mb-4">
                📅 额度将在 <strong>{getNextResetDate()}</strong> 自动重置
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  升级到专业版
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center justify-center px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 text-sm font-medium rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'SUBSCRIPTION_EXPIRED':
        return (
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                订阅已过期
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                您的专业版订阅已过期，现已自动切换为免费版服务。请续费以继续享受专业版功能。
              </p>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-red-800 dark:text-red-200 text-xs">
                  💡 续费后将立即恢复：无限制使用、无水印输出、优先处理队列
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  立即续费
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  稍后处理
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'EXCLUSIVE_FEATURE_REQUIRED':
        return (
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                独家特效功能
              </h3>
              <p className="text-purple-700 dark:text-purple-300 text-sm mb-4">
                此特效为会员版独家功能。升级到会员版即可解锁所有独家特效，享受最新AI技术体验。
              </p>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                <p className="text-purple-800 dark:text-purple-200 text-xs">
                  ✨ 会员版特权：独家特效库、最高优先级处理、专属技术支持、新功能抢先体验
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  升级到会员版
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center justify-center px-4 py-2 border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  返回选择其他特效
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // 根据错误类型确定容器样式
  const getContainerStyle = () => {
    switch (errorCode) {
      case 'MONTHLY_LIMIT_EXCEEDED':
        return "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800";
      case 'SUBSCRIPTION_EXPIRED':
        return "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800";
      case 'EXCLUSIVE_FEATURE_REQUIRED':
        return "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800";
    }
  };

  return (
    <div className={`${getContainerStyle()} rounded-lg p-6`}>
      {renderErrorContent()}
    </div>
  );
};

export default SubscriptionErrorDisplay;