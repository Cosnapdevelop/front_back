import React from 'react';
import { ImageIcon } from 'lucide-react';
import ImageCarousel from '../ImageCarousel';

interface ResultsPanelProps {
  results: string[];
  onDownload: (imageUrl: string, index: number) => void;
  isLoading?: boolean;
  className?: string;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  onDownload,
  isLoading = false,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Results
      </h2>
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Processing your image...</span>
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <ImageCarousel
            images={results}
            onDownload={onDownload}
            className="w-full"
            showIndicators={true}
            showNavigation={true}
            autoPlay={false}
          />
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {results.length} result{results.length !== 1 ? 's' : ''} generated
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No results yet</p>
          <p className="text-sm">Upload images and start processing to see results.</p>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;