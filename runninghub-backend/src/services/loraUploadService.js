import axios from 'axios';
import crypto from 'crypto';
import { getRegionConfig } from '../config/regions.js';

const DEFAULT_REGION = 'hongkong';

// 创建axios实例
function createLoraAxiosInstance(regionId = DEFAULT_REGION) {
  const regionConfig = getRegionConfig(regionId);
  return axios.create({
    baseURL: regionConfig.apiDomain,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      'Host': regionConfig.apiDomain.replace('https://', '')
    }
  });
}

// 计算文件的MD5值
export function calculateMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// 获取Lora上传链接
export async function getLoraUploadUrl(loraName, md5Hex, regionId = DEFAULT_REGION) {
  const axiosInstance = createLoraAxiosInstance(regionId);
  
  const requestData = {
    apiKey: process.env.RUNNINGHUB_API_KEY || '50dcc0fbc848467092f853a9fcb49d50',
    loraName,
    md5Hex
  };
  
  console.log(`[Lora上传] 获取上传链接: loraName=${loraName}, md5Hex=${md5Hex}, regionId=${regionId}`);
  
  try {
    const response = await axiosInstance.post('/api/openapi/getLoraUploadUrl', requestData);
    
    console.log(`[Lora上传] 获取上传链接响应:`, response.data);
    
    if (response.data.code === 0 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(`获取Lora上传链接失败: ${response.data.msg || '未知错误'}`);
    }
  } catch (error) {
    console.error(`[Lora上传] 获取上传链接异常:`, error.message);
    throw error;
  }
}

// 上传Lora文件到云存储
export async function uploadLoraFile(uploadUrl, fileBuffer, fileName) {
  console.log(`[Lora上传] 开始上传文件到云存储: ${fileName}`);
  
  try {
    const response = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      timeout: 300000, // 5分钟超时，Lora文件可能比较大
      maxContentLength: 100 * 1024 * 1024, // 100MB限制
      maxBodyLength: 100 * 1024 * 1024
    });
    
    console.log(`[Lora上传] 文件上传成功: ${fileName}, 状态码: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`[Lora上传] 文件上传失败: ${fileName}`, error.message);
    throw new Error(`Lora文件上传失败: ${error.message}`);
  }
}

// 完整的Lora上传流程
export async function uploadLoraService(file, regionId = DEFAULT_REGION) {
  console.log(`[Lora上传] 开始Lora上传流程: ${file.originalname} (${file.size} bytes)`);
  
  try {
    // 1. 计算文件MD5
    const md5Hex = calculateMD5(file.buffer);
    console.log(`[Lora上传] 文件MD5: ${md5Hex}`);
    
    // 2. 提取Lora名称（去掉.safetensors扩展名）
    const loraName = file.originalname.replace(/\.safetensors$/i, '');
    
    // 3. 获取上传链接
    const uploadData = await getLoraUploadUrl(loraName, md5Hex, regionId);
    console.log(`[Lora上传] 获取到上传链接:`, uploadData);
    
    // 4. 上传文件到云存储
    await uploadLoraFile(uploadData.url, file.buffer, file.originalname);
    
    // 5. 返回fileName供RHLoraLoader节点使用
    console.log(`[Lora上传] Lora上传完成，fileName: ${uploadData.fileName}`);
    return uploadData.fileName;
    
  } catch (error) {
    console.error(`[Lora上传] Lora上传流程失败:`, error.message);
    throw error;
  }
}

// 验证Lora文件
export function validateLoraFile(file) {
  const allowedTypes = ['application/octet-stream'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (!allowedTypes.includes(file.mimetype) && !file.originalname.endsWith('.safetensors')) {
    throw new Error('只支持.safetensors格式的Lora文件');
  }
  
  if (file.size > maxSize) {
    throw new Error(`Lora文件过大，最大支持100MB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  }
  
  return true;
}

















