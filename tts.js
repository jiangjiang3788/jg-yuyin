/**
 * jg-yuyin 酒馆助手版 - TTS 与音色 API 模块
 */

import { getSettings, saveSettings, updateCustomVoices } from './settings.js';
import { log, error, showToast } from './utils.js';

// TTS模型和音色配置
export const TTS_MODELS = {
  "FunAudioLLM/CosyVoice2-0.5B": {
    name: "CosyVoice2-0.5B",
    voices: {
      "alex": "Alex (男声)",
      "anna": "Anna (女声)",
      "bella": "Bella (女声)",
      "benjamin": "Benjamin (男声)",
      "charles": "Charles (男声)",
      "claire": "Claire (女声)",
      "david": "David (男声)",
      "diana": "Diana (女声)"
    }
  }
};

// 音频状态管理（导出供 listener.js 使用）
export const audioState = {
  isPlaying: false,
  currentAudio: null
};

/**
 * 测试 API 连接
 * @returns {Promise<boolean>} 连接是否成功
 */
export async function testConnection() {
  const settings = getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    showToast("请先输入API密钥", "error", "连接失败");
    return false;
  }

  try {
    const response = await fetch(`${settings.apiUrl}/audio/voice/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      log("API连接成功");
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    showToast(`连接失败: ${err.message}`, "error", "硅基流动插件");
    error("连接测试失败:", err);
    return false;
  }
}

/**
 * 生成 TTS 语音
 * @param {string} text - 要转换的文本
 * @param {object} [options] - 可选参数覆盖
 * @returns {Promise<string|null>} 音频 URL 或 null
 */
export async function generateTTS(text, options = {}) {
  const settings = getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    showToast("请先配置API密钥", "error", "TTS错误");
    return null;
  }

  if (!text) {
    showToast("文本不能为空", "error", "TTS错误");
    return null;
  }

  // 检查是否正在处理
  if (audioState.isPlaying) {
    log('音频正在处理中，跳过此次请求');
    return null;
  }

  try {
    log("正在生成语音...");

    // 从设置或选项获取参数
    const voiceValue = options.voice || settings.ttsVoice || "alex";
    const speed = options.speed !== undefined ? options.speed : (settings.ttsSpeed || 1.0);
    const gain = options.gain !== undefined ? options.gain : (settings.ttsGain || 0);

    // 判断是自定义音色还是预设音色
    // 规则：如果 voiceValue 含 ":"（例如 speech:xxx / custom:xxx / 任何URI），则直接当作自定义音色参数传给 API
    // 否则当作预设音色，拼成 `FunAudioLLM/CosyVoice2-0.5B:${voiceValue}`
    let voiceParam;
    if (voiceValue.includes(":")) {
      // 自定义音色（包含冒号的URI格式），直接使用
      voiceParam = voiceValue;
      log('使用自定义音色URI:', voiceParam);
    } else {
      // 预设音色，使用模型:音色格式
      voiceParam = `FunAudioLLM/CosyVoice2-0.5B:${voiceValue}`;
      log('使用预设音色:', voiceParam);
    }

    const requestBody = {
      model: "FunAudioLLM/CosyVoice2-0.5B",
      input: text,
      voice: voiceParam,
      response_format: "mp3",
      speed: speed,
      gain: gain
    };

    log('TTS请求参数:', {
      音色: voiceParam,
      语速: speed,
      音量: gain,
      文本: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    const response = await fetch(`${settings.apiUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // 创建音频元素播放
    const audio = new Audio(audioUrl);
    audioState.currentAudio = audio;

    const shouldAutoPlay = options.autoPlay !== undefined ? options.autoPlay : settings.autoPlay;

    if (shouldAutoPlay) {
      // 设置播放状态
      audioState.isPlaying = true;

      // 监听播放结束事件
      audio.addEventListener('ended', () => {
        audioState.isPlaying = false;
        audioState.currentAudio = null;
        log('音频播放完成');
      });

      audio.addEventListener('error', () => {
        audioState.isPlaying = false;
        audioState.currentAudio = null;
        log('音频播放错误');
      });

      // 播放音频
      audio.play().catch(err => {
        audioState.isPlaying = false;
        audioState.currentAudio = null;
        error('播放失败:', err);
      });
    }

    log("语音生成成功！");
    return audioUrl;

  } catch (err) {
    error("TTS Error:", err);
    showToast(`语音生成失败: ${err.message}`, "error", "TTS错误");
    return null;
  }
}

/**
 * 获取自定义音色列表
 * @returns {Promise<Array>} 音色列表
 */
export async function loadCustomVoices() {
  const settings = getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(`${settings.apiUrl}/audio/voice/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    log("自定义音色列表:", data);

    // 保存到设置 - 注意API返回的是result不是results
    const voices = data.result || data.results || [];
    updateCustomVoices(voices);

    // 打印第一个音色的结构以便调试
    if (voices.length > 0) {
      log("第一个自定义音色结构:", voices[0]);
    }

    return voices;

  } catch (err) {
    error("Load Custom Voices Error:", err);
    return [];
  }
}

/**
 * 上传克隆音色
 * @param {string} voiceName - 音色名称
 * @param {string} voiceText - 参考文本
 * @param {File} audioFile - 音频文件
 * @returns {Promise<boolean>} 是否成功
 */
export async function uploadVoice(voiceName, voiceText, audioFile) {
  const settings = getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    showToast("请先配置API密钥", "error", "克隆音色错误");
    return false;
  }

  if (!voiceName || !voiceText || !audioFile) {
    showToast("请填写音色名称、参考文本并选择音频文件", "error", "克隆音色错误");
    return false;
  }

  // 验证音色名称格式
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (!namePattern.test(voiceName)) {
    showToast("音色名称只能包含英文字母、数字、下划线和连字符", "error", "格式错误");
    return false;
  }

  if (voiceName.length > 64) {
    showToast("音色名称不能超过64个字符", "error", "格式错误");
    return false;
  }

  return new Promise((resolve) => {
    log("开始上传音色...");

    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const base64Audio = e.target.result;

        // 使用JSON格式发送
        const requestBody = {
          model: 'FunAudioLLM/CosyVoice2-0.5B',
          customName: voiceName,
          text: voiceText,
          audio: base64Audio
        };

        const response = await fetch(`${settings.apiUrl}/uploads/audio/voice`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          error("Upload error response:", errorText);

          // 如果JSON方式失败，尝试FormData方式
          log("JSON上传失败，尝试FormData方式...");

          const formData = new FormData();
          formData.append('model', 'FunAudioLLM/CosyVoice2-0.5B');
          formData.append('customName', voiceName);
          formData.append('text', voiceText);

          // 创建一个Blob对象从base64
          const base64Data = base64Audio.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: audioFile.type });

          formData.append('audio', blob, audioFile.name);

          const response2 = await fetch(`${settings.apiUrl}/uploads/audio/voice`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            body: formData
          });

          if (!response2.ok) {
            throw new Error(`HTTP ${response2.status}: ${await response2.text()}`);
          }

          const data = await response2.json();
          log("音色上传成功(FormData):", data);
        } else {
          const data = await response.json();
          log("音色上传成功(JSON):", data);
        }

        showToast(`音色 "${voiceName}" 克隆成功！`, "success", "克隆音色");

        // 刷新音色列表
        await loadCustomVoices();

        resolve(true);

      } catch (err) {
        error("Voice Clone Error:", err);
        showToast(`音色克隆失败: ${err.message}`, "error", "克隆音色错误");
        resolve(false);
      }
    };

    reader.onerror = function () {
      showToast("读取音频文件失败", "error", "克隆音色错误");
      resolve(false);
    };

    reader.readAsDataURL(audioFile);
  });
}

/**
 * 删除自定义音色
 * @param {string} uri - 音色 URI
 * @param {string} name - 音色名称
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteCustomVoice(uri, name) {
  const settings = getSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    showToast("请先配置API密钥", "error", "删除音色错误");
    return false;
  }

  // 确认删除
  if (!confirm(`确定要删除音色 "${name}" 吗？`)) {
    return false;
  }

  try {
    const response = await fetch(`${settings.apiUrl}/audio/voice/deletions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uri: uri })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    showToast(`音色 "${name}" 已删除`, "success", "删除成功");

    // 刷新列表
    await loadCustomVoices();

    return true;

  } catch (err) {
    error("Delete Voice Error:", err);
    showToast(`删除失败: ${err.message}`, "error", "删除音色错误");
    return false;
  }
}

/**
 * 停止当前播放的音频
 */
export function stopCurrentAudio() {
  if (audioState.currentAudio) {
    audioState.currentAudio.pause();
    audioState.currentAudio = null;
  }
  audioState.isPlaying = false;
}
