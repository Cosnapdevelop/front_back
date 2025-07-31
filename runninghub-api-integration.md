# RunningHub API 集成文档

## 概述
本文档详细说明了如何与RunningHub API进行集成，包括ComfyUI工作流调用、AI应用调用、文件上传等功能。

## ComfyUI 工作流调用

### 简单模式
适用于不需要修改工作流参数的场景。

**请求示例：**
```bash
curl -X POST "https://api.runninghub.com/task/openapi/create" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "workflowId": "1949831786093264897",
    "addMetadata": true
  }'
```

### 高级模式（修改参数）
适用于需要动态修改工作流节点参数的场景。

**请求示例：**
```bash
curl -X POST "https://api.runninghub.com/task/openapi/create" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "workflowId": "1949831786093264897",
    "nodeInfoList": [
      {
        "nodeId": "240",
        "fieldName": "image",
        "fieldValue": "api/257e63ad3a23136a25511e8a205cef9caa7cb0bd5a3a0b03af842206f45e33f4.jpg"
      },
      {
        "nodeId": "279",
        "fieldName": "prompt",
        "fieldValue": "describe the style of the image and atmosphere of the image in two sentence. start your answer with Change the background to"
      }
    ],
    "addMetadata": true
  }'
```

## ⚠️ 重要：nodeInfoList 构建规则

### 🎯 nodeInfoList 核心概念

**nodeId**: 工作流界面中节点右上角的数字标识
**fieldName**: 对应节点`inputs`部分的键名（如"image", "text", "prompt", "seed"等）
**fieldValue**: 要设置的具体值

### 📋 前端构建 nodeInfoList 的步骤

1. **从工作流API格式文件中获取节点信息**
   - 在RunningHub界面点击下载图标
   - 选择"Export Workflow API"
   - 打开下载的JSON文件，查看每个节点的`inputs`部分

2. **构建基础nodeInfoList（前端）**
   ```javascript
   // 前端只构建节点信息，不设置fieldValue
   const nodeInfoList = [
     {
       nodeId: "240",
       fieldName: "image",
       paramKey: "image_62"  // 用于后端查找对应参数
     },
     {
       nodeId: "279", 
       fieldName: "prompt",
       paramKey: "prompt_279"  // 用于后端查找对应参数
     }
   ];
   ```

3. **后端填充fieldValue**
   - 图片节点：使用上传后的fileName
   - 文本节点：从请求体中查找对应参数

### 🔧 后端处理 nodeInfoList 的逻辑

```javascript
// 更新nodeInfoList中的fieldValue
let imageIndex = 0;
const updatedNodeInfoList = parsedNodeInfoList.map((nodeInfo, index) => {
  if (nodeInfo.fieldName === 'image') {
    // 图片节点 - 按顺序分配上传的图片
    if (imageIndex < uploadedImages.length) {
      return {
        ...nodeInfo,
        fieldValue: uploadedImages[imageIndex]
      };
    }
    imageIndex++;
  } else if (nodeInfo.fieldName === 'text' || nodeInfo.fieldName === 'prompt') {
    // 文本节点 - 查找对应的参数
    const paramKey = nodeInfo.paramKey;
    if (paramKey && req.body[paramKey] !== undefined) {
      return {
        ...nodeInfo,
        fieldValue: req.body[paramKey]
      };
    } else {
      // 尝试根据nodeId查找参数
      const possibleParamKey = `prompt_${nodeInfo.nodeId}`;
      if (req.body[possibleParamKey] !== undefined) {
        return {
          ...nodeInfo,
          fieldValue: req.body[possibleParamKey]
        };
      }
    }
  }
  return nodeInfo;
});
```

### 📝 常见 fieldName 类型

- **image**: 图片输入节点（LoadImage）
- **text**: 文本输入节点
- **prompt**: 提示词输入节点
- **seed**: 随机种子（KSampler）
- **steps**: 采样步数（KSampler）
- **cfg**: CFG值（KSampler）

### ⚠️ 注意事项

1. **API调用不会自动改变seed值** - 相同输入总是产生相同结果
2. **某些fieldName只在浏览器中有效** - 如`control_after_generate`
3. **数组类型的fieldValue通常是节点连接** - 不建议修改
4. **图片上传必须先调用上传API** - 然后用返回的fileName作为fieldValue

## AI 应用调用

### 请求示例
```bash
curl -X POST "https://api.runninghub.com/task/webapp/create" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-api-key",
    "webappId": 1937084629516193794,
    "images": ["image1.jpg", "image2.jpg"],
    "parameters": {
      "prompt": "your prompt here"
    }
  }'
```

## 文件上传

### 图片上传
```bash
curl -X POST "https://api.runninghub.com/resource/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg"
```

**响应示例：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "fileName": "api/257e63ad3a23136a25511e8a205cef9caa7cb0bd5a3a0b03af842206f45e33f4.jpg",
    "fileType": "image"
  }
}
```

## ComfyUI Plus工作流调用

对于需要48G VRAM的Plus工作流，需要添加`instanceType`参数：

```json
{
  "apiKey": "your-api-key",
  "workflowId": "1950585019234455554",
  "instanceType": "plus",
  "nodeInfoList": [...],
  "addMetadata": true
}
```

## 智能云存储方案

### 文件大小策略
- **≤10MB**: 直接上传到RunningHub
- **>10MB**: 上传到云存储（OSS/COS/S3），然后传递URL给RunningHub

### 云存储配置
```javascript
const CLOUD_STORAGE_CONFIG = {
  provider: 'aliyun-oss', // 或 'tencent-cos', 'aws-s3'
  region: 'oss-cn-hangzhou',
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'your-access-key-secret',
  bucket: 'your-bucket-name',
  cdnDomain: 'https://your-cdn-domain.com'
};
```

### nodeInfoList中的图片处理
```javascript
// 小文件：使用fileName
{
  "nodeId": "240",
  "fieldName": "image", 
  "fieldValue": "api/257e63ad3a23136a25511e8a205cef9caa7cb0bd5a3a0b03af842206f45e33f4.jpg"
}

// 大文件：使用cloudUrl
{
  "nodeId": "240",
  "fieldName": "image",
  "fieldValue": "https://your-cdn-domain.com/large-image.jpg"
}
```

## 错误处理

### 常见错误码
- **803**: `APIKEY_INVALID_NODE_INFO` - nodeInfoList格式错误或fieldValue未正确设置
- **802**: `APIKEY_INVALID_WORKFLOW` - 工作流ID无效
- **801**: `APIKEY_INVALID` - API密钥无效

### 调试建议
1. 检查nodeInfoList中的fieldValue是否正确设置
2. 确认图片文件已成功上传
3. 验证工作流API格式文件中的节点信息
4. 检查fieldName是否在API格式中有效

## 文件限制

- **RunningHub原生上传**: 最大32MB
- **云存储上传**: 最大100MB
- **支持格式**: JPEG, PNG, GIF, WebP
- **处理时间**: 通常5-8分钟（取决于工作流复杂度）