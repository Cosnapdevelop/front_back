# 背景替换特效测试指南

## 测试步骤

### 1. 启动服务
```bash
# 启动后端服务
cd runninghub-backend
npm start

# 启动前端服务
cd project
npm run dev
```

### 2. 访问特效页面
1. 打开浏览器访问 `http://localhost:5173`
2. 导航到特效页面
3. 找到 "Cosnap背景替换" 特效
4. 点击进入应用页面

### 3. 上传测试图片
1. 上传原图（包含主体，如人物）
2. 上传目标背景图（如风景、城市等）
3. 确保两张图片都成功上传并显示预览

### 4. 开始处理
1. 点击 "开始背景替换" 按钮
2. 观察进度条和状态更新
3. 等待处理完成（2-3分钟）

### 5. 验证结果
1. 检查处理后的图片是否正确显示
2. 验证主体是否保持位置和姿态
3. 确认背景是否正确替换
4. 测试下载功能

## 预期行为

### 成功情况
- 图片上传成功，显示预览
- 进度条正常更新
- 处理完成后显示结果图片
- 结果图片保存到图片库

### 错误处理
- 缺少图片时显示错误提示
- 上传失败时显示具体错误信息
- 处理超时时提示重新尝试

## 调试信息

### 后端日志
```
[RunningHub] 开始上传图片: uploads\xxx
[RunningHub] 上传成功: { code: 0, msg: 'success', data: {...} }
[ComfyUI] 开始发起任务: { 
  apiKey: 'xxx', 
  workflowId: '1949831786093264897', 
  nodeInfoList: [
    { nodeId: '240', fieldName: 'image', fieldValue: 'uploaded_image.jpg' },
    { nodeId: '284', fieldName: 'image', fieldValue: 'uploaded_background.jpg' }
  ],
  addMetadata: true 
}
[ComfyUI] 任务发起成功: { code: 0, msg: 'success', data: { taskId: 'xxx', taskStatus: 'QUEUED' } }
[ComfyUI] 任务状态更新: taskId=xxx, status=running, attempts=1
[ComfyUI] 获取任务结果成功: taskId=xxx, result=[{ url: 'xxx', fileType: 'png' }]
```

### 前端日志
- 图片上传进度
- API调用状态
- 错误信息显示

## 常见问题

### 1. webappId未定义
**问题**: 后端日志显示 `webappId: undefined`
**解决**: 检查前端是否正确传递了 `effect.webappId`

### 2. 图片上传失败
**问题**: 上传接口返回错误
**解决**: 检查RunningHub API Key是否正确

### 3. 任务创建失败
**问题**: ComfyUI任务创建失败
**解决**: 检查workflowId和nodeInfoList格式，确保使用正确的API端点

### 4. 状态查询失败
**问题**: 任务状态查询失败
**解决**: 确保使用POST方法调用 `/task/openapi/status` 接口

### 5. 结果获取失败
**问题**: 任务结果获取失败
**解决**: 确保使用POST方法调用 `/task/openapi/outputs` 接口

### 6. 图片参数映射错误
**问题**: 图片参数没有正确映射到工作流节点
**解决**: 检查nodeInfoList中图片参数的顺序是否与上传的图片文件顺序一致

## 性能测试

### 并发测试
- 同时处理多个背景替换任务
- 验证系统稳定性

### 大文件测试
- 上传接近10MB的图片
- 验证上传和处理性能

### 网络测试
- 模拟网络延迟
- 测试错误恢复机制