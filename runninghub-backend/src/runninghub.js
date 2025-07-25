import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const apiKey = '8ee162873b6e44bd97d3ef6fce2de105';
const webappId = 1937084629516193794;
const baseUrl = 'https://www.runninghub.cn';

// 上传图片到 RunningHub（严格按官方文档）
export async function uploadImage(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('apiKey', apiKey);
  form.append('webappId', webappId);
  form.append('fileType', 'image'); // 新增 fileType 字段

  console.log('[RunningHub] 开始上传图片:', filePath);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/upload`, // 修改接口路径
      form,
      { headers: form.getHeaders() }
    );
    console.log('[RunningHub] 上传成功:', response.data);
    // 返回 { fileName: 'xxx' }
    if (response.data && response.data.data && response.data.data.fileName) {
      return { fileName: response.data.data.fileName };
    } else {
      throw new Error('上传图片失败: 未返回 fileName');
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
    webappId: '1947926545896734722', // 顶级人像放大-支持全身（体验版），用字符串传递
    apiKey: '8ee162873b6e44bd97d3ef6fce2de105',
    nodeInfoList: [
      {
        nodeId: '6011',
        fieldName: 'image',
        fieldValue: imageFileName // 这里传入上传后返回的 fileName
      }
    ]
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