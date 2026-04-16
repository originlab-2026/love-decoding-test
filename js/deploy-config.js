/**
 * 部署配置模块
 * 统一管理 GitHub Pages 和 Gitee Pages 双平台部署配置
 * 实现 Gitee 优先 + GitHub Fallback 的访问策略
 */

// 项目部署配置 - 双平台URL
const DEPLOY_CONFIG = {
    // 腾讯云托管配置（优先）
    gitee: {
        baseUrl: 'https://originlab-7gf19u3w6fdbabd9-1251058142.ap-shanghai.app.tcloudbase.com/originlab/',
        hostname: 'originlab-7gf19u3w6fdbabd9-1251058142.ap-shanghai.app.tcloudbase.com',
        faviconPath: 'favicon.ico'
    },
    // GitHub Pages 配置（Fallback）
    github: {
        baseUrl: 'https://originlab-2026.github.io/love-decoding-test/',
        hostname: 'originlab-2026.github.io',
        faviconPath: 'favicon.ico'
    },
    // 其他项目链接配置
    external: {
        // 未来伴侣测试
        futurePartner: {
            gitee: 'https://originlab-7gf19u3w6fdbabd9-1251058142.ap-shanghai.app.tcloudbase.com/future-partner/',
            github: 'https://originlab-2026.github.io/future-partner-test/'
        }
    }
};

/**
 * 检测当前部署平台
 * @returns {string} 'gitee' | 'github' | 'vercel' | 'localhost' | 'unknown'
 */
function detectDeployPlatform() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('tcloudbase.com')) {
        return 'gitee';
    }
    if (hostname.includes('gitee.io')) {
        return 'gitee';
    }
    if (hostname.includes('github.io')) {
        return 'github';
    }
    if (hostname.includes('vercel.app')) {
        return 'vercel';
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'localhost';
    }
    return 'unknown';
}

/**
 * 获取当前平台的部署URL
 * @returns {string} 当前平台的完整URL
 */
function getCurrentDeployUrl() {
    const platform = detectDeployPlatform();
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    switch (platform) {
        case 'gitee':
            // 腾讯云托管: originlab-xxx.ap-shanghai.app.tcloudbase.com/originlab
            const giteeParts = pathname.split('/').filter(p => p);
            if (giteeParts.length > 0) {
                return `https://${hostname}/${giteeParts[0]}/`;
            }
            return `https://${hostname}/`;
            
        case 'github':
            // GitHub Pages: originlab-2026.github.io/repo-name
            const githubParts = pathname.split('/').filter(p => p);
            if (githubParts.length > 0) {
                return `https://originlab-2026.github.io/${githubParts[0]}/`;
            }
            return 'https://originlab-2026.github.io/';
            
        case 'vercel':
            return `https://${hostname}/`;
            
        case 'localhost':
        default:
            return window.location.origin + '/';
    }
}

/**
 * 获取Gitee优先的URL（用于二维码生成等）
 * 如果当前在Gitee环境，使用当前URL；否则使用配置的Gitee URL
 * @returns {string} Gitee优先的URL
 */
function getGiteePriorityUrl() {
    const platform = detectDeployPlatform();
    
    // 如果当前就在Gitee环境，直接使用当前URL
    if (platform === 'gitee') {
        return getCurrentDeployUrl();
    }
    
    // 否则返回配置的Gitee URL
    return DEPLOY_CONFIG.gitee.baseUrl;
}

/**
 * 检测Gitee是否可访问（用于Fallback机制）
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>} Gitee是否可访问
 */
async function checkGiteeAvailable(timeout = 3000) {
    return new Promise((resolve) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            resolve(false);
        }, timeout);
        
        // 尝试加载Gitee的favicon
        const img = new Image();
        let resolved = false;
        
        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(true);
            }
        };
        
        img.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(false);
            }
        };
        
        // 添加随机参数避免缓存
        img.src = DEPLOY_CONFIG.gitee.baseUrl + DEPLOY_CONFIG.gitee.faviconPath + '?' + Date.now();
    });
}

/**
 * 获取带有Fallback的URL
 * 优先返回Gitee URL，如果Gitee不可用则返回GitHub URL
 * @returns {Promise<string>} 可用的URL
 */
async function getFallbackUrl() {
    const giteeAvailable = await checkGiteeAvailable();
    return giteeAvailable ? DEPLOY_CONFIG.gitee.baseUrl : DEPLOY_CONFIG.github.baseUrl;
}

/**
 * 跳转到外部链接（带Fallback机制）
 * 优先跳转到Gitee，如果检测失败则自动降级到GitHub
 * @param {string} target - 目标项目标识，如 'futurePartner'
 * @param {HTMLElement} triggerElement - 触发跳转的元素（用于显示加载状态）
 */
async function navigateWithFallback(target, triggerElement = null) {
    const urls = DEPLOY_CONFIG.external[target];
    if (!urls) {
        console.error('未知的外部链接目标:', target);
        return;
    }
    
    // 显示加载状态
    if (triggerElement) {
        triggerElement.style.opacity = '0.7';
        triggerElement.style.pointerEvents = 'none';
    }
    
    // 检测Gitee是否可用
    const giteeAvailable = await checkGiteeAvailable();
    
    // 恢复元素状态
    if (triggerElement) {
        triggerElement.style.opacity = '1';
        triggerElement.style.pointerEvents = 'auto';
    }
    
    // 跳转到可用平台
    const targetUrl = giteeAvailable ? urls.gitee : urls.github;
    window.location.href = targetUrl;
}

/**
 * 生成二维码配置
 * 根据当前平台动态生成二维码URL配置
 * @returns {Object} 二维码配置对象
 */
function getQRCodeConfig() {
    const platform = detectDeployPlatform();
    
    // 默认使用Gitee优先策略
    let qrUrl = DEPLOY_CONFIG.gitee.baseUrl;
    let fallbackUrl = DEPLOY_CONFIG.github.baseUrl;
    
    // 如果当前在GitHub环境，检查是否需要使用GitHub URL
    if (platform === 'github') {
        // 异步检测Gitee可用性，但同步返回默认配置
        // 实际使用时可以通过 checkGiteeAvailable 动态调整
        qrUrl = DEPLOY_CONFIG.github.baseUrl;
        fallbackUrl = DEPLOY_CONFIG.gitee.baseUrl;
    } else if (platform === 'gitee') {
        qrUrl = getCurrentDeployUrl();
        fallbackUrl = DEPLOY_CONFIG.github.baseUrl;
    }
    
    return {
        url: qrUrl,
        fallbackUrl: fallbackUrl,
        pdfSize: 50,      // PDF页眉二维码尺寸(px)
        posterSize: 80,   // 海报二维码尺寸(px)
        platform: platform
    };
}

/**
 * 更新二维码显示（带双平台提示）
 * 在二维码下方显示当前平台信息
 * @param {string} containerId - 二维码容器ID
 * @param {string} url - 二维码URL
 * @param {number} size - 二维码尺寸
 */
async function generatePlatformAwareQRCode(containerId, url, size = 80) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    // 清空容器
    container.innerHTML = '';
    
    // 获取平台配置
    const config = getQRCodeConfig();
    const useUrl = url || config.url;
    
    // 检查 QRCode 库
    if (typeof QRCode === 'undefined') {
        console.error('QRCode 库未加载');
        return null;
    }
    
    try {
        // 创建二维码容器
        const qrWrapper = document.createElement('div');
        qrWrapper.style.display = 'inline-block';
        qrWrapper.style.background = 'white';
        qrWrapper.style.padding = '8px';
        qrWrapper.style.borderRadius = '8px';
        qrWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        
        // 生成二维码
        const qrDiv = document.createElement('div');
        qrWrapper.appendChild(qrDiv);
        
        new QRCode(qrDiv, {
            text: useUrl,
            width: size,
            height: size,
            colorDark: '#333333',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        
        container.appendChild(qrWrapper);
        
        return useUrl;
    } catch (err) {
        console.error('二维码生成失败:', err);
        return null;
    }
}

/**
 * 生成海报二维码（异步，返回DataURL）
 * @param {string} url - 二维码URL
 * @param {number} size - 二维码尺寸
 * @returns {Promise<string|null>} 二维码DataURL
 */
async function generateQRCodeDataURL(url, size = 80) {
    return new Promise((resolve) => {
        try {
            if (typeof QRCode === 'undefined') {
                console.error('QRCode 库未加载');
                resolve(null);
                return;
            }
            
            // 创建临时容器
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);
            
            // 生成二维码
            new QRCode(tempDiv, {
                text: url,
                width: size,
                height: size,
                colorDark: '#333333',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
            
            // 等待生成完成
            setTimeout(() => {
                const img = tempDiv.querySelector('img');
                if (img && img.src && img.src.startsWith('data:')) {
                    document.body.removeChild(tempDiv);
                    resolve(img.src);
                    return;
                }
                
                const canvas = tempDiv.querySelector('canvas');
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/png');
                    document.body.removeChild(tempDiv);
                    resolve(dataUrl);
                    return;
                }
                
                document.body.removeChild(tempDiv);
                resolve(null);
            }, 100);
        } catch (err) {
            console.error('二维码生成失败:', err);
            resolve(null);
        }
    });
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEPLOY_CONFIG,
        detectDeployPlatform,
        getCurrentDeployUrl,
        getGiteePriorityUrl,
        checkGiteeAvailable,
        getFallbackUrl,
        navigateWithFallback,
        getQRCodeConfig,
        generatePlatformAwareQRCode,
        generateQRCodeDataURL
    };
}
