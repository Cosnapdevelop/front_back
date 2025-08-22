/**
 * Optimized image component with lazy loading, performance monitoring, and progressive enhancement
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trackPerformance } from '../../utils/analytics';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean; // For above-the-fold images
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onClick?: () => void;
  sizes?: string;
  srcSet?: string;
  trackingName?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  width,
  height,
  priority = false,
  onLoad,
  onError,
  onClick,
  sizes,
  srcSet,
  trackingName = 'image'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority); // If priority, load immediately
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadStartTime = useRef<number>(0);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          loadStartTime.current = performance.now();
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before the image comes into view
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const loadEndTime = performance.now();
    const loadTime = loadEndTime - loadStartTime.current;
    
    setIsLoaded(true);
    onLoad?.(event);

    // Track image loading performance
    if (loadTime > 0) {
      trackPerformance('api_response_time', loadTime);
      
      // Log slow image loads
      if (loadTime > 2000) {
        console.warn(`Slow image load: ${src} took ${loadTime.toFixed(2)}ms`);
      }
    }
  }, [onLoad, src]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(event);
    console.error(`Failed to load image: ${src}`);
  }, [onError, src]);

  // Preload critical images
  useEffect(() => {
    if (priority && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (sizes) link.setAttribute('imagesizes', sizes);
      if (srcSet) link.setAttribute('imagesrcset', srcSet);
      document.head.appendChild(link);

      return () => {
        try {
          if (link.parentNode === document.head) {
            document.head.removeChild(link);
          }
        } catch (error) {
          // Link already removed, ignore error
          console.debug('Preload link already removed');
        }
      };
    }
  }, [priority, src, sizes, srcSet]);

  // Generate optimized src with quality and format parameters
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    // If it's already an optimized URL or data URL, return as-is
    if (originalSrc.includes('?') || originalSrc.startsWith('data:')) {
      return originalSrc;
    }

    // Add optimization parameters for supported services
    const url = new URL(originalSrc, window.location.origin);
    
    // Example optimization parameters (adjust based on your image service)
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('f', 'webp'); // Prefer WebP format
    url.searchParams.set('q', '85'); // Quality setting
    
    return url.toString();
  }, [width, height]);

  const optimizedSrc = getOptimizedSrc(src);

  const placeholderElement = (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center ${placeholderClassName}`}
      style={{ width, height }}
    >
      {hasError ? (
        <div className="text-gray-400 text-sm text-center p-4">
          <div className="mb-2">❌</div>
          <div>Failed to load image</div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Loading...</div>
      )}
    </div>
  );

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {!isVisible || (!isLoaded && !hasError) ? placeholderElement : null}
      
      {isVisible && !hasError && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isLoaded ? 'absolute inset-0' : ''} ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          style={{
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined,
          }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;