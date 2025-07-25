import axios from 'axios';

const apiKey = process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105';
const baseUrl = 'https://www.runninghub.cn';

export async function startTaskService(imageFileName, nodeInfoList, webappId) {
  const requestBody = {
    webappId: webappId,
    apiKey: apiKey,
    nodeInfoList // 只用前端传来的 nodeInfoList
  };
  console.log('[RunningHub] 开始发起任务:', requestBody);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/ai-app/run`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.cn'
        }
      }
    );
    console.log('[RunningHub] 任务发起成功:', response.data);
    if (response.data && response.data.data && response.data.data.taskId) {
      return response.data.data.taskId;
    } else {
      throw new Error('发起任务失败: 未返回 taskId, requestBody=' + JSON.stringify(requestBody));
    }
  } catch (err) {
    console.error('[RunningHub] 任务发起失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message,
      requestBody
    });
    throw new Error('发起任务失败: ' + (err.response?.data?.message || err.message) + ', requestBody=' + JSON.stringify(requestBody));
  }
}

export async function waitForTaskAndGetImages(taskId, { interval = 5000, maxAttempts = 60 } = {}) {
  let taskStatus = 'pending';
  let attempts = 0;
  while (!['completed', 'success', 'SUCCESS'].includes(taskStatus) && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
    try {
      const status = await getTaskStatus(taskId);
      taskStatus = status.status;
    } catch (err) {
      console.error(`[RunningHub] 轮询任务状态失败: taskId=${taskId}, attempts=${attempts}, error=${err.message}`);
      // 继续轮询
    }
  }
  if (['completed', 'success', 'SUCCESS'].includes(taskStatus)) {
    try {
      const result = await getTaskResult(taskId);
      if (Array.isArray(result)) {
        return result.map((img, idx) => ({ id: String(idx), url: img.fileUrl }));
      }
      return [];
    } catch (err) {
      console.error(`[RunningHub] 获取任务结果失败: taskId=${taskId}, error=${err.message}`);
      return [];
    }
  } else {
    throw new Error(`任务处理超时或失败: taskId=${taskId}, 最终状态=${taskStatus}`);
  }
}

async function getTaskStatus(taskId) {
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/status`,
      {
        apiKey: apiKey,
        taskId: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.cn'
        }
      }
    );
    if (response.data && typeof response.data.data === 'string') {
      return { status: response.data.data };
    } else {
      throw new Error('查询任务状态失败: 未返回 status, taskId=' + taskId);
    }
  } catch (err) {
    throw new Error('查询任务状态失败: ' + (err.response?.data?.message || err.message) + ', taskId=' + taskId);
  }
}

async function getTaskResult(taskId) {
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/outputs`,
      {
        apiKey: apiKey,
        taskId: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.cn'
        }
      }
    );
    if (response.data && response.data.code === 0) {
      return response.data.data;
    } else {
      throw new Error('查询任务结果失败: ' + (response.data?.msg || '未知错误') + ', taskId=' + taskId);
    }
  } catch (err) {
    throw new Error('查询任务结果失败: ' + (err.response?.data?.message || err.message) + ', taskId=' + taskId);
  }
} 