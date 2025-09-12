/**
 * Performance optimization utilities for frontend
 */

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize expensive function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImage(imageElement: HTMLImageElement) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.classList.add('fade-in');
          observer.unobserve(img);
        }
      }
    });
  });
  
  imageObserver.observe(imageElement);
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = 
  window.requestIdleCallback ||
  function(callback: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline);
    }, 1);
  };

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback =
  window.cancelIdleCallback ||
  function(id: number) {
    clearTimeout(id);
  };

/**
 * Batch DOM updates
 */
export function batchDOMUpdates(updates: (() => void)[]) {
  requestIdleCallback(() => {
    updates.forEach(update => update());
  });
}

/**
 * Virtual scroll helper for large lists
 */
export function calculateVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan = 3
) {
  const startIndex = Math.floor(scrollTop / itemHeight) - overscan;
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan;
  
  return {
    visibleItems: items.slice(
      Math.max(0, startIndex),
      Math.min(items.length, endIndex)
    ),
    offsetY: Math.max(0, startIndex) * itemHeight,
    totalHeight: items.length * itemHeight,
  };
}

/**
 * Performance monitoring
 */
export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  return end - start;
}

/**
 * Frame rate monitor
 */
export class FPSMonitor {
  private lastTime = performance.now();
  private frames = 0;
  private fps = 0;

  start() {
    const measure = () => {
      this.frames++;
      const currentTime = performance.now();
      
      if (currentTime >= this.lastTime + 1000) {
        this.fps = Math.round(this.frames * 1000 / (currentTime - this.lastTime));
        this.frames = 0;
        this.lastTime = currentTime;
        
        if (this.fps < 30) {
          console.warn(`[Performance] Low FPS detected: ${this.fps}`);
        }
      }
      
      requestAnimationFrame(measure);
    };
    
    requestAnimationFrame(measure);
  }
  
  getFPS() {
    return this.fps;
  }
}