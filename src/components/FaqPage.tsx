import { t } from '../lib/i18n';
import type { SiteConfig } from '../lib/config';
import { PaymentDetails } from './PaymentDetails';

const ITEMS = [1, 2, 3, 4] as const;

export function FaqPage({ config }: { config: SiteConfig | null }) {
  return (
    <div className="stack narrow">
      <div>
        <a className="backlink" href="#/">
          {t('app.back')}
        </a>
        <h1 className="h1">{t('faq.title')}</h1>
      </div>
      <div className="stack stack--xs">
        {ITEMS.map((n) => (
          <details key={n} className="faq" open={n === 1}>
            <summary>
              {t(`faq.q${n}`)} <span aria-hidden="true">+</span>
            </summary>
            <div className="faq__body">{t(`faq.a${n}`)}</div>
          </details>
        ))}
        <details className="faq" id="contacts" open>
          <summary>
            {t('faq.coordinators')} <span aria-hidden="true">+</span>
          </summary>
          <ul className="coords">
            {(config?.coordinators ?? []).map((c) => (
              <li key={c.name + c.phone}>
                <span className="coords__name">{c.name}</span>
                <span className="coords__links">
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
                  {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
      <PaymentDetails variant="faq" config={config} />
    </div>
  );
}
