import { Wrench, Calendar, CheckCircle2, AlertCircle, Clock, UserCheck } from 'lucide-react';
import { Badge, Button } from '@tire-store/ui';

export default function AdminBayPage() {
  const bays = [
    {
      id: 1,
      name: 'Bay 1 — Express Mount & Balance',
      status: 'occupied',
      technician: 'Marcus Vance',
      currentVehicle: '2024 Toyota Camry (LE)',
      service: '4x Tire Mount & Balance',
      slot: '09:00 AM – 10:00 AM',
      progress: '75%',
    },
    {
      id: 2,
      name: 'Bay 2 — Express Mount & Balance',
      status: 'available',
      technician: 'Open / Unassigned',
      currentVehicle: 'None',
      service: 'Ready for Next Vehicle',
      slot: 'Next Booking: 10:30 AM',
      progress: '0%',
    },
    {
      id: 3,
      name: 'Bay 3 — Hawkeye Elite 3D Laser Alignment',
      status: 'occupied',
      technician: 'Elena Rostova',
      currentVehicle: '2024 Tesla Model Y (Long Range)',
      service: 'Mount, Balance & 3D Alignment',
      slot: '09:00 AM – 10:30 AM',
      progress: '40%',
    },
    {
      id: 4,
      name: 'Bay 4 — Heavy Duty Truck Bay',
      status: 'scheduled',
      technician: 'David Miller',
      currentVehicle: '2024 Ford F-150 (XLT)',
      service: '4x All-Terrain Mount & Balance',
      slot: '10:00 AM – 11:15 AM',
      progress: 'Upcoming',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-asphalt-800 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Store Manager View</Badge>
            <span className="text-xs text-alloy-400">Austin Downtown Flagship (#ATX-001)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Live Service Bay Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            Refresh Schedule
          </Button>
          <Button variant="primary" size="sm">
            + Manual Walk-in Check-in
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bays.map((bay) => (
          <div
            key={bay.id}
            className="rounded-2xl border border-asphalt-800 bg-asphalt-900 p-6 flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-raceRed-500" />
                  {bay.name}
                </span>
                {bay.status === 'occupied' ? (
                  <Badge variant="error">In Service</Badge>
                ) : bay.status === 'available' ? (
                  <Badge variant="success">Available</Badge>
                ) : (
                  <Badge variant="accent">Upcoming</Badge>
                )}
              </div>

              <div className="rounded-xl border border-asphalt-800 bg-asphalt-950 p-4 space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-alloy-400">Current Vehicle:</span>
                  <span className="font-semibold text-white">{bay.currentVehicle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-alloy-400">Services:</span>
                  <span className="text-alloy-200">{bay.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-alloy-400">Technician:</span>
                  <span className="text-alloy-200 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-certifiedGreen-400" /> {bay.technician}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-alloy-400">Time Window:</span>
                  <span className="text-pitAmber-400 font-mono">{bay.slot}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-alloy-500">Bay ID: #{bay.id}</span>
              <Button variant="secondary" size="sm">
                Update Status
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

