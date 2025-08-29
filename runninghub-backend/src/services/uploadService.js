import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const apiKey = process.env.RUNNINGHUB_API_KEY || '50dcc0fbc848467092f853a9fcb49d50';
const webappId = process.env.RUNNINGHUB_WEBAPP_ID || 1937084629516193794;
const baseUrl = 'https://www.runninghub.cn';

export async function uploadImageService(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('apiKey', apiKey);
  form.append('webappId', webappId);
  form.append('fileType', 'image');
  console.log('[RunningHub] 开始上传图片:', filePath);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/upload`,
      form,
      { headers: form.getHeaders() }
    );
    console.log('[RunningHub] 上传成功:', response.data);
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