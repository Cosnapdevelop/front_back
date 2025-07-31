// 地区配置
const REGIONS = {
  china: {
    id: 'china',
    name: '中国大陆',
    flag: '🇨🇳',
    apiDomain: 'https://www.runninghub.cn',
    description: '中国大陆用户推荐使用'
  },
  hongkong: {
    id: 'hongkong',
    name: '香港/澳门/台湾',
    flag: '🇭🇰',
    apiDomain: 'https://www.runninghub.ai',
    description: '港澳台及海外用户推荐使用'
  }
};

// 获取地区配置
function getRegionConfig(regionId) {
  const region = REGIONS[regionId];
  if (!region) {
    console.warn(`[地区配置] 未找到地区配置: ${regionId}，使用默认配置`);
    return REGIONS.hongkong; // 默认使用香港配置
  }
  return region;
}

// 获取当前地区配置
function getCurrentRegionConfig() {
  // 这里可以根据需要从环境变量或其他地方获取当前地区
  // 暂时默认使用香港配置
  return REGIONS.hongkong;
}

export {
  REGIONS,
  getRegionConfig,
  getCurrentRegionConfig
};