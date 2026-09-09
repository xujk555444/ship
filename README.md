# 报装信息生成工具

用于把船舶报装原始信息整理成固定模板。项目提供 Windows 桌面版和 iPhone PWA，普通报装累计规则一致，状态分别保存在各自设备上；iPhone PWA 额外支持多船、可选合同号、取消扣减与重复确认。

## 可用入口

| 入口 | 用途 | 状态保存 |
|---|---|---|
| `dist/ShipmentMessageTool.exe` | Windows 桌面使用 | EXE 同目录的 `shipment_state.json` |
| `run_shipment_tool.bat` | 从源码启动桌面版 | 项目根的 `shipment_state.json` |
| [iPhone PWA](https://xujk555444.github.io/ship/) | 手机同时管理多条在运大船 | iPhone Web App 的 `localStorage` |

## iPhone 使用

1. 用 Safari 打开 [https://xujk555444.github.io/ship/](https://xujk555444.github.io/ship/)。
2. 选择“分享 -> 添加到主屏幕”，并启用“作为 Web App 打开”。
3. 点“新增大船”，填写大船号、流向和可选合同号。
4. 顶部每张卡片代表一条独立大船；切换卡片时，合同号、累计、原始信息和生成结果分别保存。
5. 原始信息旁的“清空文本”只清原文；“清空当前船文本”会同时清除原文和生成结果。
6. “标记运完”确认后只删除当前大船。

## 业务规则

- 手机 PWA：原始信息含“取消计划”或“计划取消”时，点击生成扣减当前大船的报装吨数，并生成取消模板。同一大船再次取消相同小船名和吨数时需确认；清空文本或重开 App 不清除记录。超额扣减和大船号不匹配会被阻止。上线前的取消无法追溯判重。

- 流向只使用当前状态中的值，忽略原始文本里的流向。
- 独立连续 11 位数字识别为电话。
- 支持 `报装4000吨`、`报装5050`、`计划装3000吨`、`装煤2800吨`。
- `@船名 ... 装煤xxxx吨` 识别为次日船期；`船期:13号` 识别为本月 13 日；`吉船` 识别为当天。
- 第一船累计等于报装数，后续船次在当前大船累计上递增。
- 累计超过 80000 吨时提醒是否运完。
- 生成结果可编辑，复制成功时不弹提示框。
- iPhone PWA 填写合同号时在大船号后生成合同号行；未填写时保持原格式。

## 开发与验证

本机正式项目目录为 `D:\Projects\ship`。脚本使用相对项目路径，不应重新写死盘符。

```powershell
cd "D:\Projects\ship"
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
node --test tests\test_shipment_core.mjs tests\test_shipment_store.mjs
```

构建 Windows 桌面 EXE：

```powershell
python -m pip install pyinstaller
.\build_shipment_tool.bat
```

更多信息：

- [部署说明](README_DEPLOY.md)
- [架构说明](docs/architecture.md)
- [运维手册](docs/operator-runbook.md)
- [交接状态](docs/handoff.md)
- [V1.0 回滚说明](docs/ROLLBACK.md)
