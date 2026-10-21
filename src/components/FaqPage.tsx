import { useEffect } from 'react';
import { SIZE_CHARTS } from '../content/sizeCharts';
import { chartFromHash, useHash } from '../lib/route';
import { t } from '../lib/i18n';
import type { SiteConfig } from '../lib/config';

const ITEMS = [1, 2, 3, 4] as const;

export function FaqPage({ config }: { config: SiteConfig | null }) {
  const target = chartFromHash(useHash());

  useEffect(() => {
    if (target) document.getElementById(`size-${target}`)?.scrollIntoView();
  }, [target]);

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
      <section className="stack stack--xs" aria-labelledby="sizes-title">
        <h2 className="h2" id="sizes-title">
          {t('faq.sizes')}
        </h2>
        <p className="muted">{t('faq.sizesIntro')}</p>
        {SIZE_CHARTS.map((chart) => (
          <details key={chart.id} className="faq" id={`size-${chart.id}`} open={chart.id === target}>
            <summary>
              {chart.title} <span aria-hidden="true">+</span>
            </summary>
            <div className="faq__body stack stack--xs">
              {chart.notes?.map((note) => (
                <p key={note}>{note}</p>
              ))}
              {chart.tables.map((table, i) => (
                <div key={i} className="sizetable">
                  {table.title && <h3 className="sizetable__title">{table.title}</h3>}
                  <div className="sizetable__scroll">
                    <table>
                      <thead>
                        <tr>
                          {table.head.map((h, j) => (
                            <th key={j} scope="col">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row">{row.label}</th>
                            {row.values.map((v, j) => (
                              <td key={j}>{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
