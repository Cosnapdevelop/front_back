# 🌍 地区切换功能使用指南

## 📋 功能概述

为了支持不同地区的用户访问RunningHub API，我们添加了地区切换功能。用户可以根据自己所在的地理位置选择合适的API域名，以获得最佳的访问体验。

## 🎯 支持的地区

### 🇭🇰 香港/澳门/台湾
- **API域名**: `https://www.runninghub.ai`
- **适用用户**: 港澳台及海外用户
- **默认选择**: 是（推荐）

### 🇨🇳 中国大陆
- **API域名**: `https://www.runninghub.cn`
- **适用用户**: 中国大陆用户
- **默认选择**: 否

## 🔧 如何使用

### 1. 前端界面切换

#### 桌面版
- 在导航栏右侧找到地区选择器
- 点击选择器显示下拉菜单
- 选择适合您所在地区的选项

#### 移动版
- 在页面右上角找到地区选择器
- 点击选择器进行地区切换

### 2. 自动保存
- 您的地区选择会自动保存到本地存储
- 下次访问时会自动使用您上次选择的地区
- 无需重复设置

## 🏗️ 技术实现

### 前端实现
```typescript
// 地区配置
export const REGIONS = [
  {
    id: 'china',
    name: '中国大陆',
    flag: '🇨🇳',
    apiDomain: 'https://www.runninghub.cn',
    description: '中国大陆用户推荐使用'
  },
  {
    id: 'hongkong',
    name: '香港/澳门/台湾',
    flag: '🇭🇰',
    apiDomain: 'https://www.runninghub.ai',
    description: '港澳台及海外用户推荐使用'
  }
];
```

### 后端实现
```javascript
// 动态创建API实例
function createRunningHubAxiosInstance(regionId = 'hongkong') {
  const regionConfig = getRegionConfig(regionId);
  return axios.create({
    baseURL: regionConfig.apiDomain,
    headers: {
      'Host': regionConfig.host,
    },
  });
}
```

## 🧪 测试验证

### 1. 前端测试
```bash
# 启动前端服务
cd project
npm run dev

# 访问应用并测试地区切换功能
```

### 2. 后端测试
```bash
# 测试香港地区API
cd runninghub-backend
node test-region.js <taskId> hongkong

# 测试中国大陆API
node test-region.js <taskId> china
```

### 3. 功能测试
1. 切换地区设置
2. 上传图片进行背景替换
3. 观察API调用是否使用正确的域名
4. 检查处理结果是否正常

## 🔍 监控和调试

### 前端日志
- 地区切换时会触发 `regionChanged` 事件
- 可以在浏览器控制台查看地区配置信息

### 后端日志
```
[ComfyUI] 开始发起任务 (地区: 香港/澳门/台湾): {...}
[ComfyUI] 状态查询响应 (地区: 香港/澳门/台湾): taskId=xxx, response=...
[ComfyUI] 结果查询响应 (地区: 香港/澳门/台湾): taskId=xxx, response=...
```

### 网络请求
- 检查Network面板中的API请求
- 确认请求URL使用正确的地区域名

## 🚨 常见问题

### 1. 地区切换不生效
**原因**: 浏览器缓存或本地存储问题
**解决**: 
- 清除浏览器缓存
- 检查localStorage中的地区设置
- 重新选择地区

### 2. API调用失败
**原因**: 地区配置错误或网络问题
**解决**: 
- 确认选择了正确的地区
- 检查网络连接
- 查看后端日志确认API域名

### 3. 处理速度慢
**原因**: 选择了不适合当前网络环境的地区
**解决**: 
- 尝试切换到其他地区
- 检查网络延迟
- 联系技术支持

## 📊 性能优化

### 1. 自动检测
- 未来可以添加IP地理位置检测
- 自动推荐最适合的地区

### 2. 智能切换
- 根据网络延迟自动选择最佳地区
- 支持故障转移机制

### 3. 缓存优化
- 缓存地区配置信息
- 减少重复的配置查询

## 🔮 未来改进

1. **更多地区支持**: 添加更多RunningHub服务器节点
2. **自动检测**: 基于IP地址自动推荐地区
3. **性能监控**: 实时监控各地区API性能
4. **智能路由**: 根据网络状况自动选择最佳地区
5. **故障转移**: 当某个地区不可用时自动切换到备用地区

## 📞 技术支持

如果您在使用地区切换功能时遇到问题：

1. **检查网络**: 确认能正常访问选择的API域名
2. **查看日志**: 检查前端控制台和后端日志
3. **测试API**: 使用测试脚本验证API连接
4. **联系支持**: 提供详细的错误信息和地区配置

## 🎉 总结

地区切换功能让您的应用能够更好地服务不同地区的用户，提供更稳定和快速的AI图像处理体验。通过简单的界面操作，用户就可以选择最适合自己网络环境的API服务。