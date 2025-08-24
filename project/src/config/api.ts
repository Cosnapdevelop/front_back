import { getCurrentRegionConfig } from './regions';
import { createError, errorUtils } from '../types/errors';

// API配置文件 - 支持开发和生产环境
const isDevelopment = import.meta.env.DEV;

// 开发环境使用本地后端
const DEV_API_BASE_URL = 'http://localhost:3001';

// 生产环境使用环境变量或默认值
const PROD_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-backend-domain.com';

export const API_BASE_URL = isDevelopment ? DEV_API_BASE_URL : PROD_API_BASE_URL;

// 调试信息 - 在控制台显示当前配置
console.log('🔧 API配置调试信息:');
console.log('- 环境模式:', import.meta.env.MODE);
console.log('- 是否开发环境:', isDevelopment);
console.log('- VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('- 最终使用的API_BASE_URL:', API_BASE_URL);

// 获取当前地区的RunningHub API URL
export function getRunningHubApiUrl(): string {
  try {
    const currentRegion = getCurrentRegionConfig();
    return currentRegion.apiDomain;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    errorUtils.logError(errorObj, '获取RunningHub API URL');
    // 如果localStorage不可用（服务器端渲染），返回默认值
    return 'https://www.runninghub.ai';
  }
}

// RunningHub配置（前端版本 - 不包含敏感信息）
export const RUNNING_HUB_CONFIG = {
  // API基础URL
  baseUrl: API_BASE_URL,
  
  // RunningHub API URL - 动态获取当前地区配置
  get runningHubApiUrl() {
    return getRunningHubApiUrl();
  },
  
  // AI App配置
  webappId: '1937084629516193794',
  
  // 背景替换特效workflowId（ComfyUI工作流）
  backgroundChangeWorkflowId: '1949831786093264897',
  
  // 文件限制 - 根据RunningHub官方API文档
  maxFileSize: 10 * 1024 * 1024, // 10MB (RunningHub官方限制，超过此大小自动使用云存储)
  supportedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxProcessingTime: 5 * 60 * 1000 // 5分钟
};

// 环境信息
export const ENV_INFO = {
  isDevelopment,
  apiBaseUrl: API_BASE_URL,
  nodeEnv: import.meta.env.MODE,
  get currentRegion() {
    try {
      return getCurrentRegionConfig();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      errorUtils.logError(errorObj, '获取当前地区配置');
      return {
        id: 'hongkong',
        name: '香港/澳门/台湾',
        flag: '🇭🇰',
        apiDomain: 'https://www.runninghub.ai',
        description: '港澳台及海外用户推荐使用'
      };
    }
  }
};