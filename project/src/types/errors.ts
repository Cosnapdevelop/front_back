// 统一错误类型定义
export enum ErrorCode {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  
  // 任务相关错误
  TASK_CREATION_FAILED = 'TASK_CREATION_FAILED',
  TASK_STATUS_FAILED = 'TASK_STATUS_FAILED',
  TASK_RESULT_FAILED = 'TASK_RESULT_FAILED',
  TASK_CANCELLATION_FAILED = 'TASK_CANCELLATION_FAILED',
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  
  // 文件相关错误
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // 配置相关错误
  MISSING_CONFIG = 'MISSING_CONFIG',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // 用户操作错误
  USER_CANCELLED = 'USER_CANCELLED',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // 系统错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',      // 不影响主要功能
  MEDIUM = 'MEDIUM', // 影响部分功能
  HIGH = 'HIGH',    // 影响主要功能
  CRITICAL = 'CRITICAL' // 系统崩溃
}

// 基础错误类
export class BaseError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// 网络错误
export class NetworkError extends BaseError {
  constructor(message: string, retryable: boolean = true, details?: any) {
    super(message, ErrorCode.NETWORK_ERROR, ErrorSeverity.HIGH, retryable, details);
  }
}

// 超时错误
export class TimeoutError extends BaseError {
  constructor(message: string = '请求超时', details?: any) {
    super(message, ErrorCode.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, true, details);
  }
}

// API错误
export class APIError extends BaseError {
  constructor(
    message: string,
    public status?: number,
    public apiCode?: string,
    retryable: boolean = false,
    details?: any
  ) {
    super(message, ErrorCode.API_ERROR, ErrorSeverity.MEDIUM, retryable, details);
  }
}

// 任务错误
export class TaskError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    public taskId?: string,
    retryable: boolean = false,
    details?: any
  ) {
    super(message, code, ErrorSeverity.HIGH, retryable, details);
  }
}

// 文件错误
export class FileError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode,
    public fileName?: string,
    public fileSize?: number,
    details?: any
  ) {
    super(message, code, ErrorSeverity.MEDIUM, false, details);
  }
}

// 配置错误
export class ConfigError extends BaseError {
  constructor(message: string, public configKey?: string, details?: any) {
    super(message, ErrorCode.MISSING_CONFIG, ErrorSeverity.CRITICAL, false, details);
  }
}

// 用户错误
export class UserError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.INVALID_INPUT, ErrorSeverity.LOW, false, details);
  }
}

// 存储错误
export class StorageError extends BaseError {
  constructor(message: string, public operation?: string, details?: any) {
    super(message, ErrorCode.STORAGE_ERROR, ErrorSeverity.MEDIUM, false, details);
  }
}

// 错误工厂函数
export const createError = {
  network: (message: string, retryable = true, details?: any) => 
    new NetworkError(message, retryable, details),
  
  timeout: (message?: string, details?: any) => 
    new TimeoutError(message, details),
  
  api: (message: string, status?: number, apiCode?: string, retryable = false, details?: any) => 
    new APIError(message, status, apiCode, retryable, details),
  
  task: (message: string, code: ErrorCode, taskId?: string, retryable = false, details?: any) => 
    new TaskError(message, code, taskId, retryable, details),
  
  file: (message: string, code: ErrorCode, fileName?: string, fileSize?: number, details?: any) => 
    new FileError(message, code, fileName, fileSize, details),
  
  config: (message: string, configKey?: string, details?: any) => 
    new ConfigError(message, configKey, details),
  
  user: (message: string, details?: any) => 
    new UserError(message, details),
  
  storage: (message: string, operation?: string, details?: any) => 
    new StorageError(message, operation, details),
  
  unknown: (message: string, details?: any) => 
    new BaseError(message, ErrorCode.UNKNOWN_ERROR, ErrorSeverity.HIGH, false, details)
};

// 错误处理工具函数
export const errorUtils = {
  // 判断错误是否可重试
  isRetryable: (error: Error): boolean => {
    if (error instanceof BaseError) {
      return error.retryable;
    }
    // 默认网络错误可重试
    return error.message.includes('network') || error.message.includes('timeout');
  },
  
  // 获取用户友好的错误消息
  getUserMessage: (error: Error): string => {
    if (error instanceof BaseError) {
      switch (error.code) {
        case ErrorCode.NETWORK_ERROR:
          return '网络连接失败，请检查网络后重试';
        case ErrorCode.TIMEOUT_ERROR:
          return '请求超时，请稍后重试';
        case ErrorCode.TASK_TIMEOUT:
          return '任务处理超时，请稍后重试';
        case ErrorCode.FILE_TOO_LARGE:
          return '文件过大，请选择较小的文件';
        case ErrorCode.INVALID_FILE_TYPE:
          return '不支持的文件类型，请选择图片文件';
        case ErrorCode.USER_CANCELLED:
          return '操作已取消';
        default:
          return error.message || '操作失败，请重试';
      }
    }
    return error.message || '未知错误，请重试';
  },
  
  // 记录错误日志
  logError: (error: Error, context?: string) => {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof BaseError && {
        code: error.code,
        severity: error.severity,
        retryable: error.retryable,
        details: error.details
      })
    };
    
    console.error(`[${timestamp}] ${context || 'Error'}:`, errorInfo);
    
    // 可以在这里添加错误上报逻辑
    // reportError(errorInfo);
  }
}; 