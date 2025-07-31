import { GeneratedImage } from '../types';

const STORAGE_KEY = 'generated_images';
const MAX_IMAGES = 10;

// 扩展图片类型，支持处理中状态
export interface ExtendedGeneratedImage extends GeneratedImage {
  status?: 'processing' | 'completed' | 'failed' | 'cancelled';
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
      console.error('Error loading generated images:', error);
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
      console.error('Error saving processing image:', error);
      return '';
    }
  }

  // 更新图片状态
  updateImageStatus(imageId: string, status: 'processing' | 'completed' | 'failed' | 'cancelled', progress?: number, url?: string): void {
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
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
      }
    } catch (error) {
      console.error('Error updating image status:', error);
    }
  }

  // 添加新生成的图片（完成状态）
  addGeneratedImage(image: Omit<GeneratedImage, 'id' | 'createdAt'>): void {
    try {
      const images = this.getGeneratedImages();
      const newImage: ExtendedGeneratedImage = {
        ...image,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        status: 'completed'
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
      console.error('Error saving generated image:', error);
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
      console.error('Error removing generated image:', error);
    }
  }

  // 清空所有图片
  clearAllImages(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      // 触发自定义事件通知其他组件
      window.dispatchEvent(new CustomEvent('imageLibraryUpdate'));
    } catch (error) {
      console.error('Error clearing generated images:', error);
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