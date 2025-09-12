import { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

interface VirtualizationResult<T> {
  virtualItems: T[];
  totalHeight: number;
  offsetY: number;
}

/**
 * High-performance virtualization hook for large lists
 */
export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
): VirtualizationResult<T> {
  const {
    itemHeight,
    containerHeight,
    overscan = 3,
    getScrollElement,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight) - overscan;
  const endIndex = startIndex + visibleCount + (overscan * 2);

  const virtualItems = items.slice(
    Math.max(0, startIndex),
    Math.min(items.length, endIndex)
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, startIndex) * itemHeight;

  const handleScroll = useCallback(() => {
    const element = scrollElementRef.current;
    if (element) {
      setScrollTop(element.scrollTop);
    }
  }, []);

  useEffect(() => {
    const element = getScrollElement ? getScrollElement() : 
                   scrollElementRef.current;
    
    if (element) {
      scrollElementRef.current = element;
      element.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        element.removeEventListener('scroll', handleScroll);
      };
    }
  }, [getScrollElement, handleScroll]);

  return {
    virtualItems,
    totalHeight,
    offsetY,
  };
}

/**
 * Window-based virtualization for full-page scrolling
 */
export function useWindowVirtualization<T>(
  items: T[],
  itemHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.pageYOffset);
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const visibleCount = Math.ceil(windowHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight) - overscan;
  const endIndex = startIndex + visibleCount + (overscan * 2);

  const virtualItems = items.slice(
    Math.max(0, startIndex),
    Math.min(items.length, endIndex)
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, startIndex) * itemHeight;

  return {
    virtualItems,
    totalHeight,
    offsetY,
  };
}