'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useDemo } from '@/components/demo-provider';
import { BookingSummary } from '@/components/booking-summary';
import { products, services, money, type CartItem } from '@/lib/demo-data';
export default function Checkout() {
  const { data, update, ready } = useDemo();
  const [finished, setFinished] = useState(false);
  const patchItem = (slug: string, patch: Partial<CartItem>) =>
    update({ cart: data.cart.map((item) => (item.slug === slug ? { ...item, ...patch } : item)) });
  const tires = data.cart.reduce(
    (sum, item) => sum + (products.find((p) => p.slug === item.slug)?.price || 0) * item.quantity,
    0
  );
  const installation = data.cart.reduce(
    (sum, item) => sum + (item.installation ? item.quantity * 25 : 0),
    0
  );
  const service = services.find((s) => s.id === data.booking.service);
  const visit = !!(
    service &&
    data.booking.vehicle &&
    data.booking.location &&
    data.booking.date &&
    data.booking.time
  );
  const servicePrice =
    visit && service?.id !== 'tire_installation'
      ? service?.price || 0
      : visit && installation === 0
        ? service?.price || 0
        : 0;
  const total = tires + installation + servicePrice;
  if (finished)
    return (
      <div className="container page">
        <div className="page-intro">
          <p className="eyebrow">THAT’S THE DEMO</p>
          <h1>Demo complete. Nothing booked or charged.</h1>
          <p>
            Your selections remain on this device for you to explore. No order was sent, no
            appointment was reserved and no payment was taken.
          </p>
          <button className="button" onClick={() => setFinished(false)}>
            Back to cart
          </button>
        </div>
      </div>
    );
  return (
    <div className="container page">
      <div className="page-intro">
        <p className="eyebrow">ONE LAST LOOK</p>
        <h1>Your road ahead.</h1>
        <p>Review your demo cart and sample appointment.</p>
      </div>
      <div className="notice">
        This is a demonstration, not a checkout. No personal or payment details are collected.
        Nothing will be booked or charged.
      </div>
      {!ready ? (
        <p role="status">Loading your selections…</p>
      ) : (
        <div className="split">
          <section aria-label="Demo cart">
            {!data.cart.length ? (
              <div className="empty">
                <h2>Your demo cart is empty.</h2>
                <p>Find a sample tire, or explore a service appointment.</p>
                <Link href="/catalog" className="button">
                  Explore tires
                </Link>
              </div>
            ) : (
              data.cart.map((item) => {
                const p = products.find((p) => p.slug === item.slug)!;
                return (
                  <article className="cart-item" key={item.slug}>
                    <span className="badge">SAMPLE PRODUCT</span>
                    <h2>
                      <Link href={'/catalog/' + p.slug}>{p.name}</Link>
                    </h2>
                    <p>
                      {p.size} · {money(p.price)} / tire
                    </p>
                    <label className="field">
                      Quantity
                      <select
                        aria-label={'Quantity for ' + p.name}
                        value={item.quantity}
                        onChange={(e) => patchItem(item.slug, { quantity: Number(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={item.installation}
                        onChange={(e) => patchItem(item.slug, { installation: e.target.checked })}
                      />
                      Installation · $25 / tire (demo)
                    </label>
                    <button
                      className="subtle-button"
                      aria-label={'Remove ' + p.name}
                      onClick={() =>
                        update({ cart: data.cart.filter((i) => i.slug !== item.slug) })
                      }
                    >
                      Remove
                    </button>
                    <p className="price">
                      {money(item.quantity * (p.price + (item.installation ? 25 : 0)))}
                    </p>
                  </article>
                );
              })
            )}
            <div className="panel" style={{ marginTop: 28 }}>
              <BookingSummary booking={data.booking} />
            </div>
          </section>
          <aside className="panel summary">
            <h2>Demo estimate.</h2>
            <div className="total-row">
              <span>Tires</span>
              <span>{money(tires)}</span>
            </div>
            <div className="total-row">
              <span>Installation</span>
              <span>{money(installation)}</span>
            </div>
            <div className="total-row">
              <span>Sample service{visit ? '' : ' (not selected)'}</span>
              <span>{money(servicePrice)}</span>
            </div>
            <div className="total-row">
              <span>Taxes & fees</span>
              <span>Not calculated</span>
            </div>
            <div className="total-row grand">
              <span>Demo total</span>
              <span data-testid="demo-total">{money(total)}</span>
            </div>
            <p>
              USD · illustrative subtotal, not a quote. Installation is counted only once when a
              sample tire-installation appointment is selected.
            </p>
            <button
              className="button"
              disabled={!data.cart.length && !visit}
              onClick={() => setFinished(true)}
            >
              Finish demo
            </button>
            <p style={{ marginTop: 16, fontSize: 12 }}>Nothing booked. Nothing charged.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
