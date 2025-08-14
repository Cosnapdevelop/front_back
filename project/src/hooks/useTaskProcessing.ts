import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentRegionConfig } from '../config/regions';
import { API_BASE_URL } from '../config/api';
import { taskManagementService, TaskStatus } from '../services/taskManagementService';
import imageLibraryService from '../services/imageLibraryService';
import { createError, errorUtils, ErrorCode } from '../types/errors';
import { useAuth } from '../context/AuthContext';

export interface TaskProcessingState {
  isProcessing: boolean;
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error: string | null;
  results: string[];
  isCancelled: boolean;
  activeTasks: Map<string, any>;
}

const initialState: TaskProcessingState = {
  isProcessing: false,
  status: 'idle',
  progress: 0,
  error: null,
  results: [],
  isCancelled: false,
  activeTasks: new Map()
};

export function useTaskProcessing() {
  const [state, setState] = useState<TaskProcessingState>(initialState);
  const activeIntervalsRef = useRef<Set<number>>(new Set());
  const { accessToken } = useAuth();
  
  // 组件卸载时清理所有轮询
  useEffect(() => {
    return () => {
      activeIntervalsRef.current.forEach(interval => {
        clearInterval(interval);
      });
      activeIntervalsRef.current.clear();
    };
  }, []);

  const processTask = useCallback(async (effect: any, parameters: any, imageParamFiles: any[]) => {
    console.log('[任务处理] 开始处理任务:', { effect, parameters, imageParamFiles });
    
    setState(prev => ({
      ...prev,
      isProcessing: true,
      status: 'processing',
      progress: 0,
      error: null,
      results: [],
      isCancelled: false
    }));

    try {
      const formData = new FormData();
      
      const regionConfig = getCurrentRegionConfig();
      formData.append('regionId', regionConfig.id);
      
      // 添加Plus工作流支持
      if (effect.isPlusWorkflow) {
        formData.append('instanceType', 'plus');
      }
      
      // ⚠️ 重要：nodeInfoList 构建逻辑
      // 
      // 🎯 nodeInfoList 是 RunningHub ComfyUI API 的核心参数
      // 它定义了要修改的工作流节点和对应的值
      //
      // 📋 构建规则：
      // 1. nodeId: 工作流界面中节点右上角的数字标识
      // 2. fieldName: 对应节点inputs部分的键名（如"image", "text", "prompt"）
      // 3. fieldValue: 要设置的具体值（由后端填充）
      // 4. paramKey: 用于后端查找对应的参数值
      //
      // 🔧 前端只构建节点信息，fieldValue由后端根据上传的文件和参数填充
      // 这样可以确保图片文件和文本参数的正确匹配
      const nodeInfoList: any[] = [];
      
      if (effect.nodeInfoTemplate) {
        for (const template of effect.nodeInfoTemplate) {
          const nodeInfo: any = {
            nodeId: template.nodeId,        // 节点ID（如"240", "279"）
            fieldName: template.fieldName,  // 字段名（如"image", "prompt"）
            paramKey: template.paramKey     // 参数键（如"image_62", "prompt_279"）
          };
          
          nodeInfoList.push(nodeInfo);
        }
      }
      
      // 根据任务类型添加相应的ID
      if (effect.isWebapp && effect.webappId) {
        formData.append('webappId', effect.webappId);
        console.log('[任务处理] 使用webappId:', effect.webappId);
      } else if (effect.workflowId) {
        formData.append('workflowId', effect.workflowId);
        console.log('[任务处理] 使用workflowId:', effect.workflowId);
      } else {
        throw createError.config('缺少workflowId或webappId配置', 'effect.config');
      }
      
      // 添加nodeInfoList到formData
      formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
      console.log('[任务处理] 构建的nodeInfoList:', nodeInfoList);
      
      // 添加用户输入的参数
      console.log('[任务处理] 用户输入的参数:', parameters);
      Object.entries(parameters).forEach(([key, value]) => {
        console.log(`[任务处理] 处理参数: ${key} = ${value} (类型: ${typeof value})`);
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value as string);
          console.log(`[任务处理] 已添加参数到formData: ${key} = ${value}`);
        } else {
          console.warn(`[任务处理] 跳过空参数: ${key} = ${value}`);
        }
      });
      
      // 添加图片文件
      imageParamFiles.forEach((fileInfo) => {
        if (fileInfo.file) {
          formData.append('images', fileInfo.file);
        }
      });

      const applyHeaders: Record<string, string> = {};
      if (accessToken) {
        applyHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/apply`, {
        method: 'POST',
        headers: applyHeaders, // 不手动设置 Content-Type，浏览器会为 FormData 自动设置
        body: formData,
      });

      if (!response.ok) {
        throw createError.api(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const result = await response.json();
      console.log('[任务处理] 后端响应成功:', result);

      if (result.success && result.taskId) {
        console.log('[任务处理] 收到taskId:', result.taskId);
        
        // 创建任务信息并添加到任务管理服务
        const taskInfo = {
          taskId: result.taskId,
          effectId: effect.id,
          effectName: effect.name,
          status: TaskStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          progress: 0,
          parameters: { ...parameters, imageParamFiles }
        };
        
        taskManagementService.addTask(taskInfo);
        
        // 同步到本地的activeTasks状态
        setState(prev => ({
          ...prev,
          activeTasks: new Map(prev.activeTasks).set(result.taskId, taskInfo)
        }));
        
        // 立即在图片库中创建占位图片
        const placeholderImage = {
          taskId: result.taskId,
          effectId: effect.id,
          effectName: effect.name,
          progress: 0,
          url: '', // 暂时为空
          parameters: parameters
        };
        
        // 使用 addProcessingImage 方法，确保状态正确
        const imageId = imageLibraryService.addProcessingImage(placeholderImage, result.taskId);
        
        // 开始轮询任务状态
        startPollingTask(result.taskId, imageId);
        setState(prev => ({ ...prev, progress: 25 }));
      } else {
        throw createError.task(result.error || '任务创建失败', ErrorCode.TASK_CREATION_FAILED);
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '任务处理');
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'failed',
        error: errorUtils.getUserMessage(errorObj)
      }));
    }
  }, []);

  const startPollingTask = useCallback((taskId: string, imageId: string) => {
    let attempts = 0;
    const maxAttempts = 120;
    let isPollingActive = true; // 添加轮询状态控制
    
    const pollInterval = setInterval(async () => {
      // 添加到活跃轮询集合
      activeIntervalsRef.current.add(pollInterval);
      // 检查轮询是否应该继续
      if (!isPollingActive) {
        clearInterval(pollInterval);
        return;
      }
      attempts++;
      console.log(`[轮询] 第${attempts}次轮询: taskId=${taskId}`);
      
      try {
        const statusHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) statusHeaders['Authorization'] = `Bearer ${accessToken}`;
        const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/status`, {
          method: 'POST',
          headers: statusHeaders,
          body: JSON.stringify({ taskId: taskId, regionId: getCurrentRegionConfig().id })
        });

        if (!response.ok) throw createError.task('状态查询失败', ErrorCode.TASK_STATUS_FAILED, taskId);

        const result = await response.json();
        console.log('[轮询] 状态查询结果:', result);

        if (result.success) {
          const status = result.status;
          const progress = result.progress || 0;
          console.log(`[轮询] 任务状态: ${status}, 进度: ${progress}%`);
          
          // 更新任务管理服务中的状态
          if (status === 'RUNNING' || status === 'running') {
            taskManagementService.updateTaskStatus(taskId, TaskStatus.PROCESSING, progress);
            imageLibraryService.updateImageStatus(imageId, 'processing', progress);
          } else if (status === 'SUCCESS' || status === 'success' || status === 'COMPLETED' || status === 'completed') {
            console.log('[轮询] 任务完成，开始获取结果');
            
            try {
              const resultsHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
              if (accessToken) resultsHeaders['Authorization'] = `Bearer ${accessToken}`;
              const resultsResponse = await fetch(`${API_BASE_URL}/api/effects/comfyui/results`, {
                method: 'POST',
                headers: resultsHeaders,
                body: JSON.stringify({ taskId: taskId, regionId: getCurrentRegionConfig().id })
              });
              
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                console.log('[轮询] 结果响应:', resultsData);
                
                if (resultsData.success && resultsData.results && resultsData.results.length > 0) {
                  const processedResults = resultsData.results.map((result: any) => {
                    if (typeof result === 'string') return result;
                    else if (result && result.fileUrl) return result.fileUrl;
                    return result;
                  });
                  
                  // 更新任务管理服务
                  taskManagementService.updateTaskStatus(taskId, TaskStatus.COMPLETED, 100, undefined, processedResults);
                  
                  // 更新图片库中的图片，保存所有结果
                  imageLibraryService.updateImageStatus(imageId, 'completed', 100, processedResults[0], processedResults);
                  
                  // 从activeTasks中移除已完成的任务
                  setState(prev => {
                    const newActiveTasks = new Map(prev.activeTasks);
                    newActiveTasks.delete(taskId);
                    return {
                      ...prev,
                      isProcessing: false,
                      status: 'completed',
                      progress: 100,
                      results: processedResults,
                      activeTasks: newActiveTasks
                    };
                  });
                } else {
                  taskManagementService.updateTaskStatus(taskId, TaskStatus.FAILED, undefined, '未获取到有效结果');
                  imageLibraryService.updateImageStatus(imageId, 'failed');
                  
                  // 从activeTasks中移除失败的任务
                  setState(prev => {
                    const newActiveTasks = new Map(prev.activeTasks);
                    newActiveTasks.delete(taskId);
                    return {
                      ...prev,
                      isProcessing: false,
                      status: 'failed',
                      error: '未获取到有效结果',
                      activeTasks: newActiveTasks
                    };
                  });
                }
              } else {
                taskManagementService.updateTaskStatus(taskId, TaskStatus.FAILED, undefined, '获取结果失败');
                imageLibraryService.updateImageStatus(imageId, 'failed');
                
                // 从activeTasks中移除失败的任务
                setState(prev => {
                  const newActiveTasks = new Map(prev.activeTasks);
                  newActiveTasks.delete(taskId);
                  return {
                    ...prev,
                    isProcessing: false,
                    status: 'failed',
                    error: '获取结果失败',
                    activeTasks: newActiveTasks
                  };
                });
              }
            } catch (error) {
              taskManagementService.updateTaskStatus(taskId, TaskStatus.FAILED, undefined, '获取结果失败');
              imageLibraryService.updateImageStatus(imageId, 'failed');
              
              // 从activeTasks中移除失败的任务
              setState(prev => {
                const newActiveTasks = new Map(prev.activeTasks);
                newActiveTasks.delete(taskId);
                return {
                  ...prev,
                  isProcessing: false,
                  status: 'failed',
                  error: '获取结果失败',
                  activeTasks: newActiveTasks
                };
              });
            }
            
            isPollingActive = false;
            clearInterval(pollInterval);
            activeIntervalsRef.current.delete(pollInterval);
            return;
          } else if (status === 'FAILED' || status === 'failed' || status === 'ERROR' || status === 'error') {
            taskManagementService.updateTaskStatus(taskId, TaskStatus.FAILED, undefined, '任务处理失败');
            imageLibraryService.updateImageStatus(imageId, 'failed');
            
            // 从activeTasks中移除失败的任务
            setState(prev => {
              const newActiveTasks = new Map(prev.activeTasks);
              newActiveTasks.delete(taskId);
              return {
                ...prev,
                isProcessing: false,
                status: 'failed',
                error: '任务处理失败',
                activeTasks: newActiveTasks
              };
            });
            isPollingActive = false;
            clearInterval(pollInterval);
            activeIntervalsRef.current.delete(pollInterval);
            return;
          } else {
            // 更新进度
            const progressValue = Math.min(25 + (attempts * 2), 90);
            taskManagementService.updateTaskStatus(taskId, TaskStatus.PROCESSING, progressValue);
            imageLibraryService.updateImageStatus(imageId, 'processing', progressValue);
            
            setState(prev => ({ ...prev, progress: progressValue }));
          }
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        errorUtils.logError(errorObj, `轮询第${attempts}次`);
        
        if (attempts >= maxAttempts) {
          // 从activeTasks中移除超时的任务
          setState(prev => {
            const newActiveTasks = new Map(prev.activeTasks);
            newActiveTasks.delete(taskId);
            return {
              ...prev,
              isProcessing: false,
              status: 'failed',
              error: errorUtils.getUserMessage(createError.task('任务处理超时', ErrorCode.TASK_TIMEOUT, taskId)),
              activeTasks: newActiveTasks
            };
          });
          isPollingActive = false;
          clearInterval(pollInterval);
          activeIntervalsRef.current.delete(pollInterval);
        }
      }
    }, 5000);
  }, []);

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      const cancelHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) cancelHeaders['Authorization'] = `Bearer ${accessToken}`;
      await fetch(`${API_BASE_URL}/api/effects/comfyui/cancel`, {
        method: 'POST',
        headers: cancelHeaders,
        body: JSON.stringify({ taskId: taskId, regionId: getCurrentRegionConfig().id })
      });

      // 从activeTasks中移除已取消的任务
      setState(prev => {
        const newActiveTasks = new Map(prev.activeTasks);
        newActiveTasks.delete(taskId);
        return {
          ...prev,
          isProcessing: false,
          status: 'cancelled',
          error: null,
          isCancelled: true,
          activeTasks: newActiveTasks
        };
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '取消任务');
      
      // 即使取消失败，也从activeTasks中移除任务
      setState(prev => {
        const newActiveTasks = new Map(prev.activeTasks);
        newActiveTasks.delete(taskId);
        return {
          ...prev,
          isProcessing: false,
          status: 'cancelled',
          error: null,
          isCancelled: true,
          activeTasks: newActiveTasks
        };
      });
    }
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    isProcessing: state.isProcessing,
    progress: state.progress,
    status: state.status,
    error: state.error,
    results: state.results,
    isCancelled: state.isCancelled,
    activeTasks: state.activeTasks,
    processTask,
    cancelTask,
    resetState
  };
}
