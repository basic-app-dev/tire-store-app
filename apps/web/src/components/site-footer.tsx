import Link from 'next/link';
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link href="/" className="wordmark">
              Steven Mechanics
              <span aria-hidden="true" className="wordmark-dot">
                .
              </span>
            </Link>
            <p>A little care. A long way to go.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/catalog">Shop tires</Link>
            <Link href="/services">Our services</Link>
            <Link href="/stores">Locations & contact</Link>
            <Link href="/booking">Book service</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>Steven Mechanics · Website demonstration</span>
          <span>
            Sample products, prices, locations and availability. No orders or appointments are
            placed.
          </span>
        </div>
      </div>
    </footer>
  );
}
