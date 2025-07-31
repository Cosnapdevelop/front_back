// API客户端工具类 - 统一错误处理、重试机制和请求拦截

export interface ApiError extends Error {
  status?: number;
  response?: Response;
  isRetryable?: boolean;
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: ApiError) => boolean;
}

const DEFAULT_CONFIG: Required<RequestConfig> = {
  timeout: 30000, // 30秒
  retries: 3,
  retryDelay: 1000, // 1秒
  retryCondition: (error: ApiError) => {
    // 网络错误或服务器错误可重试
    return !error.status || error.status >= 500 || error.status === 408;
  }
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 指数退避算法
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, 30000);
}

/**
 * 创建带超时的fetch请求
 */
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    fetch(url, {
      ...options,
      signal: controller.signal
    })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

/**
 * 带重试机制的API请求
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  config: RequestConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: ApiError;

  for (let attempt = 0; attempt <= finalConfig.retries; attempt++) {
    try {
      console.log(`[API请求] 尝试 ${attempt + 1}/${finalConfig.retries + 1}: ${url}`);

      const response = await fetchWithTimeout(url, options, finalConfig.timeout);
      
      if (!response.ok) {
        const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        error.isRetryable = finalConfig.retryCondition(error);
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return response as any;
      }

    } catch (error) {
      lastError = error as ApiError;
      
      console.warn(`[API请求] 第${attempt + 1}次尝试失败:`, lastError.message);

      // 如果是最后一次尝试或错误不可重试，直接抛出
      if (attempt === finalConfig.retries || !finalConfig.retryCondition(lastError)) {
        break;
      }

      // 计算退避延迟
      const delayMs = calculateBackoffDelay(attempt, finalConfig.retryDelay);
      console.log(`[API请求] ${delayMs}ms后进行第${attempt + 2}次重试...`);
      await delay(delayMs);
    }
  }

  console.error(`[API请求] 所有重试均失败，URL: ${url}`);
  throw lastError;
}

/**
 * GET请求
 */
export function apiGet<T = any>(url: string, config?: RequestConfig): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' }, config);
}

/**
 * POST请求
 */
export function apiPost<T = any>(
  url: string, 
  data?: any, 
  config?: RequestConfig
): Promise<T> {
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    if (data instanceof FormData) {
      // FormData不需要设置Content-Type
      delete options.headers;
      options.body = data;
    } else {
      options.body = JSON.stringify(data);
    }
  }

  return apiRequest<T>(url, options, config);
}

/**
 * 上传文件的POST请求（更长的超时时间）
 */
export function apiUpload<T = any>(
  url: string,
  formData: FormData,
  config?: RequestConfig
): Promise<T> {
  const uploadConfig: RequestConfig = {
    timeout: 180000, // 3分钟超时
    retries: 2, // 减少重试次数（上传通常不需要太多重试）
    retryDelay: 2000,
    ...config
  };

  return apiRequest<T>(url, {
    method: 'POST',
    body: formData
  }, uploadConfig);
}

/**
 * 健康检查请求（快速失败）
 */
export function healthCheck(url: string): Promise<any> {
  return apiRequest(url, { method: 'GET' }, {
    timeout: 5000,
    retries: 1,
    retryDelay: 500
  });
}

export default {
  request: apiRequest,
  get: apiGet,
  post: apiPost,
  upload: apiUpload,
  healthCheck
};