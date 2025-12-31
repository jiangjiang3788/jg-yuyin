/**
 * jg-yuyin 酒馆助手版 - 自动朗读监听模块
 * 支持 SillyTavern 事件系统和 MutationObserver 两种模式
 */

import { getSettings } from './settings.js';
import { generateTTS, audioState } from './tts.js';
import { extractSpeakText, log, debounce } from './utils.js';

// 监听状态
const listenerState = {
  initialized: false,
  observer: null,
  lastProcessedMessageId: null,
  lastProcessedUserMessageId: null,
  processingTimeout: null,
  processedElements: new WeakSet() // 用于 MutationObserver 模式的去重
};

/**
 * 处理消息并生成 TTS
 * @param {string} messageText - 消息文本
 * @param {string} messageType - 消息类型 ('character' | 'user')
 */
async function processMessage(messageText, messageType) {
  if (!messageText) {
    log(`${messageType}消息内容为空`);
    return;
  }

  const settings = getSettings();
  const textStart = settings.textStart || '';
  const textEnd = settings.textEnd || '';

  log(`处理${messageType}消息，检查标记:`, { textStart, textEnd, 消息内容: messageText.substring(0, 100) });

  const result = extractSpeakText(messageText, textStart, textEnd);

  switch (result.mode) {
    case 'marked':
      log(`${messageType}消息 - 自动朗读标记内文本:`, result.text);
      await generateTTS(result.text);
      break;
    case 'full':
      log(`${messageType}消息 - 未设置标记，自动朗读全文:`, messageText.substring(0, 100));
      await generateTTS(messageText);
      break;
    case 'skip':
      log(`${messageType}消息 - 设置了标记但未找到匹配内容，跳过朗读`);
      break;
  }
}

/**
 * 处理角色消息渲染事件
 * @param {string|number} messageId - 消息 ID
 */
function handleCharacterMessage(messageId) {
  log('角色消息渲染:', messageId);

  // 防止重复处理同一条消息
  if (listenerState.lastProcessedMessageId === messageId) {
    log('消息已处理，跳过:', messageId);
    return;
  }

  // 检查是否开启自动朗读
  const settings = getSettings();
  if (!settings.autoPlay) {
    log('自动朗读未开启');
    return;
  }

  // 清除之前的延时器
  if (listenerState.processingTimeout) {
    clearTimeout(listenerState.processingTimeout);
  }

  // 使用防抖处理，等待消息完全渲染
  listenerState.processingTimeout = setTimeout(() => {
    log('延时处理开始:', messageId);

    // 再次检查是否已处理
    if (listenerState.lastProcessedMessageId === messageId) {
      log('消息在延迟期间已被处理，跳过');
      return;
    }

    // 标记为已处理
    listenerState.lastProcessedMessageId = messageId;

    // 查找消息元素
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (messageElement.length === 0) {
      log('未找到消息元素');
      return;
    }

    const message = messageElement.find('.mes_text').text();
    processMessage(message, 'character');

  }, 1000); // 延迟1000ms等待DOM完全更新
}

/**
 * 处理用户消息渲染事件
 * @param {string|number} messageId - 消息 ID
 */
function handleUserMessage(messageId) {
  log('用户消息渲染:', messageId);

  // 防止重复处理同一条用户消息
  if (listenerState.lastProcessedUserMessageId === messageId) {
    log('用户消息已处理，跳过:', messageId);
    return;
  }

  // 检查是否开启用户消息自动朗读
  const settings = getSettings();
  if (!settings.autoPlayUser) {
    log('用户消息自动朗读未开启');
    return;
  }

  // 标记为已处理
  listenerState.lastProcessedUserMessageId = messageId;

  setTimeout(() => {
    log('用户消息延时处理开始:', messageId);

    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (messageElement.length === 0) {
      log('未找到用户消息元素');
      return;
    }

    const message = messageElement.find('.mes_text').text();
    processMessage(message, 'user');

  }, 500);
}

/**
 * 使用 SillyTavern 事件系统设置监听
 */
function setupEventSourceListener() {
  log('使用 SillyTavern 事件系统设置监听');

  const eventSource = window.eventSource;
  const event_types = window.event_types;

  // 监听角色消息渲染事件
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, handleCharacterMessage);

  // 监听用户消息渲染事件
  eventSource.on(event_types.USER_MESSAGE_RENDERED, handleUserMessage);

  log('SillyTavern 事件监听已设置');
}

// MutationObserver 重试计数
let observerRetryCount = 0;
const MAX_OBSERVER_RETRIES = 30; // 最多重试30次（30秒）

/**
 * 使用 MutationObserver 设置监听（降级方案）
 */
function setupMutationObserver() {
  log('使用 MutationObserver 设置监听（降级方案）');

  // 查找聊天容器
  const chatContainer = document.getElementById('chat');
  if (!chatContainer) {
    observerRetryCount++;
    if (observerRetryCount >= MAX_OBSERVER_RETRIES) {
      log(`未找到聊天容器 #chat，已重试 ${MAX_OBSERVER_RETRIES} 次，停止重试。可能当前页面不是聊天页面。`);
      return;
    }
    log(`未找到聊天容器 #chat，延迟重试... (${observerRetryCount}/${MAX_OBSERVER_RETRIES})`);
    setTimeout(setupMutationObserver, 1000);
    return;
  }

  // 找到了，重置计数
  observerRetryCount = 0;

  // 创建防抖处理函数
  const debouncedProcessNewMessage = debounce((element) => {
    // 检查是否已处理
    if (listenerState.processedElements.has(element)) {
      return;
    }
    listenerState.processedElements.add(element);

    const mesId = element.getAttribute('mesid');
    const messageText = element.querySelector('.mes_text')?.textContent;

    if (!messageText) {
      return;
    }

    // 判断是角色消息还是用户消息
    const isUser = element.classList.contains('user_mes') || 
                   element.getAttribute('is_user') === 'true';

    const settings = getSettings();

    if (isUser) {
      if (settings.autoPlayUser) {
        log('MutationObserver: 检测到用户消息', mesId);
        processMessage(messageText, 'user');
      }
    } else {
      if (settings.autoPlay) {
        log('MutationObserver: 检测到角色消息', mesId);
        processMessage(messageText, 'character');
      }
    }
  }, 500);

  // 创建 MutationObserver
  listenerState.observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 检查是否是消息元素
          if (node.classList?.contains('mes')) {
            // 延迟处理，等待消息内容完全渲染
            setTimeout(() => {
              debouncedProcessNewMessage(node);
            }, 1000);
          }
          // 也检查子元素中是否有消息
          const mesElements = node.querySelectorAll?.('.mes');
          if (mesElements) {
            mesElements.forEach(el => {
              setTimeout(() => {
                debouncedProcessNewMessage(el);
              }, 1000);
            });
          }
        }
      }
    }
  });

  // 开始观察
  listenerState.observer.observe(chatContainer, {
    childList: true,
    subtree: true
  });

  log('MutationObserver 监听已设置');
}

/**
 * 初始化消息监听器
 */
export function setupMessageListener() {
  if (listenerState.initialized) {
    log('消息监听器已初始化，跳过');
    return;
  }

  log('设置消息监听器');

  // 检查是否存在 SillyTavern 的事件系统
  if (window.eventSource && window.event_types && 
      window.event_types.CHARACTER_MESSAGE_RENDERED && 
      window.event_types.USER_MESSAGE_RENDERED) {
    
    log('检测到 SillyTavern 事件系统');
    setupEventSourceListener();
  } else {
    log('未检测到 SillyTavern 事件系统，使用 MutationObserver');
    setupMutationObserver();
  }

  listenerState.initialized = true;
  log('消息监听器初始化完成');
}

/**
 * 停止消息监听
 */
export function stopMessageListener() {
  if (listenerState.observer) {
    listenerState.observer.disconnect();
    listenerState.observer = null;
  }

  if (listenerState.processingTimeout) {
    clearTimeout(listenerState.processingTimeout);
    listenerState.processingTimeout = null;
  }

  listenerState.initialized = false;
  log('消息监听器已停止');
}

/**
 * 重置监听状态（用于测试）
 */
export function resetListenerState() {
  listenerState.lastProcessedMessageId = null;
  listenerState.lastProcessedUserMessageId = null;
  listenerState.processedElements = new WeakSet();
  log('监听状态已重置');
}
