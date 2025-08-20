import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, 
  Share2, 
  Download, 
  Heart, 
  MessageCircle, 
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface ImageData {
  id: string;
  url: string;
  title?: string;
  description?: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
}

interface MobileImageGalleryProps {
  images: ImageData[];
  initialIndex?: number;
  onClose: () => void;
  onLike?: (imageId: string) => void;
  onShare?: (imageId: string) => void;
  onDownload?: (imageId: string) => void;
  onComment?: (imageId: string) => void;
}

const MobileImageGallery: React.FC<MobileImageGalleryProps> = ({
  images,
  initialIndex = 0,
  onClose,
  onLike,
  onShare,
  onDownload,
  onComment
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef(0);
  const doubleTapThreshold = 300;

  const currentImage = images[currentIndex];

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  }, [currentIndex, images.length]);

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setImagePosition({ x: 0, y: 0 });
    setIsZoomed(false);
  }, []);

  // Zoom functions
  const handleZoomIn = () => {
    const newScale = Math.min(zoomScale * 1.5, 4);
    setZoomScale(newScale);
    setIsZoomed(newScale > 1);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(zoomScale / 1.5, 1);
    setZoomScale(newScale);
    setIsZoomed(newScale > 1);
    if (newScale === 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  // Touch handling for double-tap zoom
  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < doubleTapThreshold && timeSinceLastTap > 0) {
      // Double tap - toggle zoom
      if (isZoomed) {
        resetZoom();
      } else {
        setZoomScale(2);
        setIsZoomed(true);
      }
    } else {
      // Single tap - toggle controls
      setShowControls(!showControls);
      resetControlsTimeout();
    }
    
    lastTapRef.current = now;
  };

  // Pan handling for zoomed images and gallery navigation
  const handlePanStart = (event: any, info: PanInfo) => {
    setIsDragging(true);
    
    // Determine drag direction based on initial movement
    const deltaX = Math.abs(info.delta.x);
    const deltaY = Math.abs(info.delta.y);
    
    if (isZoomed) {
      setDragDirection(null); // Allow free movement when zoomed
    } else if (deltaX > deltaY) {
      setDragDirection('horizontal');
    } else {
      setDragDirection('vertical');
    }
  };

  const handlePan = (event: any, info: PanInfo) => {
    if (isZoomed) {
      // Pan zoomed image
      const containerRect = containerRef.current?.getBoundingClientRect();
      const imageRect = imageRef.current?.getBoundingClientRect();
      
      if (containerRect && imageRect) {
        const maxX = (imageRect.width * zoomScale - containerRect.width) / 2;
        const maxY = (imageRect.height * zoomScale - containerRect.height) / 2;
        
        const newX = Math.max(-maxX, Math.min(maxX, imagePosition.x + info.delta.x));
        const newY = Math.max(-maxY, Math.min(maxY, imagePosition.y + info.delta.y));
        
        setImagePosition({ x: newX, y: newY });
      }
    }
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (!isZoomed) {
      const { offset, velocity } = info;
      
      if (dragDirection === 'horizontal') {
        // Horizontal swipe for navigation
        const swipeThreshold = 50;
        const velocityThreshold = 500;
        
        if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
          goToPrevious();
        } else if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
          goToNext();
        }
      } else if (dragDirection === 'vertical') {
        // Vertical swipe to close
        const swipeThreshold = 100;
        const velocityThreshold = 500;
        
        if (offset.y > swipeThreshold || velocity.y > velocityThreshold) {
          onClose();
        }
      }
    }
    
    setDragDirection(null);
  };

  // Pinch to zoom (for touch devices)
  const handlePinch = (scale: number) => {
    const newScale = Math.max(1, Math.min(4, scale));
    setZoomScale(newScale);
    setIsZoomed(newScale > 1);
    
    if (newScale === 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleShare = () => {
    if (onShare && currentImage) {
      onShare(currentImage.id);
    }
    // Simulate sharing via Web Share API or fallback
    if (navigator.share && currentImage) {
      navigator.share({
        title: currentImage.title || '分享图片',
        text: currentImage.description || '来自 Cosnap 的精美图片',
        url: currentImage.url
      }).catch(() => {
        // Fallback to copy link
        navigator.clipboard.writeText(currentImage.url);
      });
    }
  };

  const handleDownload = () => {
    if (onDownload && currentImage) {
      onDownload(currentImage.id);
    }
    
    // Trigger download
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = currentImage.title || `image-${currentImage.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLike = () => {
    if (onLike && currentImage) {
      onLike(currentImage.id);
      
      // Add haptic feedback simulation
      document.body.classList.add('haptic-medium');
      setTimeout(() => document.body.classList.remove('haptic-medium'), 150);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black"
      />

      {/* Image Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
        onClick={handleTap}
      >
        <motion.div
          drag={!isDragging || isZoomed}
          dragElastic={0.1}
          dragMomentum={false}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          className="relative w-full h-full flex items-center justify-center"
          style={{
            touchAction: isZoomed ? 'none' : 'pan-y',
          }}
        >
          <motion.img
            ref={imageRef}
            src={currentImage.url}
            alt={currentImage.title || `Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              scale: zoomScale,
              x: imagePosition.x,
              y: imagePosition.y,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            draggable={false}
          />
        </motion.div>
      </div>

      {/* Top Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 pt-safe"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </div>
              
              <button
                className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback"
              >
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Arrows */}
      <AnimatePresence>
        {showControls && !isZoomed && images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback"
              >
                <ArrowLeft className="h-6 w-6" />
              </motion.button>
            )}
            
            {currentIndex < images.length - 1 && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback"
              >
                <ArrowRight className="h-6 w-6" />
              </motion.button>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Zoom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2"
          >
            <button
              onClick={handleZoomIn}
              disabled={zoomScale >= 4}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback disabled:opacity-50"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleZoomOut}
              disabled={zoomScale <= 1}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback disabled:opacity-50"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pb-safe"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {/* Image Info */}
            {(currentImage.title || currentImage.description) && (
              <div className="mb-4 text-white">
                {currentImage.title && (
                  <h3 className="text-lg font-semibold mb-1">{currentImage.title}</h3>
                )}
                {currentImage.description && (
                  <p className="text-sm text-white/80">{currentImage.description}</p>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  className="flex items-center space-x-2 text-white touch-feedback"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm">
                    <Heart 
                      className={`h-5 w-5 ${currentImage.isLiked ? 'fill-sakura-500 text-sakura-500' : ''}`} 
                    />
                  </div>
                  {currentImage.likes && (
                    <span className="text-sm">{currentImage.likes}</span>
                  )}
                </button>
                
                <button
                  onClick={() => onComment && onComment(currentImage.id)}
                  className="flex items-center space-x-2 text-white touch-feedback"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  {currentImage.comments && (
                    <span className="text-sm">{currentImage.comments}</span>
                  )}
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white touch-feedback"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                resetZoom();
              }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileImageGallery;