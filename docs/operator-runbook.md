# 运维手册

## 本机位置与入口

正式项目目录：

```text
D:\Projects\ship
```

桌面快捷方式应指向：

```text
D:\Projects\ship\dist\ShipmentMessageTool.exe
```

从源码启动桌面版：

```powershell
cd "D:\Projects\ship"
.\run_shipment_tool.bat
```

构建脚本使用 PyInstaller；新环境需先安装：

```powershell
python -m pip install pyinstaller
```

## 验证命令

```powershell
cd "D:\Projects\ship"
git status --short --branch
git fsck --full
python -m unittest discover -s tests -v
node --test tests\test_shipment_core.mjs tests\test_shipment_store.mjs
```

`git fsck` 中已知的 dangling tree 是未引用对象，不代表仓库损坏；命令退出码为 0 才算通过。纯仓库 Python 基线为 21 条；本机工作树包含 3 条未跟踪卸船测试时为 24 条。

本地检查静态 PWA：

```powershell
python -m http.server 8765 --directory pwa
```

另开 PowerShell 请求：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/manifest.webmanifest
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/service-worker.js
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/static/shipment-store.js
```

## GitHub Pages 发布

`.github/workflows/pages.yml` 监听 `main`，上传 `pwa/` 并部署到：

```text
https://xujk555444.github.io/ship/
```

发布流程：

```powershell
git status --short --branch
git add <明确的文件列表>
git commit -m "<说明>"
git push origin main
```

不要使用 `git add .`，避免把现有未跟踪的卸船构建脚本和测试意外纳入提交。

线上冒烟：

```powershell
$r = Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/?check=1"
$r.StatusCode
$r.Content -match "在运大船"
```

## iPhone 安装与更新

- Safari 打开线上地址，选择“添加到主屏幕”。
- 已安装用户不需要因电脑迁盘或网页更新重新安装。
- 发布后仍看到旧界面时，先从任务切换器彻底关闭 Web App，再重新打开。
- 若仍未更新，用 Safari 打开线上地址刷新一次，再重新打开主屏幕图标。
- 删除 Web App、清理 Safari 网站数据或更换手机可能清除 PWA 本地状态。

## 常见故障

### GitHub Pages 404

1. 确认 `.github/workflows/pages.yml` 监听 `main`。
2. 确认仓库 `Settings -> Pages` 的来源为 GitHub Actions。
3. 检查 `Deploy GitHub Pages` workflow 是否成功。

### Git HTTPS 无法连接

当前远端使用 GitHub SSH over 443。验证：

```powershell
ssh -T -p 443 git@ssh.github.com
git remote -v
```

预期远端为 `ssh://git@ssh.github.com:443/xujk555444/ship.git`。

### 桌面状态不见了

- EXE 版读取 `dist\shipment_state.json`，必须让 EXE 与该文件保持在同一目录。
- 源码版读取项目根 `shipment_state.json`，两份状态互相独立。
- 不要从 C 盘旧路径启动；正式位置是 `D:\Projects\ship`。
