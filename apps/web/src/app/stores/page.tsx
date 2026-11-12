import Link from 'next/link';
import { MapPin, ArrowUpRight } from 'lucide-react';
export default function Stores() {
  return (
    <div className="container page">
      <div className="page-intro">
        <p className="eyebrow">YOUR NEXT STOP</p>
        <h1>A place to get moving.</h1>
        <p>Get familiar with a sample visit before exploring an appointment.</p>
      </div>
      <div className="location-grid">
        <div
          className="location-illustration"
          role="img"
          aria-label="Illustrative location diagram, not a navigable map"
        >
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          <div className="map-marker">
            <MapPin size={38} />
            <strong>Sample workshop</strong>
            <span>Illustration · not a real map</span>
          </div>
        </div>
        <section className="panel">
          <span className="badge">DEMO LOCATION</span>
          <h2>
            Steven Mechanics
            <br />
            Sample workshop
          </h2>
          <p>
            This location is illustrative. A real address, opening hours and contact details have
            not been provided.
          </p>
          <dl className="specs">
            <div>
              <dt>Address</dt>
              <dd>Not provided</dd>
            </div>
            <div>
              <dt>Opening hours</dt>
              <dd>Not provided</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>Sample tire & vehicle care</dd>
            </div>
          </dl>
          <Link href="/booking" className="button">
            Try a sample appointment <ArrowUpRight size={18} />
          </Link>
        </section>
      </div>
      <section id="contact" className="contact-section">
        <p className="eyebrow">LET’S TALK</p>
        <h2>Contact Steven Mechanics.</h2>
        <p>
          Verified phone and email details are not available in this demonstration.
          <br />
          No real messages, orders or appointments can be sent from this site.
        </p>
        <Link className="text-link" href="/services">
          Explore sample services <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
