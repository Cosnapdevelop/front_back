import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, Share } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import OptimizedImage from './UI/OptimizedImage';
import { trackEngagement, trackPerformance, trackFeatureUsage } from '../utils/analytics';
import { useRenderPerformance } from '../hooks/usePerformanceMonitoring';

interface TaskResultGalleryProps {
  images?: Array<{ id: string; url: string }>;
  onPreview?: (image: { id: string; url: string }) => void;
}

const TaskResultGallery: React.FC<TaskResultGalleryProps> = ({ images = [], onPreview }) => {
  const { push } = useToast();
  const { measureRender } = useRenderPerformance('TaskResultGallery');
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [downloadingImages, setDownloadingImages] = useState<Set<string>>(new Set());
  const [visibleImageCount, setVisibleImageCount] = useState(3); // Progressive loading
  const galleryRef = useRef<HTMLDivElement>(null);
  const loadStartTimes = useRef<Map<string, number>>(new Map());

  // Track gallery performance metrics
  useEffect(() => {
    if (images && images.length > 0) {
      trackFeatureUsage('ai_results_gallery', 'viewed');
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        trackPerformance('effect_processing_time', endTime - startTime);
      };
    }
  }, [images]);

  // Progressive loading implementation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleImageCount < images.length) {
          setVisibleImageCount(prev => Math.min(prev + 2, images.length));
        }
      },
      { rootMargin: '200px' }
    );

    if (galleryRef.current) {
      observer.observe(galleryRef.current);
    }

    return () => observer.disconnect();
  }, [visibleImageCount, images.length]);

  // Cleanup map on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      loadStartTimes.current.clear();
    };
  }, []);

  const handleImageLoad = useCallback((imageId: string) => {
    measureRender(() => {
      setLoadedImages(prev => new Set([...prev, imageId]));
    });
    
    // Track individual image load performance
    const startTime = loadStartTimes.current.get(imageId);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      trackPerformance('api_response_time', loadTime);
      loadStartTimes.current.delete(imageId);
    }
  }, [measureRender]);

  const handleImageLoadStart = useCallback((imageId: string) => {
    loadStartTimes.current.set(imageId, performance.now());
  }, []);

  const handleDownload = useCallback(async (image: { id: string; url: string }) => {
    if (downloadingImages.has(image.id)) return;
    
    const downloadStart = performance.now();
    setDownloadingImages(prev => new Set([...prev, image.id]));
    
    try {
      // Track engagement
      trackEngagement('result_download');
      
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cosnap_ai_result_${image.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Track download performance
      const downloadTime = performance.now() - downloadStart;
      trackPerformance('api_response_time', downloadTime);
      
      push('success', 'Image downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      push('error', 'Download failed. Please try again.');
    } finally {
      setDownloadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(image.id);
        return newSet;
      });
    }
  }, [downloadingImages, push]);

  const handleShare = useCallback(async (image: { id: string; url: string }) => {
    // Track engagement
    trackEngagement('result_share');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my AI-enhanced image!',
          text: 'Created with Cosnap AI - Transform your photos with AI effects',
          url: image.url,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          fallbackShare(image.url);
        }
      }
    } else {
      fallbackShare(image.url);
    }
  }, []);

  const fallbackShare = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    push('success', 'Image URL copied to clipboard!');
  }, [push]);

  // Memoize visible images for performance
  const visibleImages = useMemo(() => images.slice(0, visibleImageCount), [images, visibleImageCount]);

  // Calculate gallery performance stats
  const galleryStats = useMemo(() => ({
    totalImages: images.length,
    loadedImages: loadedImages.size,
    loadingProgress: images.length > 0 ? (loadedImages.size / images.length) * 100 : 0,
    visibleCount: visibleImageCount
  }), [images.length, loadedImages.size, visibleImageCount]);

  if (!images || images.length === 0) return null;

  return (
    <div ref={galleryRef} className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          AI Enhanced Results
        </h3>
        <div className="flex items-center space-x-3">
          {/* Loading progress indicator */}
          {galleryStats.loadingProgress < 100 && (
            <div className="flex items-center space-x-2">
              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${galleryStats.loadingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(galleryStats.loadingProgress)}%
              </span>
            </div>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {galleryStats.totalImages} result{galleryStats.totalImages !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {visibleImages.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-3"
        >
          <div className="relative group">
            {/* Optimized image with advanced lazy loading */}
            <OptimizedImage
              src={image.url}
              alt={`AI Enhanced Result ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg"
              placeholderClassName="w-full h-48 rounded-lg"
              height={192} // 48 * 4 (for Tailwind's h-48)
              priority={index < 2} // Prioritize first 2 images
              onClick={() => {
                if (onPreview) onPreview(image);
                trackFeatureUsage('ai_results_gallery', 'clicked');
                trackEngagement('result_download');
              }}
              onLoad={() => {
                handleImageLoad(image.id);
                trackFeatureUsage('ai_results_gallery', 'completed');
              }}
              onError={() => {
                console.error(`Failed to load result image: ${image.id}`);
              }}
              trackingName={`result-gallery-image-${index}`}
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => onPreview && onPreview(image)}
                  className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full transition-colors"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleShare(image)}
                  className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full transition-colors"
                  title="Share"
                >
                  <Share className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Status badge */}
            <div className="absolute bottom-2 left-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              ✨ AI Enhanced
            </div>
          </div>
          
          {/* Download button */}
          <button
            onClick={() => handleDownload(image)}
            disabled={downloadingImages.has(image.id)}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed"
          >
            {downloadingImages.has(image.id) ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {downloadingImages.has(image.id) ? 'Downloading...' : 'Download Result'}
            </span>
          </button>
        </motion.div>
      ))}
      
      {/* Load more button for remaining images */}
      {visibleImageCount < images.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-4"
        >
          <button
            onClick={() => {
              setVisibleImageCount(prev => Math.min(prev + 3, images.length));
              trackFeatureUsage('ai_results_gallery', 'clicked');
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Load {Math.min(3, images.length - visibleImageCount)} More Result{Math.min(3, images.length - visibleImageCount) !== 1 ? 's' : ''}
          </button>
        </motion.div>
      )}
      
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 border-t pt-2 mt-4">
          Gallery Performance: {galleryStats.loadedImages}/{galleryStats.totalImages} loaded, 
          showing {galleryStats.visibleCount} of {galleryStats.totalImages}
        </div>
      )}
    </div>
  );
};

export default TaskResultGallery; 