/**
 * jg-yuyin 酒馆助手入口脚本
 * 
 * 使用方法：
 * 1. 在酒馆助手（Tavern Helper / JS-Slash-Runner）中创建新脚本
 * 2. 将此文件的全部内容复制粘贴到脚本编辑器中
 * 3. 保存并运行脚本
 * 4. 在 SillyTavern 的扩展设置面板中即可看到"酱酱语音功能（TTS）"
 * 
 * 配置说明：
 * - BASE_URL: 远程资源地址，默认为 GitHub Pages
 * - VERSION: 版本号，用于缓存刷新，修改此值可强制重新加载资源
 * - MOUNT_SELECTOR: UI 挂载点，默认挂载到扩展设置面板
 */

(async function () {
  'use strict';

  // ============ 配置区域 ============
  
  // 远程资源基础 URL（GitHub Pages 地址）
  const BASE_URL = 'https://jiangjiang3788.github.io/jg-yuyin';
  
  // 版本号（修改此值可强制刷新缓存）
  const VERSION = '20251231';
  
  // UI 挂载点选择器
  const MOUNT_SELECTOR = '#extensions_settings';
  
  // ============ 配置结束 ============

  console.log('🍶 jg-yuyin: 开始加载酒馆助手版...');

  try {
    // 动态导入主模块
    const mainModule = await import(`${BASE_URL}/main.js?v=${VERSION}`);
    
    // 初始化插件
    await mainModule.init({
      BASE_URL: BASE_URL,
      version: VERSION,
      mountSelector: MOUNT_SELECTOR
    });

    console.log('🍶 jg-yuyin 酒馆助手版已加载');
    
    // 可选：将模块暴露到全局，方便调试和外部调用
    window.jgYuyin = {
      speak: mainModule.speak,
      getSettings: mainModule.getPluginSettings,
      generateTTS: mainModule.generateTTS,
      // 更多 API...
    };

  } catch (error) {
    console.error('🍶 jg-yuyin: 加载失败', error);
    
    // 显示错误提示
    if (typeof toastr !== 'undefined') {
      toastr.error(`jg-yuyin 加载失败: ${error.message}`, '插件错误');
    }
  }
})();
