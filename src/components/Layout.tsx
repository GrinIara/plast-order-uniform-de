import type { ReactNode } from 'react';
import { cartUnits, useCart } from '../lib/cart';
import { t } from '../lib/i18n';
import { useLive } from '../lib/live';
import type { Theme } from '../lib/theme';
import { formatDate, unitsWord } from '../lib/ui';

interface Props {
  station: string | null;
  dataDate: string | null;
  theme: Theme;
  onToggleTheme: () => void;
  children: ReactNode;
}

export function Layout({ station, dataDate, theme, onToggleTheme, children }: Props) {
  const count = cartUnits(useCart());
  const live = useLive();
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        {t('app.skipLink')}
      </a>
      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>

      <header className="header">
        <div className="banner">{t('banner.deadline')}</div>
        <div className="header__inner">
          <a className="brand" href="#/">
            <span className="brand__name">{t('brand.name')}</span>
            {station && <span className="brand__sub">{t('brand.station', { station })}</span>}
          </a>
          <a className="navlink" href="#/faq">
            {t('nav.faq')}
          </a>
          <a className="cartbtn" href="#/cart" aria-label={t('nav.cartAria', { count, unit: unitsWord(count) })}>
            <span>{t('nav.cart')}</span>
            <span className="cartbtn__count">{count}</span>
          </a>
        </div>
      </header>

      <main id="main" className="main">
        {children}
      </main>

      <footer className="footer">
        <div className="footer__inner">
          {dataDate && <span>{t('footer.dataDate', { date: formatDate(dataDate) })}</span>}
          <nav aria-label={t('nav.footer')} className="footer__nav">
            <a href="#/impressum">{t('footer.impressum')}</a>
            <a href="#/datenschutz">{t('footer.privacy')}</a>
            <a href="#/faq">{t('footer.contacts')}</a>
          </nav>
          <button type="button" className="themebtn" onClick={onToggleTheme}>
            {theme === 'dark' ? t('footer.themeLight') : t('footer.themeDark')}
          </button>
        </div>
      </footer>
    </div>
  );
}
