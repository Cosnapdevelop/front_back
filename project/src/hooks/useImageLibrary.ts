import { useState, useEffect } from 'react';
import imageLibraryService from '../services/imageLibraryService';

export const useImageLibrary = () => {
  const [imageCount, setImageCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setImageCount(imageLibraryService.getImageCount());
    };

    // 初始加载
    updateCount();

    // 监听 localStorage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'generated_images') {
        updateCount();
      }
    };

    // 监听自定义事件（当图片库更新时）
    const handleImageLibraryUpdate = () => {
      updateCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('imageLibraryUpdate', handleImageLibraryUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('imageLibraryUpdate', handleImageLibraryUpdate);
    };
  }, []);

  return { imageCount };
}; 