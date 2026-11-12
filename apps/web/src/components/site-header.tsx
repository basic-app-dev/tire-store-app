'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { Menu, X, ShoppingCart } from 'lucide-react';
import styles from './site-header.module.css';

const links = [
  ['Shop Products', '/catalog'],
  ['Services', '/services'],
  ['Why Choose Steven?', '/#main'],
] as const;

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const financing = useRef<HTMLDialogElement>(null);
  return (
    <header className={styles.header} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" onClick={() => setOpen(false)}>Steven Mechanics<span>.</span></Link>
        <nav id="main-nav" aria-label="Main navigation" className={`${styles.nav} ${open ? styles.open : ''}`}>
          {links.map(([name, url]) => (
            <Link key={url} href={url} onClick={() => setOpen(false)} aria-current={url !== '/#main' && (path === url || path.startsWith(`${url}/`)) ? 'page' : undefined}>{name}</Link>
          ))}
          <button type="button" onClick={() => financing.current?.showModal()}>Financing</button>
          <Link href="/stores" onClick={() => setOpen(false)} aria-current={path === '/stores' ? 'page' : undefined}>Find a Store</Link>
        </nav>
        <div className={styles.actions}>
          <button ref={menuButton} type="button" className={styles.toggle} aria-expanded={open} aria-controls="main-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
          <Link href="/checkout" className={styles.cart} aria-label="View cart" aria-current={path === '/checkout' ? 'page' : undefined} onClick={() => setOpen(false)}><ShoppingCart size={24} fill="currentColor" strokeWidth={2} aria-hidden="true" /></Link>
        </div>
      </div>
      <dialog ref={financing} className={styles.dialog} aria-labelledby="financing-title">
        <h2 id="financing-title">Financing</h2>
        <p>Financing details are not available yet. No financing offers or applications are available in this demo.</p>
        <button type="button" className="button secondary" aria-label="Close financing information" onClick={() => financing.current?.close()}>Close</button>
      </dialog>
    </header>
  );
}
