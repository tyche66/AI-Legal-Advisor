# AI法律顾问：上游项目、版权与再分发说明

> 本文件用于项目归属、许可证和再分发信息披露，不构成法律意见。各上游项目的许可证正文、版权声明和适用范围，以对应仓库及其随附文件为准。对具体再分发方案、商业化安排、商标使用或争议风险，建议由专业律师进行复核。

## 项目身份说明

**AI法律顾问**是本仓库的产品名称和用户界面品牌。本项目不是任何上游项目的官方产品，也不代表获得上游项目作者、组织或商标权利人的背书、合作、授权或投资关系。

本项目在用户可见界面中使用“AI法律顾问”作为产品品牌；在源代码、许可证、第三方通知、依赖元数据和本归属文件中保留上游项目的准确名称，是为了履行版权、许可证、来源追踪和再分发披露义务。

## 上游项目归属表

| 上游项目 | 仓库 / 来源 | 在本项目中的关系 | 许可证或适用文件 |
| --- | --- | --- | --- |
| **DeepSeek Harness** | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | 提供核心运行时、Agent、工具、Web 工作台和插件机制的上游项目。本项目的 DSH 运行时基于其固定版本集成。 | 上游仓库中的 MIT License 及其目录内声明 |
| **DSH** | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 及其 `@deepseek-ai/dsh-*` 包 | DSH 是 DeepSeek Harness 及其包生态中使用的项目简称和包命名空间。安装器中包含若干 `@deepseek-ai/dsh-*` 运行时依赖。 | 各包随附许可证；当前依赖清单见 [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md) |
| **DSH Desktop** | [anywhere-labs/deepseek-harness-desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) | 提供桌面端封装、Electron 启动流程、系统托盘、浏览器工作台和打包基础。本仓库是在该桌面项目基础上的法律场景集成与品牌包装版本。 | 上游仓库中的 MIT License 及其目录内声明 |
| **Cordis** | [cordiverse/cordis](https://github.com/cordiverse/cordis) | 提供插件化和组合式运行时基础；DeepSeek Harness 与桌面插件使用其生态或兼容的插件机制。 | MIT License，以对应上游文件为准 |
| **claude-for-legal-ZH** | [CSlawyer1985/claude-for-legal-ZH](https://github.com/CSlawyer1985/claude-for-legal-ZH) | 提供中国法场景的法律 Agent、Skills、适配器和参考资料。本项目将其固定版本快照集成到 `dsh-plugin-desktop/bundled/legal-zh/`，并在此基础上配置面向企业用户的四个预置 Agent。 | Apache License 2.0；见 [`dsh-plugin-desktop/bundled/legal-zh/LICENSE`](dsh-plugin-desktop/bundled/legal-zh/LICENSE) 及上游仓库声明 |
| **claude-for-legal** | [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal) | `claude-for-legal-ZH` 的上游参考项目。法律 Skills 目录中的衍生内容、版权说明或 NOTICE 应按照其上游声明一并保留。 | Apache License 2.0；见上游仓库及随附文件 |

## 本项目自有内容

以下内容由本项目维护或进行产品化集成，除非具体文件另有说明：

| 内容 | 路径 | 说明 |
| --- | --- | --- |
| 桌面产品包装与启动流程 | `dsh-plugin-desktop/src/` | Electron 生命周期、启动状态窗口、本机服务探测、浏览器工作台打开、品牌覆盖层和用户体验修复。 |
| 四个预置 Agent 的组合配置 | `dsh-plugin-desktop/bundled/legal-presets/` | 企业总法务、合同审查专家、隐私与 AI 合规专家、争议材料整理的产品化配置；配置中引用的上游能力仍受上游许可证约束。 |
| AI法律顾问品牌资源 | `dsh-plugin-desktop/build/` 及产品可见界面 | 产品图标、中文品牌展示和法律 AI 边界提示。上游名称仅在合规、源代码和归属场景保留。 |
| 发布脚本和项目文档 | 仓库根目录、`docs/` 和 `scripts/` | 本项目的构建、验证、发布和使用说明。 |

本项目自有桌面集成代码的默认许可证见仓库根目录 [`LICENSE`](LICENSE)。但根目录 MIT License **不会自动覆盖**第三方上游代码、法律 Skills、参考资料、依赖包或带有单独许可证的文件；再分发时必须按各文件和各上游项目的适用许可证执行。

## 再分发要求

再分发安装器、源码或修改版本时，应同时保留以下内容：

1. 本项目的许可证、版权声明和 AI 法律边界说明。
2. [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md) 及各依赖包的许可证文本。
3. [`dsh-plugin-desktop/bundled/legal-zh/LICENSE`](dsh-plugin-desktop/bundled/legal-zh/LICENSE) 和 `claude-for-legal-ZH`、`claude-for-legal` 相关的版权、NOTICE 与来源信息。
4. DeepSeek Harness、DSH、DSH Desktop、Cordis 等上游项目的准确归属信息。
5. 不得把 AI法律顾问描述为 DeepSeek、DSH、DSH Desktop、Anthropic、Claude、Cordis 或 `claude-for-legal-ZH` 的官方产品，也不得暗示获得其背书或商标授权。
6. 不得删除或弱化安装器中的法律 AI 边界声明、第三方通知和许可证入口。

## 名称与商标边界

“DeepSeek”“DeepSeek Harness”“DSH”“DSH Desktop”“Anthropic”“Claude”“claude-for-legal-ZH”和其他上游名称属于其各自权利人或项目作者的名称、商标或项目标识。本项目仅在技术来源、兼容性、许可证和归属说明中以必要范围使用这些名称；产品对外品牌为 **AI法律顾问**。

如果未来需要在宣传材料、官网、应用商店或商业合同中使用任何上游商标、Logo 或官方名称，应在发布前单独核对对应的商标政策和授权要求。

## 参考来源

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness Desktop / DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop)
- [Cordis](https://github.com/cordiverse/cordis)
- [claude-for-legal-ZH](https://github.com/CSlawyer1985/claude-for-legal-ZH)
- [claude-for-legal](https://github.com/anthropics/claude-for-legal)
