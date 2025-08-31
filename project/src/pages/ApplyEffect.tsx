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
import { SubscriptionErrorDisplay } from '../components/UI/SubscriptionErrorDisplay';
import { SubscriptionError } from '../types/errors';
import { trackEffectCreated, trackEngagement, trackFeatureUsage, trackPerformance } from '../utils/analytics';
import { useAPIPerformance, useRenderPerformance } from '../hooks/usePerformanceMonitoring';
import { 
  trackFunnelStep, 
  trackEngagementAction, 
  FunnelStep, 
  EngagementAction 
} from '../utils/conversionFunnel';

const ApplyEffect = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { isAuthenticated, bootstrapped } = useAuth();
  const { push } = useToast();
  
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [imageParamFiles, setImageParamFiles] = useState<Record<string, {file?: File, url?: string, name?: string, size?: number, fileId?: string}>>({});
  const [subscriptionError, setSubscriptionError] = useState<SubscriptionError | null>(null);

  // Component initialization state
  const [testState, setTestState] = useState('Component loaded');
  
  // Performance monitoring
  const { measureAPICall } = useAPIPerformance();
  const { measureRender } = useRenderPerformance('ApplyEffect');
  const [effectStartTime, setEffectStartTime] = useState<number>(0);

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

  // Track effect start when component mounts
  useEffect(() => {
    if (effect) {
      trackFunnelStep(FunnelStep.EFFECT_STARTED, effect.id);
      trackFeatureUsage('ai_effect_application', 'viewed');
      setEffectStartTime(performance.now());
    }
  }, [effect]);

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

    // Track parameter setting in funnel
    if (effect) {
      trackFunnelStep(FunnelStep.PARAMETERS_SET, effect.id, 'webapp', {
        parameter_name: paramName,
        parameter_value: value,
        total_parameters: Object.keys(parameters).length + 1,
      });
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

      // Track download in funnel
      if (effect) {
        trackFunnelStep(FunnelStep.RESULT_DOWNLOADED, effect.id, 'webapp', {
          image_index: index,
          download_method: 'direct',
        });
        trackEngagementAction(EngagementAction.RATE_RESULT, effect.id);
      }
      
      trackEngagement('result_download');
    } catch (error) {
      console.error('[Download] Download failed:', error);
      push('error','Download failed, please try again');
    }
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
    // Track effect start
    setEffectStartTime(performance.now());
    trackFeatureUsage('ai_effect_processing', 'clicked');
    
    // Check if there are image files - only check parameter images now
    const hasParamImages = Object.values(imageParamFiles).some(paramFile => paramFile.file);
    
    console.log('[ApplyEffect] Image validation:', {
      imageParamFiles: Object.keys(imageParamFiles),
      hasParamImages
    });
    
    if (!hasParamImages) {
      push('warning','Please upload images through the parameter settings below');
      return;
    }

    try {
      // Collect all image file objects in nodeInfoTemplate order
      const imageFileObjects: Array<{file: File}> = [];
      
      // Get files from parameter images in nodeInfoTemplate order
      if (effect.nodeInfoTemplate) {
        for (const nodeInfo of effect.nodeInfoTemplate) {
          const paramKey = nodeInfo.paramKey;
          if (paramKey && imageParamFiles[paramKey] && imageParamFiles[paramKey].file) {
            imageFileObjects.push({ file: imageParamFiles[paramKey].file! });
            console.log(`[ApplyEffect] Adding parameter image: ${paramKey} -> ${imageParamFiles[paramKey].file!.name}`);
          }
        }
      }

      console.log('[ApplyEffect] Collected image files:', {
        totalFiles: imageFileObjects.length,
        fileNames: imageFileObjects.map(obj => obj.file.name),
        nodeInfoTemplate: effect.nodeInfoTemplate,
        imageParamFiles: Object.keys(imageParamFiles)
      });

      console.log('[ApplyEffect] Final parameters:', parameters);
      console.log('[ApplyEffect] Parameter details:', Object.entries(parameters).map(([key, value]) => `${key}: ${value} (type: ${typeof value})`));

      // Track processing start
      trackFunnelStep(FunnelStep.PROCESSING_STARTED, effect.id, 'webapp', {
        parameter_count: Object.keys(parameters).length,
        image_count: imageFileObjects.length,
      });

      // Measure API call performance
      await measureAPICall(
        async () => await processTask(effect, parameters, imageFileObjects),
        `effect_${effect.id}`
      );
      
      // Track successful effect creation and completion
      const processingTime = performance.now() - effectStartTime;
      trackEffectCreated(effect.id, 'webapp', processingTime);
      trackFeatureUsage('ai_effect_processing', 'completed');
      trackFunnelStep(FunnelStep.PROCESSING_COMPLETED, effect.id, 'webapp', {
        processing_time: processingTime,
        success: true,
      });
      
    } catch (error) {
      console.error('Processing failed:', error);
      const processingTime = performance.now() - effectStartTime;
      trackPerformance('effect_processing_time', processingTime);
      
      // 检查是否是订阅错误
      if (error instanceof SubscriptionError) {
        setSubscriptionError(error);
      }
    }
  };

  const handleSubscriptionUpgrade = () => {
    // 导航到升级页面或打开升级对话框
    // 这里可以根据实际需求实现升级逻辑
    push('info', '升级功能即将推出，敬请期待！');
  };

  const handleSubscriptionErrorDismiss = () => {
    setSubscriptionError(null);
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
            {/* Subscription Error Display */}
            {subscriptionError && (
              <SubscriptionErrorDisplay
                errorCode={subscriptionError.code as any}
                currentUsage={subscriptionError.currentUsage}
                limit={subscriptionError.limit}
                onUpgrade={handleSubscriptionUpgrade}
                onDismiss={handleSubscriptionErrorDismiss}
              />
            )}
            
            {/* Workflow Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                📸 How to use this effect
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                This AI effect uses a specialized workflow. Please upload your images through the parameter settings below. 
                Each image parameter is specifically designed for this effect's requirements.
              </p>
            </div>

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
              disabled={Object.keys(imageParamFiles).length === 0}
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