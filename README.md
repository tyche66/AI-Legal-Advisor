<div align="center">

# AI法律顾问

### 给企业高管、OPC 创业者和业务负责人的中文法律 AI 工作台

**不用装 Node.js，不用配置 Python，不用研究命令行。下载、安装、启动，即可开始整理合同、识别风险、梳理争议材料。**

<p>
  <a href="https://files.manuscdn.com/user_upload_by_module/session_file/310519663749217922/PTixJaHngoCaRVwG.exe"><strong>下载 Windows x64 安装程序</strong></a>
  ·
  <a href="https://github.com/tyche66/AI-Legal-Advisor/actions/runs/32105680053">查看构建记录</a>
  ·
  <a href="docs/user-guide.md">阅读用户指南</a>
</p>

<p>
  <img src="https://img.shields.io/badge/version-2.0.4-13227A?style=flat-square" alt="Version 2.0.4">
  <img src="https://img.shields.io/badge/platform-Windows%20x64-13227A?style=flat-square" alt="Windows x64">
  <img src="https://img.shields.io/badge/agents-4%20legal%20experts-2E7D32?style=flat-square" alt="Four legal expert agents">
  <img src="https://img.shields.io/badge/skills-220-6A1B9A?style=flat-square" alt="220 skills">
  <img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat-square" alt="MIT License">
</p>

</div>

> **AI法律顾问不是律师，也不替代律师意见。** 它用于信息整理、风险提示、合同审阅辅助和争议材料结构化；涉及重大交易、诉讼仲裁、监管申报或其他高风险事项时，请让具备相应资质的律师进行最终审查。

## 你可以用它做什么

AI法律顾问把复杂的法律工作拆成更容易上手的步骤：先明确事实和目标，再识别风险、列出依据、形成待办，最后交给专业人士复核。它特别适合没有专职法务、但每天都要面对合同、员工、供应商、客户、数据和争议问题的企业团队。

| 工作场景 | 适合的使用方式 |
| --- | --- |
| 合同签署前 | 提取关键义务、付款节点、违约责任、自动续期、单方变更和退出机制，形成风险清单与谈判建议。 |
| 企业日常经营 | 从企业总法务视角统筹用工、采购、销售、知识产权、公司治理和供应商管理问题。 |
| 数据与 AI 项目 | 梳理个人信息、数据处理、模型使用、第三方服务和跨境传输相关的合规事项。 |
| 争议发生后 | 将聊天记录、合同、邮件、付款凭证和时间线整理成结构化材料，帮助团队快速看清事实和证据缺口。 |
| 税务与经营安排 | 协助建立问题清单、比较可行路径并提示需要向税务和法律专业人士核验的关键点。 |

## 四个预置专家 Agent

安装后即可直接选择预置专家，不需要自己编写复杂指令。**企业总法务**默认作为入口，其他专家分别处理高频法律工作。

| 专家 | 主要职责 | 典型问题 |
| --- | --- | --- |
| **企业总法务** | 站在企业经营视角统筹法律风险、业务目标和执行优先级。 | “这个合作方案最大的法律风险是什么？我应该先补哪三项？” |
| **合同审查专家** | 逐条识别合同风险，区分红线、重要风险和可接受事项，并输出修改方向。 | “请把这份采购合同审成管理层能看懂的风险表。” |
| **隐私与 AI 合规专家** | 梳理个人信息、数据、算法、模型和第三方工具使用中的合规边界。 | “我们把客户资料交给 AI 工具前，需要做哪些准备？” |
| **争议材料整理** | 组织事实、时间线、证据目录、争议焦点和待核实事项。 | “把这些聊天记录和付款凭证整理成案件材料框架。” |

## Windows 开箱即用

当前 2.0.4 提供 Windows x64 安装程序。双击安装包后按向导完成安装，桌面会生成“AI法律顾问”快捷方式；再次双击快捷方式，应用会显示启动状态并自动打开浏览器工作台。普通用户不需要额外安装 Node.js、Python、Git 或其他开发环境。

### 下载与校验

| 项目 | 信息 |
| --- | --- |
| Windows x64 安装包 | [AI法律顾问-2.0.4-x64-Setup.exe](https://files.manuscdn.com/user_upload_by_module/session_file/310519663749217922/PTixJaHngoCaRVwG.exe) |
| 文件大小 | 226,030,150 bytes |
| SHA-256 | `3a7baf27a47c9e6baf185add0bb642c46161a3576a4697dbb24c5c5a94553337` |
| 构建记录 | [GitHub Actions CI #32105680053](https://github.com/tyche66/AI-Legal-Advisor/actions/runs/32105680053) |
| 对应提交 | [`3fdbd07175`](https://github.com/tyche66/AI-Legal-Advisor/commit/3fdbd071754e6b260f30e66338146274b75b7223) |

在 Windows PowerShell 中可以使用下面的命令校验下载文件：

```powershell
Get-FileHash .\AI法律顾问-2.0.4-x64-Setup.exe -Algorithm SHA256
```

首次启动时，应用会启动本机服务并在服务就绪后打开浏览器。若浏览器刚打开时仍在加载，请等待启动状态窗口完成；应用会对本机服务进行重试探测，不需要手动运行命令。

## 2.0.4 更新内容

2.0.4 是面向实际企业法律工作的强化版本。四个预置法律 Agent 已替换为经过法律专家优化的系统提示词，法律 Skills 从 175 个扩展至 **220 个**，并新增 **税务法律**领域及相应参考资料。版本同时修复了启动等待、浏览器工作台保持运行、法律 AI 边界提示关闭和内置通用 Agent 外显等体验问题。

| 能力 | 2.0.4 状态 |
| --- | --- |
| 企业法律场景 Skills | 已集成，覆盖合同、争议、合规、公司治理、劳动、知识产权、隐私与 AI、税务法律等领域 |
| 专家 Agent | 4 个，企业总法务为默认入口 |
| 通用内置 Agent | 底层兼容性保留，但 Standard、Code、Minimal、Creator 不在用户界面展示 |
| 启动体验 | 启动状态窗口、服务重试探测、浏览器工作台自动打开 |
| 品牌体验 | 用户可见界面统一使用“AI法律顾问” |
| 合规提示 | 每次启动显示一次，可正常关闭 |

## 使用原则

AI法律顾问的输出应当被视为**工作草稿、风险提示和材料整理结果**，而不是最终法律结论。为了得到更可靠的结果，请在提问时同时提供事实背景、目标、适用地区、时间范围、已有文件和希望输出的格式，并明确区分“已确认事实”“推测内容”和“待核实事项”。

不要直接把未经脱敏的身份证件、银行卡信息、客户名单、商业秘密或其他敏感个人信息输入任何 AI 系统。对于重大合同、劳动争议、诉讼仲裁、刑事风险、税务安排和监管事项，必须由专业人士结合完整材料进行最终判断。

## 关于本项目与上游开源项目

AI法律顾问是面向中文企业法律场景的独立社区桌面产品。桌面启动、安装流程、浏览器工作台体验、四个预置法律 Agent 的产品化组合和品牌界面是本项目的主要集成内容；底层运行时、插件组合能力和法律 Skills 则来自不同上游项目或其衍生版本。

为避免来源混淆并降低再分发风险，本项目明确保留以下上游项目的名称、链接、许可证和版权归属：

| 上游项目 | 本项目使用关系 | 主要许可证 / 说明 |
| --- | --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 提供核心 DSH 运行时、Agent、工具、Web 工作台和插件机制。 | MIT License，以对应上游文件为准。 |
| **DSH** | DeepSeek Harness 及其 `@deepseek-ai/dsh-*` 包生态的项目简称与命名空间。 | 各包的许可证以随附文件和第三方通知为准。 |
| [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) | 提供 Electron 桌面封装、启动流程、系统托盘、桌面插件和打包基础；本仓库是在其基础上的法律场景集成版本。 | MIT License，以对应上游文件为准。 |
| [Cordis](https://github.com/cordiverse/cordis) | 提供插件化、组合式运行时基础及相关生态能力。 | MIT License，以对应上游文件为准。 |
| [claude-for-legal-ZH](https://github.com/CSlawyer1985/claude-for-legal-ZH) | 提供中国法法律 Agent、Skills、适配器和参考资料快照，集成于 `dsh-plugin-desktop/bundled/legal-zh/`。 | Apache License 2.0，见 `bundled/legal-zh/LICENSE` 和上游声明。 |
| [claude-for-legal](https://github.com/anthropics/claude-for-legal) | `claude-for-legal-ZH` 所参考或衍生的上游法律工作流项目。 | Apache License 2.0，见上游仓库及其 NOTICE。 |

这些项目仅表示技术来源、兼容性和归属关系，不代表 AI法律顾问获得 DeepSeek、DSH、DSH Desktop、Anthropic、Claude、Cordis 或 `claude-for-legal-ZH` 的官方背书、合作或商标授权。用户可见品牌统一为 **AI法律顾问**；上游名称只在合规、许可证、源代码和归属说明中按必要范围保留。

详细归属表和再分发要求见 [`NOTICE.md`](NOTICE.md) 与 [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md)。再分发前还应阅读根目录 [`LICENSE`](LICENSE)、[`dsh-plugin-desktop/bundled/legal-zh/LICENSE`](dsh-plugin-desktop/bundled/legal-zh/LICENSE) 以及各依赖包随附的许可证文本。

## 从源码运行

本项目主要面向 Windows x64 普通用户提供预打包安装体验。开发者如需从源码运行，请先准备 Node.js 22.23.2、Corepack/Yarn，并初始化固定版本的上游子模块：

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

完整的测试、架构、插件接口和发布流程请参阅：

| 文档 | 用途 |
| --- | --- |
| [用户指南](docs/user-guide.md) | 安装、启动和日常使用 |
| [常见问题](docs/faq.md) | 平台、环境和故障排查 |
| [架构说明](docs/architecture.md) | 应用启动、运行时和打包边界 |
| [插件开发](docs/plugin-development.md) | 开发和集成插件 |
| [桌面插件接口](dsh-plugin-desktop/docs/plugin-services.zh.md) | 了解桌面能力接口 |
| [`dsh-plugin-desktop/README.md`](dsh-plugin-desktop/README.md) | 包级构建与发布说明 |

## 许可证与非商业声明

桌面集成代码遵循仓库中的许可证；法律 Skills、预置 Agent 配置、参考资料和第三方依赖应分别按照对应目录中的许可证、版权声明和第三方通知使用。若某个文件带有额外授权或保留权利声明，以该文件及其上游许可证为准。根目录 MIT License 不会自动替代第三方项目的许可证，也不自动覆盖 `claude-for-legal-ZH`、`claude-for-legal` 或其他上游内容。

本项目当前定位为**非商业社区项目**，不构成法律服务、律师代理或法律意见。再分发时不得删除或弱化版权、许可证、第三方通知、上游归属和免责声明，不得把 AI法律顾问包装成 DeepSeek、DSH、DSH Desktop、Anthropic、Claude、Cordis 或 `claude-for-legal-ZH` 的官方产品，也不得暗示获得其背书或商标授权。完整的名称、商标和再分发风险说明见 [`NOTICE.md`](NOTICE.md)。

## 反馈与贡献

欢迎通过仓库的 [Issues](https://github.com/tyche66/AI-Legal-Advisor/issues) 反馈启动问题、界面问题、法律场景建议和文档改进意见。提交问题时，请不要上传真实客户资料、身份证件、合同原件或其他敏感信息；可以使用脱敏后的最小复现材料。

<div align="center">

**让法律工作更有条理，让业务决策更早看到风险。**

[下载 AI法律顾问](https://files.manuscdn.com/user_upload_by_module/session_file/310519663749217922/PTixJaHngoCaRVwG.exe) · [查看源代码](https://github.com/tyche66/AI-Legal-Advisor)

</div>

## References

[1]: https://github.com/deepseek-ai/deepseek-harness "DeepSeek Harness 官方仓库"
[2]: https://github.com/anywhere-labs/deepseek-harness-desktop "DSH Desktop 上游仓库"
[3]: https://github.com/cordiverse/cordis "Cordis 官方仓库"
[4]: https://github.com/CSlawyer1985/claude-for-legal-ZH "claude-for-legal-ZH 上游仓库"
[5]: https://github.com/anthropics/claude-for-legal "claude-for-legal 上游仓库"
[6]: https://github.com/tyche66/AI-Legal-Advisor/actions/runs/32105680053 "AI法律顾问 2.0.4 Windows 构建记录"
