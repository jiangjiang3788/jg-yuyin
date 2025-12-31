/**
 * jg-yuyin 酒馆助手版 - 设置管理模块
 * 使用 localStorage 存储设置，替代 SillyTavern 的 extension_settings
 */

import { log } from './utils.js';

// localStorage 存储键名
const STORAGE_KEY = 'jg-yuyin:settings';

// 默认设置
const defaultSettings = {
  apiKey: "",
  apiUrl: "https://api.siliconflow.cn/v1",
  ttsModel: "FunAudioLLM/CosyVoice2-0.5B",
  ttsVoice: "alex",
  ttsSpeed: 1.0,
  ttsGain: 0,
  responseFormat: "mp3",
  sampleRate: 32000,
  textStart: "",
  textEnd: "",
  autoPlay: true,
  autoPlayUser: false,
  customVoices: [] // 存储自定义音色列表
};

// 设置变更回调列表
const changeCallbacks = [];

/**
 * 获取当前设置（合并默认值）
 * @returns {object} 设置对象
 */
export function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 合并默认值，确保新增的设置项有默认值
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error('[jg-yuyin] 读取设置失败:', e);
  }
  return { ...defaultSettings };
}

/**
 * 保存设置（合并保存）
 * @param {object} partial - 部分设置对象
 */
export function saveSettings(partial) {
  try {
    const current = getSettings();
    const updated = { ...current, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    log('设置已保存');
    
    // 触发变更回调
    changeCallbacks.forEach(cb => {
      try {
        cb(updated);
      } catch (e) {
        console.error('[jg-yuyin] 设置变更回调执行失败:', e);
      }
    });
  } catch (e) {
    console.error('[jg-yuyin] 保存设置失败:', e);
  }
}

/**
 * 注册设置变更回调
 * @param {Function} callback - 回调函数，参数为新的设置对象
 */
export function onSettingsChange(callback) {
  if (typeof callback === 'function') {
    changeCallbacks.push(callback);
  }
}

/**
 * 获取默认设置
 * @returns {object} 默认设置对象
 */
export function getDefaultSettings() {
  return { ...defaultSettings };
}

/**
 * 重置设置为默认值
 */
export function resetSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    log('设置已重置为默认值');
    
    // 触发变更回调
    changeCallbacks.forEach(cb => {
      try {
        cb({ ...defaultSettings });
      } catch (e) {
        console.error('[jg-yuyin] 设置变更回调执行失败:', e);
      }
    });
  } catch (e) {
    console.error('[jg-yuyin] 重置设置失败:', e);
  }
}

/**
 * 更新自定义音色列表
 * @param {Array} voices - 音色列表
 */
export function updateCustomVoices(voices) {
  saveSettings({ customVoices: voices || [] });
}

/**
 * 获取自定义音色列表
 * @returns {Array} 音色列表
 */
export function getCustomVoices() {
  return getSettings().customVoices || [];
}
