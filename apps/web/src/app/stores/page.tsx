import { MapPin, Navigation, Phone, Mail, Clock, Wrench, CheckCircle } from 'lucide-react';
import { Button, Badge } from '@tire-store/ui';
import Link from 'next/link';

export default function StoresPage() {
  const stores = [
    {
      id: 'store-1',
      name: 'Apex Tire Center — Austin Downtown Flagship',
      code: 'ATX-001',
      address: '500 E 7th St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      phone: '(512) 555-0142',
      email: 'austin-flagship@apextire.com',
      distance: '2.4 miles away',
      baysCount: 4,
      bays: [
        { name: 'Bay 1 — Express Mount & Balance', alignment: false },
        { name: 'Bay 2 — Express Mount & Balance', alignment: false },
        { name: 'Bay 3 — Hawkeye Elite 3D Laser Alignment', alignment: true },
        { name: 'Bay 4 — Heavy Duty Truck Bay', alignment: true },
      ],
      hours: 'Mon-Sat 8:00 AM – 6:00 PM (Sun Closed)',
    },
    {
      id: 'store-2',
      name: 'Apex Tire Center — Dallas North Park',
      code: 'DAL-002',
      address: '8687 N Central Expy',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75225',
      phone: '(214) 555-0198',
      email: 'dallas-north@apextire.com',
      distance: '188 miles away',
      baysCount: 3,
      bays: [
        { name: 'Bay 1 — Rapid Mount & Road Force Balance', alignment: false },
        { name: 'Bay 2 — Computerized Alignment Rack', alignment: true },
        { name: 'Bay 3 — General Tire Service', alignment: false },
      ],
      hours: 'Mon-Sat 8:00 AM – 6:00 PM (Sun Closed)',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-asphalt-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Find a Service Store</h1>
          <p className="text-sm text-alloy-400 mt-1">
            Real-time PostGIS spatial locator with active bay capacities and certified alignment racks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter City, State, or Zip Code..."
            defaultValue="Austin, TX"
            className="rounded-lg border border-asphalt-700 bg-asphalt-800 px-4 py-2 text-sm text-white placeholder-alloy-500 focus:border-raceRed-500 focus:outline-none"
          />
          <Button variant="primary" size="sm" className="flex items-center gap-1.5">
            <Navigation className="h-4 w-4" /> Locate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {stores.map((store) => (
          <div
            key={store.id}
            className="rounded-2xl border border-asphalt-800 bg-asphalt-900 p-6 flex flex-col justify-between hover:border-asphalt-700 transition-all shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="success">Open Today</Badge>
                <span className="text-xs font-semibold text-nitroBlue-400 flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5" /> {store.distance}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">{store.name}</h2>
              <p className="text-xs text-alloy-300 flex items-center gap-1.5 mb-3">
                <MapPin className="h-4 w-4 text-raceRed-500 shrink-0" />
                <span>{store.address}, {store.city}, {store.state} {store.postalCode}</span>
              </p>

              <div className="space-y-1.5 text-xs text-alloy-400 border-t border-asphalt-800 pt-3 mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-alloy-400" />
                  <span>{store.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-alloy-400" />
                  <span>{store.hours}</span>
                </div>
              </div>

              {/* Service Bays List */}
              <div className="rounded-xl border border-asphalt-800/80 bg-asphalt-950/60 p-4 mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-pitAmber-400" /> Dedicated Service Bays ({store.baysCount})
                  </span>
                  <span className="text-[10px] text-certifiedGreen-400 font-semibold">Available for Booking</span>
                </div>
                <ul className="space-y-1.5 text-xs text-alloy-300">
                  {store.bays.map((bay, i) => (
                    <li key={i} className="flex items-center justify-between py-1 border-b border-asphalt-800/40 last:border-0">
                      <span>{bay.name}</span>
                      {bay.alignment ? (
                        <span className="text-[10px] font-semibold text-nitroBlue-400 bg-nitroBlue-950/60 border border-nitroBlue-500/30 px-1.5 py-0.5 rounded">
                          3D Laser
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-alloy-400">Standard</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-4">
              <Link href={`/checkout?store=${store.id}`} className="w-full">
                <Button variant="primary" className="w-full">
                  Select Store & Reserve Bay Slot
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

