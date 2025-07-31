/**
 * Webapp任务服务
 * 
 * ⚠️ 重要提示 ⚠️
 * RunningHub管理员明确要求：webappId必须使用字符串形式传递，不能使用parseInt()转换为整数
 * 这个修复解决了之前所有webapp特效返回"webapp not exists"错误的问题
 * 
 * 修复前：webappId: parseInt(webappId)  ❌
 * 修复后：webappId: webappId            ✅
 * 
 * 相关文件：
 * - runninghub-backend/src/services/webappTaskService.js (本文件)
 * - runninghub-backend/test-all-effects.js
 * - project/src/data/mockData.ts
 * 
 * 测试结果：修复后所有webapp特效都能正常启动任务，返回code: 0或code: 433
 * 
 * 最后更新：2024年1月
 */

import axios from 'axios';
import { getRegionConfig } from '../config/regions.js';

const DEFAULT_REGION = 'hongkong';

// 创建axios实例
function createWebappAxiosInstance(regionId = DEFAULT_REGION) {
  const regionConfig = getRegionConfig(regionId);
  return axios.create({
    baseURL: regionConfig.apiDomain,
    timeout: 60000, // 60秒超时
    headers: {
      'Content-Type': 'application/json',
      'Host': regionConfig.apiDomain.replace('https://', '')
    }
  });
}

// 启动webapp任务
async function startWebappTaskService(webappId, nodeInfoList, regionId = DEFAULT_REGION) {
  const axiosInstance = createWebappAxiosInstance(regionId);
  
  const requestData = {
    webappId: webappId, // 使用字符串形式，不转换为整数
    apiKey: process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105',
    nodeInfoList: nodeInfoList
  };
  
  console.log(`[Webapp] 开始启动Webapp任务: webappId=${webappId}, regionId=${regionId}`);
  console.log(`[Webapp] 请求数据详情:`, {
    webappId: requestData.webappId,
    webappIdType: typeof requestData.webappId,
    nodeInfoListLength: nodeInfoList.length,
    nodeInfoList: nodeInfoList,
    regionId: regionId
  });
  
  try {
    const response = await axiosInstance.post('/task/openapi/ai-app/run', requestData, {
      timeout: 60000 // 增加到60秒超时
    });
    
    console.log(`[Webapp] Webapp任务启动响应 (地区: ${getRegionConfig(regionId).name}): webappId=${webappId}, response=`, response.data);
    
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.taskId) {
      console.log(`[Webapp] Webapp任务启动成功: taskId=${response.data.data.taskId}`);
      return response.data.data;
    } else {
      console.error(`[Webapp] Webapp任务启动失败:`, response.data);
      throw new Error(`Webapp任务启动失败: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`[Webapp] Webapp任务启动异常 (地区: ${getRegionConfig(regionId).name}): webappId=${webappId}, error=`, error.message);
    throw error;
  }
}

// 获取webapp任务状态
async function getWebappTaskStatus(taskId, regionId = DEFAULT_REGION) {
  const axiosInstance = createWebappAxiosInstance(regionId);
  
  const requestData = {
    apiKey: process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105',
    taskId: taskId
  };
  
  try {
    const response = await axiosInstance.post('/task/openapi/status', requestData);
    console.log(`[Webapp] 状态查询响应 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, response=`, response.data);
    
    if (response.data.code === 0) {
      return response.data.data;
    } else {
      throw new Error(`状态查询失败: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`[Webapp] 状态查询失败 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, error=`, error.message);
    throw error;
  }
}

// 获取webapp任务结果
async function getWebappTaskResult(taskId, regionId = DEFAULT_REGION) {
  const axiosInstance = createWebappAxiosInstance(regionId);
  
  const requestData = {
    apiKey: process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105',
    taskId: taskId
  };
  
  try {
    console.log(`[Webapp] 开始获取结果: taskId=${taskId}, regionId=${regionId}`);
    console.log(`[Webapp] 请求数据:`, requestData);
    
    const response = await axiosInstance.post('/task/openapi/outputs', requestData);
    console.log(`[Webapp] 结果查询响应 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, response=`, response.data);
    
    if (response.data && response.data.code === 0) {
      // 检查返回的数据格式
      console.log(`[Webapp] 结果数据详情:`, {
        code: response.data.code,
        msg: response.data.msg,
        data: response.data.data,
        dataType: typeof response.data.data,
        isArray: Array.isArray(response.data.data),
        dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'N/A'
      });
      
      // 如果data是数组，直接返回；如果是对象，可能需要提取图片URL
      if (Array.isArray(response.data.data)) {
        // 处理数组中的URL，确保是完整的URL
        const processedUrls = response.data.data.map(url => {
          if (typeof url === 'string') {
            // 如果是相对路径，添加域名前缀
            if (url.startsWith('/') || !url.startsWith('http')) {
              const baseUrl = getRegionConfig(regionId).apiDomain;
              return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
            }
            return url;
          }
          return url;
        });
        console.log(`[Webapp] 处理后的图片URL:`, processedUrls);
        return processedUrls;
      } else if (response.data.data && typeof response.data.data === 'object') {
        // 如果是对象，尝试提取图片URL
        const imageUrls = [];
        for (const key in response.data.data) {
          const value = response.data.data[key];
          if (typeof value === 'string' && (value.includes('.png') || value.includes('.jpg') || value.includes('.jpeg'))) {
            // 确保是完整的URL
            let processedUrl = value;
            if (value.startsWith('/') || !value.startsWith('http')) {
              const baseUrl = getRegionConfig(regionId).apiDomain;
              processedUrl = value.startsWith('/') ? `${baseUrl}${value}` : `${baseUrl}/${value}`;
            }
            imageUrls.push(processedUrl);
          }
        }
        console.log(`[Webapp] 提取的图片URL:`, imageUrls);
        return imageUrls;
      } else {
        console.warn(`[Webapp] 未知的结果数据格式:`, response.data.data);
        return [];
      }
    } else {
      console.error(`[Webapp] 结果查询失败:`, response.data);
      throw new Error(`结果查询失败: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`[Webapp] 结果查询失败 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, error=`, error.message);
    throw error;
  }
}

// 等待webapp任务完成并获取结果
async function waitForWebappTaskAndGetImages(taskId, regionId = DEFAULT_REGION) {
  console.log(`[Webapp] 开始轮询任务状态: taskId=${taskId}`);
  
  let attempts = 0;
  const maxAttempts = 60; // 最多等待5分钟
  const interval = 5000; // 5秒轮询一次
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const status = await getWebappTaskStatus(taskId, regionId);
      console.log(`[Webapp] 任务状态更新: taskId=${taskId}, status=${status}, attempts=${attempts}`);
      
      if (status === 'SUCCESS') {
        // 等待更长时间确保结果准备完成
        console.log(`[Webapp] 任务完成，等待结果准备...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 增加到5秒
        
        const results = await getWebappTaskResult(taskId, regionId);
        console.log(`[Webapp] 任务处理完成: 生成${results.length}张图片`);
        return results;
      } else if (status === 'FAILED') {
        throw new Error(`任务处理失败: taskId=${taskId}`);
      } else if (status === 'CANCELLED') {
        throw new Error(`任务已取消: taskId=${taskId}`);
      }
      
      // 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, interval));
      
    } catch (error) {
      console.error(`[Webapp] 轮询失败: taskId=${taskId}, attempt=${attempts}, error=`, error.message);
      
      if (attempts >= maxAttempts) {
        throw new Error(`Webapp任务处理超时或失败: taskId=${taskId}, 最终状态=${status}`);
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Webapp任务处理超时: taskId=${taskId}`);
}

// 取消webapp任务
async function cancelWebappTask(taskId, regionId = DEFAULT_REGION) {
  const axiosInstance = createWebappAxiosInstance(regionId);
  
  const requestData = {
    apiKey: process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105',
    taskId: taskId
  };
  
  try {
    const response = await axiosInstance.post('/task/openapi/cancel', requestData);
    console.log(`[Webapp] 取消任务响应 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, response=`, response.data);
    
    if (response.data.code === 0) {
      return true;
    } else {
      throw new Error(`取消任务失败: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error(`[Webapp] 取消任务失败 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, error=`, error.message);
    throw error;
  }
}

export {
  startWebappTaskService,
  getWebappTaskStatus,
  getWebappTaskResult,
  waitForWebappTaskAndGetImages,
  cancelWebappTask
};