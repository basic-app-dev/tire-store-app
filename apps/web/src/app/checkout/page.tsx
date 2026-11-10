import { Calendar, Clock, Wrench, ShieldCheck, CheckCircle2, CreditCard } from 'lucide-react';
import { Button, Badge } from '@tire-store/ui';

export default function CheckoutPage() {
  const timeSlots = [
    { time: '09:00 AM', available: true },
    { time: '10:00 AM', available: true },
    { time: '11:30 AM', available: false },
    { time: '01:00 PM', available: true },
    { time: '02:30 PM', available: true },
    { time: '04:00 PM', available: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-asphalt-800 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-white">Bay Booking & Checkout</h1>
        <p className="text-sm text-alloy-400 mt-1">
          Lock in your reserved service bay slot and review your installation summary.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Bay Appointment Slot Picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Appointment Date & Time */}
          <div className="rounded-2xl border border-asphalt-800 bg-asphalt-900 p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-raceRed-500" />
              <h2 className="text-lg font-bold text-white">1. Select Appointment Date & Bay Slot</h2>
            </div>

            <p className="text-xs text-alloy-400 mb-6">
              Apex Tire Center — Austin Downtown Flagship (Bay 3: Hawkeye Elite 3D Laser Alignment)
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {timeSlots.map((slot, i) => (
                <button
                  key={i}
                  disabled={!slot.available}
                  className={`rounded-xl border p-3.5 text-center text-sm font-semibold transition-all ${
                    slot.available
                      ? i === 1
                        ? 'border-raceRed-500 bg-raceRed-600/10 text-white shadow-md shadow-raceRed-600/20 ring-1 ring-raceRed-500'
                        : 'border-asphalt-700 bg-asphalt-800/80 text-alloy-200 hover:border-asphalt-600 hover:text-white'
                      : 'border-asphalt-800/40 bg-asphalt-950/40 text-alloy-600 cursor-not-allowed line-through'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-alloy-400" />
                    <span>{slot.time}</span>
                  </div>
                  <span className="text-[10px] block mt-1 font-normal text-alloy-400">
                    {slot.available ? (i === 1 ? 'Selected' : 'Available') : 'Booked'}
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-nitroBlue-500/20 bg-nitroBlue-950/40 p-4 text-xs text-alloy-300 flex items-start gap-3">
              <Clock className="h-4 w-4 text-nitroBlue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Dynamic Duration: 90 Minutes Total</span>
                <p className="text-alloy-400 mt-0.5">
                  Calculated based on 4x tire mount & road-force balance (60m) + Hawkeye Elite 3D 4-wheel alignment (+30m).
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Contact & Vehicle Details */}
          <div className="rounded-2xl border border-asphalt-800 bg-asphalt-900 p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-raceRed-500" />
              <h2 className="text-lg font-bold text-white">2. Customer & Vehicle Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-alloy-300 mb-1">Full Name</label>
                <input
                  type="text"
                  defaultValue="Alex Morgan"
                  className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2 text-sm text-white focus:border-raceRed-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-alloy-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  defaultValue="(512) 555-0199"
                  className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2 text-sm text-white focus:border-raceRed-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-alloy-300 mb-1">Email Address (Order Confirmation)</label>
                <input
                  type="email"
                  defaultValue="alex.morgan@example.com"
                  className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2 text-sm text-white focus:border-raceRed-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Atomic Checkout */}
        <div className="rounded-2xl border border-asphalt-800 bg-asphalt-900 p-6 h-fit shadow-xl space-y-6">
          <h3 className="font-bold text-white text-lg border-b border-asphalt-800 pb-3">Order Summary</h3>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-white">4x Michelin CrossClimate 2</span>
                <span className="block text-alloy-400">235/45R18 • 98V</span>
              </div>
              <span className="font-semibold text-white">$995.96</span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-alloy-200">Professional Mount & Road Force Balance</span>
                <span className="block text-alloy-400">4 Wheels @ $20/tire</span>
              </div>
              <span className="font-semibold text-white">$80.00</span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-alloy-200">Hawkeye Elite 3D Laser Alignment</span>
                <span className="block text-alloy-400">Complete 4-wheel alignment</span>
              </div>
              <span className="font-semibold text-white">$129.99</span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-alloy-300">Tire Disposal & Environmental Fee</span>
              <span className="text-white">$12.00</span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-alloy-300">Estimated Sales Tax (8.25%)</span>
              <span className="text-white">$100.48</span>
            </div>
          </div>

          <div className="border-t border-asphalt-800 pt-4 flex justify-between items-center">
            <span className="text-sm font-bold text-white">Total Amount</span>
            <span className="text-2xl font-black text-white">$1,318.43</span>
          </div>

          <div className="rounded-xl bg-asphalt-950/80 border border-asphalt-800 p-3.5 text-xs text-certifiedGreen-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Atomic RPC guarantees bay reservation upon payment.</span>
          </div>

          <Button variant="primary" size="lg" className="w-full font-bold flex items-center justify-center gap-2">
            <CreditCard className="h-4 w-4" /> Complete Atomic Booking
          </Button>

          <p className="text-center text-[10px] text-alloy-500">
            Encrypted with 256-bit SSL. Transactions processed via atomic database RPC to guarantee no double booking.
          </p>
        </div>
      </div>
    </div>
  );
}

