'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { throttle } from '@/lib/spreadsheetUtils';
import { 
  VirtualScrollConfig, 
  VirtualScrollState, 
  ColumnDefinition 
} from '@/types/spreadsheet';

interface UseVirtualScrollingProps {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  containerWidth: number;
  columns: ColumnDefinition[];
  overscan?: number;
  horizontal?: boolean;
}

interface UseVirtualScrollingReturn {
  // Scroll state
  scrollState: VirtualScrollState;
  
  // Visible range
  startIndex: number;
  endIndex: number;
  visibleItems: number[];
  
  // Column virtualization
  startColumnIndex: number;
  endColumnIndex: number;
  visibleColumns: ColumnDefinition[];
  
  // Scroll handlers
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  
  // Container props
  containerProps: {
    style: React.CSSProperties;
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  };
  
  // Virtual spacers
  topSpacer: number;
  bottomSpacer: number;
  leftSpacer: number;
  rightSpacer: number;
  
  // Performance metrics
  renderTime: number;
}

export const useVirtualScrolling = ({
  itemCount,
  itemHeight,
  containerHeight,
  containerWidth,
  columns,
  overscan = 5,
  horizontal = false
}: UseVirtualScrollingProps): UseVirtualScrollingReturn => {
  const [scrollState, setScrollState] = useState<VirtualScrollState>({
    scrollTop: 0,
    scrollLeft: 0,
    startIndex: 0,
    endIndex: 0,
    startColumnIndex: 0,
    endColumnIndex: 0
  });
  
  const [renderTime, setRenderTime] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderStartTime = useRef<number>(0);
  
  // Calculate visible row range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    renderStartTime.current = performance.now();
    
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const scrolledItems = Math.floor(scrollState.scrollTop / itemHeight);
    
    const start = Math.max(0, scrolledItems - overscan);
    const end = Math.min(itemCount - 1, scrolledItems + visibleItemCount + overscan);
    
    const items = [];
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    
    setRenderTime(performance.now() - renderStartTime.current);
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items
    };
  }, [scrollState.scrollTop, itemHeight, containerHeight, itemCount, overscan]);
  
  // Calculate visible column range for horizontal scrolling
  const { startColumnIndex, endColumnIndex, visibleColumns } = useMemo(() => {
    if (!horizontal) {
      return {
        startColumnIndex: 0,
        endColumnIndex: columns.length - 1,
        visibleColumns: columns.filter(col => !col.hidden)
      };
    }
    
    let accumulatedWidth = 0;
    let startCol = 0;
    let endCol = columns.length - 1;
    
    // Find start column
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].hidden) continue;
      
      if (accumulatedWidth + columns[i].width > scrollState.scrollLeft) {
        startCol = Math.max(0, i - overscan);
        break;
      }
      accumulatedWidth += columns[i].width;
    }
    
    // Find end column
    accumulatedWidth = 0;
    for (let i = startCol; i < columns.length; i++) {
      if (columns[i].hidden) continue;
      
      accumulatedWidth += columns[i].width;
      if (accumulatedWidth >= containerWidth + scrollState.scrollLeft - getColumnOffset(columns, startCol)) {
        endCol = Math.min(columns.length - 1, i + overscan);
        break;
      }
    }
    
    const visibleCols = columns
      .slice(startCol, endCol + 1)
      .filter(col => !col.hidden);
    
    return {
      startColumnIndex: startCol,
      endColumnIndex: endCol,
      visibleColumns: visibleCols
    };
  }, [scrollState.scrollLeft, containerWidth, columns, horizontal, overscan]);
  
  // Calculate column offset helper
  const getColumnOffset = useCallback((cols: ColumnDefinition[], index: number): number => {
    let offset = 0;
    for (let i = 0; i < index && i < cols.length; i++) {
      if (!cols[i].hidden) {
        offset += cols[i].width;
      }
    }
    return offset;
  }, []);
  
  // Calculate total dimensions
  const totalHeight = itemCount * itemHeight;
  const totalWidth = columns.reduce((width, col) => width + (col.hidden ? 0 : col.width), 0);
  
  // Calculate spacers for virtual scrolling
  const topSpacer = startIndex * itemHeight;
  const bottomSpacer = (itemCount - endIndex - 1) * itemHeight;
  const leftSpacer = horizontal ? getColumnOffset(columns, startColumnIndex) : 0;
  const rightSpacer = horizontal ? 
    totalWidth - getColumnOffset(columns, endColumnIndex + 1) : 0;
  
  // Throttled scroll handler
  const throttledScrollHandler = useMemo(() => {
    return throttle((scrollTop: number, scrollLeft: number) => {
      setScrollState(prev => ({
        ...prev,
        scrollTop,
        scrollLeft,
        startIndex,
        endIndex,
        startColumnIndex,
        endColumnIndex
      }));
    }, 16); // ~60fps
  }, [startIndex, endIndex, startColumnIndex, endColumnIndex]);
  
  // Scroll event handler
  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    throttledScrollHandler(target.scrollTop, target.scrollLeft);
  }, [throttledScrollHandler]);
  
  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;
    
    const clampedIndex = Math.max(0, Math.min(itemCount - 1, index));
    let scrollTop = 0;
    
    switch (align) {
      case 'start':
        scrollTop = clampedIndex * itemHeight;
        break;
      case 'center':
        scrollTop = clampedIndex * itemHeight - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        scrollTop = clampedIndex * itemHeight - containerHeight + itemHeight;
        break;
    }
    
    scrollTop = Math.max(0, Math.min(totalHeight - containerHeight, scrollTop));
    
    containerRef.current.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  }, [itemCount, itemHeight, containerHeight, totalHeight]);
  
  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (!containerRef.current) return;
    
    containerRef.current.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
  
  // Container props
  const containerProps = useMemo(() => ({
    ref: containerRef,
    style: {
      height: containerHeight,
      width: containerWidth,
      overflow: 'auto',
      position: 'relative' as const
    },
    onScroll
  }), [containerHeight, containerWidth, onScroll]);
  
  // Performance monitoring
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.name === 'virtual-scroll-render') {
          setRenderTime(entry.duration);
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => observer.disconnect();
  }, []);
  
  // Intersection Observer for better performance
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Item is visible, could trigger additional loading if needed
          }
        });
      },
      {
        root: container,
        rootMargin: `${itemHeight * overscan}px`,
        threshold: 0
      }
    );
    
    // Observe visible items (would need to add refs to each item)
    // This is a simplified version - in practice, you'd observe each rendered item
    
    return () => intersectionObserver.disconnect();
  }, [itemHeight, overscan]);
  
  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;
      
      switch (event.key) {
        case 'Home':
          event.preventDefault();
          scrollToTop();
          break;
        case 'End':
          event.preventDefault();
          scrollToIndex(itemCount - 1, 'end');
          break;
        case 'PageUp':
          event.preventDefault();
          const pageUpIndex = Math.max(0, startIndex - Math.floor(containerHeight / itemHeight));
          scrollToIndex(pageUpIndex, 'start');
          break;
        case 'PageDown':
          event.preventDefault();
          const pageDownIndex = Math.min(itemCount - 1, endIndex + Math.floor(containerHeight / itemHeight));
          scrollToIndex(pageDownIndex, 'start');
          break;
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [startIndex, endIndex, itemCount, containerHeight, itemHeight, scrollToTop, scrollToIndex]);
  
  return {
    // Scroll state
    scrollState,
    
    // Visible range
    startIndex,
    endIndex,
    visibleItems,
    
    // Column virtualization
    startColumnIndex,
    endColumnIndex,
    visibleColumns,
    
    // Scroll handlers
    onScroll,
    scrollToIndex,
    scrollToTop,
    
    // Container props
    containerProps,
    
    // Virtual spacers
    topSpacer,
    bottomSpacer,
    leftSpacer,
    rightSpacer,
    
    // Performance metrics
    renderTime
  };
};