/**
 * jg-yuyin 酒馆助手版 - 插件初始化入口
 * 此版本为酒馆助手（Tavern Helper / JS-Slash-Runner）可用的远程模块插件
 * 
 * 使用方法：
 * 1. 在酒馆助手中创建新脚本
 * 2. 粘贴 example-tavern-helper-entry.js 中的内容
 * 3. 运行脚本即可
 */

import { injectUI, injectCSS, renderFromSettings, updateVoiceOptions, updateCustomVoicesList } from './ui.js';
import { getSettings, onSettingsChange } from './settings.js';
import { loadCustomVoices, generateTTS } from './tts.js';
import { setupMessageListener } from './listener.js';
import { log, error } from './utils.js';

// 版本信息
const MODULE_VERSION = '2025-12-31_21-38';
const MODULE_CHANGES = '修复设置面板显示、优化消息监听、添加版本日志';

// 输出版本信息
console.log('🍶 jg-yuyin main.js 模块版本:', MODULE_VERSION);
console.log('📦 模块修改内容:', MODULE_CHANGES);

// 默认远程 URL 基础路径
const DEFAULT_BASE_URL = 'https://jiangjiang3788.github.io/jg-yuyin';

// 插件状态
let initialized = false;

/**
 * 初始化插件
 * @param {object} [options] - 配置选项
 * @param {string} [options.BASE_URL] - 远程资源基础 URL
 * @param {string} [options.mountSelector] - UI 挂载点选择器
 * @param {string} [options.version] - 版本号（用于缓存刷新）
 */
export async function init(options = {}) {
  if (initialized) {
    log('插件已初始化，跳过');
    return;
  }

  const BASE_URL = options.BASE_URL || DEFAULT_BASE_URL;
  const mountSelector = options.mountSelector || '#extensions_settings';
  const version = options.version || Date.now();

  log('========================================');
  log('🍶 jg-yuyin 酒馆助手版开始初始化');
  log('BASE_URL:', BASE_URL);
  log('mountSelector:', mountSelector);
  log('version:', version);
  log('========================================');

  try {
    // 1. 注入 CSS
    log('步骤 1/5: 注入 CSS...');
    await injectCSS({
      cssUrl: `${BASE_URL}/style.css?v=${version}`
    });

    // 2. 注入 UI
    log('步骤 2/5: 注入 UI...');
    await injectUI({
      htmlUrl: `${BASE_URL}/example.html?v=${version}`,
      mountSelector: mountSelector
    });

    // 3. 加载自定义音色列表
    log('步骤 3/5: 加载自定义音色列表...');
    try {
      await loadCustomVoices();
    } catch (e) {
      log('加载自定义音色失败（可能未配置 API Key），继续初始化:', e.message);
    }

    // 4. 更新 UI
    log('步骤 4/5: 更新 UI...');
    updateVoiceOptions();
    updateCustomVoicesList();

    // 5. 设置消息监听器（自动朗读）
    log('步骤 5/5: 设置消息监听器...');
    setupMessageListener();

    // 6. 监听设置变更，自动更新 UI
    onSettingsChange((newSettings) => {
      log('设置已变更，更新 UI');
      renderFromSettings(newSettings);
    });

    initialized = true;
    log('========================================');
    log('🍶 jg-yuyin 酒馆助手版初始化完成！');
    log('========================================');

  } catch (err) {
    error('插件初始化失败:', err);
    error('错误堆栈:', err.stack);
    throw err;
  }
}

/**
 * 获取插件是否已初始化
 * @returns {boolean}
 */
export function isInitialized() {
  return initialized;
}

/**
 * 手动触发 TTS（供外部调用）
 * @param {string} text - 要朗读的文本
 * @param {object} [options] - TTS 选项
 * @returns {Promise<string|null>} 音频 URL
 */
export async function speak(text, options = {}) {
  return await generateTTS(text, options);
}

/**
 * 获取当前设置（供外部调用）
 * @returns {object} 设置对象
 */
export function getPluginSettings() {
  return getSettings();
}

// 导出常用函数供外部调用
export { generateTTS, testConnection, loadCustomVoices, uploadVoice, deleteCustomVoice, stopCurrentAudio } from './tts.js';
export { getSettings, saveSettings, resetSettings } from './settings.js';
export { setupMessageListener, stopMessageListener } from './listener.js';
export { extractSpeakText, showToast } from './utils.js';
