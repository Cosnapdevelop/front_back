// RunningHub API Service
import axios from 'axios';

// Types for RunningHub API
export interface RunningHubConfig {
  apiKey: string;
  baseUrl: string;
}

export interface UploadImageResponse {
  success: boolean;
  data: {
    url: string;
    fileId: string;
  };
  message?: string;
}

export interface ComfyUITaskResponse {
  success: boolean;
  data: {
    taskId: string;
  };
  message?: string;
}

export interface TaskStatusResponse {
  success: boolean;
  data: {
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
  };
  message?: string;
}

export interface TaskResultResponse {
  success: boolean;
  data: {
    results: Array<{
      url: string;
      type: string;
    }>;
  };
  message?: string;
}

class RunningHubAPI {
  private config: RunningHubConfig;
  private axiosInstance;

  constructor(config: RunningHubConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Step 1: Upload image to RunningHub
  async uploadImage(file: File): Promise<UploadImageResponse> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await this.axiosInstance.post('/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  }

  // Step 2: Start ComfyUI task
  async startComfyUITask(nodeInfoList: any[]): Promise<ComfyUITaskResponse> {
    try {
      const formData = new FormData();
      formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
      
      const response = await this.axiosInstance.post('/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error starting ComfyUI task:', error);
      throw new Error(error.response?.data?.message || 'Failed to start processing task');
    }
  }

  // Step 3: Check task status
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await this.axiosInstance.get(`/status/${taskId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error checking task status:', error);
      throw new Error(error.response?.data?.message || 'Failed to check task status');
    }
  }

  // Step 4: Get task results
  async getTaskResults(taskId: string): Promise<TaskResultResponse> {
    try {
      const response = await this.axiosInstance.get(`/task/${taskId}/result`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting task results:', error);
      throw new Error(error.response?.data?.message || 'Failed to get task results');
    }
  }

  // Helper function to build effect-specific nodes
  private buildEffectNodes(imageFileName: string, effectParams: any): any[] {
    const { effectId, parameters } = effectParams;
    
    // Handle Flux Kontext single picture mode
    if (effectId === 'flux-kontext-test') {
      return [
        {
          nodeId: "39",
          fieldName: "image",
          fieldValue: imageFileName
        },
        {
          nodeId: "37",
          fieldName: "model",
          fieldValue: "flux-kontext-pro"
        },
        {
          nodeId: "37",
          fieldName: "aspect_ratio",
          fieldValue: "match_input_image"
        },
        {
          nodeId: "52",
          fieldName: "prompt",
          fieldValue: parameters.prompt || "Transform this image with AI enhancement"
        }
      ];
    }
    
    // Default fallback for other effects
    return [
      {
        nodeId: "39",
        fieldName: "image",
        fieldValue: imageFileName
      }
    ];
  }

  // Utility function to poll task until completion
  async waitForTaskCompletion(taskId: string, maxWaitTime: number = 300000): Promise<TaskResultResponse> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await this.getTaskStatus(taskId);
      
      if (statusResponse.data.status === 'completed') {
        return this.getTaskResults(taskId);
      } else if (statusResponse.data.status === 'failed') {
        throw new Error('Task processing failed');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Task timeout - processing took too long');
  }
}

export default RunningHubAPI;