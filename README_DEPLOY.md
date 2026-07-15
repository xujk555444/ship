# GitHub Pages 部署

手机网页版是纯前端静态 PWA，GitHub Pages 只发布 `pwa/`。它不依赖 Render、FastAPI 或电脑持续开机。

## 自动部署

`.github/workflows/pages.yml` 监听 `main`，执行以下流程：

1. checkout 仓库
2. 配置 GitHub Pages
3. 上传 `pwa/` artifact
4. 部署到 GitHub Pages

线上地址：

```text
https://xujk555444.github.io/ship/
```

发布命令：

```powershell
cd "D:\Projects\ship"
git status --short --branch
git add <本次明确修改的文件>
git commit -m "<提交说明>"
git push origin main
```

首次启用时，仓库 `Settings -> Pages` 的来源应选择 `GitHub Actions`。

## 发布内容

- `pwa/index.html`
- `pwa/manifest.webmanifest`
- `pwa/service-worker.js`
- `pwa/icon.svg`
- `pwa/static/app.js`
- `pwa/static/shipment-core.js`
- `pwa/static/shipment-store.js`
- `pwa/static/styles.css`

Service Worker 当前缓存名是 `shipment-tool-static-v3`。新增或删除静态资源时必须同步更新缓存清单和缓存名。

## iPhone 使用与更新

1. Safari 打开线上地址。
2. 选择“分享 -> 添加到主屏幕”。
3. 点“新增大船”建立独立船卡，点卡片切换当前大船。

电脑迁盘、关机或重启不会影响线上 PWA。发布新版本后无需重装；若仍显示旧版，从任务切换器彻底关闭 Web App 后重新打开。

## 发布后检查

```powershell
$home = Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/?check=1"
$home.StatusCode
$home.Content -match "在运大船"

(Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/service-worker.js?check=1").Content
(Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/static/shipment-store.js?check=1").StatusCode
```

预期首页返回 200、包含“在运大船”，状态模块返回 200，Service Worker 显示当前缓存版本。

## 当前业务规则

- 流向只读取当前选中大船状态，忽略原始文本流向。
- 每条 PWA 大船分别保存累计、原始输入和生成结果。
- 第一船累计等于报装数，后续船次递增。
- 累计超过 80000 吨时提醒是否运完。
- 独立 11 位手机号自动识别为电话。
