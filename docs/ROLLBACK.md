# V1.0 稳定回滚点

## 基线定义

- Git 注释标签：`V1.0`
- 远端：`origin`，即 `ssh://git@ssh.github.com:443/xujk555444/ship.git`
- 离线备份：`D:\Projects\ship-backups\V1.0`
- 线上 PWA：`https://xujk555444.github.io/ship/`

`V1.0` 固定当前已验证的 Windows 桌面版、iPhone 多船 PWA、可选合同号和两种文本清空行为。标签和离线备份建立后不得移动、覆盖或复用该名称。

## 备份范围

离线备份包含：

- `source-v1.0.zip`：由 Git 标签直接导出的全部跟踪文件。
- `source/`：同一源码包的解压副本，便于离线检查。
- `dist/ShipmentMessageTool.exe` 与 `dist/auto_unload_exe/AutoUnloadSheet.exe`。
- `preserved-untracked/`：建立稳定点时仍未纳入 Git 的三个卸船文件，仅作保留，不属于标签源码。
- `SNAPSHOT.md` 与 `SHA256SUMS.txt`：提交、范围和逐文件校验值。

以下内容不进入稳定备份，也不得在软件回滚时覆盖：

- 项目根和 `dist/` 中的 `shipment_state.json`，它们是桌面运行数据。
- iPhone Web App 的 `localStorage`，它只保存在手机上。
- `.git/`、`build/`、`__pycache__/` 等仓库元数据或可重建缓存。

## 回滚前核验

在 `D:\Projects\ship` 中运行：

```powershell
git fetch --tags origin
git rev-parse V1.0^{commit}
git status --short --branch
Get-FileHash -Algorithm SHA256 "D:\Projects\ship-backups\V1.0\source-v1.0.zip"
```

将哈希与备份目录中的 `SHA256SUMS.txt` 对比。若标签不存在、哈希不一致或备份文件缺失，停止回滚，不要继续覆盖文件。

## 恢复跟踪源码

先关闭桌面程序和构建进程，并确保当前工作已提交。以下命令会创建安全分支，再把项目跟踪文件恢复为 V1.0，并生成新的回滚提交：

```powershell
cd "D:\Projects\ship"
git switch main
git pull --ff-only origin main
$safetyBranch = "backup-before-v1.0-$(Get-Date -Format yyyyMMdd-HHmmss)"
git branch $safetyBranch
git restore --source V1.0 --staged --worktree -- .
git status --short
git commit -m "Rollback project files to V1.0"
git push origin main
```

推送 `main` 后，GitHub Pages 会重新发布 V1.0 的 `pwa/`。该流程不会删除未跟踪文件，也不会触碰被 Git 忽略的桌面状态 JSON。

## 恢复 Windows 程序

仅在确实需要回退 EXE 时复制备份产物，不要复制或删除状态 JSON：

```powershell
Copy-Item -LiteralPath "D:\Projects\ship-backups\V1.0\dist\ShipmentMessageTool.exe" -Destination "D:\Projects\ship\dist\ShipmentMessageTool.exe"
Copy-Item -LiteralPath "D:\Projects\ship-backups\V1.0\dist\auto_unload_exe\AutoUnloadSheet.exe" -Destination "D:\Projects\ship\dist\auto_unload_exe\AutoUnloadSheet.exe"
```

恢复后重新运行 Python、Node 测试和线上冒烟检查。iPhone 不需要重新添加主屏幕图标；V1.0 使用的状态键仍是 `shipment-pwa-state-v3`。
