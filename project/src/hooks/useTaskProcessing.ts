import React, { useState, useCallback } from 'react';
import imageLibraryService from '../services/imageLibraryService';
import { getCurrentRegionConfig } from '../config/regions';
import { API_BASE_URL } from '../config/api';

export interface TaskProcessingState {
  isProcessing: boolean;
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error: string | null;
  results: string[];
  isCancelled: boolean; // 新增：标记是否被用户主动取消
  // 移除单个任务的ID，改为管理多个任务
  activeTasks: Map<string, {
    taskId: string;
    imageId: string;
    status: 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    startTime: number;
  }>;
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

export const useTaskProcessing = () => {
  const [state, setState] = useState<TaskProcessingState>(initialState);
  
  // 存储轮询间隔的引用，用于清理
  const pollIntervalsRef = React.useRef<Map<string, number>>(new Map());

  // 重置状态
  const resetState = useCallback(() => {
    // 清理所有轮询间隔
    pollIntervalsRef.current.forEach(interval => clearInterval(interval));
    pollIntervalsRef.current.clear();
    setState(initialState);
  }, []);

  // 处理任务
  const processTask = useCallback(async (
    effect: any,
    parameters: Record<string, any>,
    imageParamFiles: File[]
  ) => {
    try {
      console.log('[任务处理] 开始处理任务:', { effect, parameters, imageParamFiles });
      
      // 重置状态
      setState(prev => ({ 
        ...prev, 
        status: 'processing' as const, 
        progress: 0, 
        error: null,
        results: []
      }));

      // 构建FormData
      const formData = new FormData();
      
      // 添加图片文件
      imageParamFiles.forEach((file) => {
        formData.append('images', file);
      });

      // 添加任务参数
      const workflowId = effect.workflowId;
      const webappId = effect.webappId;
      const nodeInfoList = effect.nodeInfoTemplate || [];
      
      // 根据特效类型发送正确的参数
      if (workflowId) {
        formData.append('workflowId', workflowId);
      }
      if (webappId) {
        formData.append('webappId', webappId);
      }
      formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
      formData.append('regionId', getCurrentRegionConfig().id);
      
      // 如果是Plus工作流，添加instanceType参数（用于48G显存机器）
      if (effect.isPlusWorkflow) {
        formData.append('instanceType', 'plus');
        console.log('[任务处理] Plus工作流，使用48G显存机器');
      }
      
      // 添加用户输入的参数值
      Object.keys(parameters).forEach(paramKey => {
        if (parameters[paramKey] !== undefined && parameters[paramKey] !== null) {
          formData.append(paramKey, parameters[paramKey]);
          console.log(`[任务处理] 添加参数: ${paramKey} = ${parameters[paramKey]}`);
        }
      });

      console.log('[任务处理] FormData构建完成:', {
        workflowId,
        webappId: effect.webappId,
        nodeInfoList,
        regionId: getCurrentRegionConfig().id,
        imageCount: imageParamFiles.length
      });

      console.log('Debug - regionId:', getCurrentRegionConfig().id);

      setState(prev => ({ ...prev, status: 'processing' as const, progress: 30 }));

      // 发送请求到后端
      console.log('[任务处理] 发送请求到后端:', {
        url: '/api/effects/comfyui/apply',
        method: 'POST',
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          value: value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
        }))
      });

      // 创建AbortController用于超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000); // 60秒超时

      try {
        console.log('[任务处理] 开始发送请求...');
        const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/apply`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('[任务处理] 后端响应状态:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[任务处理] 后端错误响应:', errorData);
          throw new Error(errorData.error || '处理失败');
        }

        const result = await response.json();
        console.log('[任务处理] 后端成功响应:', result);

        if (result.success && result.taskId) {
          console.log('[任务处理] 收到taskId:', result.taskId);
          console.log('[任务处理] 完整响应:', result);
          
          // 立即添加到图片库（处理中状态）
          const imageId = imageLibraryService.addProcessingImage({
            url: '', // 暂时为空
            effectId: effect.id,
            effectName: effect.name,
            parameters: parameters // 添加parameters字段
          }, result.taskId);

          console.log('[任务处理] 设置状态:', {
            taskId: result.taskId,
            imageId: imageId
          });

          setState(prev => {
            const newActiveTasks = new Map(prev.activeTasks);
            newActiveTasks.set(result.taskId, {
              taskId: result.taskId,
              imageId: imageId,
              status: 'processing' as const,
              progress: 50,
              startTime: Date.now()
            });
            
            const newState = { 
              ...prev, 
              isProcessing: true, // 保持isProcessing为true
              activeTasks: newActiveTasks
            };
            console.log('[任务处理] 新状态:', newState);
            return newState;
          });

          // 开始轮询任务状态
          startPollingTask(result.taskId, imageId);

          // 任务已创建，返回成功
          return { success: true, taskId: result.taskId };
        } else {
          throw new Error('处理失败');
        }

      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          console.error('[任务处理] 请求超时 (60秒)');
          setState(prev => ({
            ...prev,
            status: 'failed' as const,
            error: '请求超时 - 后端可能没有响应',
            isProcessing: false
          }));
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.error('[任务处理] 网络错误:', error.message);
          setState(prev => ({
            ...prev,
            status: 'failed' as const,
            error: '网络错误 - 无法连接到后端服务器',
            isProcessing: false
          }));
        } else {
          console.error('[任务处理] 其他错误:', error);
          setState(prev => ({
            ...prev,
            status: 'failed' as const,
            error: error.message || '处理失败',
            isProcessing: false
          }));
        }
        throw error;
      } finally {
        setState(prev => {
          const newActiveTasks = new Map(prev.activeTasks);
          const firstTaskId = newActiveTasks.keys().next().value;
          if (firstTaskId) {
            const currentTask = newActiveTasks.get(firstTaskId);
            if (currentTask) {
              imageLibraryService.updateImageStatus(currentTask.imageId, 'failed');
            }
          }
          // 只有在没有活跃任务时才设置isProcessing为false
          return { 
            ...prev, 
            isProcessing: newActiveTasks.size > 0 
          };
        });
      }
    } catch (error: any) {
      console.error('任务处理失败:', error);
      setState(prev => {
        const newActiveTasks = new Map(prev.activeTasks);
        const firstTaskId = newActiveTasks.keys().next().value;
        if (firstTaskId) {
          const currentTask = newActiveTasks.get(firstTaskId);
          if (currentTask) {
            imageLibraryService.updateImageStatus(currentTask.imageId, 'failed');
          }
        }
        return {
          ...prev,
          status: 'failed' as const,
          error: error.message || '处理失败',
          isProcessing: false
        };
      });
      throw error;
    } finally {
      setState(prev => {
        const newActiveTasks = new Map(prev.activeTasks);
        const firstTaskId = newActiveTasks.keys().next().value;
        if (firstTaskId) {
          const currentTask = newActiveTasks.get(firstTaskId);
          if (currentTask) {
            imageLibraryService.updateImageStatus(currentTask.imageId, 'failed');
          }
        }
        // 只有在没有活跃任务时才设置isProcessing为false
        return { 
          ...prev, 
          isProcessing: newActiveTasks.size > 0 
        };
      });
    }
  }, []);

  // 轮询任务状态
  const startPollingTask = useCallback(async (taskId: string, imageId: string) => {
    console.log('[轮询] 开始轮询任务状态:', { taskId, imageId });
    
    let attempts = 0;
    const maxAttempts = 60; // 最多等待5分钟
    const interval = 5000; // 5秒轮询一次
    
    const pollInterval = setInterval(async () => {
      attempts++;
      console.log(`[轮询] 第${attempts}次轮询: taskId=${taskId}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: taskId,
            regionId: getCurrentRegionConfig().id
          })
        });

        if (!response.ok) {
          throw new Error('状态查询失败');
        }

        const result = await response.json();
        console.log('[轮询] 状态查询结果:', result);
        console.log('[轮询] 状态查询详细:', {
          success: result.success,
          status: result.status,
          statusType: typeof result.status
        });

        if (result.success) {
          const status = result.status;
          console.log(`[轮询] 任务状态: ${status}`);

          // 检查任务完成状态（支持多种状态格式）
          if (status === 'SUCCESS' || status === 'success' || status === 'COMPLETED' || status === 'completed') {
            console.log('[轮询] 🎉 检测到任务完成！状态:', status);
            console.log('[轮询] 准备发送结果获取请求...');
            // 任务完成，获取结果
            try {
              console.log('[轮询] 发送结果获取请求:', {
                taskId: taskId,
                regionId: getCurrentRegionConfig().id
              });
              
              const resultsResponse = await fetch(`${API_BASE_URL}/api/effects/comfyui/results`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  taskId: taskId,
                  regionId: getCurrentRegionConfig().id
                })
              });
              
              console.log('[轮询] 🔍 结果获取请求已发送');
              console.log('[轮询] 响应状态码:', resultsResponse.status);

              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                console.log('[轮询] 结果响应:', resultsData);
                
                if (resultsData.success && resultsData.results && resultsData.results.length > 0) {
                  console.log('[轮询] 获取到结果:', resultsData.results);
                  
                  // 处理结果数据：提取fileUrl字段或直接使用字符串
                  const processedResults = resultsData.results.map((result: any) => {
                    if (typeof result === 'string') {
                      return result;
                    } else if (result && result.fileUrl) {
                      return result.fileUrl;
                    }
                    return result;
                  });
                  console.log('[轮询] 处理后的结果URLs:', processedResults);
                  
                  // 更新图片库
                  processedResults.forEach((resultUrl: string, index: number) => {
                    imageLibraryService.addGeneratedImage({
                      url: resultUrl,
                      effectId: '', // 这里需要从context获取
                      effectName: '', // 这里需要从context获取
                      parameters: {},
                      originalImageName: `generated-${index + 1}.png`,
                      processedImageName: `generated-${index + 1}.png`
                    });
                  });

                  // 更新图片状态
                  imageLibraryService.updateImageStatus(imageId, 'completed', 100, processedResults[0]);

                  // 更新任务状态
                  setState(prev => {
                    const newActiveTasks = new Map(prev.activeTasks);
                    newActiveTasks.delete(taskId);
                    
                    return {
                      ...prev,
                      status: 'completed',
                      results: processedResults, // 使用处理后的URL数组
                      activeTasks: newActiveTasks,
                      isProcessing: newActiveTasks.size > 0
                    };
                  });
                } else {
                  console.warn('[轮询] 结果为空或格式错误:', resultsData);
                }
              } else {
                console.error('[轮询] 获取结果失败:', resultsResponse.status);
              }
            } catch (error) {
              console.error('[轮询] 获取结果失败:', error);
            }
            
            clearInterval(pollInterval);
            return;
          } else if (status === 'FAILED' || status === 'failed' || status === 'ERROR' || status === 'error') {
            console.error('[轮询] 任务失败');
            imageLibraryService.updateImageStatus(imageId, 'failed');
            
            setState(prev => {
              const newActiveTasks = new Map(prev.activeTasks);
              newActiveTasks.delete(taskId);
              
              return {
                ...prev,
                status: 'failed',
                error: '任务处理失败',
                activeTasks: newActiveTasks,
                isProcessing: newActiveTasks.size > 0
              };
            });
            
            clearInterval(pollInterval);
            return;
          } else if (status === 'CANCELLED' || status === 'cancelled') {
            console.log('[轮询] 任务已取消');
            imageLibraryService.updateImageStatus(imageId, 'cancelled');
            
            setState(prev => {
              const newActiveTasks = new Map(prev.activeTasks);
              newActiveTasks.delete(taskId);
              
              return {
                ...prev,
                status: 'idle',
                activeTasks: newActiveTasks,
                isProcessing: newActiveTasks.size > 0
              };
            });
            
            clearInterval(pollInterval);
            return;
          } else {
            // 任务仍在进行中，更新进度
            console.log(`[轮询] 任务进行中: ${status}`);
            const progress = Math.min(30 + (attempts * 2), 90); // 渐进式进度
            imageLibraryService.updateImageStatus(imageId, 'processing', progress);
          }
        } else {
          console.error('[轮询] 状态查询失败:', result);
        }

        // 检查是否超时
        if (attempts >= maxAttempts) {
          console.error('[轮询] 轮询超时');
          imageLibraryService.updateImageStatus(imageId, 'failed');
          
          setState(prev => {
            const newActiveTasks = new Map(prev.activeTasks);
            newActiveTasks.delete(taskId);
            
            return {
              ...prev,
              status: 'failed',
              error: '任务处理超时',
              activeTasks: newActiveTasks,
              isProcessing: newActiveTasks.size > 0
            };
          });
          
          clearInterval(pollInterval);
          return;
        }

      } catch (error) {
        console.error('[轮询] 轮询错误:', error);
        
        if (attempts >= maxAttempts) {
          imageLibraryService.updateImageStatus(imageId, 'failed');
          
          setState(prev => {
            const newActiveTasks = new Map(prev.activeTasks);
            newActiveTasks.delete(taskId);
            
            return {
              ...prev,
              status: 'failed',
              error: '轮询失败',
              activeTasks: newActiveTasks,
              isProcessing: newActiveTasks.size > 0
            };
          });
          
          clearInterval(pollInterval);
          // 从管理器中移除
          pollIntervalsRef.current.delete(taskId);
        }
      }
    }, interval);
    
    // 将轮询间隔添加到管理器中
    pollIntervalsRef.current.set(taskId, pollInterval);
  }, []);

  // 取消任务
  const cancelTask = useCallback(async (taskId: string) => {
    console.log('[取消任务] 开始取消任务，当前状态:', {
      taskId: taskId,
      isProcessing: state.isProcessing,
      status: state.status
    });
    
    // 立即停止对应的轮询
    const pollInterval = pollIntervalsRef.current.get(taskId);
    if (pollInterval) {
      clearInterval(pollInterval);
      pollIntervalsRef.current.delete(taskId);
      console.log('[取消任务] 已停止轮询间隔:', taskId);
    }
    
    // 如果没有taskId，直接重置状态
    if (!taskId) {
      console.log('[取消任务] 没有taskId，直接重置状态');
      
      // 更新图片库中的图片状态为已取消（如果有的话）
      const currentTask = state.activeTasks.get(taskId);
      if (currentTask && currentTask.imageId) {
        imageLibraryService.updateImageStatus(currentTask.imageId, 'cancelled');
      }
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'cancelled' as const,
        progress: 0,
        error: null,
        results: [],
        isCancelled: true, // 标记为用户主动取消
        activeTasks: new Map() // 清空活跃任务
      }));
      
      return true;
    }
    
    try {
      const currentRegion = getCurrentRegionConfig();
      console.log('[取消任务] 当前地区配置:', currentRegion);
      
      const requestBody = {
        taskId: taskId,
        regionId: currentRegion.id
      };
      console.log('[取消任务] 发送请求:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[取消任务] 响应状态:', response.status);
      console.log('[取消任务] 响应头:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('[取消任务] 响应数据:', responseData);
        
        // 更新图片库中的图片状态为已取消
        const currentTask = state.activeTasks.get(taskId);
        if (currentTask && currentTask.imageId) {
          imageLibraryService.updateImageStatus(currentTask.imageId, 'cancelled');
          console.log('[取消任务] 已更新图片库状态为已取消');
        }
        
        setState(prev => {
          const newActiveTasks = new Map(prev.activeTasks);
          newActiveTasks.delete(taskId);
          
          const newState = {
            ...prev,
            isProcessing: false,
            status: 'cancelled' as const,
            progress: 0,
            error: null, // 主动取消时不设置错误信息
            results: [],
            isCancelled: true, // 标记为用户主动取消
            activeTasks: newActiveTasks
          };
          console.log('[取消任务] 新状态 (用户主动取消):', newState);
          return newState;
        });
        
        console.log('[取消任务] 任务取消成功');
        return true;
      } else {
        const errorData = await response.json();
        console.error('[取消任务] 服务器错误:', errorData);
        throw new Error('取消任务失败: ' + (errorData.error || '服务器错误'));
      }
    } catch (error: any) {
      console.error('[取消任务] 取消任务失败:', error);
      
      // 即使取消失败，也要重置状态为取消（因为是用户主动操作）
      setState(prev => {
        const currentTask = prev.activeTasks.get(taskId);
        if (currentTask && currentTask.imageId) {
          imageLibraryService.updateImageStatus(currentTask.imageId, 'cancelled');
        }
        return {
          ...prev,
          isProcessing: false,
          status: 'cancelled' as const,
          progress: 0,
          error: null, // 用户主动取消，不显示错误
          results: [],
          isCancelled: true, // 标记为用户主动取消
          activeTasks: new Map() // 清空活跃任务
        };
      });
      
      return true; // 返回true表示状态已重置
    }
  }, [state.isProcessing, state.status, state.activeTasks]);

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
};