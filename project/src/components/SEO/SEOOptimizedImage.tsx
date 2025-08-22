import React, { useState, useCallback } from 'react';

interface SEOImageProps {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  className?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const SEOOptimizedImage: React.FC<SEOImageProps> = ({
  src,
  alt,
  title,
  width,
  height,
  loading = 'lazy',
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  onLoad,
  onError
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  // Generate responsive srcSet for different screen densities
  const generateSrcSet = useCallback((imageSrc: string): string => {
    if (!imageSrc) return '';
    
    // If it's an external URL or already has parameters, return as-is
    if (imageSrc.startsWith('http') || imageSrc.includes('?')) {
      return imageSrc;
    }
    
    // Generate responsive variants for Cosnap images
    const basePath = imageSrc.replace(/\.[^/.]+$/, ''); // Remove extension
    const extension = imageSrc.match(/\.[^/.]+$/)?.[0] || '.jpg';
    
    return [
      `${basePath}-320w${extension} 320w`,
      `${basePath}-640w${extension} 640w`,
      `${basePath}-768w${extension} 768w`,
      `${basePath}-1024w${extension} 1024w`,
      `${basePath}-1200w${extension} 1200w`,
      `${imageSrc} 1920w`
    ].join(', ');
  }, []);

  // Generate WebP variant if supported
  const generateWebPSrc = useCallback((imageSrc: string): string => {
    if (!imageSrc || imageSrc.startsWith('http')) return imageSrc;
    return imageSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }, []);

  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <picture className={className}>
      {/* WebP variant for modern browsers */}
      <source
        srcSet={generateSrcSet(generateWebPSrc(src))}
        sizes={sizes}
        type="image/webp"
      />
      
      {/* Fallback for older browsers */}
      <img
        src={src}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
        alt={alt}
        title={title}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300 
          ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          ${className}
        `}
        style={{
          // Prevent layout shift during image load
          aspectRatio: width && height ? `${width}/${height}` : undefined,
          objectFit: 'cover'
        }}
      />
      
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div 
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"
          style={{ width, height }}
        />
      )}
    </picture>
  );
};

// Specialized component for effect preview images
export const EffectPreviewImage: React.FC<{
  effect: any;
  className?: string;
  priority?: boolean;
}> = ({ effect, className = '', priority = false }) => {
  const alt = `${effect.name} AI effect preview - ${effect.description || 'Transform your photos with this amazing AI effect'}`;
  
  return (
    <SEOOptimizedImage
      src={effect.previewImage || '/effects/default-preview.jpg'}
      alt={alt}
      title={`${effect.name} - ${effect.category} Effect`}
      width={300}
      height={200}
      className={className}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
};

// Specialized component for user avatars
export const UserAvatarImage: React.FC<{
  user: any;
  size?: number;
  className?: string;
}> = ({ user, size = 40, className = '' }) => {
  const alt = `${user.name || 'User'} profile picture`;
  
  return (
    <SEOOptimizedImage
      src={user.avatar || '/avatars/default-avatar.png'}
      alt={alt}
      title={`${user.name || 'User'}'s profile`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      loading="lazy"
    />
  );
};

// Specialized component for post images
export const PostImage: React.FC<{
  post: any;
  className?: string;
  priority?: boolean;
}> = ({ post, className = '', priority = false }) => {
  const alt = `${post.title || 'AI-enhanced photo'} - Created by ${post.author?.name || 'Cosnap user'} using Cosnap AI effects`;
  
  return (
    <SEOOptimizedImage
      src={post.imageUrl}
      alt={alt}
      title={post.title}
      className={className}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
};

export default SEOOptimizedImage;