# 部署故障排除指南

## 问题：Pages 返回 404

### 第一步：运行诊断脚本

双击运行 `deploy-fix.bat`，查看输出信息。

### 第二步：检查远程仓库配置

在 Git Bash 或 CMD 中执行：
```bash
git remote -v
```

**预期输出：**
```
origin  https://github.com/originlab-2026/love-decoding-test.git (fetch)
origin  https://github.com/originlab-2026/love-decoding-test.git (push)
gitee   https://gitee.com/originlab/love-decoding-test.git (fetch)
gitee   https://gitee.com/originlab/love-decoding-test.git (push)
```

**如果远程仓库不正确，请修复：**
```bash
# 删除错误的远程仓库
git remote remove origin
git remote remove gitee

# 添加正确的远程仓库
git remote add origin https://github.com/originlab-2026/love-decoding-test.git
git remote add gitee https://gitee.com/originlab/love-decoding-test.git
```

### 第三步：确认代码已推送

```bash
git status
```

如果有未提交的更改，请先提交：
```bash
git add .
git commit -m "Update deployment config"
git push origin main
git push gitee main
```

### 第四步：检查 GitHub Pages 设置

1. 访问：https://github.com/originlab-2026/love-decoding-test/settings/pages
2. 检查以下设置：
   - **Source**: Deploy from a branch ✓
   - **Branch**: `main` 或 `master` (根据你的默认分支) ✓
   - **Folder**: `/(root)` ✓
3. 点击 **Save**
4. 等待 1-2 分钟，刷新页面查看是否显示：
   > "Your site is published at https://originlab-2026.github.io/love-decoding-test/"

### 第五步：检查腾讯云托管设置

1. 访问：https://console.cloud.tencent.com/tcb/hosting/index?envId=originlab-7gf19u3w6fdbabd9
2. 检查以下设置：
   - **部署状态**: 显示 "部署成功" ✓
   - **访问路径**: `/originlab` ✓
3. 点击 **"重新部署"** 如果需要更新
4. 等待 1-2 分钟

### 第六步：检查仓库是否为公开

**GitHub:**
1. 访问：https://github.com/originlab-2026/love-decoding-test/settings
2. 滚动到最下方 "Danger Zone"
3. 确认显示 "Change repository visibility" (不是 "Make public")

**Gitee:**
1. 访问：https://gitee.com/originlab/love-decoding-test/settings
2. 检查仓库是否为公开

### 第七步：验证入口文件

确保仓库根目录有 `index.html` 文件：
https://github.com/originlab-2026/love-decoding-test/blob/main/index.html

### 第八步：检查 deploy-config.js

确认 `js/deploy-config.js` 中的 URL 正确：
```javascript
const DEPLOY_CONFIG = {
    gitee: {
        baseUrl: 'https://originlab-7gf19u3w6fdbabd9-1251058142.ap-shanghai.app.tcloudbase.com/originlab/',
        // ...
    },
    github: {
        baseUrl: 'https://originlab-2026.github.io/love-decoding-test/',
        // ...
    }
};
```

### 常见 404 原因

| 原因 | 解决方案 |
|-----|---------|
| 仓库是 Private | 改为 Public |
| Pages 服务未开启 | 在设置中手动开启 |
| 分支选择错误 | 选择正确的分支 (main/master) |
| 部署目录错误 | 选择 `/(root)` |
| 缺少 index.html | 确保文件已推送 |
| 仓库名称不匹配 | 更新 deploy-config.js |

### 验证部署

部署成功后，访问：
- 腾讯云托管: https://originlab-7gf19u3w6fdbabd9-1251058142.ap-shanghai.app.tcloudbase.com/originlab/
- GitHub: https://originlab-2026.github.io/love-decoding-test/

在浏览器控制台验证：
```javascript
detectDeployPlatform()  // 应返回 "gitee" 或 "github"
getCurrentDeployUrl()   // 应返回当前平台 URL
```
