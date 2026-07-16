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

`git fsck` 中已知的 dangling tree 是未引用对象，不代表仓库损坏；命令退出码为 0 才算通过。纯仓库 Python 基线为 21 条；本机工作树包含 3 条未跟踪卸船测试时为 24 条。Node 基线为 18 条。

`.github/workflows/blank.yml` 当前是 GitHub 示例工作流，只执行 `echo`，不会运行 Python 或 Node 测试。发布前必须执行上面的本地测试，不能只依据 GitHub 的绿色 `CI` 状态。

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
$pageResponse = Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/?check=1"
$pageResponse.StatusCode
$pageResponse.Content -match 'id="contractInput"'

$coreResponse = Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/static/shipment-core.js?check=1"
$coreResponse.Content -match "合同号："

$workerResponse = Invoke-WebRequest -UseBasicParsing "https://xujk555444.github.io/ship/service-worker.js?check=1"
$workerResponse.Content -match "shipment-tool-static-v4"
```

预期状态码为 200，三个匹配结果均为 `True`。

## V1.0 稳定回滚点

- Git 注释标签：`V1.0`，对应提交 `b46f26b`。
- 离线只读基线：`D:\Projects\ship-backups\V1.0`。
- 完整恢复范围和数据保护步骤：`docs/ROLLBACK.md`。

日常只读核验：

```powershell
git rev-parse "V1.0^{commit}"
git ls-remote --tags origin "refs/tags/V1.0" "refs/tags/V1.0^{}"
Get-FileHash -Algorithm SHA256 "D:\Projects\ship-backups\V1.0\source-v1.0.zip"
```

预期标签提交为 `b46f26b49d827d795d96ed2cdaf1b36e397c13e1`，源码包 SHA-256 为 `BFA117072011847700ED9A0122494A8B50571E5A57C84D3DFBE2DD18FFA36004`。不要修改、覆盖或重新生成 V1.0 备份；真正回滚前必须阅读 `docs/ROLLBACK.md`。

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
