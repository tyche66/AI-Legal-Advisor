# DSH-money-view 预置说明

本目录包含 [tyche66/DSH-money-view](https://github.com/tyche66/DSH-money-view) 的源码快照、预览模板和 MIT 许可文本。集成来源提交为 `6ab2306`，原项目版本为 `0.1.0`。

AI法律顾问 2.0.5 将其中的 DeepSeek 余额 Host 查询逻辑和 sidebar footer 卡片适配为 `dsh-plugin-desktop` 的内置模块：Host 入口为 `dsh-plugin-desktop/deepseek-balance`，Client 入口复用 Desktop 自有 Client bundle。适配后的模块仍保持以下边界：API Key 只通过 Harness credentials 服务解析，不进入浏览器端；只有最近 30 分钟内发生 DeepSeek 调用时才查询余额；查询间隔遵循 API 的 `Cache-Control: max-age`，没有缓存提示时使用默认间隔；每日首次查询建立余额基准。

源码快照保持原始项目结构，仅作为再分发与审计材料，不在构建阶段作为独立 workspace 安装。运行时集成代码位于 `dsh-plugin-desktop/src/deepseek-balance.ts` 与 `dsh-plugin-desktop/src/client/deepseek-balance.tsx`。

## 许可

完整 MIT License 文本见本目录的 [`LICENSE`](LICENSE)，原始项目许可证亦保存在源码快照的 [`source/LICENSE`](source/LICENSE)。
