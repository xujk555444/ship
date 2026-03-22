# GitHub Pages 部署

这个项目现在包含两套入口：

- Windows 桌面版：`PySide6`
- 手机网页版/PWA：纯前端静态版，可直接部署到 GitHub Pages

## GitHub Pages 会发布什么

GitHub Pages 只发布这个目录：

- `pwa/`

它不依赖 Render，不依赖 Python 后端，也不需要绑卡。

## 已经准备好的文件

- `.github/workflows/pages.yml`
- `pwa/index.html`
- `pwa/manifest.webmanifest`
- `pwa/service-worker.js`
- `pwa/static/app.js`
- `pwa/static/shipment-core.js`

## 启用步骤

1. 把代码 push 到 GitHub 仓库
2. 打开仓库 `Settings -> Pages`
3. 如果页面提示来源，选择 `GitHub Actions`
4. 等待 `Actions` 里的 `Deploy GitHub Pages` 工作流跑完

## 访问地址

如果仓库地址是：

```text
https://github.com/xujk555444/ship
```

发布后的网址通常是：

```text
https://xujk555444.github.io/ship/
```

## iPhone 使用

1. 用 Safari 打开上面的地址
2. 点分享
3. 选择“添加到主屏幕”

## 当前规则

- 流向只读取上方当前状态
- 原始文本中的流向全部忽略
- 第一船累积 = 报装数
- 后续船次累积递增
- 超过 `80000` 吨提醒是否运完
- 独立 `11` 位手机号自动识别为电话
