// 云存储服务 - 处理大于10MB的文件上传
// 支持阿里云OSS、腾讯云COS、AWS S3等云存储服务

import axios from 'axios';
import OSS from 'ali-oss';

// 阿里云OSS配置
const CLOUD_STORAGE_CONFIG = {
  provider: process.env.CLOUD_STORAGE_PROVIDER || 'mock',
  
  // 阿里云OSS配置
  aliyunOSS: {
    region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    bucket: process.env.ALIYUN_OSS_BUCKET || 'cosnap-storage',
    // CDN域名（可选，用于加速访问）
    customDomain: process.env.ALIYUN_OSS_CUSTOM_DOMAIN,
  },
  
  // 其他云存储配置（备用）
  tencentCOS: {
    secretId: process.env.TENCENT_COS_SECRET_ID,
    secretKey: process.env.TENCENT_COS_SECRET_KEY,
    region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
    bucket: process.env.TENCENT_COS_BUCKET || 'cosnap-storage',
  },
  
  awsS3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || 'cosnap-storage',
  }
};

/**
 * 上传大文件到云存储
 * @param {Buffer} fileBuffer - 文件缓冲区
 * @param {string} fileName - 文件名
 * @param {string} mimeType - 文件MIME类型
 * @returns {Promise<string>} - 返回云存储的公开访问URL
 */
export async function uploadToCloudStorage(fileBuffer, fileName, mimeType) {
  console.log(`[云存储] 开始上传大文件: ${fileName} (${fileBuffer.length} bytes)`);
  
  try {
    // 生成唯一文件名（避免重名冲突）
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `cosnap/large-files/${timestamp}-${randomString}.${fileExtension}`;
    
    // 根据配置选择云存储服务商
    switch (CLOUD_STORAGE_CONFIG.provider) {
      case 'aliyun-oss':
        return await uploadToAliyunOSS(fileBuffer, uniqueFileName, mimeType);
      
      case 'tencent-cos':
        return await uploadToTencentCOS(fileBuffer, uniqueFileName, mimeType);
      
      case 'aws-s3':
        return await uploadToAWSS3(fileBuffer, uniqueFileName, mimeType);
      
      case 'mock':
      default:
        // 模拟上传（开发测试用）
        console.log(`[云存储] 模拟上传成功: ${uniqueFileName}`);
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 返回模拟的公开URL
        const mockPublicUrl = `https://mock-cdn.example.com/${uniqueFileName}`;
        console.log(`[云存储] 模拟URL: ${mockPublicUrl}`);
        
        return mockPublicUrl;
    }
    
  } catch (error) {
    console.error('[云存储] 上传失败:', error);
    throw new Error(`云存储上传失败: ${error.message}`);
  }
}

/**
 * 上传到阿里云OSS
 */
async function uploadToAliyunOSS(fileBuffer, fileName, mimeType) {
  const config = CLOUD_STORAGE_CONFIG.aliyunOSS;
  
  // 检查必需的配置
  if (!config.accessKeyId || !config.accessKeySecret) {
    throw new Error('阿里云OSS配置不完整：缺少AccessKey信息');
  }
  
  try {
    console.log(`[阿里云OSS] 开始上传文件: ${fileName}`);
    
    // 创建OSS客户端
    const client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
    });
    
    // 上传文件到OSS
    const result = await client.put(fileName, fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'x-oss-object-acl': 'public-read', // 设置为公开读
        'Cache-Control': 'max-age=31536000', // 缓存1年
      }
    });
    
    // 构建公开访问URL
    let publicUrl;
    if (config.customDomain) {
      // 使用自定义域名（CDN加速）
      publicUrl = `https://${config.customDomain}/${fileName}`;
    } else {
      // 使用OSS默认域名
      publicUrl = result.url.replace('http://', 'https://');
    }
    
    console.log(`[阿里云OSS] 上传成功: ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error('[阿里云OSS] 上传失败:', error);
    throw new Error(`阿里云OSS上传失败: ${error.message}`);
  }
}

/**
 * 上传到腾讯云COS
 */
async function uploadToTencentCOS(fileBuffer, fileName, mimeType) {
  // 实现腾讯云COS上传逻辑
  // 需要安装: npm install cos-nodejs-sdk-v5
  throw new Error('腾讯云COS功能需要配置后启用');
}

/**
 * 上传到AWS S3
 */
async function uploadToAWSS3(fileBuffer, fileName, mimeType) {
  // 实现AWS S3上传逻辑
  // 需要安装: npm install aws-sdk
  throw new Error('AWS S3功能需要配置后启用');
}

/**
 * 检查文件是否需要使用云存储
 * @param {number} fileSize - 文件大小（字节）
 * @returns {boolean} - 是否需要云存储
 */
export function shouldUseCloudStorage(fileSize) {
  const RUNNINGHUB_LIMIT = 10 * 1024 * 1024; // 10MB - RunningHub官方API限制
  return fileSize > RUNNINGHUB_LIMIT;
}

/**
 * 获取文件大小的友好显示格式
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 默认导出包含所有函数的服务对象
export default {
  uploadToCloudStorage,
  shouldUseCloudStorage,
  formatFileSize
};