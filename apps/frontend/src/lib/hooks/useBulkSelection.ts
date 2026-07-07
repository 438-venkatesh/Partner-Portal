import { useCallback, useMemo, useState } from 'react';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(itemIds));
  }, [itemIds]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0;

  return {
    selected,
    selectedCount: selected.size,
    toggle,
    selectAll,
    clear,
    isSelected,
    allSelected,
    someSelected,
    selectedIds: useMemo(() => Array.from(selected), [selected]),
  };
}
