# Node65 IC-Light Light Shape 参数配置说明

## 概述

本文档描述了如何为workflow ID `1952448857223442433`（重新打光工作流）中的node65（IC-Light Light Shape）节点添加用户可配置的参数。

## 配置内容

### 1. 参数类型

Node65支持以下5个可配置参数：

| 参数名 | 类型 | 默认值 | 描述 | 范围/选项 |
|--------|------|--------|------|-----------|
| `shape_65` | select | triangle | 光源形状（改变光源的形状） | 9种形状选项 |
| `X_offset_65` | slider | 0 | X轴偏移（负数：光源从左边打过来，正数：光源从右边打过来） | -1024-1024, 步长32 |
| `Y_offset_65` | slider | -512 | Y轴偏移（负数：光源从上方打过来，正数：光源从下方打过来） | -1024-1024, 步长32 |
| `scale_65` | text | 1 | 光源大小（可以键盘输入数值，默认1） | 任意数值 |
| `rotation_65` | slider | 0 | 光源角度（0-359度） | 0-359, 步长1 |

### 2. 形状选项说明

根据ComfyUI界面提供的形状选项，支持以下9种光源形状：

- **circle**: 圆形
- **square**: 正方形
- **semicircle**: 半圆形
- **quarter_circle**: 四分之一圆
- **ellipse**: 椭圆形
- **triangle**: 三角形
- **cross**: 十字形
- **star**: 星形
- **radial**: 径向

### 3. 参数映射关系

前端参数名与ComfyUI工作流节点字段的映射关系：

```javascript
{
  nodeId: '65', fieldName: 'shape', paramKey: 'shape_65',        // 光源形状
  nodeId: '65', fieldName: 'X_offset', paramKey: 'X_offset_65',  // X轴偏移
  nodeId: '65', fieldName: 'Y_offset', paramKey: 'Y_offset_65',  // Y轴偏移
  nodeId: '65', fieldName: 'scale', paramKey: 'scale_65',        // 光源大小
  nodeId: '65', fieldName: 'rotation', paramKey: 'rotation_65'   // 光源角度
}
```

## 实现细节

### 1. 前端界面

- 使用slider组件实现数值参数的调节
- 使用select组件实现形状选择
- 所有参数都有实时预览和数值显示
- 支持默认值恢复

### 2. 数据流

1. 用户在ApplyEffect页面调整参数
2. 参数值通过`handleParameterChange`函数更新
3. 提交时，参数通过`nodeInfoTemplate`映射到ComfyUI工作流
4. 最终生成包含用户配置的完整工作流JSON

### 3. 生成的ComfyUI节点示例

```json
{
  "65": {
    "inputs": {
      "shape": "triangle",
      "X_offset": 0,
      "Y_offset": -512,
      "scale": 1.2,
      "rotation": 45,
      "background_color": ["64", 0],
      "shape_color": ["63", 0]
    },
    "class_type": "LightShapeNode",
    "_meta": {
      "title": "IC-Light Light Shape"
    }
  }
}
```

## 使用说明

1. 在ApplyEffect页面，用户可以看到5个光源控制参数
2. **形状选择**：通过下拉菜单选择9种不同的光源形状
3. **X轴偏移**：通过滑块控制光源水平位置（负数：左边，正数：右边）
4. **Y轴偏移**：通过滑块控制光源垂直位置（负数：上方，正数：下方）
5. **光源大小**：通过键盘输入数值控制光源大小（默认1）
6. **光源角度**：通过滑块控制光源旋转角度（0-359度）
7. 所有参数都有中文描述和合理的默认值
8. 参数调整会实时反映在界面上
9. 提交后，系统会使用用户配置的参数生成最终效果

## 技术要点

- 支持slider、select和text三种参数类型
- 参数范围经过合理设计，避免无效值
- 步长设置确保参数调节的精确性
- 默认值基于原始工作流配置
- 完整的类型定义和错误处理
- scale参数支持键盘输入，自动转换为数值类型

## 扩展性

如需添加更多光源参数，只需：
1. 在`parameters`数组中添加新参数定义
2. 在`nodeInfoTemplate`中添加对应的映射关系
3. 确保前端界面支持相应的参数类型

这种设计使得系统具有良好的扩展性，可以轻松添加更多可配置的光源参数。 