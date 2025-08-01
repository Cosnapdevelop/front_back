import { API_BASE_URL } from '../config/api';

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',      // 等待中
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',        // 失败
  CANCELLED = 'cancelled'   // 已取消
}

// 任务信息接口
export interface TaskInfo {
  taskId: string;
  effectId: string;
  effectName: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  progress?: number;        // 进度百分比 (0-100)
  errorMessage?: string;    // 错误信息
  resultUrls?: string[];    // 结果图片URL
  parameters?: any;         // 任务参数
}

// 任务管理服务
class TaskManagementService {
  private activeTasks: Map<string, TaskInfo> = new Map();
  private statusUpdateCallbacks: Map<string, (task: TaskInfo) => void> = new Map();

  // 添加新任务
  addTask(taskInfo: TaskInfo): void {
    this.activeTasks.set(taskInfo.taskId, taskInfo);
    console.log(`[任务管理] 添加新任务: ${taskInfo.taskId}`, taskInfo);
  }

  // 更新任务状态
  updateTaskStatus(taskId: string, status: TaskStatus, progress?: number, errorMessage?: string, resultUrls?: string[]): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      if (progress !== undefined) task.progress = progress;
      if (errorMessage !== undefined) task.errorMessage = errorMessage;
      if (resultUrls !== undefined) task.resultUrls = resultUrls;

      console.log(`[任务管理] 更新任务状态: ${taskId} -> ${status}`, { progress, errorMessage, resultUrls });
      
      // 触发状态更新回调
      const callback = this.statusUpdateCallbacks.get(taskId);
      if (callback) {
        callback(task);
      }
    }
  }

  // 获取任务信息
  getTask(taskId: string): TaskInfo | undefined {
    return this.activeTasks.get(taskId);
  }

  // 获取所有活跃任务
  getAllTasks(): TaskInfo[] {
    return Array.from(this.activeTasks.values());
  }

  // 获取特定状态的任务
  getTasksByStatus(status: TaskStatus): TaskInfo[] {
    return Array.from(this.activeTasks.values()).filter(task => task.status === status);
  }

  // 移除任务
  removeTask(taskId: string): void {
    this.activeTasks.delete(taskId);
    this.statusUpdateCallbacks.delete(taskId);
    console.log(`[任务管理] 移除任务: ${taskId}`);
  }

  // 注册状态更新回调
  onStatusUpdate(taskId: string, callback: (task: TaskInfo) => void): void {
    this.statusUpdateCallbacks.set(taskId, callback);
  }

  // 取消任务
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        this.updateTaskStatus(taskId, TaskStatus.CANCELLED);
        console.log(`[任务管理] 任务取消成功: ${taskId}`);
        return true;
      } else {
        console.error(`[任务管理] 任务取消失败: ${taskId}`, response.statusText);
        return false;
      }
    } catch (error) {
      console.error(`[任务管理] 任务取消异常: ${taskId}`, error);
      return false;
    }
  }

  // 重试失败的任务
  async retryTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId);
    if (!task || task.status !== TaskStatus.FAILED) {
      console.error(`[任务管理] 无法重试任务: ${taskId}`, task?.status);
      return false;
    }

    try {
      // 重置任务状态
      this.updateTaskStatus(taskId, TaskStatus.PENDING);
      
      // 重新提交任务
      const response = await fetch(`${API_BASE_URL}/api/effects/comfyui/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          taskId,
          effectId: task.effectId,
          parameters: task.parameters 
        }),
      });

      if (response.ok) {
        console.log(`[任务管理] 任务重试成功: ${taskId}`);
        return true;
      } else {
        this.updateTaskStatus(taskId, TaskStatus.FAILED, undefined, '重试失败');
        console.error(`[任务管理] 任务重试失败: ${taskId}`, response.statusText);
        return false;
      }
    } catch (error) {
      this.updateTaskStatus(taskId, TaskStatus.FAILED, undefined, '重试异常');
      console.error(`[任务管理] 任务重试异常: ${taskId}`, error);
      return false;
    }
  }

  // 清理已完成的任务（可选，用于内存管理）
  cleanupCompletedTasks(): void {
    const completedStatuses = [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED];
    const tasksToRemove: string[] = [];

    this.activeTasks.forEach((task, taskId) => {
      if (completedStatuses.includes(task.status)) {
        // 保留最近的任务，删除较旧的
        const timeDiff = Date.now() - task.updatedAt.getTime();
        if (timeDiff > 30 * 60 * 1000) { // 30分钟后清理
          tasksToRemove.push(taskId);
        }
      }
    });

    tasksToRemove.forEach(taskId => this.removeTask(taskId));
    if (tasksToRemove.length > 0) {
      console.log(`[任务管理] 清理已完成任务: ${tasksToRemove.length} 个`);
    }
  }
}

// 导出单例实例
export const taskManagementService = new TaskManagementService(); 