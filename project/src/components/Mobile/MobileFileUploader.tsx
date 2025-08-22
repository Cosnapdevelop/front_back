import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  Upload, 
  Camera, 
  Image as ImageIcon, 
  X, 
  Check,
  AlertCircle,
  RotateCcw,
  Maximize2,
  RotateCw,
  Crop,
  Zap
} from 'lucide-react';
import { useBeta } from '../../context/BetaContext';

interface MobileFileUploaderProps {
  onUpload: (file: File) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  currentFile?: { url?: string; name?: string; size?: number };
  error?: string;
  disabled?: boolean;
  showCameraOption?: boolean;
  showGalleryOption?: boolean;
  // Enhanced mobile features
  enableGestures?: boolean;
  enableHapticFeedback?: boolean;
  showPreview?: boolean;
  enableRotation?: boolean;
  enableCrop?: boolean;
  compressionQuality?: number;
}

const MobileFileUploader: React.FC<MobileFileUploaderProps> = ({
  onUpload,
  onError,
  accept = "image/jpeg,image/jpg,image/png,image/gif,image/webp",
  maxSize = 30, // 30MB default
  label = "Upload Image",
  currentFile,
  error,
  disabled = false,
  showCameraOption = true,
  showGalleryOption = true,
  enableGestures = true,
  enableHapticFeedback = true,
  showPreview = true,
  enableRotation = false,
  enableCrop = false,
  compressionQuality = 0.9
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'fast' | 'offline'>('fast');
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-100, 0], [0.5, 1]);
  
  const { isFeatureEnabled, trackBetaEvent } = useBeta();

  // Network detection
  useEffect(() => {
    const updateNetworkSpeed = () => {
      if (!navigator.onLine) {
        setNetworkSpeed('offline');
        return;
      }
      
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        setNetworkSpeed(effectiveType === '2g' || effectiveType === '3g' ? 'slow' : 'fast');
        setCompressionEnabled(effectiveType === '2g' || connection.saveData);
      }
    };

    updateNetworkSpeed();
    window.addEventListener('online', updateNetworkSpeed);
    window.addEventListener('offline', updateNetworkSpeed);
    
    return () => {
      window.removeEventListener('online', updateNetworkSpeed);
      window.removeEventListener('offline', updateNetworkSpeed);
    };
  }, []);

  // Haptic feedback simulation
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback) return;
    
    // Try native haptic feedback first (iOS Safari)
    if ('vibrate' in navigator) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [200]
      };
      navigator.vibrate(patterns[type]);
    }
    
    // Fallback to CSS animation
    document.body.classList.add(`haptic-${type}`);
    setTimeout(() => document.body.classList.remove(`haptic-${type}`), 150);
    
    // Track usage
    trackBetaEvent('mobile_haptic_feedback', { type, enabled: enableHapticFeedback });
  }, [enableHapticFeedback, trackBetaEvent]);

  // Enhanced file validation with security checks and compression support
  const validateFile = useCallback((file: File): string | null => {
    // Size validation
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }
    
    // Minimum size check (prevent empty files)
    if (file.size < 100) {
      return 'File is too small or empty';
    }
    
    // File type validation (strict MIME type checking)
    const acceptedTypes = accept.split(',').map(type => type.trim());
    if (!acceptedTypes.some(type => file.type.includes(type.replace('image/', '')))) {
      return 'Invalid file type. Please select an image file.';
    }
    
    return null;
  }, [accept, maxSize]);

  // Image compression utility
  const compressImage = useCallback(async (file: File, quality: number = 0.9): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions based on network speed
        const maxWidth = networkSpeed === 'slow' ? 1080 : 1920;
        const maxHeight = networkSpeed === 'slow' ? 1080 : 1920;
        
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, [networkSpeed]);

  // Enhanced file selection with compression and progress tracking
  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError?.(validationError);
      triggerHaptic('heavy');
      return;
    }

    triggerHaptic('light');
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let processedFile = file;
      
      // Apply compression if enabled or network is slow
      if (compressionEnabled || networkSpeed === 'slow') {
        setUploadProgress(10);
        processedFile = await compressImage(file, compressionQuality);
        
        // Track compression stats
        trackBetaEvent('mobile_image_compression', {
          original_size: file.size,
          compressed_size: processedFile.size,
          compression_ratio: ((file.size - processedFile.size) / file.size).toFixed(2),
          network_speed: networkSpeed
        });
      }
      
      // Enhanced upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + (networkSpeed === 'slow' ? 5 : 15);
        });
      }, networkSpeed === 'slow' ? 200 : 100);

      // Simulate network-aware upload delay
      const uploadDelay = networkSpeed === 'slow' ? 1500 : 500;
      await new Promise(resolve => setTimeout(resolve, uploadDelay));
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onUpload(processedFile);
        setIsUploading(false);
        setUploadProgress(0);
        setShowOptions(false);
        triggerHaptic('medium');
        
        // Track successful upload
        trackBetaEvent('mobile_file_upload_success', {
          file_size: processedFile.size,
          file_type: processedFile.type,
          network_speed: networkSpeed,
          compression_used: compressionEnabled
        });
      }, 300);
      
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      triggerHaptic('heavy');
      onError?.(err instanceof Error ? err.message : 'Upload failed');
      
      // Track upload error
      trackBetaEvent('mobile_file_upload_error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        network_speed: networkSpeed
      });
    }
  }, [validateFile, onUpload, onError, triggerHaptic, compressionEnabled, networkSpeed, compressImage, compressionQuality, trackBetaEvent]);

  // Enhanced gesture and drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
      triggerHaptic('light');
    }
  }, [disabled, triggerHaptic]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    triggerHaptic('medium');

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
    
    trackBetaEvent('mobile_drag_drop_upload', { file_count: files.length });
  }, [disabled, handleFileSelect, triggerHaptic, trackBetaEvent]);

  // Pan gesture handler for enhanced mobile interactions
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (!enableGestures) return;
    
    const { offset, velocity } = info;
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (offset.y < -swipeThreshold || velocity.y < -velocityThreshold) {
      // Swipe up to open options
      if (!showOptions && !disabled && !currentFile?.url) {
        setShowOptions(true);
        triggerHaptic('medium');
        trackBetaEvent('mobile_swipe_upload', { direction: 'up' });
      }
    }
  }, [enableGestures, showOptions, disabled, currentFile, triggerHaptic, trackBetaEvent]);

  // Enhanced touch-optimized file input handlers
  const handleGallerySelect = () => {
    triggerHaptic('light');
    fileInputRef.current?.click();
    trackBetaEvent('mobile_gallery_select');
  };

  const handleCameraSelect = () => {
    triggerHaptic('light');
    cameraInputRef.current?.click();
    trackBetaEvent('mobile_camera_select');
  };

  const handlePreviewToggle = () => {
    if (!currentFile?.url) return;
    setShowPreviewModal(!showPreviewModal);
    triggerHaptic('medium');
    trackBetaEvent('mobile_preview_toggle');
  };

  const handleRotateImage = () => {
    setPreviewRotation(prev => (prev + 90) % 360);
    triggerHaptic('light');
    trackBetaEvent('mobile_image_rotate', { rotation: previewRotation + 90 });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  };

  const clearFile = () => {
    setUploadProgress(0);
    setIsUploading(false);
    setPreviewRotation(0);
    setShowPreviewModal(false);
    triggerHaptic('medium');
    trackBetaEvent('mobile_file_clear');
    // This would need to call a prop to clear the current file
  };

  // Network status indicator
  const getNetworkStatusColor = () => {
    switch (networkSpeed) {
      case 'offline': return 'text-red-500';
      case 'slow': return 'text-yellow-500';
      case 'fast': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getNetworkStatusText = () => {
    switch (networkSpeed) {
      case 'offline': return 'Offline';
      case 'slow': return 'Slow Network';
      case 'fast': return 'Fast Network';
      default: return 'Unknown';
    }
  };

  return (
    <div className="w-full">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {label}
      </div>

      {/* Network Status Indicator */}
      {isFeatureEnabled('enhancedImageUploader') && (
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className={`flex items-center space-x-1 ${getNetworkStatusColor()}`}>
            <div className={`w-2 h-2 rounded-full ${
              networkSpeed === 'offline' ? 'bg-red-500' :
              networkSpeed === 'slow' ? 'bg-yellow-500 animate-pulse' :
              'bg-green-500'
            }`}></div>
            <span>{getNetworkStatusText()}</span>
          </div>
          {compressionEnabled && (
            <div className="flex items-center space-x-1 text-blue-500">
              <Zap size={12} />
              <span>Smart Compression</span>
            </div>
          )}
        </div>
      )}

      {/* Main Upload Area - Enhanced with Gestures */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 min-h-touch
          ${isDragOver 
            ? 'border-mint-400 bg-mint-50 dark:bg-mint-900/20 scale-105' 
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer touch-manipulation'}
          ${currentFile?.url ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : ''}
        `}
        style={{ y: dragY, opacity: dragOpacity }}
        drag={enableGestures && !disabled && !currentFile?.url ? "y" : false}
        dragConstraints={{ top: -100, bottom: 0 }}
        onPanEnd={handlePanEnd}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && !currentFile?.url && setShowOptions(true)}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="w-12 h-12 mx-auto mb-3 relative">
                <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                <div 
                  className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"
                  style={{
                    background: `conic-gradient(from 0deg, transparent ${360 - (uploadProgress * 3.6)}deg, #3b82f6 ${360 - (uploadProgress * 3.6)}deg)`
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uploading... {uploadProgress}%
              </p>
            </motion.div>
          ) : currentFile?.url ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <div className="relative inline-block mb-3">
                <motion.img 
                  src={currentFile.url} 
                  alt={currentFile.name} 
                  className="w-24 h-24 object-cover rounded-lg mx-auto cursor-pointer"
                  style={{ transform: `rotate(${previewRotation}deg)` }}
                  onClick={showPreview ? handlePreviewToggle : undefined}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
                
                {/* Enhanced action buttons */}
                <div className="absolute -top-2 -right-2 flex space-x-1">
                  {enableRotation && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateImage();
                      }}
                      className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-600 transition-colors touch-manipulation"
                      whileTap={{ scale: 0.9 }}
                      title="Rotate"
                    >
                      <RotateCw size={10} />
                    </motion.button>
                  )}
                  
                  {showPreview && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewToggle();
                      }}
                      className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-600 transition-colors touch-manipulation"
                      whileTap={{ scale: 0.9 }}
                      title="Preview"
                    >
                      <Maximize2 size={10} />
                    </motion.button>
                  )}
                  
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors touch-manipulation"
                    whileTap={{ scale: 0.9 }}
                    title="Remove"
                  >
                    <X size={10} />
                  </motion.button>
                </div>
              </div>
              <div className="flex items-center justify-center text-green-600 dark:text-green-400 mb-2">
                <Check size={16} className="mr-1" />
                <span className="text-sm font-medium">Upload Complete</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentFile.name} 
                {currentFile.size && ` (${(currentFile.size / 1024 / 1024).toFixed(1)}MB)`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <motion.div
                animate={isDragOver ? { scale: 1.1, rotate: 360 } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-mint-500" />
              </motion.div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tap to upload image
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {enableGestures ? 'Swipe up for options or drag & drop' : 'Or drag and drop your image here'}
              </p>
              <div className="flex items-center justify-center space-x-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                <span>Max: {maxSize}MB</span>
                <span>•</span>
                <span>JPG, PNG, GIF, WebP</span>
                {compressionEnabled && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500">Auto-compress</span>
                  </>
                )}
              </div>
              
              {/* Gesture hint */}
              {enableGestures && !currentFile?.url && (
                <motion.div
                  className="mt-3 text-xs text-mint-500 flex items-center justify-center space-x-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <span>↑</span>
                  <span>Swipe up for camera options</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start"
        >
          <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Mobile Upload Options Modal */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowOptions(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-6 z-50 safe-area-pb"
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6"></div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
                Select Image Source
              </h3>

              <div className="space-y-3">
                {showCameraOption && (
                  <motion.button
                    onClick={handleCameraSelect}
                    className="w-full flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-manipulation min-h-touch"
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4 flex-shrink-0">
                      <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Take Photo
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Use your camera to capture an image
                      </div>
                    </div>
                  </motion.button>
                )}

                {showGalleryOption && (
                  <motion.button
                    onClick={handleGallerySelect}
                    className="w-full flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-manipulation min-h-touch"
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-4 flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Choose from Gallery
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Select an image from your photo library
                      </div>
                    </div>
                  </motion.button>
                )}

                {/* Advanced options for beta users */}
                {isFeatureEnabled('enhancedImageUploader') && (
                  <>
                    {enableCrop && (
                      <motion.button
                        onClick={() => {
                          setShowOptions(false);
                          // Handle crop functionality
                          trackBetaEvent('mobile_crop_option_selected');
                        }}
                        className="w-full flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-colors touch-manipulation min-h-touch border border-purple-200 dark:border-purple-700"
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-4 flex-shrink-0">
                          <Crop className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="text-left">
                          <div className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            Advanced Editor
                            <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full">BETA</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Crop, rotate, and enhance your image
                          </div>
                        </div>
                      </motion.button>
                    )}
                  </>
                )}

                <motion.button
                  onClick={() => {
                    setShowOptions(false);
                    triggerHaptic('light');
                  }}
                  className="w-full p-4 text-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors touch-manipulation min-h-touch rounded-xl"
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full-Screen Preview Modal for Beta Users */}
      <AnimatePresence>
        {showPreviewModal && currentFile?.url && isFeatureEnabled('enhancedImageUploader') && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50"
              onClick={() => setShowPreviewModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-4 z-50 flex items-center justify-center"
            >
              <div className="relative max-w-full max-h-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                {/* Preview Header */}
                <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
                  <div className="flex items-center justify-between text-white">
                    <h3 className="text-lg font-semibold">{currentFile.name}</h3>
                    <div className="flex items-center space-x-2">
                      {enableRotation && (
                        <motion.button
                          onClick={handleRotateImage}
                          className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors touch-manipulation"
                          whileTap={{ scale: 0.9 }}
                        >
                          <RotateCw size={20} />
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => setShowPreviewModal(false)}
                        className="w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors touch-manipulation"
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={20} />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Preview Image */}
                <motion.img
                  src={currentFile.url}
                  alt={currentFile.name}
                  className="w-full h-full object-contain max-h-screen"
                  style={{ 
                    transform: `rotate(${previewRotation}deg)`,
                    maxWidth: '100vw',
                    maxHeight: 'calc(100vh - 8rem)'
                  }}
                  drag
                  dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                  whileDrag={{ scale: 0.95 }}
                />

                {/* Preview Footer */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                  <div className="text-white text-center">
                    <p className="text-sm opacity-75">
                      {currentFile.size && `${(currentFile.size / 1024 / 1024).toFixed(1)}MB`}
                      {compressionEnabled && ' • Compressed'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default MobileFileUploader;