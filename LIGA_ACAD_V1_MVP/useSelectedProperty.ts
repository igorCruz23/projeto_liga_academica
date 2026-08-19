import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "liga-rural:selected-property";

export function useSelectedProperty() {
  const [propertyId, setPropertyIdState] = useState<number | undefined>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  });

  const setPropertyId = useCallback((nextPropertyId: number | undefined) => {
    setPropertyIdState(nextPropertyId);
    if (nextPropertyId) {
      window.localStorage.setItem(STORAGE_KEY, String(nextPropertyId));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const synchronise = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const parsed = event.newValue ? Number(event.newValue) : NaN;
      setPropertyIdState(Number.isInteger(parsed) && parsed > 0 ? parsed : undefined);
    };
    window.addEventListener("storage", synchronise);
    return () => window.removeEventListener("storage", synchronise);
  }, []);

  return { propertyId, setPropertyId };
}
