/**
 * 工具函数库
 * 包含 LocalStorage 操作、数据验证、通用辅助函数
 */

const StorageKeys = {
    QUIZ_DATA: 'quiz_data',
    USER_ANSWERS: 'user_answers',
    CURRENT_QUESTION: 'current_question',
    QUIZ_CONFIG: 'quiz_config',
    UI_CONFIG: 'ui_config'
};

/**
 * LocalStorage 工具类
 */
class StorageUtil {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }

    static clear() {
        localStorage.clear();
    }

    static clearQuizProgress() {
        this.remove(StorageKeys.USER_ANSWERS);
        this.remove(StorageKeys.CURRENT_QUESTION);
    }
}

/**
 * 题目数据验证器
 */
class QuizValidator {
    static validate(quizData) {
        const errors = [];

        // 检查必填字段
        if (!quizData.quiz_name) {
            errors.push('缺少测试名称 (quiz_name)');
        }
        if (!quizData.nbr_question) {
            errors.push('缺少题目数量 (nbr_question)');
        }

        // 检查维度定义表
        if (!quizData.dimensions || !Array.isArray(quizData.dimensions) || quizData.dimensions.length === 0) {
            errors.push('缺少维度定义表 (dimensions)');
        } else {
            quizData.dimensions.forEach((dim, index) => {
                if (!dim.dimension_id) {
                    errors.push(`维度表第 ${index + 1} 行缺少 dimension_id`);
                }
                if (!dim.dimension_name) {
                    errors.push(`维度表第 ${index + 1} 行缺少 dimension_name`);
                }
            });
        }

        // 检查量表题
        if (!quizData.scale_questions || !Array.isArray(quizData.scale_questions)) {
            errors.push('缺少量表题数据表 (scale_questions)');
        } else {
            quizData.scale_questions.forEach((q, index) => {
                if (!q.question_id) {
                    errors.push(`量表题第 ${index + 1} 行缺少 question_id`);
                }
                if (!q.dimension_id) {
                    errors.push(`量表题第 ${index + 1} 行 (${q.question_id || '未知'}) 缺少 dimension_id`);
                }
                if (!q.question_text) {
                    errors.push(`量表题第 ${index + 1} 行 (${q.question_id || '未知'}) 缺少 question_text`);
                }
            });
        }

        // 检查选择题（可选）
        if (quizData.choice_questions && Array.isArray(quizData.choice_questions)) {
            quizData.choice_questions.forEach((q, index) => {
                if (!q.question_id) {
                    errors.push(`选择题第 ${index + 1} 行缺少 question_id`);
                }
                if (!q.question_text) {
                    errors.push(`选择题第 ${index + 1} 行 (${q.question_id || '未知'}) 缺少 question_text`);
                }
                // 检查选项
                const options = ['a', 'b', 'c', 'd', 'e'];
                let hasValidOption = false;
                options.forEach(opt => {
                    if (q[`option_${opt}_text`] && q[`option_${opt}_dim`]) {
                        hasValidOption = true;
                    }
                });
                if (!hasValidOption) {
                    errors.push(`选择题 ${q.question_id || `第 ${index + 1} 行`} 没有有效的选项`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

/**
 * 通用工具函数
 */
const Utils = {
    /**
     * 图片懒加载管理器
     * 使用 IntersectionObserver 实现智能懒加载
     */
    lazyLoadImages: {
        observer: null,
        imagesToLoad: [],
        
        init() {
            // 检查浏览器支持
            if ('IntersectionObserver' in window) {
                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.loadImage(entry.target);
                            this.observer.unobserve(entry.target);
                        }
                    });
                }, {
                    rootMargin: '50px 0px', // 提前 50px 开始加载
                    threshold: 0.01
                });
                
                // 页面加载完成后开始观察所有懒加载图片
                document.addEventListener('DOMContentLoaded', () => {
                    this.observeAll();
                });
            } else {
                // 降级处理：直接加载所有图片
                this.loadAll();
            }
        },
        
        observeAll() {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => this.observer.observe(img));
        },
        
        loadImage(img) {
            if (!img.dataset.src) return;
            
            img.src = img.dataset.src;
            img.onload = () => {
                img.classList.add('loaded');
            };
            img.onerror = () => {
                console.warn('图片加载失败:', img.src);
            };
        },
        
        loadAll() {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => this.loadImage(img));
        }
    },
    
    /**
     * 图片预加载器
     * 提前加载关键图片到内存
     */
    preloadImages(urls) {
        urls.forEach(url => {
            const img = new Image();
            img.src = url;
            // 图片会自动缓存到浏览器
        });
    },
    
    /**
     * 响应式图片生成器
     * 根据设备像素比返回合适的图片 URL
     */
    getResponsiveImageSrc(basePath, formats = ['webp', 'png', 'jpg']) {
        const dpr = window.devicePixelRatio || 1;
        const scale = dpr >= 2 ? '@2x' : '';
        
        // 检测 WebP 支持
        const supportsWebP = this.checkWebPSupport();
        
        if (supportsWebP && formats.includes('webp')) {
            return `${basePath}${scale}.webp`;
        } else if (formats.includes('png')) {
            return `${basePath}${scale}.png`;
        } else if (formats.includes('jpg')) {
            return `${basePath}${scale}.jpg`;
        }
        
        return `${basePath}${scale}.${formats[0]}`;
    },
    
    /**
     * 检测 WebP 支持
     */
    checkWebPSupport() {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    },
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 下载 JSON 文件
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 读取上传的 JSON 文件
     */
    readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (err) {
                    reject(new Error('文件格式错误，请上传有效的 JSON 文件'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    },

    /**
     * 生成唯一 ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * 格式化百分比
     */
    formatPercent(value, decimals = 1) {
        return (value * 100).toFixed(decimals) + '%';
    },

    /**
     * 平滑滚动到元素
     */
    scrollToElement(element, offset = 0) {
        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
};

/**
 * 默认 UI 配置
 */
const DefaultUIConfig = {
    theme: 'default',
    primaryColor: '#FF8C94',
    secondaryColor: '#FFD3B6',
    backgroundColor: '#FFF5F5',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: {
        title: '2rem',
        subtitle: '1.25rem',
        body: '1rem',
        small: '0.875rem'
    },
    borderRadius: '12px',
    maxWidth: '800px'
};

/**
 * 获取当前 UI 配置（合并默认配置和自定义配置）
 */
function getUIConfig() {
    const customConfig = StorageUtil.get(StorageKeys.UI_CONFIG, {});
    return { ...DefaultUIConfig, ...customConfig };
}

/**
 * 应用 UI 配置到页面
 */
function applyUIConfig(config = null) {
    const uiConfig = config || getUIConfig();
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', uiConfig.primaryColor);
    root.style.setProperty('--secondary-color', uiConfig.secondaryColor);
    root.style.setProperty('--background-color', uiConfig.backgroundColor);
    root.style.setProperty('--font-family', uiConfig.fontFamily);
    root.style.setProperty('--border-radius', uiConfig.borderRadius);
    root.style.setProperty('--max-width', uiConfig.maxWidth);
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageKeys, StorageUtil, QuizValidator, Utils, DefaultUIConfig, getUIConfig, applyUIConfig };
}
