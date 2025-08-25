import React from 'react';
import { Upload, X } from 'lucide-react';
import MobileFileUploader from '../Mobile/MobileFileUploader';

interface ParameterInputProps {
  param: {
    name: string;
    type: string;
    label?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    default?: any;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  };
  value: any;
  onChange: (name: string, value: any) => void;
  imageParamFiles?: Record<string, {
    file?: File;
    url?: string;
    name?: string;
    size?: number;
    fileId?: string;
  }>;
  onImageUpload?: (paramName: string, file: File) => void;
  onImageRemove?: (paramName: string) => void;
}

export const ParameterInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  imageParamFiles = {},
  onImageUpload,
  onImageRemove,
}) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(param.name, file);
    }
  };

  const handleImageRemove = () => {
    if (onImageRemove) {
      onImageRemove(param.name);
    }
  };

  switch (param.type) {
    case 'image':
      return (
        <div className="space-y-2">
          <MobileFileUploader
            label={param.label || param.name}
            onUpload={(file: File) => onImageUpload?.(param.name, file)}
            onError={(error: string) => console.error('Upload error:', error)}
            onClear={() => onImageRemove?.(param.name)}
            currentFile={imageParamFiles[param.name] ? {
              url: imageParamFiles[param.name].url,
              name: imageParamFiles[param.name].name,
              size: imageParamFiles[param.name].size
            } : undefined}
            maxSize={30}
            showCameraOption={true}
            showGalleryOption={true}
          />
          {param.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{param.description}</p>
          )}
        </div>
      );

    case 'range':
    case 'slider':
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {param.label || param.name}: {value !== undefined ? value : param.default}
          </label>
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={param.step || 1}
            value={value !== undefined ? value : param.default}
            onChange={(e) => onChange(param.name, parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 
                     slider-thumb:appearance-none slider-thumb:w-4 slider-thumb:h-4 slider-thumb:bg-blue-500 
                     slider-thumb:rounded-full slider-thumb:cursor-pointer hover:slider-thumb:bg-blue-600 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{param.min}</span>
            <span>{param.max}</span>
          </div>
          {param.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
          )}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {param.label || param.name}
          </label>
          <select
            value={value !== undefined ? value : param.default}
            onChange={(e) => onChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white 
                     transition-colors hover:border-blue-300 dark:hover:border-blue-600"
          >
            {param.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {param.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
          )}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {param.label || param.name}
          </label>
          <input
            type="text"
            value={value !== undefined ? value : (param.default || '')}
            onChange={(e) => onChange(param.name, e.target.value)}
            placeholder={param.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white 
                     placeholder-gray-500 dark:placeholder-gray-400 transition-colors 
                     hover:border-blue-300 dark:hover:border-blue-600"
          />
          {param.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
          )}
        </div>
      );
  }
};

export default ParameterInput;