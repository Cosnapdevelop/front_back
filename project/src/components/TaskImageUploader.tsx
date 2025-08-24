import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface TaskImageUploaderProps {
  fileObj?: { url?: string; name?: string; size?: number };
  error?: string;
  disabled?: boolean;
  onUpload: (file: File) => void;
  label?: string;
}

const TaskImageUploaderCore: React.FC<TaskImageUploaderProps> = ({ fileObj, error, disabled, onUpload, label }) => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - RunningHub官方限制

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        throw new Error(`文件大小 ${sizeMB}MB 超过限制 10MB。大文件将自动使用云存储。`);
      }
      
      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`不支持的文件类型：${file.type}。请上传 JPEG、PNG、GIF 或 WebP 格式的图片。`);
      }
      
      onUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label || '上传图片'}
        <span className="text-xs text-gray-500 ml-2">(最大 10MB)</span>
      </label>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {fileObj?.url && (
        <div className="mt-2">
          <img src={fileObj.url} alt={fileObj.name} className="w-32 h-32 object-cover rounded" />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fileObj.name} ({fileObj.size && (fileObj.size / 1024 / 1024).toFixed(1)}MB)
          </div>
        </div>
      )}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

const TaskImageUploader: React.FC<TaskImageUploaderProps> = (props) => {
  return (
    <ErrorBoundary 
      config={{ 
        level: 'component', 
        feature: 'image_upload',
        fallback: (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-gray-500">图片上传组件暂时不可用</p>
            <p className="text-sm text-gray-400 mt-1">请刷新页面重试</p>
          </div>
        )
      }}
    >
      <TaskImageUploaderCore {...props} />
    </ErrorBoundary>
  );
};

export default TaskImageUploader; 