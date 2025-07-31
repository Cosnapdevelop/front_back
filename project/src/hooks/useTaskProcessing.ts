import { useState, useCallback } from 'react';
import { getCurrentRegionConfig } from '../config/regions';
import { API_BASE_URL } from '../config/api';

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
      
      if (effect.workflowId) {
        formData.append('workflowId', effect.workflowId);
      }
      if (effect.webappId) {
        formData.append('webappId', effect.webappId.toString());
      }
      
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
      
      // 添加nodeInfoList到formData
      formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
      console.log('[任务处理] 构建的nodeInfoList:', nodeInfoList);
      
      // 添加用户输入的参数
      Object.entries(parameters).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value as string);
        }
      });
      
      // 添加图片文件
      imageParamFiles.forEach((fileInfo) => {
        if (fileInfo.file) {
          formData.append('images', fileInfo.file);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/apply`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[任务处理] 后端响应成功:', result);

      if (result.success && result.taskId) {
        console.log('[任务处理] 收到taskId:', result.taskId);
        startPollingTask(result.taskId);
        setState(prev => ({ ...prev, progress: 25 }));
      } else {
        throw new Error(result.error || '任务创建失败');
      }
    } catch (error) {
      console.error('[任务处理] 错误:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'failed',
        error: error instanceof Error ? error.message : '未知错误'
      }));
    }
  }, []);

  const startPollingTask = useCallback((taskId: string) => {
    let attempts = 0;
    const maxAttempts = 120;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      console.log(`[轮询] 第${attempts}次轮询: taskId=${taskId}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: taskId, regionId: getCurrentRegionConfig().id })
        });

        if (!response.ok) throw new Error('状态查询失败');

        const result = await response.json();
        console.log('[轮询] 状态查询结果:', result);

        if (result.success) {
          const status = result.status;
          console.log(`[轮询] 任务状态: ${status}`);
          
          if (status === 'SUCCESS' || status === 'success' || status === 'COMPLETED' || status === 'completed') {
            console.log('[轮询] 任务完成，开始获取结果');
            
            try {
              const resultsResponse = await fetch(`${API_BASE_URL}/api/effects/comfyui/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                  
                  setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    status: 'completed',
                    progress: 100,
                    results: processedResults
                  }));
                } else {
                  setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    status: 'failed',
                    error: '未获取到有效结果'
                  }));
                }
              } else {
                setState(prev => ({
                  ...prev,
                  isProcessing: false,
                  status: 'failed',
                  error: '获取结果失败'
                }));
              }
            } catch (error) {
              setState(prev => ({
                ...prev,
                isProcessing: false,
                status: 'failed',
                error: '获取结果失败'
              }));
            }
            
            clearInterval(pollInterval);
            return;
          } else if (status === 'FAILED' || status === 'failed' || status === 'ERROR' || status === 'error') {
            setState(prev => ({
              ...prev,
              isProcessing: false,
              status: 'failed',
              error: '任务处理失败'
            }));
            clearInterval(pollInterval);
            return;
          } else {
            const progressValue = Math.min(25 + (attempts * 2), 90);
            setState(prev => ({ ...prev, progress: progressValue }));
          }
        }
      } catch (error) {
        console.error(`[轮询] 第${attempts}次轮询失败:`, error);
        
        if (attempts >= maxAttempts) {
          setState(prev => ({
            ...prev,
            isProcessing: false,
            status: 'failed',
            error: '任务处理超时'
          }));
          clearInterval(pollInterval);
        }
      }
    }, 5000);
  }, []);

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskId, regionId: getCurrentRegionConfig().id })
      });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'cancelled',
        error: null,
        isCancelled: true
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        status: 'cancelled',
        error: null,
        isCancelled: true
      }));
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
