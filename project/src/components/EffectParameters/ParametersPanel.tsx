import React from 'react';
import { ParameterInput } from './ParameterInput';

interface Parameter {
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
}

interface ParametersPanelProps {
  parameters: Parameter[];
  values: Record<string, any>;
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
  className?: string;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({
  parameters,
  values,
  onChange,
  imageParamFiles = {},
  onImageUpload,
  onImageRemove,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Parameters
      </h2>
      <div className="space-y-4">
        {parameters.map((param) => (
          <ParameterInput
            key={param.name}
            param={param}
            value={values[param.name]}
            onChange={onChange}
            imageParamFiles={imageParamFiles}
            onImageUpload={onImageUpload}
            onImageRemove={onImageRemove}
          />
        ))}
      </div>
    </div>
  );
};

export default ParametersPanel;