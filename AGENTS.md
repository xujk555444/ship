# Project Guide

## Project Facts

- 本机正式项目目录是 `D:\Projects\ship`；不要再使用已清理的 C 盘旧路径。
- Windows 桌面入口是 `app.py`，业务规则集中在 `shipment_tool.py`。
- 手机入口是静态 PWA：`pwa/index.html`、`pwa/static/app.js`、`pwa/static/shipment-core.js`、`pwa/static/shipment-store.js`。
- `web_app.py` 是保留的旧 FastAPI 入口；GitHub Pages 不依赖 Python 后端或 Render。
- 桌面版与 PWA 的核心解析和累计规则一致，但状态独立，不做跨设备同步；可选合同号仅 PWA 支持。

## Invariants

- 取消扣减仅 PWA 支持：识别“取消计划/计划取消”，从当前大船扣减；每船 `cancellation_keys` 保存相同小船名与吨数的取消记录，重复操作需确认。累计、结果和记录一起成功保存后才更新界面。

- 原始文本中的流向必须忽略，输出只使用当前选中状态的流向。
- 桌面版维持单大船状态；PWA 支持多条大船，每条船独立保存合同号、累计和草稿。
- 第一船累计等于本次报装数，后续船次累加；超过 80000 吨才触发运完提醒。
- PWA 状态结构为 `shipment-pwa-state-v3`；不要无意恢复 v2 数据迁移。
- 复制结果保持静默，生成结果保持可编辑。

## Verification

业务改动至少运行：

```powershell
python -m unittest discover -s tests -v
node --test tests\test_shipment_core.mjs tests\test_shipment_store.mjs
```

PWA 资源或 Service Worker 改动还应启动静态服务器，检查首页、manifest、Service Worker 和所有静态模块返回 200。

`.github/workflows/blank.yml` 当前只是示例 CI，只执行 `echo`；GitHub 上的绿色 `CI` 不能替代上述本地测试。

## Deployment And Paths

- `main` 推送后由 `.github/workflows/pages.yml` 发布 `pwa/`。
- 线上地址是 `https://xujk555444.github.io/ship/`。
- Git 远端使用 `ssh://git@ssh.github.com:443/xujk555444/ship.git`。
- `V1.0` 是稳定回滚标签，离线只读基线位于 `D:\Projects\ship-backups\V1.0`；恢复前必须阅读 `docs/ROLLBACK.md`。
- 构建与启动脚本必须基于 `%~dp0` 或 `$PSScriptRoot`，避免绑定本机项目绝对路径。
- `build/`、`dist/`、`*.spec`、`shipment_state.json` 和 `*.xlsx` 被 Git 忽略；不要用清理命令误删用户运行数据或已构建 EXE。
