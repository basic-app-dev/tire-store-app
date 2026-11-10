import Link from 'next/link';
import { Search, Shield, Wrench, Clock, CheckCircle2, Star, ArrowRight, Gauge, MapPin } from 'lucide-react';
import { Button, Badge } from '@tire-store/ui';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section with Fitment Search */}
      <section className="relative overflow-hidden bg-gradient-to-b from-asphalt-900 via-asphalt-950 to-asphalt-950 pt-16 pb-24 border-b border-asphalt-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:32px_32px] opacity-10"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-raceRed-500/30 bg-raceRed-950/60 px-4 py-1.5 text-xs font-semibold text-raceRed-400 mb-6 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-raceRed-500 animate-pulse"></span>
              Precision Vehicle Fitment Engine v2.0
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
              Tires Matched to Your Vehicle.{' '}
              <span className="bg-gradient-to-r from-raceRed-500 via-pitAmber-400 to-raceRed-400 bg-clip-text text-transparent">
                Guaranteed Fitment.
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-alloy-300">
              Browse top brands, choose guaranteed factory-spec tire dimensions, select your local service bay, and lock in your appointment time slot in under 2 minutes.
            </p>
          </div>

          {/* Vehicle Fitment Lookup Card */}
          <div className="mx-auto max-w-4xl rounded-2xl border border-asphalt-700 bg-asphalt-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-asphalt-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-raceRed-500" />
                <h3 className="font-bold text-white text-base">Select Your Vehicle</h3>
              </div>
              <span className="text-xs text-alloy-400">Step 1 of 3: Vehicle Specs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-alloy-300 mb-1.5">1. Year</label>
                <select className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2.5 text-sm text-white focus:border-raceRed-500 focus:outline-none focus:ring-1 focus:ring-raceRed-500">
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-alloy-300 mb-1.5">2. Make</label>
                <select className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2.5 text-sm text-white focus:border-raceRed-500 focus:outline-none focus:ring-1 focus:ring-raceRed-500">
                  <option value="Toyota">Toyota</option>
                  <option value="Tesla">Tesla</option>
                  <option value="Honda">Honda</option>
                  <option value="Ford">Ford</option>
                  <option value="BMW">BMW</option>
                  <option value="Chevrolet">Chevrolet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-alloy-300 mb-1.5">3. Model</label>
                <select className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2.5 text-sm text-white focus:border-raceRed-500 focus:outline-none focus:ring-1 focus:ring-raceRed-500">
                  <option value="Camry">Camry</option>
                  <option value="RAV4">RAV4</option>
                  <option value="Model 3">Model 3</option>
                  <option value="Model Y">Model Y</option>
                  <option value="Civic">Civic</option>
                  <option value="F-150">F-150</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-alloy-300 mb-1.5">4. Trim / Wheel</label>
                <select className="w-full rounded-lg border border-asphalt-700 bg-asphalt-800 px-3.5 py-2.5 text-sm text-white focus:border-raceRed-500 focus:outline-none focus:ring-1 focus:ring-raceRed-500">
                  <option value="LE">LE (205/65R16)</option>
                  <option value="XSE">XSE (235/40R19)</option>
                  <option value="XLE">XLE (225/65R17)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-certifiedGreen-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>NHTSA Verified OEM Tire Dimensions</span>
              </div>
              <Link href="/catalog?make=Toyota&model=Camry&year=2024">
                <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold tracking-wide">
                  Find Matching Tires <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-6 flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-raceRed-600/20 text-raceRed-500">
              <Shield className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">Guaranteed Fitment</h4>
            <p className="text-xs text-alloy-400 leading-relaxed">
              Every tire recommendation aligns directly with OEM load index, speed rating, and wheel dimensions.
            </p>
          </div>

          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-6 flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nitroBlue-500/20 text-nitroBlue-400">
              <Wrench className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">3D Laser Alignment</h4>
            <p className="text-xs text-alloy-400 leading-relaxed">
              Equipped with Hawkeye Elite 3D alignment racks to prevent uneven wear and maximize tire lifespan.
            </p>
          </div>

          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-6 flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pitAmber-500/20 text-pitAmber-400">
              <Clock className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">Real-Time Bay Booking</h4>
            <p className="text-xs text-alloy-400 leading-relaxed">
              Dynamic service duration calculation reserves your dedicated technician bay to prevent appointment wait times.
            </p>
          </div>

          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-6 flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-certifiedGreen-500/20 text-certifiedGreen-400">
              <MapPin className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">PostGIS Store Locator</h4>
            <p className="text-xs text-alloy-400 leading-relaxed">
              Sub-millisecond spatial radius queries identify nearby stores with available service capacity.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Tires Preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Top Rated Tires for 2024</h2>
            <p className="text-sm text-alloy-400 mt-1">
              Field-tested for exceptional wet grip, tread longevity, and quiet ride quality.
            </p>
          </div>
          <Link href="/catalog" className="text-sm font-semibold text-raceRed-400 hover:text-raceRed-300 flex items-center gap-1">
            View All Tires <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900 p-5 flex flex-col justify-between hover:border-asphalt-700 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="accent">All-Season</Badge>
                <span className="text-xs text-alloy-400">60,000 mi warranty</span>
              </div>
              <h3 className="text-lg font-bold text-white">Michelin CrossClimate 2</h3>
              <p className="text-xs text-alloy-400 mt-1">235/45R18 • 98V Load & Speed</p>
              <div className="flex items-center gap-1 mt-3 text-pitAmber-400 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-pitAmber-400" />
                <span>4.9</span>
                <span className="text-alloy-500">(1,240 reviews)</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-asphalt-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-alloy-400">Starting at</span>
                <div className="text-xl font-extrabold text-white">$248.99<span className="text-xs font-normal text-alloy-400">/ea</span></div>
              </div>
              <Link href="/checkout">
                <Button size="sm" variant="primary">Select Tire</Button>
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900 p-5 flex flex-col justify-between hover:border-asphalt-700 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="success">Ultra Long Life</Badge>
                <span className="text-xs text-alloy-400">80,000 mi warranty</span>
              </div>
              <h3 className="text-lg font-bold text-white">Michelin Defender 2</h3>
              <p className="text-xs text-alloy-400 mt-1">215/50R17 • 95H Load & Speed</p>
              <div className="flex items-center gap-1 mt-3 text-pitAmber-400 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-pitAmber-400" />
                <span>4.8</span>
                <span className="text-alloy-500">(980 reviews)</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-asphalt-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-alloy-400">Starting at</span>
                <div className="text-xl font-extrabold text-white">$198.99<span className="text-xs font-normal text-alloy-400">/ea</span></div>
              </div>
              <Link href="/checkout">
                <Button size="sm" variant="primary">Select Tire</Button>
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-900 p-5 flex flex-col justify-between hover:border-asphalt-700 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="accent">High Performance</Badge>
                <span className="text-xs text-alloy-400">50,000 mi warranty</span>
              </div>
              <h3 className="text-lg font-bold text-white">Continental DWS06 Plus</h3>
              <p className="text-xs text-alloy-400 mt-1">235/40R19 • 96Y Ultra High Speed</p>
              <div className="flex items-center gap-1 mt-3 text-pitAmber-400 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-pitAmber-400" />
                <span>4.9</span>
                <span className="text-alloy-500">(1,820 reviews)</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-asphalt-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-alloy-400">Starting at</span>
                <div className="text-xl font-extrabold text-white">$265.99<span className="text-xs font-normal text-alloy-400">/ea</span></div>
              </div>
              <Link href="/checkout">
                <Button size="sm" variant="primary">Select Tire</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

