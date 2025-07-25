import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const apiKey = 'af36846844d94652bb84dc800815d1da';
const webappId = 1937084629516193794;
const baseUrl = 'https://www.runninghub.cn';

// 上传图片到 RunningHub（严格按官方文档）
export async function uploadImage(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('apiKey', apiKey);
  form.append('webappId', webappId);

  console.log('[RunningHub] 开始上传图片:', filePath);
  try {
    const response = await axios.post(
      `${baseUrl}/api/upload`,
      form,
      { headers: form.getHeaders() }
    );
    console.log('[RunningHub] 上传成功:', response.data);
    // 返回 { fileId: 'xxx' }
    if (response.data && response.data.data && response.data.data.fileId) {
      return { fileName: response.data.data.fileId };
    } else {
      throw new Error('上传图片失败: 未返回 fileId');
    }
  } catch (err) {
    console.error('[RunningHub] 上传失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('上传图片失败: ' + (err.response?.data?.message || err.message));
  }
}

// 发起 ComfyUI 任务（严格按官方文档）
export async function startComfyUITask(imageFileName, nodeInfoList) {
  const requestBody = {
    webappId,
    apiKey,
    nodeInfoList
  };
  console.log('[RunningHub] 开始发起任务:', requestBody);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/ai-app/run`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('[RunningHub] 任务发起成功:', response.data);
    if (response.data && response.data.data && response.data.data.taskId) {
      return { taskId: response.data.data.taskId };
    } else {
      throw new Error('发起任务失败: 未返回 taskId');
    }
  } catch (err) {
    console.error('[RunningHub] 任务发起失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('发起任务失败: ' + (err.response?.data?.message || err.message));
  }
}

// 查询任务状态（严格按官方文档）
export async function getTaskStatus(taskId) {
  console.log('[RunningHub] 查询任务状态:', taskId);
  try {
    const response = await axios.get(
      `${baseUrl}/task/${taskId}/status`
    );
    if (response.data && response.data.data && response.data.data.status) {
      return { status: response.data.data.status };
    } else {
      throw new Error('查询任务状态失败: 未返回 status');
    }
  } catch (err) {
    console.error('[RunningHub] 查询任务状态失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('查询任务状态失败: ' + (err.response?.data?.message || err.message));
  }
} 