# 项目交接状态

状态日期：2026-07-16

## 已具备能力

- Windows PySide6 桌面版可从源码运行，也可使用 `dist/ShipmentMessageTool.exe`。
- iPhone 静态 PWA 已部署到 `https://xujk555444.github.io/ship/`。
- PWA 支持一个主屏幕图标管理多条在运大船，各船累计、原文和结果独立保存。
- PWA 每条大船支持可选合同号；合同号为空时生成结果保持旧格式。
- GitHub Pages 在 `main` 推送后自动发布 `pwa/`。
- 本机正式项目已迁移到 `D:\Projects\ship`，桌面快捷方式已切换到 D 盘。
- C 盘旧项目内容已清理，不应再作为工作目录。

## 验证基线

- Python：纯仓库基线 21 条通过；本机工作树包含 3 条未跟踪卸船测试时为 24 条通过。
- Node：`node --test tests\test_shipment_core.mjs tests\test_shipment_store.mjs`，18 条通过。
- Git：`main` 与 `origin/main` 对齐；功能提交 `7ebbf4c` 已推送。
- 线上：主页及静态模块返回 200，合同号字段、合同号模板和 `shipment-tool-static-v4` 均已发布。
- D 盘桌面 EXE 已启动验证，卸船 EXE 已在 D 盘重新构建。

## 已知边界

- 桌面版仍是单大船状态；多船管理和合同号只在手机 PWA。
- 桌面与手机状态独立，没有账号、云同步或后端数据库。
- `web_app.py`、`render.yaml` 和 `requirements-web.txt` 是旧后端方案，Pages 发布不使用。
- Service Worker 使用 cache-first；发布后已打开的 iPhone Web App 可能需要彻底关闭后重开。
- 工作区存在三个未跟踪文件：`build_auto_unload_exe.bat`、`build_auto_unload_exe.ps1`、`tests/test_unload_processor.py`。它们已随 D 盘项目保留，不应在无审查时删除或批量提交。

## 后续修改原则

- 改共享解析或累计规则时同步修改 Python 与 JavaScript 实现，并更新两套测试；PWA 专属能力只改 JavaScript 和 Node 测试。
- 改 PWA 静态资源时更新 Service Worker 缓存名和资源清单。
- 发布前明确暂存文件，不使用会吞入未跟踪文件的批量暂存命令。
