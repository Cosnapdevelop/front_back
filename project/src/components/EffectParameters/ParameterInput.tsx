import React from 'react';
import { Upload, X } from 'lucide-react';

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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {param.label || param.name}
          </label>
          <div className="flex items-center space-x-4">
            {imageParamFiles[param.name]?.url ? (
              <div className="relative">
                <img 
                  src={imageParamFiles[param.name].url} 
                  alt={param.name}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={handleImageRemove}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id={`param-${param.name}`}
                />
                <label
                  htmlFor={`param-${param.name}`}
                  className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center"
                >
                  <Upload size={16} className="mr-2" />
                  Upload Image
                </label>
              </div>
            )}
          </div>
          {param.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{param.description}</p>
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