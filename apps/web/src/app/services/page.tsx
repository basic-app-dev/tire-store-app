import Link from 'next/link';
import {
  CircleDot,
  SlidersHorizontal,
  RotateCw,
  Wrench,
  Gauge,
  Snowflake,
  ArrowUpRight,
} from 'lucide-react';
const services = [
  [
    'Tire installation',
    'tire_installation',
    'Mounting and balancing for your next set of tires.',
    'From $25 / tire',
    CircleDot,
  ],
  [
    'Wheel alignment',
    'wheel_alignment',
    'An alignment check to help keep your vehicle tracking straight.',
    '$110',
    SlidersHorizontal,
  ],
  [
    'Tire rotation',
    'tire_rotation',
    'Move tires between positions to support even wear.',
    '$35',
    RotateCw,
  ],
  [
    'Flat tire assessment',
    'flat_repair',
    'An inspection to explore whether a damaged tire can be repaired.',
    '$30',
    Wrench,
  ],
  [
    'Vehicle inspection',
    'inspection',
    'A starting point for understanding your vehicle’s condition.',
    '$40',
    Gauge,
  ],
  [
    'Seasonal changeover',
    'seasonal_changeover',
    'Switch between your seasonal sets when the weather turns.',
    '$90',
    Snowflake,
  ],
] as const;
export default function Services() {
  return (
    <div className="container page">
      <div className="page-intro">
        <p className="eyebrow">A LITTLE CARE. A LONG WAY.</p>
        <h1>Good care. More miles.</h1>
        <p>Keep the everyday running smoothly, with care for what moves you.</p>
      </div>
      <div className="service-banner">
        <img src="/images/service.jpg" alt="Automotive engine belts and pulleys" />
        <div>
          <h2>Start with what your vehicle needs.</h2>
          <p>
            Explore illustrative services below, then walk through a sample appointment. These are
            demo offerings and prices, not a quote.
          </p>
          <Link className="button" href="/booking">
            Explore booking <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <div className="service-grid">
        {services.map(([name, id, description, price, Icon]) => (
          <article className="service-card" key={id}>
            <Icon size={28} />
            <h2>{name}</h2>
            <p>{description}</p>
            <p className="price">
              {price} <small>sample price</small>
            </p>
            <Link className="text-link" href={'/booking?service=' + id}>
              Choose service <ArrowUpRight size={17} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
