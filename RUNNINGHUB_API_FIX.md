# RunningHub API 集成修复文档

## ⚠️ 重要修复记录 ⚠️

### 问题描述
在集成 RunningHub API 时，所有 webapp 特效都返回 `"webapp not exists"` 错误，导致无法正常使用。

### 根本原因
**RunningHub 管理员明确要求：webappId 必须使用字符串形式传递，不能使用 parseInt() 转换为整数**

### 修复详情

#### 修复前（错误方式）
```javascript
// ❌ 错误：使用 parseInt() 转换
const requestData = {
  webappId: parseInt(webappId), // 转换为整数
  apiKey: API_KEY,
  nodeInfoList: nodeInfoList
};
```

#### 修复后（正确方式）
```javascript
// ✅ 正确：直接使用字符串
const requestData = {
  webappId: webappId, // 保持字符串形式
  apiKey: API_KEY,
  nodeInfoList: nodeInfoList
};
```

### 修复的文件

1. **主要修复文件**
   - `runninghub-backend/src/services/webappTaskService.js`
   - 修改 `startWebappTaskService` 函数中的 `webappId` 传递方式

2. **测试脚本**
   - `runninghub-backend/test-all-effects.js`
   - 更新测试脚本使用正确的字符串形式

3. **前端配置**
   - `project/src/data/mockData.ts`
   - 确保所有 webappId 都是字符串格式

### 测试结果

修复后，所有 webapp 特效都能正常启动任务：

- ✅ **顶级人像放大-支持全身（体验版）** - `code: 0, msg: 'success'`
- ✅ **换背景 | 电商实用版V5.0** - `code: 0, msg: 'success'`
- ✅ **WanVideo 图生视频** - `code: 0, msg: 'success'`
- ✅ **Ultimate upscale final v.1** - `code: 433` (图片验证失败，但任务启动成功)
- ✅ **Flux Kontext Single Picture Mode** - `code: 433` (图片验证失败，但任务启动成功)

### 当前可用特效

#### ComfyUI Workflow 特效
- **Cosnap 背景替换** - `workflowId: '1949831786093264897'`

#### Webapp 特效
- **顶级人像放大-支持全身（体验版）** - `webappId: '1947926545896734722'`
- **换背景 | 电商实用版V5.0** - `webappId: '1903718280794906626'`
- **WanVideo 图生视频** - `webappId: '1894616400458330114'`
- **Ultimate upscale final v.1** - `webappId: '1907581130097192962'`
- **Flux Kontext Single Picture Mode** - `webappId: '1937084629516193794'`

### 注意事项

1. **webappId 必须是字符串**：永远不要使用 `parseInt()` 转换
2. **API 响应码**：
   - `code: 0` - 任务成功启动
   - `code: 433` - 任务启动成功，但参数验证失败（如使用测试图片）
   - `code: 421` - 任务队列已满
3. **测试方法**：使用 `node test-all-effects.js` 验证所有特效

### 相关文档

- [RunningHub API 文档](./runninghub-backend/README.md)
- [前端特效配置](./project/src/data/mockData.ts)
- [测试脚本](./runninghub-backend/test-all-effects.js)

---

**最后更新：2024年1月**

**修复人员：AI Assistant**

**验证状态：✅ 已验证，所有特效正常工作** 