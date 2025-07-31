// RunningHub API Service
import axios, { AxiosInstance } from 'axios';
import { RUNNING_HUB_CONFIG, getRunningHubApiUrl } from '../config/api';

// 创建本地后端API实例
const localAxiosInstance: AxiosInstance = axios.create({
  baseURL: RUNNING_HUB_CONFIG.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建RunningHub API实例 - 动态获取地区配置
function createRunningHubAxiosInstance(): AxiosInstance {
  const currentApiUrl = getRunningHubApiUrl();
  return axios.create({
    baseURL: currentApiUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Host': new URL(currentApiUrl).hostname,
    },
  });
}

// 获取当前RunningHub API实例
function getRunningHubAxiosInstance(): AxiosInstance {
  return createRunningHubAxiosInstance();
}

// 上传图片到RunningHub
export async function uploadImage(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await getRunningHubAxiosInstance().post('/upload/openapi/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.code === 0 && response.data.data) {
      return response.data.data.fileName;
    } else {
      throw new Error('上传失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (error: any) {
    console.error('上传图片失败:', error);
    throw new Error('上传图片失败: ' + (error.response?.data?.msg || error.message));
  }
}

// 创建简易ComfyUI任务
export async function createSimpleComfyUITask(workflowId: string, imageFile: File): Promise<string> {
  try {
    // 先上传图片
    const fileName = await uploadImage(imageFile);
    
    // 创建任务
    const requestBody = {
      apiKey: RUNNING_HUB_CONFIG.apiKey,
      workflowId: workflowId,
      addMetadata: true
    };

    const response = await getRunningHubAxiosInstance().post('/task/openapi/create', requestBody);
    
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.taskId) {
      return response.data.data.taskId.toString();
    } else {
      throw new Error('创建任务失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (error: any) {
    console.error('创建简易ComfyUI任务失败:', error);
    throw new Error('创建任务失败: ' + (error.response?.data?.msg || error.message));
  }
}

// 创建高级ComfyUI任务
export async function createAdvancedComfyUITask(workflowId: string, nodeInfoList: any[]): Promise<string> {
  try {
    const requestBody = {
      apiKey: RUNNING_HUB_CONFIG.apiKey,
      workflowId: workflowId,
      nodeInfoList: nodeInfoList,
      addMetadata: true
    };

    const response = await getRunningHubAxiosInstance().post('/task/openapi/create', requestBody);
    
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.taskId) {
      return response.data.data.taskId.toString();
    } else {
      throw new Error('创建任务失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (error: any) {
    console.error('创建高级ComfyUI任务失败:', error);
    throw new Error('创建任务失败: ' + (error.response?.data?.msg || error.message));
  }
}

// 获取RunningHub任务状态
export async function getRunningHubTaskStatus(taskId: string): Promise<any> {
  try {
    const response = await getRunningHubAxiosInstance().post('/task/openapi/status', {
      apiKey: RUNNING_HUB_CONFIG.apiKey,
      taskId: taskId
    });

    if (response.data && response.data.code === 0) {
      return response.data.data;
    } else {
      throw new Error('获取任务状态失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (error: any) {
    console.error('获取任务状态失败:', error);
    throw new Error('获取任务状态失败: ' + (error.response?.data?.msg || error.message));
  }
}

// 获取RunningHub任务结果
export async function getRunningHubTaskResults(taskId: string): Promise<any[]> {
  try {
    const response = await getRunningHubAxiosInstance().post('/task/openapi/outputs', {
      apiKey: RUNNING_HUB_CONFIG.apiKey,
      taskId: taskId
    });

    if (response.data && response.data.code === 0 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('获取任务结果失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (error: any) {
    console.error('获取任务结果失败:', error);
    throw new Error('获取任务结果失败: ' + (error.response?.data?.msg || error.message));
  }
}

// 开始ComfyUI任务（兼容旧版本）
export async function startComfyUITask(workflowId: string, imageFile: File): Promise<string> {
  return createSimpleComfyUITask(workflowId, imageFile);
}

// 获取任务状态（兼容旧版本）
export async function getTaskStatus(taskId: string): Promise<any> {
  try {
    const response = await localAxiosInstance.get(`/api/task/status/${taskId}`);
    return response.data;
  } catch (error: any) {
    console.error('获取任务状态失败:', error);
    throw new Error('获取任务状态失败: ' + error.message);
  }
}

// 获取任务结果（兼容旧版本）
export async function getTaskResults(taskId: string): Promise<any[]> {
  try {
    const response = await localAxiosInstance.get(`/api/task/results/${taskId}`);
    return response.data;
  } catch (error: any) {
    console.error('获取任务结果失败:', error);
    throw new Error('获取任务结果失败: ' + error.message);
  }
}