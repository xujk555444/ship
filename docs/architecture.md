# 架构说明

## 总览

项目有两个正式客户端和一个保留的旧 Web 入口：

```text
Windows / PySide6                     iPhone / Static PWA
app.py                                pwa/index.html
  -> shipment_tool.py                   -> static/app.js
  -> shipment_state.json                -> shipment-core.js
                                        -> shipment-store.js
                                        -> localStorage v3

Legacy: web_app.py -> FastAPI -> pwa/（GitHub Pages 不使用）
```

桌面版与 PWA 不共享运行时或存储，普通报装累计规则一致；多船管理、可选合同号、取消扣减与重复确认是 PWA 专属能力。完整模板中大小船号的识别修复仅在 JavaScript 实现。

## Windows 桌面版

- `app.py` 负责 PySide6 界面、可编辑输出、复制和运完确认。
- `shipment_tool.py` 负责解析、模板生成、累计更新和 JSON 状态读写。
- 从源码运行时，状态写入项目根 `shipment_state.json`。
- 从 PyInstaller EXE 运行时，状态写入 EXE 同目录的 `shipment_state.json`。

桌面版只维护一条当前大船状态：`big_ship_no`、`flow`、`current_total`。

## iPhone PWA

- `pwa/static/app.js` 负责 DOM 事件、卡片切换、自动保存、复制和运完删除。
- `pwa/static/shipment-core.js` 负责与 Python 版对应的解析、累计规则，以及 PWA 专属的可选合同号输出。
- `pwa/static/shipment-store.js` 负责多船状态的创建、选择、更新、删除和归一化。
- `pwa/service-worker.js` 缓存静态资源，当前缓存名为 `shipment-tool-static-v5`。

本地状态键为 `shipment-pwa-state-v3`：

```text
{
  version: 3,
  activeShipId,
  ships: [
    { id, big_ship_no, contract_no, flow, current_total, raw_text, output_text, cancellation_keys }
  ]
}
```

每条大船的合同号、累计、原始输入和生成结果彼此隔离。现有 v3 数据缺少合同号时按空值读取；旧的 `shipment-pwa-state-v2` 在初始化时删除，不迁移为多船数据。

## 业务数据流

PWA 识别“取消计划/计划取消”后从当前累计扣减报装吨数，忽略原文旧累计。`cancellation_keys` 默认空数组，以 JSON 编码的 `[规范化小船名, 整数吨数]` 判重，重复需确认；清空文本及普通报装均保留记录，删除大船才移除。旧 v3 数据兼容读取。扣减前校验大船号和余额，累计、结果、记录一次写入 localStorage，失败不提交界面状态。取消不触发运完提醒。

1. 用户选择大船，并填写该船的大船号、流向与可选合同号。
2. 解析器从原始信息提取小船号、报装吨数、电话和船期；原始流向不进入解析结果。
3. 生成器用当前大船状态构建固定模板；合同号非空时插入合同号行，并更新该船累计。
4. 状态立即保存到当前客户端本地。
5. 累计超过 80000 吨时提示运完；确认后桌面版清空状态，PWA 删除当前船卡。

## 部署边界

GitHub Actions 只上传 `pwa/`，因此线上手机端不依赖电脑是否开机，也不依赖本地项目位于哪个盘。`render.yaml`、`web_app.py` 和 `requirements-web.txt` 仅为旧后端方案保留。
