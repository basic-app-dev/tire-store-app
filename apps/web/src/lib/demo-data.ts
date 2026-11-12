export const products = [
  {
    slug: 'all-road-comfort',
    name: 'All Road Comfort',
    category: 'All-season',
    size: '235/45R18',
    price: 189,
    description:
      'A balanced choice for everyday journeys, with a focus on comfort and wet-road control.',
  },
  {
    slug: 'touring-plus',
    name: 'Touring Plus',
    category: 'All-season',
    size: '235/45R18',
    price: 219,
    description: 'A comfort-focused touring option for the long way home.',
  },
  {
    slug: 'everyday-touring',
    name: 'Everyday Touring',
    category: 'All-season',
    size: '215/55R17',
    price: 149,
    description: 'A straightforward option for daily commutes and weekend errands.',
  },
  {
    slug: 'winter-ready',
    name: 'Winter Ready',
    category: 'Winter',
    size: '215/55R17',
    price: 179,
    description: 'An illustrative cold-weather option for seasonal driving.',
  },
  {
    slug: 'trail-explorer',
    name: 'Trail Explorer',
    category: 'All-terrain',
    size: '275/65R18',
    price: 249,
    description: 'A versatile sample tire for trucks and mixed-surface adventures.',
  },
  {
    slug: 'sport-response',
    name: 'Sport Response',
    category: 'Performance',
    size: '225/45R18',
    price: 229,
    description: 'A responsive sample option for drivers who enjoy the curves.',
  },
] as const;
export const vehicles = [
  { id: 'camry', name: '2024 Toyota Camry · sample 235/45R18', size: '235/45R18' },
  { id: 'civic', name: '2023 Honda Civic · sample 215/55R17', size: '215/55R17' },
  { id: 'f150', name: '2024 Ford F-150 · sample 275/65R18', size: '275/65R18' },
];
export const services = [
  { id: 'tire_installation', name: 'Tire installation', price: 100 },
  { id: 'wheel_alignment', name: 'Wheel alignment', price: 110 },
  { id: 'tire_rotation', name: 'Tire rotation', price: 35 },
  { id: 'flat_repair', name: 'Flat tire assessment', price: 30 },
  { id: 'inspection', name: 'Vehicle inspection', price: 40 },
  { id: 'seasonal_changeover', name: 'Seasonal changeover', price: 90 },
];
export const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
export type Filters = { mode: string; vehicle: string; size: string; season: string; sort: string };
export type Booking = {
  service: string;
  vehicle: string;
  location: string;
  date: string;
  time: string;
};
export type CartItem = { slug: string; quantity: number; installation: boolean };
export const defaultFilters: Filters = {
  mode: 'size',
  vehicle: '',
  size: '',
  season: '',
  sort: 'featured',
};
export const defaultBooking: Booking = {
  service: '',
  vehicle: '',
  location: '',
  date: '',
  time: '',
};
