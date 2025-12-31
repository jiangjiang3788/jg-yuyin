# jg-yuyin - 酱酱语音插件

这是一个用于 SillyTavern 的语音扩展（TTS），支持硅基流动 API。

## 🎉 两种使用方式

### 方式一：酒馆助手版（推荐）

适用于 **酒馆助手（Tavern Helper / JS-Slash-Runner）** 用户。

#### 安装步骤

1. 在酒馆助手中创建新脚本
2. 复制 `example-tavern-helper-entry.js` 的全部内容粘贴到脚本编辑器
3. 保存并运行脚本
4. 在 SillyTavern 的扩展设置面板中即可看到"酱酱语音功能（TTS）"

#### 或者使用远程加载

直接在酒馆助手中粘贴以下代码：

```javascript
(async function () {
  const BASE_URL = 'https://jiangjiang3788.github.io/jg-yuyin';
  const VERSION = '20251231';
  
  try {
    const mainModule = await import(`${BASE_URL}/main.js?v=${VERSION}`);
    await mainModule.init({ BASE_URL, version: VERSION });
    console.log('🍶 jg-yuyin 酒馆助手版已加载');
  } catch (error) {
    console.error('🍶 jg-yuyin: 加载失败', error);
  }
})();
```

### 方式二：传统 SillyTavern 扩展

适用于直接安装扩展的用户。

#### 安装步骤

1. 在 SillyTavern 中，使用内置的扩展安装程序
2. 或将此仓库克隆到 `scripts/extensions/third-party/` 目录

---

## 特性

- **TTS 语音合成**：使用硅基流动 API 生成高质量语音
- **多种预设音色**：Alex、Anna、Bella、Benjamin 等 8 种预设音色
- **克隆音色**：上传音频文件克隆自定义音色
- **自动朗读**：自动朗读角色消息和/或用户消息
- **文本截取**：支持自定义标记，只朗读标记内的文本（如引号内的对话）
- **语速/音量调节**：可调节语速（0.25-4.0）和音量增益（-10 到 10）
- **本地保存**：所有设置保存在本地，刷新后仍然保留

---

## 文件结构

```
jg-yuyin/
├── main.js                      # 酒馆助手版入口
├── settings.js                  # 设置管理（localStorage）
├── ui.js                        # UI 注入与事件绑定
├── tts.js                       # TTS API 调用
├── listener.js                  # 自动朗读监听
├── utils.js                     # 工具函数
├── example-tavern-helper-entry.js  # 酒馆助手粘贴入口
├── example.html                 # UI 模板
├── style.css                    # 样式文件
└── legacy-extension/            # [旧版] SillyTavern 扩展（已弃用）
    ├── index.js
    └── manifest.json
```

---

## 使用说明

### 1. 配置 API

1. 从 [硅基流动官网](https://siliconflow.cn) 获取 API 密钥
2. 在插件设置中输入 API 密钥
3. 点击"测试连接"确认连接成功

### 2. 选择音色

- 从下拉菜单选择预设音色
- 或上传音频文件克隆自定义音色

### 3. 自动朗读设置

- **自动朗读角色消息**：默认开启，角色回复时自动朗读
- **自动朗读用户消息**：默认关闭，可手动开启

### 4. 文本截取设置

- 设置开始和结束标记，只朗读标记内的文本
- 例如：设置 `"` 和 `"` 可以只朗读引号内的对话
- 两个输入框都留空则朗读全部消息

---

## API 说明

酒馆助手版提供以下全局 API：

```javascript
// 手动触发 TTS
window.jgYuyin.speak("要朗读的文本");

// 获取当前设置
const settings = window.jgYuyin.getSettings();

// 生成 TTS（返回音频 URL）
const audioUrl = await window.jgYuyin.generateTTS("文本", { autoPlay: true });
```

---

## 先决条件

- SillyTavern 1.10.0 或更高版本
- 硅基流动 API 密钥
- 酒馆助手版需要安装 Tavern Helper / JS-Slash-Runner

---

## 支持和贡献

如需支持，请在 GitHub Issues 中提问。

欢迎任何形式的贡献，您可以通过提交问题或拉取请求来帮助改进此扩展。

---

## 许可证

本项目使用 [MIT 许可证](LICENSE)。
