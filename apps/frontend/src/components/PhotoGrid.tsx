import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

type PhotoGridProps = {
  children: ReactNode;
  /** Minimum column width in px before wrapping. */
  minColWidth?: number;
  gap?: number;
};

type ItemLayout = {
  top: number;
  left: number;
  width: number;
};

/**
 * Masonry grid with left-to-right packing: each next item goes into the
 * currently shortest column (not CSS multi-column top-to-bottom order).
 */
export function PhotoGrid({
  children,
  minColWidth = 200,
  gap = 16,
}: PhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const items = useMemo(() => Children.toArray(children), [children]);
  const [colCount, setColCount] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  const [layouts, setLayouts] = useState<ItemLayout[]>([]);
  const [gridHeight, setGridHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setContainerWidth(width);
      setColCount(Math.max(1, Math.floor(width / minColWidth)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [minColWidth]);

  const syncHeights = useCallback(() => {
    const next = items.map((_, index) => itemRefs.current[index]?.offsetHeight ?? 0);
    setHeights((prev) => {
      if (prev.length === next.length && prev.every((h, i) => h === next[i])) {
        return prev;
      }
      return next;
    });
  }, [items]);

  useLayoutEffect(() => {
    syncHeights();
  }, [items, colCount, containerWidth, syncHeights]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => syncHeights());
    for (const node of itemRefs.current) {
      if (node) ro.observe(node);
    }

    const onLoad = () => syncHeights();
    el.addEventListener("load", onLoad, true);
    return () => {
      ro.disconnect();
      el.removeEventListener("load", onLoad, true);
    };
  }, [items, syncHeights]);

  useLayoutEffect(() => {
    if (!containerWidth || colCount < 1) return;

    const colWidth = (containerWidth - gap * (colCount - 1)) / colCount;
    const colHeights = new Array(colCount).fill(0);
    const nextLayouts: ItemLayout[] = [];

    items.forEach((_, index) => {
      let target = 0;
      for (let c = 1; c < colCount; c++) {
        if (colHeights[c]! < colHeights[target]!) target = c;
      }

      const height = heights[index] || 0;
      nextLayouts[index] = {
        top: colHeights[target]!,
        left: target * (colWidth + gap),
        width: colWidth,
      };
      colHeights[target]! += height + (height > 0 ? gap : 0);
    });

    setLayouts(nextLayouts);
    setGridHeight(Math.max(0, ...colHeights.map((h) => Math.max(0, h - gap))));
  }, [items, heights, colCount, containerWidth, gap]);

  return (
    <div
      ref={containerRef}
      className="photo-grid"
      style={{ height: gridHeight || undefined }}
    >
      {items.map((item, index) => {
        const layout = layouts[index];
        return (
          <div
            key={(item as ReactElement).key ?? index}
            className="photo-grid-item"
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            style={
              layout
                ? {
                    top: layout.top,
                    left: layout.left,
                    width: layout.width,
                  }
                : { width: containerWidth ? containerWidth / colCount : undefined }
            }
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}
