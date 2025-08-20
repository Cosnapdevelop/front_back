import axios from 'axios';
import monitoringService from './monitoringService.js';
import FormData from 'form-data';
import { uploadToCloudStorage, shouldUseCloudStorage, formatFileSize } from './cloudStorageService.js';

const apiKey = process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105';
const webappId = process.env.RUNNINGHUB_WEBAPP_ID || '1937084629516193794';

// 地区配置
const REGIONS = {
  china: {
    name: '中国大陆',
    apiDomain: 'https://www.runninghub.cn',
    host: 'www.runninghub.cn'
  },
  hongkong: {
    name: '香港/澳门/台湾',
    apiDomain: 'https://www.runninghub.ai',
    host: 'www.runninghub.ai'
  }
};

// 默认地区
const DEFAULT_REGION = 'hongkong';

// 获取地区配置
function getRegionConfig(regionId = DEFAULT_REGION) {
  return REGIONS[regionId] || REGIONS[DEFAULT_REGION];
}

// 创建RunningHub API实例
function createRunningHubAxiosInstance(regionId = DEFAULT_REGION) {
  const regionConfig = getRegionConfig(regionId);
  return axios.create({
    baseURL: regionConfig.apiDomain,
    timeout: 180000, // 默认3分钟超时，但具体请求会覆盖此设置
    headers: {
      'Host': regionConfig.host,
    },
  });
}

export async function uploadImageService(file, regionId = DEFAULT_REGION) {
  console.log(`[图片上传] 开始上传图片 (地区: ${getRegionConfig(regionId).name}): ${file.originalname} (${formatFileSize(file.size)})`);
  
  // 检查文件大小，决定使用RunningHub还是云存储
  if (shouldUseCloudStorage(file.size)) {
    console.log(`[图片上传] 文件大于10MB，使用云存储上传: ${formatFileSize(file.size)}`);
    
    try {
      // 使用云存储上传大文件
      const cloudUrl = await uploadToCloudStorage(file.buffer, file.originalname, file.mimetype);
      console.log(`[图片上传] 云存储上传成功: ${cloudUrl}`);
      monitoringService.recordFileUpload('image', file.size, 'success');
      
      // 返回云存储URL（这个URL可以直接在LoadImage节点中使用）
      return cloudUrl;
    } catch (error) {
      console.error('[图片上传] 云存储上传失败:', error);
      monitoringService.recordFileUpload('image', file.size, 'error');
      throw new Error(`大文件上传失败: ${error.message}`);
    }
  }
  
  // 小于等于10MB的文件使用RunningHub原生上传
  console.log(`[图片上传] 文件小于等于10MB，使用RunningHub原生上传: ${formatFileSize(file.size)}`);
  
  const form = new FormData();
  form.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype
  });
  form.append('apiKey', apiKey);
  form.append('fileType', 'image');
  
  // 重试机制
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const axiosInstance = createRunningHubAxiosInstance(regionId);
      
      // 根据文件大小动态调整超时时间（针对10MB以内的文件）
      const fileSizeMB = file.size / (1024 * 1024);
      let baseTimeout;
      
      if (fileSizeMB > 5) {
        baseTimeout = 120000; // 5-10MB：2分钟
      } else {
        baseTimeout = 60000;  // 小文件：1分钟
      }
      
      const timeout = attempt === 1 ? baseTimeout : Math.max(baseTimeout * 0.7, 60000);
      
      console.log(`[RunningHub] 文件大小: ${fileSizeMB.toFixed(1)}MB, 超时设置: ${timeout/1000}秒`);
      
      console.log(`[RunningHub] 上传尝试 ${attempt}/${maxRetries} (超时: ${timeout}ms)`);
      
      const response = await axiosInstance.post('/task/openapi/upload', form, {
        headers: {
          ...form.getHeaders(),
          'Host': getRegionConfig(regionId).host
        },
        timeout: timeout
      });
      
      console.log(`[RunningHub] 上传成功 (地区: ${getRegionConfig(regionId).name}):`, response.data);
      monitoringService.recordFileUpload('image', file.size, 'success');
      
      if (response.data && response.data.code === 0 && response.data.data && response.data.data.fileName) {
        return response.data.data.fileName;
      } else {
        throw new Error('上传图片失败: 未返回 fileName');
      }
    } catch (err) {
      lastError = err;
      console.error(`[RunningHub] 上传尝试 ${attempt} 失败 (地区: ${getRegionConfig(regionId).name}):`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      monitoringService.recordFileUpload('image', file.size, 'error');
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        // 如果是超时错误，增加更长的延迟
        const isTimeout = err.message && err.message.includes('timeout');
        const baseDelay = isTimeout ? 5000 : 2000;
        const delay = baseDelay * attempt; // 超时: 5秒、10秒；其他: 2秒、4秒
        
        console.log(`[RunningHub] ${isTimeout ? '超时错误' : '一般错误'}, 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败了
  throw new Error('上传图片失败: ' + (lastError.response?.data?.msg || lastError.message));
}