# RunningHub Backend

## ⚠️ 重要提示 ⚠️

### WebappId 传递要求
**RunningHub管理员明确要求：webappId必须使用字符串形式传递，不能使用parseInt()转换为整数**

这个修复解决了之前所有webapp特效返回"webapp not exists"错误的问题。

#### 修复详情
- **修复前**：`webappId: parseInt(webappId)` ❌
- **修复后**：`webappId: webappId` ✅

#### 相关文件
- `src/services/webappTaskService.js` - 主要修复文件
- `test-all-effects.js` - 测试脚本
- `../project/src/data/mockData.ts` - 前端特效配置

#### 测试结果
修复后所有webapp特效都能正常启动任务，返回`code: 0`或`code: 433`。

---

## 快速开始

1. 安装依赖
   ```
   npm install
   ```

2. 配置 `.env` 文件，填入你的 RunningHub API Key、webappId

3. 启动服务
   ```
   npm start
   ```

4. 前端调用接口示例

- **上传图片并发起特效任务**
  ```
  POST /api/effects/apply
  form-data:
    image: (文件)
    nodeInfoList: (JSON字符串，见 RunningHub 文档)
  返回: { taskId }
  ```

- **查询任务状态**
  ```
  GET /api/effects/status/:taskId
  ```

- **查询任务结果**
  ```
  GET /api/effects/result/:taskId
  ```

## nodeInfoList 说明
- 你可以在 RunningHub 平台的 AI 应用详情页，复制 nodeInfoList 示例，粘贴到前端表单或后端预设。

## 常见问题
- API Key 不要暴露给前端！
- 图片最大 10MB，格式见 RunningHub 文档。
- 任务状态/结果接口建议前端轮询。 