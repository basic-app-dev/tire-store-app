import Link from 'next/link';
import { type Booking, services, vehicles, money } from '@/lib/demo-data';
export function BookingSummary({ booking: b }: { booking: Booking }) {
  const service = services.find((s) => s.id === b.service);
  return (
    <>
      <h2>Your sample visit.</h2>
      <dl className="specs">
        <div>
          <dt>Service</dt>
          <dd>{service?.name || 'Not selected'}</dd>
        </div>
        <div>
          <dt>Vehicle</dt>
          <dd>{vehicles.find((v) => v.id === b.vehicle)?.name || 'Not selected'}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{b.location ? 'Sample workshop' : 'Not selected'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{b.date || 'Not selected'}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{b.time || 'Not selected'}</dd>
        </div>
        <div>
          <dt>Service estimate</dt>
          <dd>{service ? money(service.price) : '—'}</dd>
        </div>
      </dl>
      <p>Illustrative availability and prices. No appointment has been reserved.</p>
      <Link className="text-link" href="/booking">
        Edit sample appointment →
      </Link>
    </>
  );
}
