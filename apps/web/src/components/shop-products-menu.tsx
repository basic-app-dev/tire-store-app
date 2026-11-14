'use client';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import styles from './shop-products-menu.module.css';

const categories = [
  { id: 'tires', name: 'Tires', description: 'A little more confidence for every mile.', title: 'Find your next set of tires', text: 'The tire catalog is not available in this preview.', note: 'You can still explore tire installation, rotation and other care for your vehicle.', link: 'Explore tire services' },
  { id: 'wheels', name: 'Wheels', description: 'A new perspective on your everyday drive.', title: 'A fresh look for the road ahead', text: 'Wheel shopping is not available in this preview.', note: 'There are no wheel products or fitment tools to browse here. Explore our available vehicle services instead.', link: 'Explore vehicle services' },
  { id: 'parts', name: 'Parts & Accessories', description: 'The details that keep you moving.', title: 'Care, down to the details', text: 'Parts and accessories are not available in this preview.', note: 'We don’t currently offer an online parts catalog. See the vehicle care services you can explore today.', link: 'Explore vehicle services' },
  { id: 'offers', name: 'Special Offers', description: 'A clear view of what’s available.', title: 'No surprises. No invented savings.', text: 'Special offers are not available in this preview.', note: 'There are no active promotions, coupons or rebates listed here. You can explore our existing services without an offer.', link: 'Explore available services' },
] as const;

export function ShopProductsMenu({ onNavigate }: { onNavigate: () => void }) {
  const [selected, setSelected] = useState<string | null>('tires');
  return (
    <section id="shop-products" aria-label="Shop Products" className={styles.menu}>
      {categories.map((category, index) => (
        <Fragment key={category.id}>
          <button type="button" id={`shop-${category.id}`} className={styles.category} style={{ gridRow: index + 1 }} aria-label={category.name} aria-expanded={selected === category.id} aria-controls={`shop-${category.id}-content`} onClick={() => setSelected(selected === category.id ? null : category.id)}>
            <img src={`/images/shop-${category.id}.svg`} alt="" width={96} height={96} />
            <span className={styles.label}><span className={styles.name}>{category.name}</span><span className={styles.description}>{category.description}</span></span>
            <ChevronDown aria-hidden="true" className={styles.chevron} size={18} />
          </button>
          <div id={`shop-${category.id}-content`} role="region" aria-labelledby={`shop-${category.id}`} hidden={selected !== category.id} className={styles.content}>
            <div><p className={styles.eyebrow}>EXPLORE {category.name.toUpperCase()}</p><h2>{category.title}</h2><p className={styles.status}>{category.text}</p><p className={styles.note}>{category.note}</p></div>
            <Link href="/services" onClick={onNavigate} className={styles.link}>{category.link}<ArrowUpRight size={20} aria-hidden="true" /></Link>
            <p className={styles.caption}>Category illustrations are illustrative, not products for sale.</p>
          </div>
        </Fragment>
      ))}
    </section>
  );
}
