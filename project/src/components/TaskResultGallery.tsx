import React from 'react';
import { useToast } from '../context/ToastContext';

interface TaskResultGalleryProps {
  images: Array<{ id: string; url: string }>;
  onPreview?: (image: { id: string; url: string }) => void;
}

const TaskResultGallery: React.FC<TaskResultGalleryProps> = ({ images, onPreview }) => {
  const { push } = useToast();
  if (!images || images.length === 0) return null;
  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Processed Result</h3>
      {images.map((image, index) => (
        <div key={image.id} className="space-y-2">
          <div className="relative">
            <img
              src={image.url}
              alt={`Processed ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg cursor-pointer"
              onClick={() => onPreview && onPreview(image)}
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Processed
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                // 使用 fetch + blob 下载，避免页面跳转
                const response = await fetch(image.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `processed_${image.id}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('下载失败:', error);
                push('error','下载失败，请重试');
              }
            }}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <span>下载图片</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default TaskResultGallery; 