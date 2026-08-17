# 法助桌面（LegalDesk）

法助桌面是一个面向企业高管、创业老板和业务负责人的中国法 AI 法律工作台。它将 DeepSeek Harness、桌面启动器和 `claude-for-legal-ZH` 的中国法律工作流组合成一个可安装的 Windows 应用。

## Windows 用户体验

用户只需要双击 `LegalDesk-<版本>-x64-Setup.exe`，按安装向导完成安装。安装程序会创建桌面快捷方式和开始菜单入口，不要求预先安装 Node.js、Python、pnpm、Git 或任何开发环境。

首次双击“法助桌面”后，应用会在本机启动受限的 loopback Web 服务，并自动打开系统默认浏览器页面。浏览器页面是实际使用界面；桌面进程负责保持本地服务、配置、profile 和托盘入口。再次点击托盘中的“打开法助桌面”会重新打开浏览器页面。

首次使用时，用户只需在页面的模型设置中填写自己可用的模型服务配置。API key 不写入仓库、不随安装包分发，也不会由本项目代为提供。没有开启外部法律检索时，时效性法律内容会被标注为“需人工核验”。

## 预置专家 Agent

安装包默认提供四个 system preset：

| 专家 | 适合场景 | 输出重点 |
| --- | --- | --- |
| 企业总法务 | 企业经营决策、重大合同、综合风险 | 决策备忘录、风险分层、行动清单 |
| 合同审查专家 | 采购、销售、SaaS、NDA、供应商合同 | 条款问题、谈判优先级、修改建议 |
| 隐私与 AI 合规专家 | 个人信息、跨境、AI 产品上线 | 数据清单、合规缺口、整改路线图 |
| 争议材料整理 | 纠纷、仲裁、诉讼材料整理 | 时间线、证据矩阵、争点和律师交接包 |

“企业总法务”是新会话的默认专家。用户可以在 DSH 的专家 Agent 选择界面切换其他专家；切换只影响新建会话，不会改变已经产生内容的历史会话。

## 重要边界

法助桌面的输出是 AI 辅助生成的法律工作草稿，不是律师意见，不构成诉讼代理或辩护，不保证案件结果。法规、案例、期限、监管动态和具体案件结论必须由具备相应资质的专业人士复核后再使用。产品不默认开启外部法律数据库，不默认发送材料到第三方服务，也不自动提交、发送或覆盖原始文件。

本项目是独立社区发行版，不是 DeepSeek、Anthropic、Claude 或任何律师事务所的官方产品，也不代表这些主体提供背书。

## Linux 开发与构建

```bash
corepack yarn install --immutable
corepack yarn check
corepack yarn workspace dsh-plugin-desktop package:dir
```

`package:dir` 用于在 Linux 上生成当前平台的未压缩目录包和运行时闭包检查。Linux 不负责生成 Windows NSIS 安装器；Windows 安装器由 GitHub Actions 在 `windows-latest` runner 上执行 `yarn workspace dsh-plugin-desktop dist:win`，成功后上传为 `legaldesk-windows-installer` 构件。

## 开源与第三方声明

本发行版同时包含 MIT 和 Apache-2.0 许可的上游代码及法律工作流。请随发行包一并查看 `dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`、内置法律仓库的 `LICENSE` 和源码地址。修改上游文件时应保留原始版权、许可证和必要的 NOTICE 信息。
