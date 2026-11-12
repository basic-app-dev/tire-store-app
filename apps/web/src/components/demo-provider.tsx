'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type Filters,
  type Booking,
  type CartItem,
  defaultBooking,
  defaultFilters,
  products,
} from '@/lib/demo-data';
type Demo = { filters: Filters; booking: Booking; cart: CartItem[] };
const initial: Demo = { filters: defaultFilters, booking: defaultBooking, cart: [] };
const Context = createContext<{
  data: Demo;
  ready: boolean;
  storageError: boolean;
  update: (patch: Partial<Demo>) => void;
}>({ data: initial, ready: false, storageError: false, update: () => {} });
export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Demo>(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('steven-mechanics-demo-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        const strings = (obj: Record<string, string>, defaults: Record<string, string>) =>
          Object.fromEntries(
            Object.entries(defaults).map(([key, value]) => [
              key,
              typeof obj?.[key] === 'string' ? obj[key] : value,
            ])
          );
        setData({
          filters: strings(saved.filters, defaultFilters) as Filters,
          booking: strings(saved.booking, defaultBooking) as Booking,
          cart: Array.isArray(saved.cart)
            ? saved.cart
                .filter(
                  (item: CartItem) =>
                    products.some((p) => p.slug === item.slug) &&
                    Number.isInteger(item.quantity) &&
                    item.quantity > 0 &&
                    item.quantity <= 8
                )
                .map((item: CartItem) => ({ ...item, installation: !!item.installation }))
            : [],
        });
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('steven-mechanics-demo-v1', JSON.stringify(data));
      } catch {
        setStorageError(true);
      }
  }, [data, ready]);
  return (
    <Context.Provider
      value={{
        data,
        ready,
        storageError,
        update: (patch) => setData((previous) => ({ ...previous, ...patch })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useDemo = () => useContext(Context);
