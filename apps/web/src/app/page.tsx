import Link from 'next/link';
import {
  ArrowUpRight,
  CircleDot,
  Wrench,
  SlidersHorizontal,
  RotateCw,
  Gauge,
  MapPin,
} from 'lucide-react';
const items = [
  {
    icon: CircleDot,
    title: 'The right tires for your road',
    text: 'Explore options for everyday commutes, weekend escapes and everything between.',
    url: '/catalog',
  },
  {
    icon: Wrench,
    title: 'Care beyond the tires',
    text: 'From a simple rotation to a wheel alignment, explore the care your vehicle needs.',
    url: '/services',
  },
  {
    icon: SlidersHorizontal,
    title: 'A clearer way to choose',
    text: 'Compare tire sizes, specifications and sample prices, all in one place.',
    url: '/catalog',
  },
  {
    icon: RotateCw,
    title: 'Keep the good miles coming',
    text: 'Get to know routine services that help keep your tires in good shape.',
    url: '/services',
  },
  {
    icon: Gauge,
    title: 'Make time for your vehicle',
    text: 'Choose a service and explore the appointment process at your own pace.',
    url: '/booking',
  },
  {
    icon: MapPin,
    title: 'Your next stop, made simple',
    text: 'Explore our sample location and see how a visit could come together.',
    url: '/stores',
  },
];
export default function HomePage() {
  return (
    <>
      <section className="hero container">
        <p className="eyebrow">TIRES. SERVICE. PEACE OF MIND.</p>
        <h1>
          A better drive
          <br className="desktop-break" /> starts here.
        </h1>
        <p className="hero-copy">
          The right tires. Thoughtful service. A little more confidence
          <br className="desktop-break" /> for wherever the road takes you.
        </p>
        <div className="actions">
          <Link className="button" href="/catalog">
            Find your tires <ArrowUpRight size={18} />
          </Link>
          <Link className="button secondary" href="/booking">
            Book a service <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="container feature-grid" aria-label="Explore Steven Mechanics">
        <Link className="image-link" href="/catalog">
          <img src="/images/tires.jpg" alt="Stacked tires with detailed tread patterns" />
          <div className="image-caption">
            <div>
              <span>READY FOR YOUR NEXT MILE</span>
              <h2>Find your perfect fit.</h2>
            </div>
            <ArrowUpRight aria-hidden="true" />
          </div>
        </Link>
        <Link className="image-link" href="/services">
          <img src="/images/service.jpg" alt="Close-up of automotive engine belts and pulleys" />
          <div className="image-caption">
            <div>
              <span>A LITTLE CARE GOES A LONG WAY</span>
              <h2>Leave it in good hands.</h2>
            </div>
            <ArrowUpRight aria-hidden="true" />
          </div>
        </Link>
      </section>
      <section className="container info-section">
        <div className="section-heading">
          <p className="eyebrow">HERE FOR THE ROAD AHEAD</p>
          <h2>
            Everything your drive needs.
            <br />
            Nothing it doesn’t.
          </h2>
        </div>
        <div className="info-grid">
          {items.map(({ icon: Icon, title, text, url }) => (
            <Link href={url} className="info-item" key={title}>
              <Icon size={27} strokeWidth={1.5} />
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="text-link">
                Explore <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
