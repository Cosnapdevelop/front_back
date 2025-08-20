import React from 'react';
import { LoadingSpinner } from '../LoadingSpinner';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
  fullScreen = false,
}) => {
  const containerClasses = fullScreen 
    ? 'min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'
    : 'flex items-center justify-center py-12';

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <LoadingSpinner size={size} className="mb-4" />
        <p className={`text-gray-600 dark:text-gray-400 ${sizeClasses[size]}`}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingState;