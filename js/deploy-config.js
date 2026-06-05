/**
 * 多平台部署配置与智能 Fallback
 * Cloudflare Pages 优先，GitHub Pages 备用（按 priority 选择，同优先级再比响应时间）
 *
 * 当前项目: 爱的解码 (love-decoding)
 */

const DEPLOY_CONFIG = {
    projectId: 'love-decoding',

    platforms: [
        {
            id: 'cloudflare',
            name: 'Cloudflare Pages',
            priority: 1,
            baseUrl: 'https://love-decoding-test.pages.dev/',
            hostnameIncludes: ['pages.dev'],
            checkPath: 'favicon.ico',
            enabled: true
        },
        {
            id: 'github',
            name: 'GitHub Pages',
            priority: 2,
            baseUrl: 'https://originlab-2026.github.io/love-decoding-test/',
            hostnameIncludes: ['github.io'],
            checkPath: 'favicon.ico',
            enabled: true
        }
    ],

    external: {
        loveDecoding: {
            cloudflare: 'https://love-decoding-test.pages.dev/',
            github: 'https://originlab-2026.github.io/love-decoding-test/'
        },
        futurePartner: {
            cloudflare: 'https://future-partner-test.pages.dev/',
            github: 'https://originlab-2026.github.io/future-partner-test/'
        },
        catalog: {
            cloudflare: 'https://test-catalog.pages.dev/',
            github: 'https://originlab-2026.github.io/test-catalog/'
        }
    },

    detection: {
        timeout: 3000,
        cacheTTL: 300000,
        precheckDelay: 2000,
        useHeadRequest: true,
        useImageFallback: true
    }
};

const PLATFORM_CACHE_KEY = 'deploy_platform_cache_v3';

function isPlaceholderDeployUrl(url) {
    return !url || url.includes('<预留>');
}

/**
 * @returns {string} 'cloudflare' | 'github' | 'localhost' | 'unknown'
 */
function detectDeployPlatform() {
    const hostname = window.location.hostname;
    for (const platform of DEPLOY_CONFIG.platforms) {
        for (const include of platform.hostnameIncludes) {
            if (hostname.includes(include)) {
                return platform.id;
            }
        }
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'localhost';
    }
    return 'unknown';
}

function getCurrentDeployUrl() {
    const platform = detectDeployPlatform();
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const platformConfig = DEPLOY_CONFIG.platforms.find(p => p.id === platform);

    if (platformConfig) {
        if (platform === 'github') {
            const parts = pathname.split('/').filter(p => p);
            if (parts.length > 0) {
                return `https://${hostname}/${parts[0]}/`;
            }
        }
        if (platform === 'cloudflare') {
            return window.location.origin + '/';
        }
        return platformConfig.baseUrl;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return window.location.origin + '/';
    }

    return 'https://' + hostname + '/';
}

function getPrimaryDeployUrl() {
    const platform = detectDeployPlatform();
    if (platform === 'cloudflare') {
        return getCurrentDeployUrl();
    }
    const cf = DEPLOY_CONFIG.platforms.find(p => p.id === 'cloudflare');
    if (cf && cf.enabled && !isPlaceholderDeployUrl(cf.baseUrl)) {
        return cf.baseUrl;
    }
    const gh = DEPLOY_CONFIG.platforms.find(p => p.id === 'github');
    return gh ? gh.baseUrl : getCurrentDeployUrl();
}

/** 站点根下的资源 URL（适配 GitHub Pages 子路径；避免 Clean URL 下相对路径解析错误） */
function resolveDeployPath(relativePath) {
    const rel = String(relativePath || '').replace(/^\//, '');
    return getCurrentDeployUrl().replace(/\/?$/, '/') + rel;
}

/**
 * 页面导航 URL。Cloudflare Pages 启用 Clean URLs 时，quiz.html 会 308 到 /quiz，弱网下多一次往返；
 * 在 Cloudflare 上直接使用无扩展名路径可减少重定向。
 */
function getDeployPageUrl(filename) {
    const name = String(filename || 'index.html').trim();
    const base = getCurrentDeployUrl().replace(/\/?$/, '/');
    if (detectDeployPlatform() === 'cloudflare') {
        const lower = name.toLowerCase();
        if (lower === 'index.html' || lower === '' || lower === 'index') {
            return base;
        }
        const stem = name.replace(/\.html$/i, '');
        return base + stem;
    }
    return base + name.replace(/^\//, '');
}

function patchStaticHtmlNavLinks() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('a[href="index.html"]').forEach((a) => {
        a.setAttribute('href', getDeployPageUrl('index.html'));
    });
    document.querySelectorAll('a[href="quiz.html"]').forEach((a) => {
        a.setAttribute('href', getDeployPageUrl('quiz.html'));
    });
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            patchStaticHtmlNavLinks();
        } catch (e) {
            /* no-op */
        }
    });
}

function compareAvailabilityByPriority(a, b) {
    const pa = DEPLOY_CONFIG.platforms.find(p => p.id === a.platformId);
    const pb = DEPLOY_CONFIG.platforms.find(p => p.id === b.platformId);
    const priA = pa ? pa.priority : 999;
    const priB = pb ? pb.priority : 999;
    if (priA !== priB) return priA - priB;
    return a.responseTime - b.responseTime;
}

function firstEnabledPlatformBaseUrl() {
    const ordered = [...DEPLOY_CONFIG.platforms]
        .filter(p => p.enabled && !isPlaceholderDeployUrl(p.baseUrl))
        .sort((a, b) => a.priority - b.priority);
    return ordered[0] ? ordered[0].baseUrl : '';
}

async function checkPlatformAvailability(platformId, timeout = DEPLOY_CONFIG.detection.timeout) {
    const platform = DEPLOY_CONFIG.platforms.find(p => p.id === platformId);
    if (!platform || !platform.enabled || isPlaceholderDeployUrl(platform.baseUrl)) {
        return { available: false, responseTime: Infinity };
    }

    const checkUrl = platform.baseUrl + platform.checkPath + '?' + Date.now();
    const startTime = performance.now();

    if (DEPLOY_CONFIG.detection.useHeadRequest) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            await fetch(checkUrl, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseTime = performance.now() - startTime;
            console.log(`[DeployConfig] ${platform.name} available (${responseTime.toFixed(0)}ms)`);
            return { available: true, responseTime };
        } catch (e) {
            console.log(`[DeployConfig] ${platform.name} HEAD check failed`);
        }
    }

    if (DEPLOY_CONFIG.detection.useImageFallback) {
        return new Promise((resolve) => {
            const img = new Image();
            let resolved = false;

            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve({ available: false, responseTime: Infinity });
                }
            }, timeout);

            img.onload = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({ available: true, responseTime: performance.now() - startTime });
                }
            };

            img.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({ available: false, responseTime: Infinity });
                }
            };

            img.src = checkUrl;
        });
    }

    return { available: false, responseTime: Infinity };
}

const CATALOG_URL_CACHE_KEY = 'deploy_catalog_best_url_v1';
const CATALOG_URL_CACHE_TTL_MS = 120000;

async function checkAbsoluteUrlReachable(fullCheckUrl, timeout = DEPLOY_CONFIG.detection.timeout) {
    const startTime = performance.now();
    if (DEPLOY_CONFIG.detection.useHeadRequest) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            await fetch(fullCheckUrl, {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            console.log(`[DeployConfig] URL reachable (HEAD): ${fullCheckUrl} (${(performance.now() - startTime).toFixed(0)}ms)`);
            return true;
        } catch (e) {
            console.log(`[DeployConfig] HEAD failed for ${fullCheckUrl}`);
        }
    }
    if (DEPLOY_CONFIG.detection.useImageFallback) {
        return new Promise((resolve) => {
            const img = new Image();
            let resolved = false;
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            }, timeout);
            img.onload = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(true);
                }
            };
            img.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(false);
                }
            };
            img.src = fullCheckUrl;
        });
    }
    return false;
}

async function getBestCatalogUrl() {
    try {
        const raw = sessionStorage.getItem(CATALOG_URL_CACHE_KEY);
        if (raw) {
            const { url, ts } = JSON.parse(raw);
            if (Date.now() - ts < CATALOG_URL_CACHE_TTL_MS && url) {
                console.log('[DeployConfig] Using cached catalog URL:', url);
                return url;
            }
        }
    } catch (e) {
        /* ignore */
    }

    const ext = DEPLOY_CONFIG.external.catalog;
    if (!ext) return null;

    const cfBase = (ext.cloudflare || '').replace(/\/?$/, '/');
    const ghBase = (ext.github || '').replace(/\/?$/, '/');

    let chosen = null;
    if (cfBase && !isPlaceholderDeployUrl(ext.cloudflare)) {
        const probe = cfBase + 'favicon.ico?' + Date.now();
        const ok = await checkAbsoluteUrlReachable(probe);
        if (ok) {
            chosen = cfBase;
            console.log('[DeployConfig] Catalog: using Cloudflare');
        }
    }
    if (!chosen && ghBase && !isPlaceholderDeployUrl(ext.github)) {
        chosen = ghBase;
        console.log('[DeployConfig] Catalog: using GitHub fallback');
    }
    if (!chosen && cfBase && !isPlaceholderDeployUrl(ext.cloudflare)) {
        chosen = cfBase;
    }

    if (chosen) {
        try {
            sessionStorage.setItem(CATALOG_URL_CACHE_KEY, JSON.stringify({ url: chosen, ts: Date.now() }));
        } catch (e) {
            /* ignore */
        }
    }
    return chosen || null;
}

async function checkAllPlatforms() {
    const enabledPlatforms = DEPLOY_CONFIG.platforms.filter(p => p.enabled);
    console.log(`[DeployConfig] Checking ${enabledPlatforms.length} platforms...`);

    const promises = enabledPlatforms.map(p =>
        checkPlatformAvailability(p.id).then(result => ({
            platformId: p.id,
            ...result,
            url: p.baseUrl
        }))
    );

    const results = await Promise.all(promises);

    const available = results
        .filter(r => r.available)
        .sort(compareAvailabilityByPriority);

    console.log('[DeployConfig] Available platforms:', available.map(r => `${r.platformId}(${r.responseTime.toFixed(0)}ms)`).join(', ') || 'none');
    return available;
}

function getCachedResults() {
    try {
        const cached = sessionStorage.getItem(PLATFORM_CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < DEPLOY_CONFIG.detection.cacheTTL) {
                console.log('[DeployConfig] Using cached results');
                return data.results;
            }
        }
    } catch (e) {
        console.warn('[DeployConfig] Cache read error:', e);
    }
    return null;
}

function setCachedResults(results) {
    try {
        sessionStorage.setItem(PLATFORM_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            results
        }));
    } catch (e) {
        console.warn('[DeployConfig] Cache write error:', e);
    }
}

async function getFallbackUrl() {
    const results = await checkAllPlatforms();
    if (results.length > 0) {
        return results[0].url;
    }
    return firstEnabledPlatformBaseUrl();
}

async function getBestAvailableUrl(target = null) {
    if (target === 'catalog') {
        return getBestCatalogUrl();
    }

    let results = getCachedResults();

    if (!results) {
        console.log('[DeployConfig] Cache miss, checking platforms...');
        results = await checkAllPlatforms();
        setCachedResults(results);
    }

    if (results.length === 0) {
        console.error('[DeployConfig] No platforms available!');
        if (target) {
            const externalUrls = DEPLOY_CONFIG.external[target];
            if (externalUrls) {
                const ordered = [...DEPLOY_CONFIG.platforms].sort((a, b) => a.priority - b.priority);
                for (const platform of ordered) {
                    const u = externalUrls[platform.id];
                    if (u && !isPlaceholderDeployUrl(u)) {
                        return u;
                    }
                }
            }
        }
        return firstEnabledPlatformBaseUrl() || null;
    }

    if (target) {
        const externalUrls = DEPLOY_CONFIG.external[target];
        if (!externalUrls) {
            console.error('[DeployConfig] Unknown target:', target);
            return null;
        }

        for (const result of results) {
            const u = externalUrls[result.platformId];
            if (u && !isPlaceholderDeployUrl(u)) {
                console.log(`[DeployConfig] Best URL for ${target}:`, u);
                return u;
            }
        }

        const ordered = [...DEPLOY_CONFIG.platforms].sort((a, b) => a.priority - b.priority);
        for (const platform of ordered) {
            const u = externalUrls[platform.id];
            if (u && !isPlaceholderDeployUrl(u)) {
                console.warn(`[DeployConfig] Using fallback URL for ${target}:`, u);
                return u;
            }
        }
    } else {
        const winner = results[0];
        const p = DEPLOY_CONFIG.platforms.find(x => x.id === winner.platformId);
        if (p && !isPlaceholderDeployUrl(p.baseUrl)) {
            return winner.url;
        }
        const fb = firstEnabledPlatformBaseUrl();
        return fb || null;
    }

    return null;
}

async function navigateWithFallback(target, triggerElement = null) {
    if (triggerElement) {
        triggerElement.style.opacity = '0.7';
        triggerElement.style.pointerEvents = 'none';
    }

    try {
        const url = await getBestAvailableUrl(target);
        if (url) {
            window.location.href = url;
        } else {
            console.error('[DeployConfig] No URL available for target:', target);
            alert('暂时无法连接到目标页面，请稍后再试');
            if (triggerElement) {
                triggerElement.style.opacity = '1';
                triggerElement.style.pointerEvents = 'auto';
            }
        }
    } catch (e) {
        console.error('[DeployConfig] Navigation error:', e);
        if (triggerElement) {
            triggerElement.style.opacity = '1';
            triggerElement.style.pointerEvents = 'auto';
        }
    }
}

function preloadPlatformChecks() {
    const run = () => {
        console.log('[DeployConfig] Starting background platform checks...');
        checkAllPlatforms().then((results) => {
            setCachedResults(results);
            console.log('[DeployConfig] Background check complete');
        }).catch((e) => {
            console.warn('[DeployConfig] Background check failed:', e);
        });
    };
    const delay = DEPLOY_CONFIG.detection.precheckDelay;
    if (typeof window === 'undefined') {
        return;
    }
    window.addEventListener('load', () => {
        setTimeout(run, delay);
    });
}

const QR_SHARE_URL_CACHE_KEY = 'deploy_qr_share_url_v1';
const QR_SHARE_URL_CACHE_TTL_MS = 120000;

/**
 * PDF/海报二维码：优先 Cloudflare 公网地址，探测失败则用 GitHub Pages。
 */
async function getQrCodeShareUrl() {
    try {
        const raw = sessionStorage.getItem(QR_SHARE_URL_CACHE_KEY);
        if (raw) {
            const { url, ts } = JSON.parse(raw);
            if (Date.now() - ts < QR_SHARE_URL_CACHE_TTL_MS && url) {
                return url;
            }
        }
    } catch (e) {
        /* ignore */
    }

    const cfPlat = DEPLOY_CONFIG.platforms.find(p => p.id === 'cloudflare');
    const ghPlat = DEPLOY_CONFIG.platforms.find(p => p.id === 'github');
    const cfUrl = cfPlat && !isPlaceholderDeployUrl(cfPlat.baseUrl) ? cfPlat.baseUrl.replace(/\/?$/, '/') : '';
    const ghUrl = ghPlat && ghPlat.baseUrl && !isPlaceholderDeployUrl(ghPlat.baseUrl) ? ghPlat.baseUrl.replace(/\/?$/, '/') : '';

    let chosen = ghUrl || cfUrl;
    if (cfUrl) {
        const probe = cfUrl + 'favicon.ico?' + Date.now();
        try {
            const ok = await checkAbsoluteUrlReachable(probe);
            if (ok) {
                chosen = cfUrl;
            } else if (ghUrl) {
                chosen = ghUrl;
            }
        } catch (e) {
            if (ghUrl) chosen = ghUrl;
        }
    }

    if (!chosen && typeof window !== 'undefined' && window.location && window.location.origin) {
        chosen = window.location.origin + '/';
    }

    if (chosen) {
        try {
            sessionStorage.setItem(QR_SHARE_URL_CACHE_KEY, JSON.stringify({ url: chosen, ts: Date.now() }));
        } catch (e) {
            /* ignore */
        }
    }

    return chosen || '';
}

function clearPlatformCache() {
    sessionStorage.removeItem(PLATFORM_CACHE_KEY);
    sessionStorage.removeItem(CATALOG_URL_CACHE_KEY);
    sessionStorage.removeItem(QR_SHARE_URL_CACHE_KEY);
    console.log('[DeployConfig] Cache cleared');
}

const FREE_MODE_STORAGE_KEY = 'love_decoding_free_mode';

/** 捕获 ?free=1 免费入口标记，写入 session 并清理 URL 参数 */
function captureFreeModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('free') !== '1') {
        return;
    }
    try {
        sessionStorage.setItem(FREE_MODE_STORAGE_KEY, '1');
    } catch (e) {
        /* ignore */
    }
    params.delete('free');
    const query = params.toString();
    const clean = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
    window.history.replaceState({}, '', clean);
}

function isPaywallEnabled() {
    try {
        return sessionStorage.getItem(FREE_MODE_STORAGE_KEY) !== '1';
    } catch (e) {
        return true;
    }
}

if (typeof window !== 'undefined') {
    captureFreeModeFromUrl();
}

function getQRCodeConfig() {
    const platform = detectDeployPlatform();
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    const ghPlat = DEPLOY_CONFIG.platforms.find(p => p.id === 'github');
    const cfPlat = DEPLOY_CONFIG.platforms.find(p => p.id === 'cloudflare');
    const ghUrl = ghPlat ? ghPlat.baseUrl : '';
    const cfConfigured = cfPlat && !isPlaceholderDeployUrl(cfPlat.baseUrl) ? cfPlat.baseUrl : '';

    let qrUrl = cfConfigured || ghUrl;
    let fallbackUrl = ghUrl || cfConfigured;

    if (platform === 'cloudflare') {
        qrUrl = window.location.origin + '/';
        fallbackUrl = ghUrl || qrUrl;
    } else if (platform === 'github') {
        const parts = pathname.split('/').filter(p => p);
        if (parts.length > 0) {
            qrUrl = `https://${hostname}/${parts[0]}/`;
        } else {
            qrUrl = ghUrl;
        }
        fallbackUrl = cfConfigured || qrUrl;
    }

    if (isPlaceholderDeployUrl(fallbackUrl)) {
        fallbackUrl = ghUrl;
    }
    if (isPlaceholderDeployUrl(qrUrl)) {
        qrUrl = ghUrl;
    }

    return {
        url: qrUrl,
        fallbackUrl: fallbackUrl,
        pdfSize: 50,
        posterSize: 80,
        platform: platform
    };
}

async function generatePlatformAwareQRCode(containerId, url, size = 80) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    container.innerHTML = '';

    const config = getQRCodeConfig();
    const useUrl = url || config.url;

    if (typeof QRCode === 'undefined') {
        console.error('QRCode library not loaded');
        return null;
    }

    try {
        const qrWrapper = document.createElement('div');
        qrWrapper.style.display = 'inline-block';
        qrWrapper.style.background = 'white';
        qrWrapper.style.padding = '8px';
        qrWrapper.style.borderRadius = '8px';
        qrWrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

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
        console.error('QRCode generation failed:', err);
        return null;
    }
}

async function generateQRCodeDataURL(url, size = 80) {
    return new Promise((resolve) => {
        try {
            if (typeof QRCode === 'undefined') {
                resolve(null);
                return;
            }

            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            document.body.appendChild(tempDiv);

            new QRCode(tempDiv, {
                text: url,
                width: size,
                height: size,
                colorDark: '#333333',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });

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
            console.error('QRCode generation failed:', err);
            resolve(null);
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEPLOY_CONFIG,
        detectDeployPlatform,
        getCurrentDeployUrl,
        getPrimaryDeployUrl,
        resolveDeployPath,
        getDeployPageUrl,
        patchStaticHtmlNavLinks,
        checkPlatformAvailability,
        checkAllPlatforms,
        getFallbackUrl,
        getBestAvailableUrl,
        navigateWithFallback,
        preloadPlatformChecks,
        clearPlatformCache,
        getQRCodeConfig,
        getQrCodeShareUrl,
        generatePlatformAwareQRCode,
        generateQRCodeDataURL,
        captureFreeModeFromUrl,
        isPaywallEnabled
    };
}
