/**
 * React Query deterministic query key factories for tire store client applications.
 */
export const queryKeys = {
  tires: {
    all: ['tires'] as const,
    lists: () => [...queryKeys.tires.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.tires.lists(), filters] as const,
    details: () => [...queryKeys.tires.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tires.details(), id] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    years: () => [...queryKeys.vehicles.all, 'years'] as const,
    makes: (year: number) => [...queryKeys.vehicles.all, 'makes', year] as const,
    models: (year: number, make: string) =>
      [...queryKeys.vehicles.all, 'models', year, make] as const,
    trims: (year: number, make: string, model: string) =>
      [...queryKeys.vehicles.all, 'trims', year, make, model] as const,
    fitment: (year: number, make: string, model: string, trim: string) =>
      [...queryKeys.vehicles.all, 'fitment', year, make, model, trim] as const,
    garage: (userId: string) => [...queryKeys.vehicles.all, 'garage', userId] as const,
  },
  stores: {
    all: ['stores'] as const,
    locator: (lat: number, lng: number, radiusMiles?: number) =>
      [...queryKeys.stores.all, 'locator', { lat, lng, radiusMiles }] as const,
    detail: (id: string) => [...queryKeys.stores.all, 'detail', id] as const,
    bays: (storeId: string) => [...queryKeys.stores.all, storeId, 'bays'] as const,
    hours: (storeId: string) => [...queryKeys.stores.all, storeId, 'hours'] as const,
  },
  appointments: {
    all: ['appointments'] as const,
    availableSlots: (storeId: string, date: string, services: string[]) =>
      [...queryKeys.appointments.all, 'slots', { storeId, date, services }] as const,
    userList: (userId: string) => [...queryKeys.appointments.all, 'user', userId] as const,
    storeList: (storeId: string) => [...queryKeys.appointments.all, 'store', storeId] as const,
    detail: (id: string) => [...queryKeys.appointments.all, 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    userOrders: (userId: string) => [...queryKeys.orders.all, 'user', userId] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
  },
};
