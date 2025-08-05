# RunningHub Backend

## ⚠️ 重要提示 ⚠️

### RunningHub API 集成关键修复

#### 1. WebappId 传递要求
**RunningHub管理员明确要求：webappId必须使用字符串形式传递，不能使用parseInt()转换为整数**

这个修复解决了之前所有webapp特效返回"webapp not exists"错误的问题。

- **修复前**：`webappId: parseInt(webappId)` ❌
- **修复后**：`webappId: webappId` ✅

#### 2. FieldValue 类型要求
**RunningHub API要求所有fieldValue都是字符串类型**

这个修复解决了"Cosnap重新打光"特效的`APIKEY_INVALID_NODE_INFO`错误。

- **修复前**：`fieldValue: parseFloat(value)` ❌
- **修复后**：`fieldValue: String(value)` ✅

#### 相关文件
- `src/services/webappTaskService.js` - webappId修复
- `src/routes/effects.js` - fieldValue类型修复
- `test-all-effects.js` - 测试脚本
- `../project/src/data/mockData.ts` - 前端特效配置

#### 测试结果
修复后所有特效都能正常启动任务：
- ✅ webapp特效：返回`code: 0`或`code: 433`
- ✅ ComfyUI特效：参数正确传递，无类型错误

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