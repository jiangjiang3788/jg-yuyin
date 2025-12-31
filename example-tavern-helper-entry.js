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
  const VERSION = '2025-12-31_23-25';
  const CHANGES = '添加控制面板到扩展设置区域，提供快捷按钮';
  
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

    // 添加控制面板到扩展设置区域
    addControlPanel();

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

  /**
   * 添加控制面板到扩展设置区域
   * 提供快捷按钮用于打开设置面板和测试语音
   */
  function addControlPanel() {
    // 检查是否已存在控制面板
    if (document.getElementById('jg-yuyin-control-panel')) {
      console.log('🍶 jg-yuyin: 控制面板已存在，跳过创建');
      return;
    }

    const controlPanelHTML = `
      <div id="jg-yuyin-control-panel" class="jg-yuyin-control-panel" style="
        margin: 10px 0;
        padding: 12px;
        border: 1px solid var(--SmartThemeBorderColor, #444);
        border-radius: 8px;
        background: var(--SmartThemeBlurTintColor, rgba(26, 26, 46, 0.8));
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <h4 style="margin: 0; color: var(--SmartThemeBodyColor, #fff); font-size: 14px;">
            🔊 jg-yuyin 语音控制
          </h4>
          <span style="font-size: 11px; color: #888;">v${VERSION}</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="jg-yuyin-open-settings" class="menu_button" style="
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
          ">📋 打开设置面板</button>
          <button id="jg-yuyin-manual-test" class="menu_button" style="
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
          ">🎤 测试语音</button>
          <button id="jg-yuyin-stop-audio" class="menu_button" style="
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
          ">⏹️ 停止播放</button>
        </div>
      </div>
    `;

    // 尝试多个可能的挂载点
    const possibleSelectors = [
      '#extensions_settings',
      '#extensions_settings2',
      '.extensions_block',
      '#right-nav-panel'
    ];

    let mounted = false;
    for (const selector of possibleSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        container.insertAdjacentHTML('afterbegin', controlPanelHTML);
        console.log('🍶 jg-yuyin: 控制面板已添加到', selector);
        mounted = true;
        break;
      }
    }

    if (!mounted) {
      console.log('🍶 jg-yuyin: 未找到扩展设置容器，控制面板未添加');
      return;
    }

    // 绑定按钮事件
    const openSettingsBtn = document.getElementById('jg-yuyin-open-settings');
    const manualTestBtn = document.getElementById('jg-yuyin-manual-test');
    const stopAudioBtn = document.getElementById('jg-yuyin-stop-audio');

    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => {
        // 尝试显示浮动面板
        const floatingPanel = document.getElementById('jg-yuyin-floating-panel');
        if (floatingPanel) {
          floatingPanel.style.display = floatingPanel.style.display === 'none' ? 'block' : 'none';
          console.log('🍶 jg-yuyin: 切换浮动面板显示状态');
        } else {
          // 尝试滚动到设置区域
          const settingsPanel = document.querySelector('.siliconflow-extension-settings');
          if (settingsPanel) {
            settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // 展开 inline-drawer
            const drawerContent = settingsPanel.querySelector('.inline-drawer-content');
            const drawerIcon = settingsPanel.querySelector('.inline-drawer-icon');
            if (drawerContent && drawerContent.style.display === 'none') {
              drawerContent.style.display = 'block';
              if (drawerIcon) drawerIcon.classList.add('down');
            }
            console.log('🍶 jg-yuyin: 滚动到设置面板');
          } else {
            console.log('🍶 jg-yuyin: 未找到设置面板');
            if (typeof toastr !== 'undefined') {
              toastr.info('设置面板未找到，请检查插件是否正确加载', 'jg-yuyin');
            }
          }
        }
      });
    }

    if (manualTestBtn) {
      manualTestBtn.addEventListener('click', async () => {
        const testText = '你好，这是 jg-yuyin 语音测试。';
        console.log('🍶 jg-yuyin: 开始测试语音:', testText);
        
        if (window.jgYuyin?.speak) {
          try {
            await window.jgYuyin.speak(testText, { autoPlay: true });
            console.log('🍶 jg-yuyin: 测试语音生成成功');
          } catch (err) {
            console.error('🍶 jg-yuyin: 测试语音失败:', err);
            if (typeof toastr !== 'undefined') {
              toastr.error(`语音测试失败: ${err.message}`, 'jg-yuyin');
            }
          }
        } else {
          console.error('🍶 jg-yuyin: speak 函数不可用');
          if (typeof toastr !== 'undefined') {
            toastr.error('语音功能不可用，请检查插件配置', 'jg-yuyin');
          }
        }
      });
    }

    if (stopAudioBtn) {
      stopAudioBtn.addEventListener('click', () => {
        if (window.jgYuyin?.stopAudio) {
          window.jgYuyin.stopAudio();
          console.log('🍶 jg-yuyin: 已停止音频播放');
          if (typeof toastr !== 'undefined') {
            toastr.info('已停止播放', 'jg-yuyin');
          }
        } else {
          console.log('🍶 jg-yuyin: stopAudio 函数不可用');
        }
      });
    }

    console.log('🍶 jg-yuyin: 控制面板事件绑定完成');
  }
})();
