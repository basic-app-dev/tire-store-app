'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useDemo } from './demo-provider';
import { products, money } from '@/lib/demo-data';
export function ProductDetail({ product: p }: { product: (typeof products)[number] }) {
  const { data, update, ready } = useDemo();
  const existing = data.cart.find((item) => item.slug === p.slug);
  const [quantity, setQuantity] = useState(4);
  const [installation, setInstallation] = useState(false);
  const [added, setAdded] = useState(false);
  const add = () => {
    update({
      cart: [
        ...data.cart.filter((item) => item.slug !== p.slug),
        { slug: p.slug, quantity, installation },
      ],
    });
    setAdded(true);
  };
  return (
    <div className="container page">
      <Link href="/catalog" className="text-link">
        ← All sample tires
      </Link>
      <div className="split" style={{ marginTop: 32 }}>
        <div>
          <img
            className="detail-image"
            src="/images/tires.jpg"
            alt="Illustrative stacked tire photograph, not a product photograph"
          />
          <p className="notice">
            Illustrative image. This is a sample product, not a manufacturer listing. Confirm size,
            load and speed ratings with a qualified installer.
          </p>
        </div>
        <section>
          <span className="badge">{p.category} · DEMO PRODUCT</span>
          <h1>{p.name}</h1>
          <p>{p.description}</p>
          <dl className="specs">
            <div>
              <dt>Tire size</dt>
              <dd>{p.size}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{p.category}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>Sample only</dd>
            </div>
          </dl>
          <p className="price">
            {money(p.price)} <small>/ tire · sample price</small>
          </p>
          <label className="field">
            Quantity
            <select
              aria-label="Quantity"
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                setAdded(false);
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={installation}
              onChange={(e) => {
                setInstallation(e.target.checked);
                setAdded(false);
              }}
            />
            Add installation · $25 / tire (demo)
          </label>
          <div className="total-row grand">
            <span>Sample subtotal</span>
            <span>{money(quantity * (p.price + (installation ? 25 : 0)))}</span>
          </div>
          <button disabled={!ready} className="button" onClick={add}>
            {existing ? 'Update demo cart' : 'Add to demo cart'}
          </button>
          {added && (
            <div role="status" style={{ marginTop: 20 }}>
              <p>Selection saved to your demo cart.</p>
              <Link className="text-link" href="/checkout">
                Review demo cart →
              </Link>
            </div>
          )}
          <p className="notice">
            Nothing is purchased or reserved. Taxes and fees are not calculated in this demo.
          </p>
        </section>
      </div>
    </div>
  );
}
