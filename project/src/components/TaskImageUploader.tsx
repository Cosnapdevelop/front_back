import React from 'react';

interface TaskImageUploaderProps {
  fileObj?: { url?: string; name?: string; size?: number };
  error?: string;
  disabled?: boolean;
  onUpload: (file: File) => void;
  label?: string;
}

const TaskImageUploader: React.FC<TaskImageUploaderProps> = ({ fileObj, error, disabled, onUpload, label }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label || '上传图片'}</label>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
          }
        }}
        disabled={disabled}
      />
      {fileObj?.url && (
        <div className="mt-2">
          <img src={fileObj.url} alt={fileObj.name} className="w-32 h-32 object-cover rounded" />
          <div className="text-xs text-gray-500 dark:text-gray-400">{fileObj.name} ({fileObj.size && (fileObj.size / 1024 / 1024).toFixed(1)}MB)</div>
        </div>
      )}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>
      )}
    </div>
  );
};

export default TaskImageUploader; 