import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  Play, 
  X, 
  AlertCircle,
  Image as ImageIcon,
  StopCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTaskProcessing } from '../hooks/useTaskProcessing';

const ApplyEffect = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedImages, setUploadedImages] = useState<Array<{id: string, url: string, name: string, size: number}>>([]);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [imageParamFiles, setImageParamFiles] = useState<Record<string, {file?: File, url?: string, name?: string, size?: number, fileId?: string}>>({});

  // 简单的测试状态
  const [testState, setTestState] = useState('Component loaded');

  // 使用新的任务处理hook
  const { 
    isProcessing, 
    progress, 
    status, 
    error, 
    results, 
    isCancelled,
    activeTasks,
    processTask, 
    cancelTask
  } = useTaskProcessing();

  // 简单的测试函数
  const testFunction = () => {
    console.log('[Test] 测试函数被调用');
    setTestState('Test button clicked at ' + new Date().toLocaleTimeString());
  };

  console.log('[ApplyEffect] 组件渲染:', {
    id,
    testState,
    isProcessing,
    status,
    activeTasksSize: activeTasks?.size || 0
  });

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
  useEffect(() => {
    const defaultParams: Record<string, any> = {};
    effect.parameters.forEach(param => {
      defaultParams[param.name] = param.default;
    });
    setParameters(defaultParams);
  }, [effect.parameters]);

  const validateFile = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024; // 100MB (系统支持云存储，最大100MB)
    const runningHubLimit = 10 * 1024 * 1024; // 10MB (RunningHub原生限制)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Supported: JPG, PNG, GIF, WebP`;
    }
    
    if (file.size > maxSize) {
      return `File too large. Maximum size: 100MB`;
    }
    
    // 如果文件大于10MB，给用户一个提示
    if (file.size > runningHubLimit) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      console.log(`[文件上传] 大文件检测: ${fileSizeMB}MB，将使用云存储上传`);
      // 这里不返回错误，让用户知道会使用云存储
    }
    
    return null;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleMultipleFiles(files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleMultipleFiles = (files: File[]) => {
    const maxFiles = 5;
    const currentCount = uploadedImages.length;
    const runningHubLimit = 10 * 1024 * 1024; // 10MB
    
    if (currentCount + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed. You can upload ${maxFiles - currentCount} more.`);
      return;
    }

    files.forEach((file) => {
      const error = validateFile(file);
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      if (error) {
        alert(error);
        return;
      }
      
      // 检查是否为大文件，给用户提示
      if (file.size > runningHubLimit) {
        const fileSizeMB = formatFileSize(file.size);
        console.log(`[文件上传] 检测到大文件: ${file.name} (${fileSizeMB})，将使用云存储上传`);
        // 可以在这里添加一个用户提示，但不阻止上传
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setUploadedImages(prev => [...prev, {
          id: fileId,
          url,
          name: file.name,
          size: file.size
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
      handleMultipleFiles(files);
  };

  const handleImageParamUpload = (paramName: string, file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageParamFiles(prev => ({
        ...prev,
        [paramName]: {
          file,
          url,
          name: file.name,
          size: file.size,
          fileId
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramName]: value }));
  };

  const handleDownload = async (event: React.MouseEvent, result: string, index: number) => {
    // 阻止事件冒泡，避免触发图片预览
    event.preventDefault();
    event.stopPropagation();
    
    try {
      console.log('[下载] 开始下载图片:', result);
      
      // 使用 fetch + blob 下载，避免页面跳转
      const response = await fetch(result);
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cosnap-generated-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 释放blob URL
      window.URL.revokeObjectURL(url);
      console.log('[下载] 图片下载完成');
    } catch (error) {
      console.error('[下载] 下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const renderParameterInput = (param: any) => {
    switch (param.type) {
      case 'image':
      return (
        <div key={param.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {param.label || param.name}
            </label>
            <div className="flex items-center space-x-4">
              {imageParamFiles[param.name]?.url ? (
                <div className="relative">
                  <img 
                    src={imageParamFiles[param.name].url} 
                    alt={param.name}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => setImageParamFiles(prev => {
                      const newState = { ...prev };
                      delete newState[param.name];
                      return newState;
                    })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
          <input
            type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageParamUpload(param.name, file);
                      }
                    }}
                    className="hidden"
                    id={`param-${param.name}`}
                  />
                  <label
                    htmlFor={`param-${param.name}`}
                    className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    <Upload size={16} className="inline mr-2" />
                    Upload Image
                  </label>
                </div>
              )}
            </div>
            {param.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
          )}
        </div>
      );
      case 'range':
        return (
          <div key={param.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {param.label || param.name}: {parameters[param.name]}
              </label>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step || 1}
              value={parameters[param.name] || param.default}
              onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
            {param.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
            )}
          </div>
        );
      case 'select':
        return (
          <div key={param.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {param.label || param.name}
            </label>
            <select
              value={parameters[param.name] || param.default}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {param.options.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
              ))}
            </select>
            {param.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
            )}
          </div>
        );
      default:
        return (
          <div key={param.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {param.label || param.name}
            </label>
            <input
              type="text"
              value={parameters[param.name] !== undefined ? parameters[param.name] : (param.default || '')}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder={param.placeholder}
            />
            {param.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
            )}
          </div>
        );
    }
  };

  const handleProcessImages = async () => {
    // 检查是否有图片文件
    const hasUploadedImages = uploadedImages.length > 0;
    const hasParamImages = Object.values(imageParamFiles).some(paramFile => paramFile.file);
    
    console.log('[ApplyEffect] 图片检查:', {
      uploadedImages: uploadedImages.length,
      imageParamFiles: Object.keys(imageParamFiles),
      hasUploadedImages,
      hasParamImages
    });
    
    if (!hasUploadedImages && !hasParamImages) {
      alert('Please upload at least one image');
      return;
    }

    try {
      // 收集所有图片文件，按照nodeInfoTemplate的顺序
      const imageFiles: File[] = [];
      
      // 首先从参数图片中获取文件，按照nodeInfoTemplate的顺序
      if (effect.nodeInfoTemplate) {
        for (const nodeInfo of effect.nodeInfoTemplate) {
          const paramKey = nodeInfo.paramKey;
          if (paramKey && imageParamFiles[paramKey] && imageParamFiles[paramKey].file) {
            imageFiles.push(imageParamFiles[paramKey].file!);
            console.log(`[ApplyEffect] 添加参数图片: ${paramKey} -> ${imageParamFiles[paramKey].file!.name}`);
          }
        }
      }
      
      // 然后从上传的图片中获取文件（如果有的话）
      for (const image of uploadedImages) {
        // 这里需要从URL重新创建File对象
        const response = await fetch(image.url);
        const blob = await response.blob();
        const file = new File([blob], image.name, { type: blob.type });
        imageFiles.push(file);
        console.log(`[ApplyEffect] 添加上传图片: ${image.name}`);
      }

      console.log('[ApplyEffect] 收集到的图片文件:', {
        totalFiles: imageFiles.length,
        fileNames: imageFiles.map(f => f.name),
        nodeInfoTemplate: effect.nodeInfoTemplate,
        imageParamFiles: Object.keys(imageParamFiles)
      });

      await processTask(effect, parameters, imageFiles);
    } catch (error) {
      console.error('处理失败:', error);
    }
  };

  const handleCancelTask = async () => {
    console.log('[ApplyEffect] 用户点击取消按钮');
    console.log('[ApplyEffect] 当前状态:', {
      isProcessing,
      status,
      activeTasks: activeTasks,
      activeTasksSize: activeTasks.size,
      activeTasksKeys: Array.from(activeTasks.keys())
    });
    
    // 获取当前活跃的任务ID
    const activeTaskIds = Array.from(activeTasks.keys());
    console.log('[ApplyEffect] 当前活跃任务:', activeTaskIds);
    
    if (activeTaskIds.length === 0) {
      console.log('[ApplyEffect] 没有活跃任务，显示错误');
      alert('没有正在进行的任务可以取消');
      return;
    }
    
    // 取消所有活跃任务
    for (const taskId of activeTaskIds) {
      try {
        console.log(`[ApplyEffect] 开始取消任务: ${taskId}`);
        await cancelTask(taskId);
        console.log(`[ApplyEffect] 成功取消任务: ${taskId}`);
      } catch (error) {
        console.error(`[ApplyEffect] 取消任务失败: ${taskId}`, error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
        <div className="mb-8">
              <button
                onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
            <X className="h-5 w-5 mr-2" />
            Back
              </button>

          {/* Test Button */}
              <button
            onClick={testFunction}
            className="mb-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Test Button - {testState}
              </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {effect.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {effect.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Parameters */}
                <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Parameters
              </h2>
              <div className="space-y-4">
                  {effect.parameters.map(renderParameterInput)}
              </div>
                </div>
                
            {/* Process Button */}
            <div className="space-y-3">
                  <button
                onClick={handleProcessImages}
                    disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                      </>
                    ) : (
                      <>
                    <Play className="h-5 w-5 mr-2" />
                    Start Processing
                      </>
                    )}
                  </button>

              {/* Debug Button */}
              <button
                onClick={() => {
                  console.log('[Debug] 当前状态:', {
                    isProcessing,
                    status,
                    progress,
                    activeTasks: activeTasks,
                    activeTasksSize: activeTasks.size,
                    activeTasksKeys: Array.from(activeTasks.keys())
                  });
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Debug State
              </button>

                {isProcessing && (
                        <button 
                  onClick={handleCancelTask}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                        >
                  <StopCircle className="h-5 w-5 mr-2" />
                  Cancel Processing
                        </button>
                )}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
          </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Display - 只在非用户主动取消时显示 */}
            {error && !isCancelled && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-800 dark:text-red-200">{error}</span>
                </div>
              </div>
            )}
            
            {/* Cancelled Status Display */}
            {isCancelled && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                  <span className="text-yellow-800 dark:text-yellow-200">任务已取消</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Results
              </h2>
              
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div 
                      key={index} 
                      className="relative"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <img
                        src={result}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg cursor-default select-none pointer-events-none"
                        onDragStart={(e) => e.preventDefault()}
                      />
                      <button
                        onClick={(event) => handleDownload(event, result, index)}
                        className="absolute top-2 right-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:shadow-xl transition-shadow z-20 pointer-events-auto"
                        title="下载图片"
                      >
                        <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <ImageIcon className="mx-auto h-12 w-12 mb-4" />
                  <p>No results yet. Upload images and start processing to see results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyEffect;