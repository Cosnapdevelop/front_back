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

// 发起ComfyUI任务1-简易（严格按官方文档）
export async function startComfyUITaskSimple(workflowId) {
  console.log('[RunningHub] 发起ComfyUI任务1-简易:', workflowId);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/create`,
      {
        apiKey: apiKey,
        workflowId: workflowId
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
      console.log('发起ComfyUI任务1-简易接口返回：', response.data);
      throw new Error('发起ComfyUI任务1-简易失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 发起ComfyUI任务1-简易失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('发起ComfyUI任务1-简易失败: ' + (err.response?.data?.message || err.message));
  }
}

// 发起ComfyUI任务2-高级（严格按官方文档）
export async function startComfyUITaskAdvanced({ workflowId, nodeInfoList, workflow, addMetadata }) {
  console.log('[RunningHub] 发起ComfyUI任务2-高级:', workflowId, nodeInfoList);
  try {
    const requestBody = {
      apiKey: apiKey,
      workflowId: workflowId
    };
    if (nodeInfoList) requestBody.nodeInfoList = nodeInfoList;
    if (workflow) requestBody.workflow = workflow;
    if (typeof addMetadata !== 'undefined') requestBody.addMetadata = addMetadata;

    const response = await axios.post(
      `${baseUrl}/task/openapi/create`,
      requestBody,
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
      console.log('发起ComfyUI任务2-高级接口返回：', response.data);
      throw new Error('发起ComfyUI任务2-高级失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 发起ComfyUI任务2-高级失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('发起ComfyUI任务2-高级失败: ' + (err.response?.data?.message || err.message));
  }
}

// 查询任务状态（严格按官方文档）
export async function getTaskStatus(taskId) {
  console.log('[RunningHub] 查询任务状态:', taskId);
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
      console.log('任务状态接口返回：', response.data);
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

// 查询任务生成结果（严格按官方文档）
export async function getTaskResult(taskId) {
  console.log('[RunningHub] 查询任务结果:', taskId);
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
      console.log('任务结果接口返回：', response.data);
      throw new Error('查询任务结果失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 查询任务结果失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('查询任务结果失败: ' + (err.response?.data?.message || err.message));
  }
}

// 获取工作流Json（严格按官方文档）
export async function getWorkflowJson(workflowId) {
  console.log('[RunningHub] 获取工作流Json:', workflowId);
  try {
    const response = await axios.post(
      'https://www.runninghub.cn/api/openapi/getJsonApiFormat',
      {
        apiKey: apiKey,
        workflowId: workflowId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.cn'
        }
      }
    );
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.prompt) {
      return response.data.data.prompt;
    } else {
      console.log('获取工作流Json接口返回：', response.data);
      throw new Error('获取工作流Json失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 获取工作流Json失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('获取工作流Json失败: ' + (err.response?.data?.message || err.message));
  }
}

// 取消ComfyUI任务（严格按官方文档）
export async function cancelComfyUITask(taskId) {
  console.log('[RunningHub] 取消ComfyUI任务:', taskId);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/cancel`,
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
      return { code: 0, msg: response.data.msg };
    } else {
      console.log('取消ComfyUI任务接口返回：', response.data);
      throw new Error('取消ComfyUI任务失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 取消ComfyUI任务失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('取消ComfyUI任务失败: ' + (err.response?.data?.message || err.message));
  }
}

// 获取账户信息（严格按官方文档）
export async function getAccountStatus() {
  console.log('[RunningHub] 获取账户信息');
  try {
    const response = await axios.post(
      'https://www.runninghub.cn/uc/openapi/accountStatus',
      {
        apikey: apiKey
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
      console.log('获取账户信息接口返回：', response.data);
      throw new Error('获取账户信息失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 获取账户信息失败详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('获取账户信息失败: ' + (err.response?.data?.message || err.message));
  }
}

// 获取webhook事件详情（严格按官方文档）
export async function getWebhookDetail(taskId) {
  console.log('[RunningHub] 获取webhook事件详情:', taskId);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/getWebhookDetail`,
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
      console.log('获取webhook事件详情接口返回：', response.data);
      throw new Error('获取webhook事件详情失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 获取webhook事件详情失败:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('获取webhook事件详情失败: ' + (err.response?.data?.message || err.message));
  }
}

// 重新发送指定webhook事件（严格按官方文档）
export async function retryWebhook({ webhookId, webhookUrl }) {
  console.log('[RunningHub] 重新发送指定webhook事件:', webhookId, webhookUrl);
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/retryWebhook`,
      {
        apiKey: apiKey,
        webhookId: webhookId,
        webhookUrl: webhookUrl
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.cn'
        }
      }
    );
    if (response.data && response.data.code === 0) {
      return { code: 0, msg: response.data.msg };
    } else {
      console.log('重新发送指定webhook事件接口返回：', response.data);
      throw new Error('重新发送指定webhook事件失败: ' + (response.data?.msg || '未知错误'));
    }
  } catch (err) {
    console.error('[RunningHub] 重新发送指定webhook事件失败:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw new Error('重新发送指定webhook事件失败: ' + (err.response?.data?.message || err.message));
  }
} 