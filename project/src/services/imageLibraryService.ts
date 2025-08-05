import { GeneratedImage } from '../types';
import { createError, errorUtils } from '../types/errors';

const STORAGE_KEY = 'generated_images';
const MAX_IMAGES = 10;

// 扩展图片类型，支持处理中状态
export interface ExtendedGeneratedImage extends GeneratedImage {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  taskId?: string;
  progress?: number;
}

class ImageLibraryService {
  // 获取所有生成的图片
  getGeneratedImages(): ExtendedGeneratedImage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '加载图片库');
      return [];
    }
  }

  // 添加新生成的图片（处理中状态）
  addProcessingImage(image: Omit<ExtendedGeneratedImage, 'id' | 'createdAt'>, taskId: string): string {
    try {
      const images = this.getGeneratedImages();
      const newImage: ExtendedGeneratedImage = {
        ...image,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        status: 'processing',
        taskId: taskId,
        progress: 0
      };

      // 添加到开头（最新的在前面）
      images.unshift(newImage);

      // 保持最多 MAX_IMAGES 张图片
      if (images.length > MAX_IMAGES) {
        images.splice(MAX_IMAGES);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
      
      return newImage.id;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '保存处理中图片');
      return '';
    }
  }

  // 更新图片状态
  updateImageStatus(imageId: string, status: 'processing' | 'completed' | 'failed' | 'cancelled', progress?: number, url?: string, allUrls?: string[]): void {
    try {
      const images = this.getGeneratedImages();
      const imageIndex = images.findIndex(img => img.id === imageId);
      
      if (imageIndex !== -1) {
        images[imageIndex].status = status;
        if (progress !== undefined) {
          images[imageIndex].progress = progress;
        }
        if (url) {
          images[imageIndex].url = url;
        }
        // 保存所有图片URL
        if (allUrls && allUrls.length > 0) {
          (images[imageIndex] as any).allUrls = allUrls;
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '更新图片状态');
    }
  }

  // 添加新生成的图片（支持自定义状态）
  addGeneratedImage(image: Omit<GeneratedImage, 'id' | 'createdAt'>): void {
    try {
      const images = this.getGeneratedImages();
      const newImage: ExtendedGeneratedImage = {
        ...image,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        status: (image as any).status || 'completed' // 使用传入的状态，默认为completed
      };

      // 添加到开头（最新的在前面）
      images.unshift(newImage);

      // 保持最多 MAX_IMAGES 张图片
      if (images.length > MAX_IMAGES) {
        images.splice(MAX_IMAGES);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '保存生成图片');
    }
  }

  // 删除指定的图片
  removeGeneratedImage(imageId: string): void {
    try {
      const images = this.getGeneratedImages();
      const filteredImages = images.filter(img => img.id !== imageId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredImages));
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '删除图片');
    }
  }

  // 清空所有图片
  clearAllImages(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '清空图片库');
    }
  }

  // 获取图片数量
  getImageCount(): number {
    return this.getGeneratedImages().length;
  }

  // 检查是否有图片
  hasImages(): boolean {
    return this.getImageCount() > 0;
  }

  // 根据taskId查找图片
  findImageByTaskId(taskId: string): ExtendedGeneratedImage | undefined {
    const images = this.getGeneratedImages();
    return images.find(img => img.taskId === taskId);
  }
}

export default new ImageLibraryService(); 