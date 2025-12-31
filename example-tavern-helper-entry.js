/**
 * jg-yuyin 酒馆助手入口脚本
 * 
 * 使用方法：
 * 1. 在酒馆助手（Tavern Helper / JS-Slash-Runner）中创建新脚本
 * 2. 将此文件的全部内容复制粘贴到脚本编辑器中
 * 3. 保存并运行脚本
 * 4. 右下角会出现"🔊 语音设置"按钮，点击即可打开设置面板
 * 
 * 配置说明：
 * - BASE_URL: 远程资源地址，默认为 GitHub Pages
 * - VERSION: 版本号，用于缓存刷新，修改此值可强制重新加载资源
 */

(async function () {
  'use strict';

  // ============ 版本信息 ============
  const VERSION = '2025-12-31_21-38';
  const CHANGES = '修复设置面板显示、优化消息监听、添加版本日志';
  
  console.log('🍶 jg-yuyin 酒馆助手版 加载版本:', VERSION);
  console.log('📦 修改内容:', CHANGES);
  console.log('🍶 jg-yuyin 入口脚本已执行，检查版本和修改内容');

  // ============ 配置区域 ============
  
  // 远程资源基础 URL（GitHub Pages 地址）
  const BASE_URL = 'https://jiangjiang3788.github.io/jg-yuyin';
  
  // ============ 配置结束 ============

  console.log('🍶 jg-yuyin: 开始加载酒馆助手版...');
  console.log('🍶 jg-yuyin: BASE_URL =', BASE_URL);

  try {
    // 动态导入主模块（添加版本号避免缓存）
    const mainModule = await import(`${BASE_URL}/main.js?v=${VERSION}`);
    
    // 初始化插件
    await mainModule.init({
      BASE_URL: BASE_URL,
      version: VERSION,
      mountSelector: '#extensions_settings'
    });

    console.log('🍶 jg-yuyin 酒馆助手版已成功加载！');
    
    // 将模块暴露到全局，方便调试和外部调用
    window.jgYuyin = {
      version: VERSION,
      changes: CHANGES,
      speak: mainModule.speak,
      getSettings: mainModule.getPluginSettings,
      generateTTS: mainModule.generateTTS,
      stopAudio: mainModule.stopCurrentAudio,
      // 更多 API...
    };

    console.log('🍶 jg-yuyin: 全局对象 window.jgYuyin 已创建，可用于调试');

  } catch (error) {
    console.error('🍶 jg-yuyin: 加载失败', error);
    console.error('🍶 jg-yuyin: 错误堆栈', error.stack);
    
    // 显示错误提示
    if (typeof toastr !== 'undefined') {
      toastr.error(`jg-yuyin 加载失败: ${error.message}`, '插件错误');
    } else {
      alert(`jg-yuyin 加载失败: ${error.message}\n请查看控制台获取详细信息`);
    }
  }
})();
