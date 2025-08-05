import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  onDownload?: (imageUrl: string, index: number) => void;
  className?: string;
  showIndicators?: boolean;
  showNavigation?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  onDownload,
  className = '',
  showIndicators = true,
  showNavigation = true,
  autoPlay = false,
  autoPlayInterval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 自动播放
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, images.length]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>暂无图片</p>
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={images[0]}
          alt="Generated image"
          className="w-full h-full object-cover rounded-lg"
        />
        {onDownload && (
          <button
            onClick={() => onDownload(images[0], 0)}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-full shadow-lg hover:shadow-xl transition-colors z-20"
            title="下载图片"
          >
            <Download className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* 图片容器 */}
      <div className="relative aspect-square">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Generated image ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>

        {/* 下载按钮 */}
        {onDownload && (
          <button
            onClick={() => onDownload(images[currentIndex], currentIndex)}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-2 rounded-full shadow-lg hover:shadow-xl transition-colors z-20"
            title="下载图片"
          >
            <Download className="h-4 w-4 text-white" />
          </button>
        )}

        {/* 导航按钮 */}
        {showNavigation && images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
              title="上一张"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
              title="下一张"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* 图片计数器 */}
        {images.length > 1 && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs z-20">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* 指示器 */}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              title={`跳转到第 ${index + 1} 张图片`}
            />
          ))}
        </div>
      )}

      {/* 键盘导航 */}
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              prevImage();
              break;
            case 'ArrowRight':
              e.preventDefault();
              nextImage();
              break;
          }
        }}
        className="absolute inset-0 focus:outline-none"
      />
    </div>
  );
};

export default ImageCarousel; 