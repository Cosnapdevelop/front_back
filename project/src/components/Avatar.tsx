import React, { useState, useRef, useEffect } from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-xl sm:w-32 sm:h-32 sm:text-2xl'
};

const generateInitials = (name?: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return words
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};

const getColorFromName = (name?: string): string => {
  if (!name) return 'bg-gray-500';
  
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name, 
  size = 'md', 
  className = '', 
  fallbackClassName = '',
  onClick 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const shouldShowImage = src && !imageError;
  const initials = generateInitials(name);
  const colorClass = getColorFromName(name);
  
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
    
    if (src) {
      const img = new Image();
      img.onload = () => {
        setImageLoading(false);
        setImageError(false);
      };
      img.onerror = (error) => {
        setImageLoading(false);
        setImageError(true);
        console.error(`Avatar image failed to load: ${src}`, error);
      };
      img.src = src;
    } else {
      setImageLoading(false);
    }
  }, [src]);
  
  const baseClasses = `
    ${sizeMap[size]} 
    rounded-full 
    border-4 border-white dark:border-gray-800 
    object-cover 
    flex items-center justify-center 
    font-semibold text-white
    transition-all duration-200
    ${onClick ? 'cursor-pointer hover:scale-105' : ''}
    ${className}
  `.trim();

  if (shouldShowImage && !imageLoading) {
    return (
      <img
        ref={imgRef}
        src={src}
        alt={name || 'User avatar'}
        className={baseClasses}
        onClick={onClick}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  }

  // Show loading state
  if (imageLoading && src) {
    return (
      <div 
        className={`${baseClasses} bg-gray-300 dark:bg-gray-600 animate-pulse ${fallbackClassName}`}
        onClick={onClick}
      >
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show initials fallback
  return (
    <div 
      className={`${baseClasses} ${colorClass} ${fallbackClassName}`}
      onClick={onClick}
      title={name || 'User'}
    >
      {initials}
    </div>
  );
};

export default Avatar;