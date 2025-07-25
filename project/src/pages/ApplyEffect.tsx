import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Play, 
  Pause,
  Download,
  Share,
  RefreshCw,
  Settings,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import RunningHubAPI from '../services/runningHubApi';
import { RUNNING_HUB_CONFIG } from '../config/runningHub';

const ApplyEffect = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<Array<{id: string, url: string, name: string, size: number}>>([]);
  const [processedImages, setProcessedImages] = useState<Array<{id: string, url: string}>>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  // 新增：用于存储每个 image 参数上传的图片信息
  const [imageParamFiles, setImageParamFiles] = useState<Record<string, {file?: File, url?: string, name?: string, size?: number, fileId?: string}>>({});
  // 新增：图片预览模态框状态
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string, name: string} | null>(null);

  // Initialize RunningHub API
  const runningHubAPI = new RunningHubAPI(RUNNING_HUB_CONFIG);

  const effect = state.effects.find(e => e.id === id);

  if (!effect) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Effect not found</p>
        </div>
      </div>
    );
  }

  // Initialize parameters with defaults
  React.useEffect(() => {
    const defaultParams: Record<string, any> = {};
    effect.parameters.forEach(param => {
      defaultParams[param.name] = param.default;
    });
    setParameters(defaultParams);
  }, [effect.parameters]);

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Supported: JPG, PNG, GIF, WebP`;
    }
    
    if (file.size > maxSize) {
      return `File too large. Maximum size: 10MB`;
    }
    
    return null;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleMultipleFiles(files);
  };

  const handleMultipleFiles = (files: File[]) => {
    const maxFiles = 5;
    const currentCount = uploadedImages.length;
    
    if (currentCount + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed. You can upload ${maxFiles - currentCount} more.`);
      return;
    }

    files.forEach((file) => {
      const error = validateFile(file);
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      if (error) {
        setUploadErrors(prev => ({ ...prev, [fileId]: error }));
        return;
      }

      // Show upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        }
      };
      
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const newImage = {
          id: fileId,
          url: imageUrl,
          name: file.name,
          size: file.size
        };
        
        setUploadedImages(prev => [...prev, newImage]);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      };
      
      reader.onerror = () => {
        setUploadErrors(prev => ({ ...prev, [fileId]: 'Failed to read file' }));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      handleMultipleFiles(files);
    }
  };

  // 新增：处理单个 image 参数的图片上传
  const handleImageParamUpload = (paramName: string, file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadErrors(prev => ({ ...prev, [paramName]: error }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageParamFiles(prev => ({
        ...prev,
        [paramName]: {
          file,
          url: e.target?.result as string,
          name: file.name,
          size: file.size
        }
      }));
      setUploadErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[paramName];
        return newErrors;
      });
    };
    reader.onerror = () => {
      setUploadErrors(prev => ({ ...prev, [paramName]: 'Failed to read file' }));
    };
    reader.readAsDataURL(file);
  };

  const processImagesWithRunningHub = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessedImages([]);
    try {
      // 1. 获取 image 参数的文件
      const imageParams = effect.parameters.filter(p => p.type === 'image');
      if (imageParams.length === 0) {
        throw new Error('没有找到图片参数');
      }
      
      const imageParam = imageParams[0];
      const fileObj = imageParamFiles[imageParam.name];
      if (!fileObj?.file) {
        throw new Error(`请上传${imageParam.name}`);
      }

      // 2. 构建 nodeInfoList（不包含图片，图片由后端处理）
      let nodeInfoList = [];
      if (effect.nodeInfoTemplate) {
        // 过滤掉图片参数，只保留其他参数
        const nonImageParams = { ...parameters };
        imageParams.forEach(param => {
          delete nonImageParams[param.name];
        });
        nodeInfoList = effect.nodeInfoTemplate
          .filter(item => item.paramKey !== imageParam.name)
          .map(item => ({
            nodeId: item.nodeId,
            fieldName: item.fieldName,
            fieldValue: nonImageParams[item.paramKey] || item.fieldValue
          }));
      }

      // 3. 调用后端接口，上传图片并发起任务
      setProgress(30);
      const formData = new FormData();
      formData.append('image', fileObj.file);
      formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
      
      const response = await fetch('http://localhost:3001/api/effects/apply', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start processing task');
      }
      
      const result = await response.json();
      
      // 4. 等待任务完成
      setProgress(60);
      let taskStatus = 'pending';
      let attempts = 0;
      const maxAttempts = 60; // 最多等待10分钟
      
      while (!['completed', 'success', 'SUCCESS'].includes(taskStatus) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒，减少轮询频率
        attempts++;
        
        try {
          const statusResponse = await fetch(`http://localhost:3001/api/effects/status/${result.taskId}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            taskStatus = statusData.status;
            setProgress(60 + (attempts / maxAttempts) * 30);
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
      }
      
      if (['completed', 'success', 'SUCCESS'].includes(taskStatus)) {
        // 获取真实处理结果图片
        const resultRes = await fetch(`http://localhost:3001/api/effects/result/${result.taskId}`);
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          // 假设 resultData.results 是图片数组，包含 fileUrl 字段
          setProcessedImages(resultData.results.map((img, idx) => ({ id: String(idx), url: img.fileUrl })));
          setProgress(100);
        } else {
          setProcessedImages([]);
          throw new Error('任务已完成，但获取结果图片失败');
        }
      } else {
        throw new Error('任务处理超时或失败');
      }
      
    } catch (error) {
      console.error('Error in processing:', error);
      alert(error instanceof Error ? error.message : 'Failed to process images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateProcessing = () => {
    // Fallback simulation for development/testing
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          // Create processed versions of all uploaded images
          setProcessedImages(uploadedImages.map(img => ({
            id: img.id,
            url: effect.afterImage // In real app, this would be the processed version
          })));
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleDownload = () => {
    if (processedImages.length === 0) return;
    
    // 显示第一张处理后的图片预览
    const firstImage = processedImages[0];
    setPreviewImage({
      url: firstImage.url,
      name: `${effect.name.replace(/\s+/g, '_').toLowerCase()}_processed.jpg`
    });
    setShowImagePreview(true);
  };

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    setProcessedImages(prev => prev.filter(img => img.id !== imageId));
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[imageId];
      return newErrors;
    });
  };

  // 修改参数渲染，image 类型渲染独立上传控件
  const renderParameterInput = (param: any) => {
    if (param.type === 'image') {
      const fileObj = imageParamFiles[param.name];
      return (
        <div key={param.name} className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{param.name}</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleImageParamUpload(param.name, e.target.files[0]);
              }
            }}
            disabled={isProcessing}
          />
          {fileObj?.url && (
            <div className="mt-2">
              <img src={fileObj.url} alt={param.name} className="w-32 h-32 object-cover rounded" />
              <div className="text-xs text-gray-500 dark:text-gray-400">{fileObj.name} ({fileObj.size && (fileObj.size / 1024 / 1024).toFixed(1)}MB)</div>
            </div>
          )}
          {uploadErrors[param.name] && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">{uploadErrors[param.name]}</div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
        </div>
      );
    }
    // 其余类型保持原有逻辑
    switch (param.type) {
      case 'slider':
        return (
          <div key={param.name} className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {param.name}
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {parameters[param.name]}
              </span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={parameters[param.name] || param.default}
              onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {param.description}
            </p>
          </div>
        );

      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {param.name}
            </label>
            <select
              value={parameters[param.name] || param.default}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              {param.options.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {param.description}
            </p>
          </div>
        );

      case 'text':
        return (
          <div key={param.name} className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {param.name}
            </label>
            <textarea
              value={parameters[param.name] || param.default}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {param.description}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Apply: {effect.name}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  showAdvancedSettings
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload/Display */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Effect Parameters
                </h2>
                
                <div className="space-y-6">
                  {effect.parameters.map(renderParameterInput)}
                </div>
                
                {/* Action Button */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={processImagesWithRunningHub}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        <span>Apply Effect</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Processing Progress */}
                {isProcessing && (
                  <div className="mt-4 space-y-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {Math.round(progress)}%
                    </p>
                  </div>
                )}

                {/* Processed Results */}
                {!isProcessing && processedImages.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Processed Result
                    </h3>
                    {processedImages.map((image, index) => (
                      <div key={image.id} className="space-y-2">
                        <div className="relative">
                          <img
                            src={image.url}
                            alt={`Processed ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Processed
                          </div>
                        </div>
                        <button 
                          onClick={handleDownload}
                          className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Result</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              {/* Effect Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Effect Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Description</p>
                    <p className="text-gray-900 dark:text-white">
                      {effect.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Processing Time</p>
                    <p className="text-gray-900 dark:text-white">
                      {effect.processingTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Difficulty</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      effect.difficulty === 'Easy' 
                        ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                        : effect.difficulty === 'Medium'
                        ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
                        : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
                    }`}>
                      {effect.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">
                  💡 Tips for Best Results with AI Processing
                </h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Use high-quality images for better results</li>
                  <li>• Ensure good lighting in your photos</li>
                  <li>• Try different parameter settings</li>
                  <li>• Processing may take 1-5 minutes per image</li>
                  <li>• Check your internet connection for uploads</li>
                </ul>
              </div>

              {/* Processing Status */}
              {(isProcessing || processedImages.length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Processing Status ({uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''})
                  </h3>
                  {isProcessing ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Processing your images...
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">All images processed successfully!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showImagePreview && previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImagePreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📸 图片预览
                </h3>
                <button
                  onClick={() => setShowImagePreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Image Content */}
              <div className="p-6">
                <div className="relative">
                  <img 
                    src={previewImage.url} 
                    alt={previewImage.name} 
                    className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-lg" 
                  />
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    {previewImage.name}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button
                  onClick={() => setShowImagePreview(false)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>返回</span>
                </button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewImage.url;
                      link.download = previewImage.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg transition-all"
                  >
                    <Download className="h-4 w-4" />
                    <span>下载图片</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplyEffect;