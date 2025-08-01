import { createError, errorUtils } from '../types/errors';

// 地区配置
export interface RegionConfig {
  id: string;
  name: string;
  flag: string;
  apiDomain: string;
  description: string;
}

export const REGIONS: RegionConfig[] = [
  {
    id: 'china',
    name: '中国大陆',
    flag: '🇨🇳',
    apiDomain: 'https://www.runninghub.cn',
    description: '中国大陆用户推荐使用'
  },
  {
    id: 'hongkong',
    name: '香港/澳门/台湾',
    flag: '🇭🇰',
    apiDomain: 'https://www.runninghub.ai',
    description: '港澳台及海外用户推荐使用'
  }
];

// 默认地区（根据用户位置自动检测）
export const DEFAULT_REGION = 'hongkong';

// 获取地区配置
export function getRegionConfig(regionId: string): RegionConfig {
  return REGIONS.find(region => region.id === regionId) || REGIONS[0];
}

// 安全获取localStorage值
function getLocalStorageItem(key: string, defaultValue: string): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || defaultValue;
    }
    return defaultValue;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    errorUtils.logError(errorObj, '获取localStorage');
    return defaultValue;
  }
}

// 安全设置localStorage值
function setLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    errorUtils.logError(errorObj, '设置localStorage');
  }
}

// 获取当前地区配置
export function getCurrentRegionConfig(): RegionConfig {
  const savedRegion = getLocalStorageItem('selectedRegion', DEFAULT_REGION);
  return getRegionConfig(savedRegion);
}

// 设置地区
export function setRegion(regionId: string): void {
  setLocalStorageItem('selectedRegion', regionId);
  // 触发自定义事件，通知其他组件地区已更改
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('regionChanged', { detail: regionId }));
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    errorUtils.logError(errorObj, '触发地区更改事件');
  }
}