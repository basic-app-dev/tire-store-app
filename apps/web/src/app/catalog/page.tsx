import { Filter, SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react';
import { Button, Badge } from '@tire-store/ui';
import Link from 'next/link';

export default function CatalogPage({
  searchParams,
}: {
  searchParams: { make?: string; model?: string; year?: string; season?: string };
}) {
  const tires = [
    {
      id: '1',
      brand: 'Michelin',
      model: 'CrossClimate 2',
      season: 'All-Season',
      size: '235/45R18',
      price: '$248.99',
      warranty: '60,000 miles',
      badge: 'Best Seller',
      description: 'Exceptional all-season traction with revolutionary 3D SipeLock technology.',
    },
    {
      id: '2',
      brand: 'Michelin',
      model: 'Defender 2',
      season: 'All-Season',
      size: '215/50R17',
      price: '$198.99',
      warranty: '80,000 miles',
      badge: 'Longest Tread Life',
      description: 'Engineered for ultimate tread longevity and quiet, comfortable highway cruising.',
    },
    {
      id: '3',
      brand: 'Continental',
      model: 'ExtremeContact DWS06 Plus',
      season: 'Ultra High Performance',
      size: '235/40R19',
      price: '$265.99',
      warranty: '50,000 miles',
      badge: 'Top Performance',
      description: 'Precision cornering, wet braking indicators, and tuned snow traction.',
    },
    {
      id: '4',
      brand: 'Bridgestone',
      model: 'Turanza QuietTrack',
      season: 'Touring All-Season',
      size: '225/45R18',
      price: '$229.99',
      warranty: '80,000 miles',
      badge: 'Whisper Quiet',
      description: 'Dampens harsh road noise and delivers confident wet and dry control.',
    },
    {
      id: '5',
      brand: 'Goodyear',
      model: 'Wrangler All-Terrain Adventure',
      season: 'All-Terrain',
      size: '275/65R18',
      price: '$289.99',
      warranty: '60,000 miles',
      badge: 'DuPont Kevlar',
      description: 'Rugged strength for harsh highway and off-road rocky trail conditions.',
    },
    {
      id: '6',
      brand: 'Pirelli',
      model: 'P Zero All Season Plus 3',
      season: 'Performance',
      size: '255/45R19',
      price: '$295.99',
      warranty: '50,000 miles',
      badge: 'Luxury Sport',
      description: 'Responsive steering precision crafted for North American performance cars.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-asphalt-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Tire Catalog</h1>
          <p className="text-sm text-alloy-400 mt-1">
            {searchParams.make
              ? `Showing fitments for ${searchParams.year || 2024} ${searchParams.make} ${searchParams.model || ''}`
              : 'Showing all premium certified tires in database'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" /> Sort: Featured
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-5">
            <h3 className="font-bold text-white text-sm mb-4">Season Category</h3>
            <div className="space-y-2 text-xs">
              {['All-Season', 'Performance', 'Winter / Snow', 'All-Terrain'].map((s) => (
                <label key={s} className="flex items-center gap-2.5 text-alloy-300 hover:text-white cursor-pointer">
                  <input type="checkbox" className="rounded border-asphalt-700 bg-asphalt-800 text-raceRed-600 focus:ring-raceRed-500" defaultChecked={s === 'All-Season'} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-5">
            <h3 className="font-bold text-white text-sm mb-4">Tire Brand</h3>
            <div className="space-y-2 text-xs">
              {['Michelin', 'Continental', 'Bridgestone', 'Goodyear', 'Pirelli'].map((b) => (
                <label key={b} className="flex items-center gap-2.5 text-alloy-300 hover:text-white cursor-pointer">
                  <input type="checkbox" className="rounded border-asphalt-700 bg-asphalt-800 text-raceRed-600 focus:ring-raceRed-500" defaultChecked />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-5">
            <h3 className="font-bold text-white text-sm mb-4">Speed Rating</h3>
            <div className="space-y-2 text-xs">
              {['Y (186 mph)', 'W (168 mph)', 'V (149 mph)', 'H (130 mph)'].map((sr) => (
                <label key={sr} className="flex items-center gap-2.5 text-alloy-300 hover:text-white cursor-pointer">
                  <input type="checkbox" className="rounded border-asphalt-700 bg-asphalt-800 text-raceRed-600 focus:ring-raceRed-500" />
                  <span>{sr}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Cards Grid */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {tires.map((tire) => (
            <div
              key={tire.id}
              className="rounded-xl border border-asphalt-800 bg-asphalt-900 p-6 flex flex-col justify-between hover:border-asphalt-700 transition-all shadow-md group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="accent">{tire.badge}</Badge>
                  <span className="text-xs text-alloy-400">{tire.warranty}</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-raceRed-400 transition-colors">
                  {tire.brand} {tire.model}
                </h3>
                <p className="text-xs font-mono text-alloy-300 mt-1">{tire.size} • {tire.season}</p>
                <p className="text-xs text-alloy-400 mt-3 leading-relaxed">{tire.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-asphalt-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-alloy-400">Unit Price</span>
                  <div className="text-xl font-extrabold text-white">{tire.price}</div>
                </div>
                <Link href={`/checkout?tire=${tire.id}`}>
                  <Button variant="primary" size="sm">
                    Select & Book Bay
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

