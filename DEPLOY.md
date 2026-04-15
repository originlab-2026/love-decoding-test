# 部署指南

## 步骤1: 验证 Git 安装

打开 PowerShell，执行：
```powershell
C:\Program Files\Git\bin\git.exe --version
```

如果显示版本号，说明 Git 安装正确。

## 步骤2: 配置 Git 别名（可选但推荐）

为了让 `git` 命令在 PowerShell 中可用，执行：
```powershell
# 为当前会话添加 git 别名
Set-Alias -Name git -Value "C:\Program Files\Git\bin\git.exe"

# 验证
git --version
```

## 步骤3: 进入项目目录

```powershell
cd "d:\局域网共享文件夹\Qoder项目\心理测试 - 爱的解码"
```

## 步骤4: 配置远程仓库

```powershell
# 查看现有远程仓库
git remote -v

# 如果远程仓库不正确，先删除
git remote remove origin
git remote remove gitee

# 添加正确的远程仓库
git remote add origin https://github.com/originlab-2026/love-decoding-test.git
git remote add gitee https://gitee.com/originlab/love-decoding-test.git

# 验证
git remote -v
```

## 步骤5: 推送代码

```powershell
# 添加所有更改
git add .

# 提交
git commit -m "Update: Gitee priority + GitHub fallback deployment config"

# 推送到 GitHub
git push origin main
# 如果失败，尝试: git push origin master

# 推送到 Gitee
git push gitee main
# 如果失败，尝试: git push gitee master
```

## 步骤6: 验证推送

访问以下链接检查最新提交时间：
- GitHub: https://github.com/originlab-2026/love-decoding-test/commits/main
- Gitee: https://gitee.com/originlab/love-decoding-test/commits/main

## 步骤7: 开启 Pages 服务

### GitHub Pages:
1. 访问 https://github.com/originlab-2026/love-decoding-test/settings/pages
2. Source: Deploy from a branch
3. Branch: main 或 master /(root)
4. 点击 Save

### Gitee Pages:
1. 访问 https://gitee.com/originlab/love-decoding-test/pages
2. 选择分支: main 或 master
3. 选择目录: /
4. 点击启动/更新

## 步骤8: 验证部署

等待 1-5 分钟后访问：
- Gitee: https://originlab.gitee.io/love-decoding-test/
- GitHub: https://originlab-2026.github.io/love-decoding-test/

## 故障排除

### 如果 git 命令不可用
每次打开 PowerShell 时执行：
```powershell
Set-Alias -Name git -Value "C:\Program Files\Git\bin\git.exe"
```

### 如果推送失败
1. 检查网络连接
2. 确认仓库地址正确
3. 确认有推送权限

### 如果 Pages 404
1. 确认代码已推送（查看最新提交时间）
2. 确认 Pages 服务已开启
3. 确认仓库是 Public（公开）
