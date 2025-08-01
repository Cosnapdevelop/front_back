import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  progress?: number; // 0-100
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  progress,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-mint-600',
    secondary: 'text-obsidian-600',
    white: 'text-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* 加载动画 */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin rounded-full border-2 border-current border-t-transparent`}
        />
        
        {/* 进度指示器 */}
        {progress !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-medium ${colorClasses[color]}`}>
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      
      {/* 文本提示 */}
      {text && (
        <p className={`mt-2 text-sm font-medium ${colorClasses[color]}`}>
          {text}
        </p>
      )}
    </div>
  );
};

// 脉冲加载动画
export const PulseSpinner: React.FC<Omit<LoadingSpinnerProps, 'progress'>> = ({
  size = 'md',
  color = 'primary',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'bg-mint-600',
    secondary: 'bg-obsidian-600',
    white: 'bg-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
      />
      {text && (
        <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {text}
        </p>
      )}
    </div>
  );
};

// 任务状态指示器
export const TaskStatusIndicator: React.FC<{
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  className?: string;
}> = ({ status, progress, className = '' }) => {
  const statusConfig = {
    pending: {
      icon: '⏳',
      text: '等待中',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    },
    processing: {
      icon: '🔄',
      text: '处理中',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    completed: {
      icon: '✅',
      text: '已完成',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    failed: {
      icon: '❌',
      text: '失败',
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    cancelled: {
      icon: '⏹️',
      text: '已取消',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-900/20'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${config.bgColor} ${className}`}>
      <span className="text-lg">{config.icon}</span>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
      {status === 'processing' && progress !== undefined && (
        <span className="text-xs text-gray-500">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}; 