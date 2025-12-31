/**
 * jg-yuyin 酒馆助手版 - UI 注入与事件绑定模块
 */

import { getSettings, saveSettings, getCustomVoices } from './settings.js';
import { testConnection, generateTTS, loadCustomVoices, uploadVoice, deleteCustomVoice, TTS_MODELS } from './tts.js';
import { log, error, showToast } from './utils.js';

// UI 状态
let uiInjected = false;

/**
 * 注入 CSS 样式
 * @param {object} options - 配置选项
 * @param {string} options.cssUrl - CSS 文件 URL
 */
export async function injectCSS({ cssUrl }) {
  try {
    log('正在加载 CSS:', cssUrl);
    const response = await fetch(cssUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const cssText = await response.text();

    // 创建 style 元素并插入
    const styleElement = document.createElement('style');
    styleElement.id = 'jg-yuyin-styles';
    styleElement.textContent = cssText;
    document.head.appendChild(styleElement);

    log('CSS 注入成功');
  } catch (err) {
    error('CSS 注入失败:', err);
  }
}

/**
 * 注入 HTML UI
 * @param {object} options - 配置选项
 * @param {string} options.htmlUrl - HTML 文件 URL
 * @param {string} [options.mountSelector] - 挂载点选择器，默认 #extensions_settings
 */
export async function injectUI({ htmlUrl, mountSelector = '#extensions_settings' }) {
  if (uiInjected) {
    log('UI 已注入，跳过');
    return;
  }

  try {
    log('正在加载 HTML:', htmlUrl);
    const response = await fetch(htmlUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    let htmlText = await response.text();

    // 查找挂载点
    const mountPoint = document.querySelector(mountSelector);
    if (!mountPoint) {
      error('未找到挂载点:', mountSelector);
      // 尝试创建一个浮动面板作为备选
      createFloatingPanel(htmlText);
      return;
    }

    // 插入 HTML
    mountPoint.insertAdjacentHTML('beforeend', htmlText);
    uiInjected = true;

    log('HTML UI 注入成功');

    // 绑定事件处理器
    bindUIHandlers();

    // 从设置渲染 UI
    renderFromSettings(getSettings());

    // 设置 inline-drawer 折叠功能
    setupDrawerToggle();

  } catch (err) {
    error('UI 注入失败:', err);
  }
}

/**
 * 创建浮动面板（当找不到挂载点时的备选方案）
 * @param {string} htmlContent - HTML 内容
 */
function createFloatingPanel(htmlContent) {
  log('创建浮动面板作为备选');

  const panel = document.createElement('div');
  panel.id = 'jg-yuyin-floating-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    background: var(--SmartThemeBlurTintColor, #1a1a2e);
    border: 1px solid var(--SmartThemeBorderColor, #444);
    border-radius: 8px;
    padding: 15px;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  // 添加关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 5px;
    right: 10px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--SmartThemeBodyColor, #fff);
  `;
  closeBtn.onclick = () => panel.style.display = 'none';

  // 添加显示/隐藏切换按钮
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'jg-yuyin-toggle-btn';
  toggleBtn.textContent = '🔊 语音设置';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background: var(--SmartThemeBlurTintColor, #1a1a2e);
    border: 1px solid var(--SmartThemeBorderColor, #444);
    border-radius: 8px;
    cursor: pointer;
    z-index: 10001;
    color: var(--SmartThemeBodyColor, #fff);
  `;
  toggleBtn.onclick = () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  panel.innerHTML = htmlContent;
  panel.insertBefore(closeBtn, panel.firstChild);

  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);

  uiInjected = true;

  // 绑定事件处理器
  bindUIHandlers();

  // 从设置渲染 UI
  renderFromSettings(getSettings());

  // 设置 inline-drawer 折叠功能
  setupDrawerToggle();
}

/**
 * 设置 inline-drawer 折叠/展开功能
 */
function setupDrawerToggle() {
  setTimeout(() => {
    $('.siliconflow-extension-settings .inline-drawer-toggle').each(function () {
      $(this).off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const $header = $(this);
        const $icon = $header.find('.inline-drawer-icon');
        const $content = $header.next('.inline-drawer-content');
        const isOpen = $content.data('open') === true;

        if (isOpen) {
          // 收起
          $content.data('open', false);
          $content.hide();
          $icon.removeClass('down');
        } else {
          // 展开
          $content.data('open', true);
          $content.show();
          $icon.addClass('down');
        }
      });
    });
  }, 100);
}

/**
 * 绑定 UI 事件处理器
 */
export function bindUIHandlers() {
  log('绑定 UI 事件处理器');

  // 保存设置按钮
  $("#save_siliconflow_settings").off('click').on("click", () => {
    const settings = readSettingsFromUI();
    saveSettings(settings);
    showToast("设置已保存", "success");
  });

  // 测试连接按钮
  $("#test_siliconflow_connection").off('click').on("click", async () => {
    // 先保存当前 API Key
    const apiKey = $("#siliconflow_api_key").val();
    const apiUrl = $("#siliconflow_api_url").val();
    saveSettings({ apiKey, apiUrl });

    const success = await testConnection();
    if (success) {
      $("#connection_status").text("已连接").css("color", "green");
    } else {
      $("#connection_status").text("未连接").css("color", "red");
    }
  });

  // TTS 模型变更
  $("#tts_model").off('change').on("change", updateVoiceOptions);

  // 音色选择变更
  $("#tts_voice").off('change').on("change", function () {
    saveSettings({ ttsVoice: $(this).val() });
    log("选择的音色:", $(this).val());
  });

  // 语速滑块
  $("#tts_speed").off('input').on("input", function () {
    $("#tts_speed_value").text($(this).val());
  });

  // 音量增益滑块
  $("#tts_gain").off('input').on("input", function () {
    $("#tts_gain_value").text($(this).val());
  });

  // 自动朗读角色消息
  $("#auto_play_audio").off('change').on("change", function () {
    saveSettings({ autoPlay: $(this).prop("checked") });
    log("自动朗读角色消息:", $(this).prop("checked"));
  });

  // 自动朗读用户消息
  $("#auto_play_user").off('change').on("change", function () {
    saveSettings({ autoPlayUser: $(this).prop("checked") });
    log("自动朗读用户消息:", $(this).prop("checked"));
  });

  // 文本标记设置自动保存
  $("#image_text_start, #image_text_end").off('input').on("input", function () {
    saveSettings({
      textStart: $("#image_text_start").val(),
      textEnd: $("#image_text_end").val()
    });
  });

  // TTS 测试按钮
  $("#test_tts").off('click').on("click", async function () {
    // 先保存当前设置
    const settings = readSettingsFromUI();
    saveSettings(settings);

    const testText = $("#tts_test_text").val() || "你好，这是一个测试语音。";
    const audioUrl = await generateTTS(testText, { autoPlay: true });

    if (audioUrl) {
      // 添加下载按钮
      const downloadLink = $(`<a href="${audioUrl}" download="tts_output.mp3">下载音频</a>`);
      $("#tts_output").empty().append(downloadLink);
    }
  });

  // 克隆音色功能
  $("#upload_voice").off('click').on("click", async () => {
    const voiceName = $("#clone_voice_name").val();
    const voiceText = $("#clone_voice_text").val();
    const audioFile = $("#clone_voice_audio")[0]?.files[0];

    const success = await uploadVoice(voiceName, voiceText, audioFile);
    if (success) {
      // 清空输入
      $("#clone_voice_name").val("");
      $("#clone_voice_text").val("");
      $("#clone_voice_audio").val("");

      // 刷新音色列表 UI
      updateCustomVoicesList();
      updateVoiceOptions();
    }
  });

  // 刷新音色列表
  $("#refresh_custom_voices").off('click').on("click", async () => {
    await loadCustomVoices();
    updateCustomVoicesList();
    updateVoiceOptions();
  });

  // 删除音色事件（使用事件委托）
  $(document).off("click", ".delete-voice").on("click", ".delete-voice", async function () {
    const uri = $(this).data("uri");
    const name = $(this).data("name");
    const success = await deleteCustomVoice(uri, name);
    if (success) {
      updateCustomVoicesList();
      updateVoiceOptions();
    }
  });

  log('UI 事件处理器绑定完成');
}

/**
 * 从设置渲染 UI 控件
 * @param {object} settings - 设置对象
 */
export function renderFromSettings(settings) {
  log('从设置渲染 UI');

  $("#siliconflow_api_key").val(settings.apiKey || "");
  $("#siliconflow_api_url").val(settings.apiUrl || "https://api.siliconflow.cn/v1");
  $("#tts_model").val(settings.ttsModel || "FunAudioLLM/CosyVoice2-0.5B");
  $("#tts_speed").val(settings.ttsSpeed || 1.0);
  $("#tts_speed_value").text(settings.ttsSpeed || 1.0);
  $("#tts_gain").val(settings.ttsGain || 0);
  $("#tts_gain_value").text(settings.ttsGain || 0);
  $("#image_text_start").val(settings.textStart || "");
  $("#image_text_end").val(settings.textEnd || "");
  $("#auto_play_audio").prop("checked", settings.autoPlay !== false);
  $("#auto_play_user").prop("checked", settings.autoPlayUser === true);

  // 更新音色选项后再设置选中值
  updateVoiceOptions();
  if (settings.ttsVoice) {
    $("#tts_voice").val(settings.ttsVoice);
  }

  // 更新自定义音色列表
  updateCustomVoicesList();
}

/**
 * 从 UI 控件读取设置
 * @returns {object} 部分设置对象
 */
export function readSettingsFromUI() {
  return {
    apiKey: $("#siliconflow_api_key").val(),
    apiUrl: $("#siliconflow_api_url").val(),
    ttsModel: $("#tts_model").val(),
    ttsVoice: $("#tts_voice").val(),
    ttsSpeed: parseFloat($("#tts_speed").val()) || 1.0,
    ttsGain: parseFloat($("#tts_gain").val()) || 0,
    textStart: $("#image_text_start").val(),
    textEnd: $("#image_text_end").val(),
    autoPlay: $("#auto_play_audio").prop("checked"),
    autoPlayUser: $("#auto_play_user").prop("checked")
  };
}

/**
 * 更新音色下拉选项
 */
export function updateVoiceOptions() {
  const model = $("#tts_model").val() || "FunAudioLLM/CosyVoice2-0.5B";
  const voiceSelect = $("#tts_voice");
  const currentValue = voiceSelect.val();
  voiceSelect.empty();

  // 添加预设音色
  if (TTS_MODELS[model] && TTS_MODELS[model].voices) {
    voiceSelect.append('<optgroup label="预设音色">');
    Object.entries(TTS_MODELS[model].voices).forEach(([value, name]) => {
      voiceSelect.append(`<option value="${value}">${name}</option>`);
    });
    voiceSelect.append('</optgroup>');
  }

  // 添加自定义音色
  const customVoices = getCustomVoices();
  log(`更新音色选项，自定义音色数量: ${customVoices.length}`);

  if (customVoices.length > 0) {
    voiceSelect.append('<optgroup label="自定义音色">');
    customVoices.forEach(voice => {
      const voiceName = voice.name || voice.customName || voice.custom_name || "未命名";
      const voiceUri = voice.uri || voice.id || voice.voice_id;
      log(`添加自定义音色: ${voiceName} -> ${voiceUri}`);
      voiceSelect.append(`<option value="${voiceUri}">${voiceName} (自定义)</option>`);
    });
    voiceSelect.append('</optgroup>');
  }

  // 恢复之前的选择或设置默认值
  if (currentValue && voiceSelect.find(`option[value="${currentValue}"]`).length > 0) {
    voiceSelect.val(currentValue);
  } else {
    const settings = getSettings();
    const defaultVoice = settings.ttsVoice || Object.keys(TTS_MODELS[model]?.voices || {})[0];
    voiceSelect.val(defaultVoice);
  }
}

/**
 * 更新自定义音色列表显示
 */
export function updateCustomVoicesList() {
  const customVoices = getCustomVoices();
  const listContainer = $("#custom_voices_list");

  if (customVoices.length === 0) {
    listContainer.html("<small>暂无自定义音色</small>");
    return;
  }

  let html = "";
  customVoices.forEach(voice => {
    const voiceName = voice.name || voice.customName || voice.custom_name || "未命名";
    const voiceUri = voice.uri || voice.id || voice.voice_id;
    html += `
      <div class="custom-voice-item" style="margin: 5px 0; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
        <span>${voiceName}</span>
        <button class="menu_button delete-voice" data-uri="${voiceUri}" data-name="${voiceName}" style="float: right; padding: 2px 8px; font-size: 12px;">删除</button>
      </div>
    `;
  });

  listContainer.html(html);
}
