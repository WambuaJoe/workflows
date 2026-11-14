"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A list that reorders freely while dragging and commits once on drop, as a single undo step.
 * `move` shifts an item by one for keyboard users.
 */
export function useReorderable<T extends { id: string }>(
  items: T[],
  onChange: (items: T[]) => void,
) {
  const [order, setOrder] = useState(items);
  const [synced, setSynced] = useState(items);
  if (synced !== items) {
    setSynced(items);
    setOrder(items);
  }

  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  });

  const commit = () => {
    const next = orderRef.current;
    if (next.some((item, i) => item !== items[i])) onChange(next);
  };

  const move = (id: string, by: -1 | 1) => {
    const i = items.findIndex((item) => item.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return { order, setOrder, commit, move };
}
