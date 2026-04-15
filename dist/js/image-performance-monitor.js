/**
 * 图片性能监控工具
 * 用于测试和报告图片加载性能
 */

class ImagePerformanceMonitor {
    constructor() {
        this.metrics = {
            imagesLoaded: 0,
            totalSize: 0,
            loadTimes: [],
            errors: []
        };
        
        this.observer = null;
        this.startTime = performance.now();
    }
    
    // 开始监控
    start() {
        console.log('🎯 开始监控图片性能...');
        
        // 监听所有图片加载
        document.querySelectorAll('img').forEach(img => {
            this.monitorImage(img);
        });
        
        // 使用 PerformanceObserver 监控资源加载
        if (typeof PerformanceObserver !== 'undefined') {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.initiatorType === 'img') {
                            this.recordMetric(entry);
                        }
                    });
                });
                
                observer.observe({ entryTypes: ['resource'] });
                this.observer = observer;
            } catch (e) {
                console.warn('PerformanceObserver 不支持');
            }
        }
        
        // 页面加载完成后生成报告
        window.addEventListener('load', () => {
            setTimeout(() => this.generateReport(), 1000);
        });
    }
    
    // 监控单张图片
    monitorImage(img) {
        const startTime = performance.now();
        
        if (img.complete) {
            // 已缓存或已加载
            this.recordLoad(img.src, 0, performance.now() - startTime);
        } else {
            // 等待加载
            img.addEventListener('load', () => {
                const size = this.getImageSize(img);
                this.recordLoad(img.src, size, performance.now() - startTime);
            });
            
            img.addEventListener('error', () => {
                this.recordError(img.src);
            });
        }
    }
    
    // 记录加载指标
    recordMetric(resourceEntry) {
        const size = resourceEntry.transferSize || 0;
        const duration = resourceEntry.duration || 0;
        
        this.recordLoad(
            resourceEntry.name,
            size,
            duration
        );
    }
    
    // 记录加载成功
    recordLoad(src, size, duration) {
        this.metrics.imagesLoaded++;
        this.metrics.totalSize += size;
        this.metrics.loadTimes.push({
            src: src.substring(src.lastIndexOf('/') + 1),
            size: size,
            duration: duration.toFixed(2)
        });
        
        console.log(`✅ ${src.substring(src.lastIndexOf('/') + 1)}: ${(size/1024).toFixed(1)}KB, ${duration.toFixed(0)}ms`);
    }
    
    // 记录加载失败
    recordError(src) {
        this.metrics.errors.push(src);
        console.error(`❌ 图片加载失败：${src}`);
    }
    
    // 获取图片大小 (估算)
    getImageSize(img) {
        // 尝试从 naturalWidth/naturalHeight 估算
        if (img.naturalWidth && img.naturalHeight) {
            // 粗略估算：宽×高×3 字节 (RGB)
            return img.naturalWidth * img.naturalHeight * 3;
        }
        return 0;
    }
    
    // 生成报告
    generateReport() {
        const totalTime = performance.now() - this.startTime;
        const avgTime = this.metrics.loadTimes.length > 0 
            ? this.metrics.loadTimes.reduce((sum, t) => sum + parseFloat(t.duration), 0) / this.metrics.loadTimes.length 
            : 0;
        
        const report = `
╔═══════════════════════════════════════════════════════╗
║          📊 图片性能监控报告                          ║
╠═══════════════════════════════════════════════════════╣
║ 总加载时间：${totalTime.toFixed(0)}ms
║ 加载图片数：${this.metrics.imagesLoaded} 张
║ 总传输体积：${(this.metrics.totalSize / 1024).toFixed(1)} KB
║ 平均加载时间：${avgTime.toFixed(0)}ms/张
║ 加载失败：${this.metrics.errors.length} 张
╠═══════════════════════════════════════════════════════╣
║ 详细列表:
${this.metrics.loadTimes.map(t => `║   - ${t.src.padEnd(35)} ${t.size.toString().padStart(7)}B  ${t.duration.padStart(6)}ms`).join('\n')}
╚═══════════════════════════════════════════════════════╝
        `;
        
        console.log(report);
        
        // 保存到全局变量方便查看
        window.imagePerformanceReport = {
            totalTime,
            imagesLoaded: this.metrics.imagesLoaded,
            totalSize: this.metrics.totalSize,
            averageTime: avgTime,
            errors: this.metrics.errors,
            details: this.metrics.loadTimes
        };
        
        return window.imagePerformanceReport;
    }
    
    // 停止监控
    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }
        return this.generateReport();
    }
}

// 自动启动监控 (如果在浏览器环境)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.imageMonitor = new ImagePerformanceMonitor();
    
    // DOM 加载后开始
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.imageMonitor.start();
        }, 100);
    });
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImagePerformanceMonitor;
}
