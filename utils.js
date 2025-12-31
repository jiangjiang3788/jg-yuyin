/**
 * jg-yuyin 酒馆助手版 - 工具函数模块
 * 此版本为酒馆助手（Tavern Helper / JS-Slash-Runner）可用的远程模块插件
 */

/**
 * 转义正则表达式特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 日志工具 - 带前缀的控制台日志
 * @param {string} message - 日志消息
 * @param {...any} args - 额外参数
 */
export function log(message, ...args) {
  console.log(`[jg-yuyin] ${message}`, ...args);
}

/**
 * 警告日志
 * @param {string} message - 警告消息
 * @param {...any} args - 额外参数
 */
export function warn(message, ...args) {
  console.warn(`[jg-yuyin] ${message}`, ...args);
}

/**
 * 错误日志
 * @param {string} message - 错误消息
 * @param {...any} args - 额外参数
 */
export function error(message, ...args) {
  console.error(`[jg-yuyin] ${message}`, ...args);
}

/**
 * 从消息中提取需要朗读的文本
 * @param {string} message - 原始消息文本
 * @param {string} startMark - 开始标记
 * @param {string} endMark - 结束标记
 * @returns {{ text: string|null, mode: 'marked'|'full'|'skip' }} 提取结果
 */
export function extractSpeakText(message, startMark, endMark) {
  // 如果没有设置标记，返回全文
  if (!startMark || !endMark) {
    return { text: message, mode: 'full' };
  }

  let extractedTexts = [];

  // 判断开始和结束标记是否相同（如英文引号）
  if (startMark === endMark) {
    // 相同标记：使用配对算法
    let insideQuote = false;
    let currentText = '';

    for (let i = 0; i < message.length; i++) {
      const char = message[i];

      if (char === startMark) {
        if (!insideQuote) {
          // 开始引号
          insideQuote = true;
          currentText = '';
        } else {
          // 结束引号
          if (currentText.trim()) {
            extractedTexts.push(currentText.trim());
          }
          insideQuote = false;
          currentText = '';
        }
      } else if (insideQuote) {
        currentText += char;
      }
    }
  } else {
    // 不同标记：使用正则表达式
    const escapedStart = escapeRegex(startMark);
    const escapedEnd = escapeRegex(endMark);

    const regex = new RegExp(`${escapedStart}(.*?)${escapedEnd}`, 'g');
    let match;

    while ((match = regex.exec(message)) !== null) {
      const cleanText = match[1].trim();
      if (cleanText) {
        extractedTexts.push(cleanText);
      }
    }
  }

  if (extractedTexts.length > 0) {
    return { text: extractedTexts.join(' '), mode: 'marked' };
  }

  // 设置了标记但没找到匹配内容，跳过朗读
  return { text: null, mode: 'skip' };
}

/**
 * 显示 Toast 消息（兼容 SillyTavern 的 toastr）
 * @param {string} message - 消息内容
 * @param {'success'|'error'|'warning'|'info'} type - 消息类型
 * @param {string} [title] - 标题
 */
export function showToast(message, type = 'info', title = '') {
  // 尝试使用 SillyTavern 的 toastr
  if (typeof toastr !== 'undefined') {
    switch (type) {
      case 'success':
        toastr.success(message, title);
        break;
      case 'error':
        toastr.error(message, title);
        break;
      case 'warning':
        toastr.warning(message, title);
        break;
      default:
        toastr.info(message, title);
    }
  } else {
    // 降级到控制台
    const prefix = title ? `[${title}] ` : '';
    switch (type) {
      case 'error':
        console.error(`${prefix}${message}`);
        break;
      case 'warning':
        console.warn(`${prefix}${message}`);
        break;
      default:
        console.log(`${prefix}${message}`);
    }
  }
}
