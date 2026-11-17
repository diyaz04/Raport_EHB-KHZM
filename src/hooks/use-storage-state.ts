"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Hook to persist and synchronize client state with browser sessionStorage.
 * Utilizes useSyncExternalStore to eliminate hydration mismatches and prevent
 * redundant re-renders or cascading effect warnings in React 19.
 */
export function useSessionStorageState<T extends string>(
  key: string,
  initialValue: T
): [T, (val: T) => void] {
  const getSnapshot = useCallback(() => {
    try {
      if (typeof window === "undefined") return initialValue;
      const stored = window.sessionStorage.getItem(key);
      return (stored as T) ?? initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const subscribe = useCallback(
    (notify: () => void) => {
      const handleCustomEvent = (event: Event) => {
        const customEv = event as CustomEvent;
        if (!customEv.detail || customEv.detail.key === key) {
          notify();
        }
      };

      window.addEventListener("storage", notify);
      window.addEventListener("khzm_storage_change", handleCustomEvent);

      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("khzm_storage_change", handleCustomEvent);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (newVal: T) => {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(key, newVal);
          window.dispatchEvent(
            new CustomEvent("khzm_storage_change", { detail: { key, value: newVal } })
          );
        }
      } catch {
        // ignore storage errors
      }
    },
    [key]
  );

  return [value, setValue];
}
