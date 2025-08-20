import React from 'react';
import { Play, StopCircle, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';

interface ProcessingControlsProps {
  isProcessing: boolean;
  progress: number;
  error?: string;
  isCancelled: boolean;
  onProcess: () => void;
  onCancel: () => void;
  onDebug?: () => void;
  disabled?: boolean;
}

export const ProcessingControls: React.FC<ProcessingControlsProps> = ({
  isProcessing,
  progress,
  error,
  isCancelled,
  onProcess,
  onCancel,
  onDebug,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Main Process Button */}
      <button
        onClick={onProcess}
        disabled={isProcessing || disabled}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed 
                 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 
                 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]
                 flex items-center justify-center space-x-2"
      >
        {isProcessing ? (
          <>
            <LoadingSpinner size="sm" color="white" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            <span>Start Processing</span>
          </>
        )}
      </button>

      {/* Debug Button - Development Only */}
      {onDebug && process.env.NODE_ENV === 'development' && (
        <button
          onClick={onDebug}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 
                   rounded-lg transition-colors text-sm"
        >
          Debug State
        </button>
      )}

      {/* Cancel Button */}
      {isProcessing && (
        <button 
          onClick={onCancel}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 
                   rounded-lg transition-colors flex items-center justify-center space-x-2
                   shadow-lg hover:shadow-xl"
        >
          <StopCircle className="h-5 w-5" />
          <span>Cancel Processing</span>
        </button>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="mb-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full 
                       transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && !isCancelled && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                      rounded-lg p-4 animate-fade-in">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
          </div>
        </div>
      )}
      
      {/* Cancelled Status */}
      {isCancelled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 
                      rounded-lg p-4 animate-fade-in">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">Task cancelled</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingControls;