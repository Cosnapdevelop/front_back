import { API_BASE_URL } from '../config/api';
import { createError, errorUtils, APIError as BaseAPIError, TimeoutError, NetworkError } from '../types/errors';

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  timeout: 30000, // 30秒
};

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 带重试的fetch包装器
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retryConfig = RETRY_CONFIG
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), retryConfig.timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 如果响应成功，直接返回
      if (response.ok) {
        return response;
      }
      
      // 如果是客户端错误（4xx），不重试
      if (response.status >= 400 && response.status < 500) {
        return response;
      }
      
      // 服务器错误（5xx）或网络错误，继续重试
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // 如果是AbortError（超时），不重试
      if (error instanceof Error && error.name === 'AbortError') {
        throw createError.timeout('请求超时');
      }
    }
    
    // 如果不是最后一次尝试，等待后重试
    if (attempt < retryConfig.maxRetries) {
      const delayTime = retryConfig.retryDelay * Math.pow(2, attempt); // 指数退避
      console.log(`[API] 第${attempt + 1}次请求失败，${delayTime}ms后重试:`, lastError?.message);
      await delay(delayTime);
    }
  }
  
  // 将普通错误转换为网络错误
  if (lastError instanceof Error) {
    throw createError.network(lastError.message, true, { originalError: lastError });
  }
  throw createError.unknown('未知网络错误');
}

// 统一的API错误处理 - 使用新的错误类型系统
export class APIError extends BaseAPIError {
  constructor(
    message: string,
    status?: number,
    apiCode?: string,
    retryable = false,
    details?: any
  ) {
    super(message, status, apiCode, retryable, details);
  }
}

// 处理API响应
export async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // 如果无法解析JSON，使用状态文本
      errorData = { message: response.statusText };
    }
    
    const isRetryable = response.status >= 500 || response.status === 408;
    throw new APIError(
      errorData.error || errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData.code,
      isRetryable,
      errorData
    );
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new APIError('响应解析失败', response.status);
  }
}

// 通用的API调用函数
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  retryConfig = RETRY_CONFIG
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const accessToken = localStorage.getItem('cosnap_access_token');
    const headers: any = { ...(options.headers || {}) };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const response = await fetchWithRetry(url, { ...options, headers }, retryConfig);
    return await handleAPIResponse<T>(response);
  } catch (error) {
    if (error instanceof APIError) {
      // 401错误让AuthContext处理token刷新，避免重复刷新逻辑
      if (error.status === 401) {
        console.warn('[API] Authentication error detected. AuthContext should handle token refresh.');
        // 不在这里处理token刷新，让AuthContext的interceptor处理
      }
      throw error;
    }
    if (error instanceof BaseError) {
      throw error;
    }
    throw createError.network(error instanceof Error ? error.message : '网络请求失败', true, { originalError: error });
  }
}

// 任务相关的API调用
export const taskAPI = {
  // 获取任务状态
  async getStatus(taskId: string, regionId: string) {
    return apiCall('/api/effects/comfyui/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, regionId })
    });
  },
  
  // 获取任务结果
  async getResults(taskId: string, regionId: string) {
    return apiCall('/api/effects/comfyui/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, regionId })
    });
  },
  
  // 取消任务
  async cancelTask(taskId: string, regionId: string) {
    return apiCall('/api/effects/comfyui/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, regionId })
    });
  }
};