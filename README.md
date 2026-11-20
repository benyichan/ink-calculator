<div align="center">

# Ink Calculator · 墨水屏计算器

**把计算器做成一张纸。**

[![GitHub Pages](https://img.shields.io/badge/落地页-GitHub%20Pages-20201e?style=flat-square)](https://benyichan.github.io/ink-calculator/)
[![License: MIT](https://img.shields.io/badge/协议-MIT-20201e?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/平台-Android%207%2B-20201e?style=flat-square)](https://github.com/benyichan/ink-calculator/releases)

[**🌐 产品介绍落地页**](https://benyichan.github.io/ink-calculator/) · [**📱 下载 APK v1.5**](apk/ink-calculator-v1.5.apk) · [**▶️ 浏览器在线体验**](https://benyichan.github.io/ink-calculator/app/index.html)

![screenshot](assets/screenshot.png)

</div>

---

> **缘起**：系统自带的计算器不能在输入框定位光标；好不容易找到符合要求的，打开有广告，想买会员国内又买不了。索性自己做一个——把想要的功能都加上，UI 也按自己喜欢的来。于是有了这个墨水屏计算器。

完整的产品故事、设计理念、功能演示和「为谁而做」，都在 **[产品介绍落地页](https://benyichan.github.io/ink-calculator/)** —— README 这里只讲怎么拿去用、怎么构建。

---

## 特性

- **墨水屏视觉**：纸色底、深灰细描边、CASIO 式细边框按键、纸感噪点纹理，深浅双主题
- **光标级编辑**：表达式任意位置插入/删除数字与运算符，点击定位光标，实时千分位显示
- **智能括号**：单个 `()` 键自动判断插入左括号 / 右括号，连续输入按同向处理（复合公式），运算完成自动跳出
- **计算历史**：平常（按 `=` 才记录）/ 激进（停顿可配置，默认 10 秒自动记录）双模式，默认保留 30 条，多选删除 + 一键清空
- **显示单位**：原值 / 千 / 万 / 百万 / 千万 / 亿 / 十亿，结果态整体换算，历史记录实时重算
- **科学模式**：三角函数、对数、幂、开方、阶乘、DEG/RAD、记忆功能
- **贴心细节**：超长公式自动缩字号完整显示、零过多自动科学计数法、CASIO 式上下文百分号（`100-12.5% = 87.5`）、长按公式复制到剪贴板

## 下载与体验

| 方式 | 入口 | 说明 |
|---|---|---|
| 📱 Android APK | [apk/ink-calculator-v1.5.apk](apk/ink-calculator-v1.5.apk) · [Releases](https://github.com/benyichan/ink-calculator/releases) | 自签名 release，Android 7.0 / API 24+，首次安装需允许「未知来源」 |
| ▶️ 浏览器版 | [在线打开](https://benyichan.github.io/ink-calculator/app/index.html) 或本地 [app/index.html](app/index.html) | 单文件、零依赖、离线可用，与 APK 界面源码完全一致 |
| 🌐 产品介绍 | [落地页](https://benyichan.github.io/ink-calculator/) |缘起、设计理念、体验演示、为谁而做 |

## 构建

本机需 JDK 21（Android Studio 自带 JBR）、Android SDK、Node.js。

```bash
npm install
npx cap sync android
cd android
./gradlew assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

要重新签名：在 `android/app/` 放自己的 keystore，改 `android/app/build.gradle` 的 `signingConfigs`。

## 项目结构

| 路径 | 说明 |
|---|---|
| `index.html` | **GitHub Pages 落地页**（产品介绍宣传页，站点根） |
| `app/index.html` | 计算器完整源码（单文件 HTML：样式 + 解析引擎 + 界面） |
| `apk/` | 已签名的 release APK |
| `assets/` | 图标、OG 分享图、真机截图（落地页与 README 共用） |
| `robots.txt` / `sitemap.xml` / `llms.txt` | SEO / GEO 基建，随落地页发布 |
| `.nojekyll` | 关闭 Jekyll，保证 Pages 原样发布静态文件 |

> 落地页与 README 共用 `assets/`：改了截图或图标，两边同时生效。

## 技术说明

- 表达式解析为手写递归下降解析器，支持隐式乘法（`2(3+4)`）、一元负号、后缀 `%` / `!`
- 自绘光标替代原生 `<input>`，规避 Android WebView 唤起软键盘的问题
- 千分位仅为显示层改写，内部始终保存原始串；光标位置通过双向位置映射保持准确
- 剪贴板使用 `@capacitor/clipboard` 原生插件，规避 WebView 中 `execCommand` 在长按定时器内失效的问题

## 协议

[MIT](LICENSE) © 2026 Benyi Chan
