import { useState } from 'react';
import { applyEffect } from '../services/runningHubApi';

interface ImageParamFile {
  file?: File;
  url?: string;
  name?: string;
  size?: number;
  fileId?: string;
}

interface ProcessedImage {
  id: string;
  url: string;
}

interface UseTaskProcessingProps {
  effect: any;
  imageParamFiles: Record<string, ImageParamFile>;
  parameters: Record<string, any>;
  setParameters: (params: Record<string, any>) => void;
}

const useTaskProcessing = ({ effect, imageParamFiles, parameters, setParameters }: UseTaskProcessingProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const processImagesWithRunningHub = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessedImages([]);
    try {
      // 1. 获取 image 参数的文件
      const imageParams = effect.parameters.filter((p: any) => p.type === 'image');
      if (imageParams.length === 0) {
        throw new Error('没有找到图片参数');
      }
      const imageParam = imageParams[0];
      const fileObj = imageParamFiles[imageParam.name];
      if (!fileObj?.file) {
        throw new Error(`请上传${imageParam.name}`);
      }
      // 2. 根据 nodeInfoTemplate 自动生成 nodeInfoList，所有参数必须有值
      let nodeInfoList: any[] = [];
      if (effect.nodeInfoTemplate) {
        nodeInfoList = effect.nodeInfoTemplate.map((item: any) => {
          if (item.paramKey === imageParam.name) {
            return { nodeId: item.nodeId, fieldName: item.fieldName, fieldValue: undefined };
          }
          const value = parameters[item.paramKey];
          if (value === undefined || value === null || value === '') {
            throw new Error(`参数 ${item.paramKey} 不能为空`);
          }
          return { nodeId: item.nodeId, fieldName: item.fieldName, fieldValue: value };
        });
      }
      setProgress(30);
      // 3. 调用后端接口，上传图片并发起任务
      const result = await applyEffect({ image: fileObj.file, nodeInfoList, webappId: effect.webappId });
      if (result.images && Array.isArray(result.images) && result.images.length > 0) {
        setProcessedImages(result.images);
        setProgress(100);
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        throw new Error('任务处理超时或失败');
      }
    } catch (error: any) {
      console.error('Error in processing:', error);
      alert(error instanceof Error ? error.message : 'Failed to process images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    progress,
    processedImages,
    uploadProgress,
    uploadErrors,
    processImagesWithRunningHub,
    setProcessedImages,
    setUploadProgress,
    setUploadErrors
  };
};

export default useTaskProcessing; 