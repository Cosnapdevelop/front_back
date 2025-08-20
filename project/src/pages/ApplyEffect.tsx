import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTaskProcessing } from '../hooks/useTaskProcessing';
import { ParametersPanel } from '../components/EffectParameters/ParametersPanel';
import { ProcessingControls } from '../components/ProcessingStatus/ProcessingControls';
import { ResultsPanel } from '../components/Results/ResultsPanel';
import { LoadingState } from '../components/UI/LoadingState';

const ApplyEffect = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { isAuthenticated, bootstrapped } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();
  
  const [uploadedImages, setUploadedImages] = useState<Array<{id: string, url: string, name: string, size: number}>>([]);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [imageParamFiles, setImageParamFiles] = useState<Record<string, {file?: File, url?: string, name?: string, size?: number, fileId?: string}>>({});

  // Component initialization state
  const [testState, setTestState] = useState('Component loaded');

  // Use task processing hook
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

  // Test function for debugging
  const testFunction = () => {
    console.log('[Test] Test function called');
    setTestState('Test button clicked at ' + new Date().toLocaleTimeString());
  };

  console.log('[ApplyEffect] Component render:', {
    id,
    testState,
    isProcessing,
    status,
    activeTasksSize: activeTasks?.size || 0
  });

  // Wait for authentication state initialization
  if (!bootstrapped) {
    return <LoadingState fullScreen message="Initializing..." />;
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to use AI effects</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

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
    console.log('[ApplyEffect] Initialize default parameters:', defaultParams);
    setParameters(defaultParams);
  }, [effect.parameters]);

  const validateFile = (file: File): string | null => {
    const maxSize = 30 * 1024 * 1024; // 30MB（与后端multer限制保持一致）
    const runningHubLimit = 10 * 1024 * 1024; // 10MB（RunningHub原生限制，用于提示走云存储路径）
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Supported: JPG, PNG, GIF, WebP`;
    }
    
    if (file.size > maxSize) {
      return `File too large. Maximum size: 30MB`;
    }
    
    // If file is larger than 10MB, log a notice for cloud storage usage
    if (file.size > runningHubLimit) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      console.log(`[File Upload] Large file detected: ${fileSizeMB}MB, will use cloud storage upload`);
      // Don't return error here, let user know cloud storage will be used
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
      push('warning', `Maximum ${maxFiles} images allowed. You can upload ${maxFiles - currentCount} more.`);
      return;
    }

    files.forEach((file) => {
      const error = validateFile(file);
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      if (error) {
        push('error', error);
        return;
      }
      
      // Check for large files and notify user
      if (file.size > runningHubLimit) {
        const fileSizeMB = formatFileSize(file.size);
        console.log(`[File Upload] Large file detected: ${file.name} (${fileSizeMB}), will use cloud storage upload`);
        // Could add user notification here, but don't block upload
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
      push('error', error);
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
      
      // Update parameter value to ensure it's properly set
      // For image parameters, we use a placeholder value as actual file will be passed through FormData
      setParameters(prev => ({
        ...prev,
        [paramName]: `uploaded_${file.name}` // Use identifier to indicate uploaded
      }));
    };
    reader.readAsDataURL(file);
    
    console.log(`[ApplyEffect] Parameter image upload complete: ${paramName} = uploaded_${file.name}`);
  };

  const handleImageParamRemove = (paramName: string) => {
    setImageParamFiles(prev => {
      const newState = { ...prev };
      delete newState[paramName];
      return newState;
    });
    setParameters(prev => ({
      ...prev,
      [paramName]: undefined
    }));
  };

  const handleParameterChange = (paramName: string, value: any) => {
    console.log(`[Parameter Change] ${paramName}: ${value} (type: ${typeof value})`);
    
    // For numeric type parameters, ensure conversion to number
    // Use precise matching to avoid false positives
    if (paramName === 'scale_65' || 
        paramName === 'X_offset_65' || 
        paramName === 'Y_offset_65' || 
        paramName === 'rotation_65') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setParameters(prev => ({ ...prev, [paramName]: numValue }));
        console.log(`[Parameter Change] Numeric conversion: ${paramName} = ${numValue}`);
      } else {
        setParameters(prev => ({ ...prev, [paramName]: value }));
        console.log(`[Parameter Change] Numeric conversion failed, keeping original: ${paramName} = ${value}`);
      }
    } else {
      setParameters(prev => ({ ...prev, [paramName]: value }));
      console.log(`[Parameter Change] Regular parameter: ${paramName} = ${value}`);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      console.log('[Download] Starting image download:', imageUrl);
      
      // Use fetch + blob download to avoid page navigation
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cosnap-generated-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Release blob URL
      window.URL.revokeObjectURL(url);
      console.log('[Download] Image download complete');
    } catch (error) {
      console.error('[Download] Download failed:', error);
      push('error','Download failed, please try again');
    }
  };

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleDebugState = () => {
    console.log('[Debug] Current state:', {
      isProcessing,
      status,
      progress,
      activeTasks: activeTasks,
      activeTasksSize: activeTasks.size,
      activeTasksKeys: Array.from(activeTasks.keys())
    });
  };

  const handleProcessImages = async () => {
    // Check if there are image files
    const hasUploadedImages = uploadedImages.length > 0;
    const hasParamImages = Object.values(imageParamFiles).some(paramFile => paramFile.file);
    
    console.log('[ApplyEffect] Image validation:', {
      uploadedImages: uploadedImages.length,
      imageParamFiles: Object.keys(imageParamFiles),
      hasUploadedImages,
      hasParamImages
    });
    
    if (!hasUploadedImages && !hasParamImages) {
      push('warning','Please upload at least one image');
      return;
    }

    try {
      // Collect all image file objects in nodeInfoTemplate order
      const imageFileObjects: Array<{file: File}> = [];
      
      // First get files from parameter images in nodeInfoTemplate order
      if (effect.nodeInfoTemplate) {
        for (const nodeInfo of effect.nodeInfoTemplate) {
          const paramKey = nodeInfo.paramKey;
          if (paramKey && imageParamFiles[paramKey] && imageParamFiles[paramKey].file) {
            imageFileObjects.push({ file: imageParamFiles[paramKey].file! });
            console.log(`[ApplyEffect] Adding parameter image: ${paramKey} -> ${imageParamFiles[paramKey].file!.name}`);
          }
        }
      }
      
      // Then get files from uploaded images (if any)
      for (const image of uploadedImages) {
        // Need to recreate File object from URL
        const response = await fetch(image.url);
        const blob = await response.blob();
        const file = new File([blob], image.name, { type: blob.type });
        imageFileObjects.push({ file });
        console.log(`[ApplyEffect] Adding uploaded image: ${image.name}`);
      }

      console.log('[ApplyEffect] Collected image files:', {
        totalFiles: imageFileObjects.length,
        fileNames: imageFileObjects.map(obj => obj.file.name),
        nodeInfoTemplate: effect.nodeInfoTemplate,
        imageParamFiles: Object.keys(imageParamFiles)
      });

      console.log('[ApplyEffect] Final parameters:', parameters);
      console.log('[ApplyEffect] Parameter details:', Object.entries(parameters).map(([key, value]) => `${key}: ${value} (type: ${typeof value})`));

      await processTask(effect, parameters, imageFileObjects);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  const handleCancelTask = async () => {
    console.log('[ApplyEffect] User clicked cancel button');
    console.log('[ApplyEffect] Current state:', {
      isProcessing,
      status,
      activeTasks: activeTasks,
      activeTasksSize: activeTasks.size,
      activeTasksKeys: Array.from(activeTasks.keys())
    });
    
    // Get current active task IDs
    const activeTaskIds = Array.from(activeTasks.keys());
    console.log('[ApplyEffect] Current active tasks:', activeTaskIds);
    
    if (activeTaskIds.length === 0) {
      console.log('[ApplyEffect] No active tasks, showing warning');
      push('warning','No active tasks to cancel');
      return;
    }
    
    // Cancel all active tasks
    for (const taskId of activeTaskIds) {
      try {
        console.log(`[ApplyEffect] Starting task cancellation: ${taskId}`);
        await cancelTask(taskId);
        console.log(`[ApplyEffect] Successfully cancelled task: ${taskId}`);
      } catch (error) {
        console.error(`[ApplyEffect] Task cancellation failed: ${taskId}`, error);
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
          {/* Left Column - Parameters & Controls */}
          <div className="space-y-6">
            <ParametersPanel
              parameters={effect.parameters}
              values={parameters}
              onChange={handleParameterChange}
              imageParamFiles={imageParamFiles}
              onImageUpload={handleImageParamUpload}
              onImageRemove={handleImageParamRemove}
            />
            
            <ProcessingControls
              isProcessing={isProcessing}
              progress={progress}
              error={error}
              isCancelled={isCancelled}
              onProcess={handleProcessImages}
              onCancel={handleCancelTask}
              onDebug={handleDebugState}
              disabled={uploadedImages.length === 0 && Object.keys(imageParamFiles).length === 0}
            />
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <ResultsPanel
              results={results}
              onDownload={handleDownload}
              isLoading={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyEffect;