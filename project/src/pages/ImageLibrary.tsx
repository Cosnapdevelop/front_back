import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  Image as ImageIcon,
  X,
  Share2,
  StopCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GeneratedImage } from '../types';
import imageLibraryService, { ExtendedGeneratedImage } from '../services/imageLibraryService';
import { useImageLibrary } from '../hooks/useImageLibrary';
import { getCurrentRegionConfig } from '../config/regions';

const ImageLibrary = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<ExtendedGeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<ExtendedGeneratedImage | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { imageCount } = useImageLibrary();

  useEffect(() => {
    loadImages();
    
    // 监听图片库更新事件
    const handleImageLibraryUpdate = () => {
      loadImages();
    };
    
    window.addEventListener('imageLibraryUpdate', handleImageLibraryUpdate);
    return () => {
      window.removeEventListener('imageLibraryUpdate', handleImageLibraryUpdate);
    };
  }, [imageCount]);

  const loadImages = () => {
    const generatedImages = imageLibraryService.getGeneratedImages();
    setImages(generatedImages);
  };

  const handleDownload = async (image: ExtendedGeneratedImage) => {
    if (image.status !== 'completed' || !image.url) {
      alert('图片尚未生成完成，无法下载');
      return;
    }
    
    try {
      // 使用 fetch + blob 下载，避免页面跳转
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${image.effectName}_${new Date(image.createdAt).getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  const handleDelete = (imageId: string) => {
    if (window.confirm('确定要删除这张图片吗？')) {
      imageLibraryService.removeGeneratedImage(imageId);
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
        setShowPreview(false);
      }
    }
  };

  const handleCancelTask = async (image: ExtendedGeneratedImage) => {
    if (!image.taskId) {
      console.error('[ImageLibrary] 图片没有taskId，无法取消');
      return;
    }

    try {
      console.log(`[ImageLibrary] 开始取消任务: taskId=${image.taskId}`);
      
      const currentRegion = getCurrentRegionConfig();
      const requestBody = {
        taskId: image.taskId,
        regionId: currentRegion.id
      };
      
      const response = await fetch('/api/effects/comfyui/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log(`[ImageLibrary] 取消任务成功: taskId=${image.taskId}`, responseData);
        
        // 更新图片状态为已取消
        imageLibraryService.updateImageStatus(image.id, 'cancelled');
        
        // 刷新图片库
        setImages(imageLibraryService.getGeneratedImages());
      } else {
        const errorData = await response.json();
        console.error(`[ImageLibrary] 取消任务失败: taskId=${image.taskId}`, errorData);
        alert('取消任务失败: ' + (errorData.error || '服务器错误'));
      }
    } catch (error) {
      console.error(`[ImageLibrary] 取消任务异常: taskId=${image.taskId}`, error);
      alert('取消任务失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handlePreview = (image: ExtendedGeneratedImage) => {
    if (image.status !== 'completed' || !image.url) {
      alert('图片尚未生成完成，无法预览');
      return;
    }
    
    setSelectedImage(image);
    setShowPreview(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = async (image: ExtendedGeneratedImage) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `使用 ${image.effectName} 生成的作品`,
          text: `我在 Cosnap 使用 ${image.effectName} 生成了这张图片！`,
          url: window.location.href
        });
      } else {
        // 复制链接到剪贴板
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板！');
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">图片库</h1>
          </div>

          {/* Empty State */}
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              还没有生成的图片
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              使用特效生成图片后，它们会出现在这里
            </p>
            <button
              onClick={() => navigate('/effects')}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              去选择特效
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">图片库</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                最近生成的 {images.length} 张图片
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('确定要清空所有图片吗？此操作不可恢复。')) {
                imageLibraryService.clearAllImages();
              }
            }}
            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            清空全部
          </button>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  {image.status === 'processing' ? (
                    // 处理中状态
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">处理中...</p>
                        {image.progress !== undefined && (
                          <div className="mt-2 w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto">
                            <div 
                              className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${image.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : image.status === 'failed' ? (
                    // 失败状态
                    <div className="w-full h-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <div className="text-center">
                        <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600 dark:text-red-400">处理失败</p>
                      </div>
                    </div>
                  ) : image.status === 'cancelled' ? (
                    // 已取消状态
                    <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <StopCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">已取消</p>
                      </div>
                    </div>
                  ) : (
                    // 正常图片
                    <img
                      src={image.url}
                      alt={image.effectName}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => handlePreview(image)}
                      onError={(e) => {
                        console.error('[ImageLibrary] 图片加载失败:', image.url);
                        // 图片加载失败时显示错误状态
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <div class="text-center">
                                <ImageIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p class="text-sm text-gray-500 dark:text-gray-400">图片加载失败</p>
                                <button 
                                  class="mt-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                  onclick="window.open('${image.url}', '_blank')"
                                >
                                  在新窗口打开
                                </button>
                              </div>
                            </div>
                          `;
                        }
                      }}
                      onLoad={() => {
                        console.log('[ImageLibrary] 图片加载成功:', image.url);
                      }}
                    />
                  )}
                  
                  <div className="absolute top-2 right-2 flex space-x-1">
                    {image.status === 'processing' ? (
                      // 处理中显示取消按钮
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelTask(image);
                        }}
                        className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                        title="取消任务"
                      >
                        <StopCircle className="w-4 h-4 text-white" />
                      </button>
                    ) : image.status === 'completed' ? (
                      // 完成状态显示正常按钮
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(image);
                          }}
                          className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                          title="预览"
                        >
                          <Eye className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image);
                          }}
                          className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                          title="下载"
                        >
                          <Download className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : null}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      className="p-1.5 bg-black/50 hover:bg-red-600 rounded-full transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                    {image.effectName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(image.createdAt)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Image */}
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.effectName}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>

              {/* Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedImage.effectName}
                    </h2>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(selectedImage.createdAt)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleShare(selectedImage)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(selectedImage)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(selectedImage.id);
                        setShowPreview(false);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Parameters */}
                {Object.keys(selectedImage.parameters).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      使用参数
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedImage.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {typeof value === 'string' && value.length > 20 
                              ? `${value.substring(0, 20)}...` 
                              : String(value)
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageLibrary; 