import axios from 'axios';
import monitoringService from './monitoringService.js';

const apiKey = process.env.RUNNINGHUB_API_KEY;

// 安全检查：确保API密钥已配置
if (!apiKey) {
  console.warn('⚠️ 警告：RUNNINGHUB_API_KEY环境变量未配置');
  console.warn('ComfyUI功能将被禁用，请在.env文件中设置RUNNINGHUB_API_KEY=your-api-key');
}

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
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Host': regionConfig.host,
    },
  });
}

/**
 * 启动ComfyUI任务服务
 * ⚠️ 重要：RunningHub API要求所有参数都必须是字符串类型！
 * @param {string} workflowId - 工作流ID (必须转换为字符串)
 * 
 * TODO(human) - 添加详细的调试日志来帮助诊断503错误问题
 * @param {Array} nodeInfoList - 节点信息列表
 * @param {string} regionId - 地区ID
 * @param {string} instanceType - 实例类型
 */
async function startComfyUITaskService(workflowId, nodeInfoList, regionId = DEFAULT_REGION, instanceType = null) {
  // 检查API密钥是否可用
  if (!apiKey) {
    const error = new Error('ComfyUI服务不可用：RUNNINGHUB_API_KEY未配置');
    error.code = 'NO_API_KEY';
    monitoringService.recordMetric('errors_total', 1, { 
      type: 'ComfyUI', 
      route: 'startTask', 
      error_code: 'NO_API_KEY' 
    });
    throw error;
  }
  
  console.log(`[ComfyUI] 开始发起任务 (地区: ${getRegionConfig(regionId).name}): workflowId=${workflowId}, instanceType=${instanceType}`);
  const timerStart = Date.now();
  
  // 重试机制
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const axiosInstance = createRunningHubAxiosInstance(regionId);
      
      // 第一次尝试使用更长的超时时间
      const timeout = attempt === 1 ? 60000 : 30000;
      
      console.log(`[ComfyUI] 发起任务尝试 ${attempt}/${maxRetries} (超时: ${timeout}ms)`);
      
      // ⚠️ 重要提醒：RunningHub API要求所有参数都必须是字符串类型！
      // workflowId, nodeId, fieldName, fieldValue 都必须转换为字符串
      // 根据nodeInfoList是否为空来决定使用简易模式还是高级模式
      let requestBody;
      
      if (!nodeInfoList || nodeInfoList.length === 0) {
        // 简易模式：直接运行工作流，不修改任何参数
        requestBody = {
          apiKey: apiKey,
          workflowId: String(workflowId), // ⚠️ 必须转换为字符串！RunningHub API要求
          addMetadata: true
        };
        console.log(`[ComfyUI] 使用简易模式（无参数修改）`);
      } else {
        // 高级模式：修改工作流参数
        requestBody = {
          apiKey: apiKey,
          workflowId: String(workflowId), // ⚠️ 必须转换为字符串！RunningHub API要求
          nodeInfoList: nodeInfoList.map(item => ({
            nodeId: String(item.nodeId), // ⚠️ 必须转换为字符串！
            fieldName: String(item.fieldName), // ⚠️ 必须转换为字符串！
            fieldValue: String(item.fieldValue) // ⚠️ 必须转换为字符串！RunningHub API要求
          })),
          addMetadata: true
        };
        console.log(`[ComfyUI] 使用高级模式（修改参数）`);
        console.log(`[ComfyUI] nodeInfoList详情:`, nodeInfoList.map(item => ({
          nodeId: item.nodeId,
          fieldName: item.fieldName,
          fieldValue: typeof item.fieldValue === 'string' ? 
            (item.fieldValue.length > 50 ? item.fieldValue.substring(0, 50) + '...' : item.fieldValue) : 
            item.fieldValue
        })));
      }
      
      // 如果指定了instanceType，添加到请求体中（用于48G Plus工作流）
      if (instanceType) {
        requestBody.instanceType = instanceType;
        console.log(`[ComfyUI] 指定实例类型: ${instanceType} (用于48G Plus工作流)`);
      }
      
      console.log(`[ComfyUI] 发送请求数据:`, JSON.stringify(requestBody, null, 2));
      
      const response = await axiosInstance.post('/task/openapi/create', requestBody, {
        timeout: timeout,
        headers: {
          'Host': getRegionConfig(regionId).host
        }
      });
      
      console.log(`[ComfyUI] 任务发起成功 (地区: ${getRegionConfig(regionId).name}):`, response.data);
      monitoringService.recordEffectProcessing('comfyui', regionId, Date.now() - timerStart, 'success');
      
      // 检查promptTips字段，如果有错误信息则输出
      if (response.data?.data?.promptTips) {
        try {
          const promptTips = JSON.parse(response.data.data.promptTips);
          
          if (promptTips.error || (promptTips.node_errors && Object.keys(promptTips.node_errors).length > 0)) {
            console.error(`[ComfyUI] 工作流校验失败:`, {
              error: promptTips.error,
              node_errors: promptTips.node_errors
            });
            throw new Error(`工作流校验失败: ${JSON.stringify(promptTips)}`);
          } else {
            // 只在调试模式下显示成功的校验信息
            if (process.env.NODE_ENV === 'development') {
              console.log(`[ComfyUI] 工作流校验通过，将执行 ${promptTips.outputs_to_execute?.length || 0} 个节点`);
            }
          }
        } catch (parseError) {
          console.error(`[ComfyUI] promptTips解析失败:`, parseError.message);
          console.error(`[ComfyUI] 原始promptTips:`, response.data.data.promptTips);
        }
      }
      
      if (response.data && response.data.code === 0 && response.data.data && response.data.data.taskId) {
        return response.data.data;
      } else {
        throw new Error('任务发起失败: ' + JSON.stringify(response.data));
      }
    } catch (err) {
      lastError = err;
      console.error(`[ComfyUI] 发起任务尝试 ${attempt} 失败 (地区: ${getRegionConfig(regionId).name}):`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      monitoringService.recordEffectProcessing('comfyui', regionId, Date.now() - timerStart, 'failed');
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`[ComfyUI] 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败了
  throw new Error('任务发起失败: ' + (lastError.response?.data?.msg || lastError.message));
}

async function waitForComfyUITaskAndGetImages(taskId, { interval = 5000, maxAttempts = 150, regionId = DEFAULT_REGION } = {}) {
  let taskStatus = 'pending';
  let attempts = 0;
  
  console.log(`[ComfyUI] 开始轮询任务状态 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}`);
  
  while (!['completed', 'success', 'SUCCESS'].includes(taskStatus) && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
    
    try {
      const status = await getComfyUITaskStatus(taskId, regionId);
      taskStatus = status.status;
      console.log(`[ComfyUI] 任务状态更新: taskId=${taskId}, status=${taskStatus}, attempts=${attempts}`);
    } catch (err) {
      console.error(`[ComfyUI] 轮询任务状态失败: taskId=${taskId}, attempts=${attempts}, error=${err.message}`);
      // 继续轮询
    }
  }
  
  if (['completed', 'success', 'SUCCESS'].includes(taskStatus)) {
    // 任务完成后等待一段时间再获取结果，确保结果已经准备好
    console.log(`[ComfyUI] 任务完成，等待3秒后获取结果: taskId=${taskId}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const result = await getComfyUITaskResult(taskId, regionId);
      console.log(`[ComfyUI] 获取任务结果成功: taskId=${taskId}, result=`, result);
      
      if (result && Array.isArray(result)) {
        return result.map((img, idx) => ({ 
          id: String(idx), 
          url: img.fileUrl || img.url 
        }));
      }
      return [];
    } catch (err) {
      console.error(`[ComfyUI] 获取任务结果失败: taskId=${taskId}, error=${err.message}`);
      return [];
    }
  } else {
    throw new Error(`ComfyUI任务处理超时或失败: taskId=${taskId}, 最终状态=${taskStatus}`);
  }
}

async function getComfyUITaskStatus(taskId, regionId = DEFAULT_REGION) {
  if (!apiKey) {
    throw new Error('ComfyUI服务不可用：RUNNINGHUB_API_KEY未配置');
  }
  
  try {
    const axiosInstance = createRunningHubAxiosInstance(regionId);
    const response = await axiosInstance.post('/task/openapi/status', {
      apiKey: apiKey,
      taskId: taskId
    }, {
      timeout: 60000 // 增加到60秒超时
    });
    
    console.log(`[ComfyUI] 状态查询响应 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, response=`, response.data);
    
    if (response.data && response.data.code === 0) {
      // 根据API文档，状态直接返回在data字段中
      const status = response.data.data;
      let mappedStatus = 'pending';
      
      switch (status) {
        case 'QUEUED':
          mappedStatus = 'pending';
          break;
        case 'RUNNING':
          mappedStatus = 'running';
          break;
        case 'SUCCESS':
          mappedStatus = 'completed';
          break;
        case 'FAILED':
          mappedStatus = 'failed';
          break;
        default:
          mappedStatus = 'pending';
      }
      
      return { status: mappedStatus };
    } else {
      throw new Error('查询ComfyUI任务状态失败: 未返回 status, taskId=' + taskId + ', response=' + JSON.stringify(response.data));
    }
  } catch (err) {
    throw new Error('查询ComfyUI任务状态失败: ' + (err.response?.data?.msg || err.message) + ', taskId=' + taskId);
  }
}

async function getComfyUITaskResult(taskId, regionId = DEFAULT_REGION) {
  if (!apiKey) {
    throw new Error('ComfyUI服务不可用：RUNNINGHUB_API_KEY未配置');
  }
  
  try {
    const axiosInstance = createRunningHubAxiosInstance(regionId);
    const response = await axiosInstance.post('/task/openapi/outputs', {
      apiKey: apiKey,
      taskId: taskId
    }, {
      timeout: 60000 // 增加到60秒超时
    });
    
    console.log(`[ComfyUI] 结果查询响应 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, response=`, response.data);
    
    if (response.data && response.data.code === 0 && response.data.data) {
      // 根据API文档，结果是包含fileUrl等字段的对象数组
      const results = response.data.data;
      console.log(`[ComfyUI] 原始结果数据:`, results);
      
      // 处理结果，确保URL是完整的
      const processedResults = results.map(item => {
        if (typeof item === 'string') {
          // 如果是字符串，直接作为URL处理
          const baseUrl = getRegionConfig(regionId).apiDomain;
          const fullUrl = item.startsWith('http') ? item : 
                         item.startsWith('/') ? `${baseUrl}${item}` : `${baseUrl}/${item}`;
          return { fileUrl: fullUrl, fileType: 'image' };
        } else if (item && item.fileUrl) {
          // 如果是对象且有fileUrl字段
          const baseUrl = getRegionConfig(regionId).apiDomain;
          const fullUrl = item.fileUrl.startsWith('http') ? item.fileUrl :
                         item.fileUrl.startsWith('/') ? `${baseUrl}${item.fileUrl}` : `${baseUrl}/${item.fileUrl}`;
          return { ...item, fileUrl: fullUrl };
        }
        return item;
      });
      
      console.log(`[ComfyUI] 处理后的结果:`, processedResults);
      return processedResults;
    } else {
      throw new Error('获取ComfyUI任务结果失败: 未返回 results, taskId=' + taskId + ', response=' + JSON.stringify(response.data));
    }
  } catch (err) {
    throw new Error('获取ComfyUI任务结果失败: ' + (err.response?.data?.msg || err.message) + ', taskId=' + taskId);
  }
}

async function cancelComfyUITask(taskId, regionId = DEFAULT_REGION) {
  if (!apiKey) {
    throw new Error('ComfyUI服务不可用：RUNNINGHUB_API_KEY未配置');
  }
  
  try {
    console.log(`[ComfyUI] 开始取消任务: taskId=${taskId}, regionId=${regionId}`);
    
    const axiosInstance = createRunningHubAxiosInstance(regionId);
    const requestBody = {
      apiKey: apiKey,
      taskId: taskId
    };
    
    console.log(`[ComfyUI] 取消任务请求体:`, requestBody);
    
    const response = await axiosInstance.post('/task/openapi/cancel', requestBody, {
      timeout: 30000,
      headers: {
        'Host': getRegionConfig(regionId).host,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[ComfyUI] 取消任务响应 (地区: ${getRegionConfig(regionId).name}): taskId=${taskId}, response=`, response.data);
    
    if (response.data && response.data.code === 0) {
      console.log(`[ComfyUI] 任务取消成功: taskId=${taskId}`);
      return true;
    } else {
      console.error(`[ComfyUI] 任务取消失败: taskId=${taskId}, response=`, response.data);
      throw new Error('取消任务失败: ' + JSON.stringify(response.data));
    }
  } catch (err) {
    console.error(`[ComfyUI] 取消任务异常: taskId=${taskId}, error=`, err);
    throw new Error('取消任务失败: ' + (err.response?.data?.msg || err.message) + ', taskId=' + taskId);
  }
}

// 连接预热函数
async function warmupConnection(regionId = DEFAULT_REGION) {
  try {
    console.log(`[ComfyUI] 开始预热连接 (地区: ${getRegionConfig(regionId).name})`);
    const axiosInstance = createRunningHubAxiosInstance(regionId);
    
    // 发送一个简单的请求来预热连接
    await axiosInstance.get('/task/openapi/status', {
      timeout: 10000,
      params: {
        apiKey: apiKey,
        taskId: 'test'
      }
    });
    
    console.log(`[ComfyUI] 连接预热完成 (地区: ${getRegionConfig(regionId).name})`);
  } catch (error) {
    // 预热失败不影响正常功能，只是记录日志
    console.log(`[ComfyUI] 连接预热失败 (地区: ${getRegionConfig(regionId).name}):`, error.message);
  }
}

// 导出所有函数
export { 
  startComfyUITaskService, 
  waitForComfyUITaskAndGetImages, 
  cancelComfyUITask,
  getComfyUITaskStatus,
  getComfyUITaskResult,
  warmupConnection 
};