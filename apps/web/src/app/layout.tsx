import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Link from 'next/link';
import { ShoppingCart, Compass, Wrench, ShieldCheck, Car } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Apex Tire Center — Precision Tires, Laser Alignment & Bay Booking',
  description:
    'Guaranteed vehicle fitment matching, real-time PostGIS store locator, laser 3D alignment, and instant appointment bay scheduling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-asphalt-950 text-alloy-100 flex min-h-screen flex-col font-sans antialiased selection:bg-raceRed-600 selection:text-white">
        <Providers>
          {/* Top Announcement Bar */}
          <div className="bg-gradient-to-r from-raceRed-900 via-raceRed-700 to-raceRed-900 px-4 py-2 text-center text-xs font-semibold tracking-wider text-white uppercase">
            ⚡ Fall Tire Sale: Up to $120 Instant Rebate on Sets of 4 + Free Installation Inspection
          </div>

          {/* Navigation Bar */}
          <header className="sticky top-0 z-50 border-b border-asphalt-800 bg-asphalt-900/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-raceRed-600 font-extrabold text-white shadow-lg shadow-raceRed-600/30">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xl font-black tracking-tight text-white">APEX</span>
                    <span className="text-xl font-light tracking-widest text-raceRed-500">TIRE</span>
                  </div>
                </Link>

                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                  <Link href="/catalog" className="text-alloy-300 transition-colors hover:text-white">
                    Tire Catalog
                  </Link>
                  <Link href="/stores" className="text-alloy-300 transition-colors hover:text-white">
                    Store Locator
                  </Link>
                  <Link href="/checkout" className="text-alloy-300 transition-colors hover:text-white">
                    Service & Bay Booking
                  </Link>
                  <Link href="/admin" className="text-alloy-400 transition-colors hover:text-raceRed-400">
                    Store Portal
                  </Link>
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/stores"
                  className="hidden sm:flex items-center gap-1.5 text-xs text-alloy-300 hover:text-white"
                >
                  <Compass className="h-4 w-4 text-nitroBlue-400" />
                  <span>Find a Store</span>
                </Link>

                <Link
                  href="/checkout"
                  className="flex items-center gap-2 rounded-lg bg-asphalt-800 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-asphalt-700 hover:border-asphalt-600 border border-asphalt-700/80 shadow-inner"
                >
                  <ShoppingCart className="h-4 w-4 text-pitAmber-400" />
                  <span>Cart</span>
                  <span className="ml-1 rounded-full bg-raceRed-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    0
                  </span>
                </Link>
              </div>
            </div>
          </header>

          {/* Main App Content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t border-asphalt-800 bg-asphalt-900 py-12 text-alloy-400">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Car className="h-5 w-5 text-raceRed-500" />
                  <span className="text-lg font-black text-white">APEX TIRE</span>
                </div>
                <p className="text-xs leading-relaxed text-alloy-400">
                  Precision fitment matching, factory-certified master technicians, 3D laser alignment, and certified road hazard protection.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Tire Catalog</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/catalog?season=all_season" className="hover:text-white">All-Season Tires</Link></li>
                  <li><Link href="/catalog?season=performance" className="hover:text-white">Ultra High Performance</Link></li>
                  <li><Link href="/catalog?season=truck_suv" className="hover:text-white">Truck & SUV All-Terrain</Link></li>
                  <li><Link href="/catalog?season=winter" className="hover:text-white">Winter & Severe Snow</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Services</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/checkout" className="hover:text-white">Precision Mount & Balance</Link></li>
                  <li><Link href="/checkout" className="hover:text-white">Hawkeye Elite 3D Alignment</Link></li>
                  <li><Link href="/checkout" className="hover:text-white">TPMS Sensor Calibration</Link></li>
                  <li><Link href="/checkout" className="hover:text-white">Road Hazard Warranty</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Stores & System</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/stores" className="hover:text-white">Austin Downtown Flagship</Link></li>
                  <li><Link href="/stores" className="hover:text-white">Dallas North Park Center</Link></li>
                  <li><Link href="/admin" className="hover:text-white">Technician & Bay Schedule</Link></li>
                  <li><a href="http://localhost:4000/health" target="_blank" rel="noreferrer" className="hover:text-certifiedGreen-400">Backend API Health (Port 4000)</a></li>
                </ul>
              </div>
            </div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-asphalt-800/80 text-center text-xs text-alloy-500">
              © {new Date().getFullYear()} Apex Tire Center Inc. All rights reserved. Monorepo architecture powered by Next.js App Router, Expo, PostGIS & Supabase.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

