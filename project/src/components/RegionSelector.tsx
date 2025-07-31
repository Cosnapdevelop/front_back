import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REGIONS, getCurrentRegionConfig, setRegion, RegionConfig } from '../config/regions';

interface RegionSelectorProps {
  className?: string;
  showDescription?: boolean;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({ 
  className = '', 
  showDescription = true 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<RegionConfig>(() => {
    try {
      return getCurrentRegionConfig();
    } catch (error) {
      // 如果初始化失败，返回默认地区
      return REGIONS.find(region => region.id === 'hongkong') || REGIONS[0];
    }
  });

  useEffect(() => {
    const handleRegionChange = (event: CustomEvent) => {
      const newRegionId = event.detail;
      const newRegion = REGIONS.find(region => region.id === newRegionId);
      if (newRegion) {
        setCurrentRegion(newRegion);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('regionChanged', handleRegionChange as EventListener);
      return () => {
        window.removeEventListener('regionChanged', handleRegionChange as EventListener);
      };
    }
  }, []);

  const handleRegionSelect = (region: RegionConfig) => {
    setRegion(region.id);
    setCurrentRegion(region);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 地区选择器按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-lg">{currentRegion.flag}</span>
        <span className="font-medium text-gray-700">{currentRegion.name}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 地区选择下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          >
            <div className="py-2">
              {REGIONS.map((region) => (
                <button
                  key={region.id}
                  onClick={() => handleRegionSelect(region)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 ${
                    currentRegion.id === region.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{region.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{region.name}</div>
                    {showDescription && (
                      <div className="text-sm text-gray-500 mt-1">{region.description}</div>
                    )}
                  </div>
                  {currentRegion.id === region.id && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 点击外部关闭下拉菜单 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};