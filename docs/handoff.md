# 项目交接状态

状态日期：2026-09-08

## 已具备能力

- 手机 PWA 新增“取消计划/计划取消”扣减与重复确认；现有 v3 数据和合同号兼容保留，取消记录仅从本次升级后开始。

- Windows PySide6 桌面版可从源码运行，也可使用 `dist/ShipmentMessageTool.exe`。
- iPhone 静态 PWA 已部署到 `https://xujk555444.github.io/ship/`。
- PWA 支持一个主屏幕图标管理多条在运大船，各船累计、原文和结果独立保存。
- PWA 每条大船支持可选合同号；合同号为空时生成结果保持旧格式。
- GitHub Pages 在 `main` 推送后自动发布 `pwa/`。
- `V1.0` 是当前稳定回滚标签；离线基线位于 `D:\Projects\ship-backups\V1.0`，恢复流程见 `docs/ROLLBACK.md`。
- 本机正式项目已迁移到 `D:\Projects\ship`，桌面快捷方式已切换到 D 盘。
- C 盘旧项目内容已清理，不应再作为工作目录。

## 验证基线

- Python：纯仓库基线 21 条通过；本机工作树包含 3 条未跟踪卸船测试时为 24 条通过。
- Node：`node --test tests\test_shipment_core.mjs tests\test_shipment_store.mjs`，23 条通过；另用浏览器检查重复确认、保存失败重试与离线重开。
- Git：本地与远端稳定标签 `V1.0` 均固定在提交 `b46f26b`；取消功能位于后续提交，不移动该标签。
- 线上：主页及静态模块返回 200，合同号字段、合同号模板和 `shipment-tool-static-v5` 均已发布。
- D 盘桌面 EXE 已启动验证，卸船 EXE 已在 D 盘重新构建。

## 已知边界

- 桌面版仍是单大船状态；多船管理和合同号只在手机 PWA。
- 桌面与手机状态独立，没有账号、云同步或后端数据库。
- `web_app.py`、`render.yaml` 和 `requirements-web.txt` 是旧后端方案，Pages 发布不使用。
- `.github/workflows/blank.yml` 是只执行 `echo` 的示例 CI，不提供自动测试保障。
- Service Worker 使用 cache-first；发布后已打开的 iPhone Web App 可能需要彻底关闭后重开。
- 工作区存在三个未跟踪文件：`build_auto_unload_exe.bat`、`build_auto_unload_exe.ps1`、`tests/test_unload_processor.py`。它们已随 D 盘项目保留，不应在无审查时删除或批量提交。
- V1.0 软件回滚不恢复桌面 `shipment_state.json`、iPhone `localStorage`、`.git/` 或可重建的 `build/`。

## 后续修改原则

- 改共享解析或累计规则时同步修改 Python 与 JavaScript 实现，并更新两套测试；PWA 专属能力只改 JavaScript 和 Node 测试。
- 改 PWA 静态资源时更新 Service Worker 缓存名和资源清单。
- 发布前明确暂存文件，不使用会吞入未跟踪文件的批量暂存命令。
