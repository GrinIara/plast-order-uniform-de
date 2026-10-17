import { useMemo, useState } from 'react';
import { t } from '../lib/i18n';
import { categoryTint } from '../lib/ui';
import { groupByCategory } from '../lib/search';
import type { LoadedCatalog } from '../lib/data';
import { ProductCard } from './ProductCard';

export type CatalogStatus = 'loading' | 'ready' | 'error';

function Skeletons() {
  return (
    <div aria-busy="true" aria-label={t('catalog.loading')} className="stack stack--sm">
      <div className="skel skel--title" />
      <div className="grid">
        {[1, 2, 3].map((k) => (
          <div key={k} className="card">
            <div className="skel skel--photo" />
            <div className="card__body">
              <div className="skel skel--line" style={{ width: '70%' }} />
              <div className="skel skel--line" style={{ width: '40%' }} />
              <div className="sizes">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="skel skel--size" />
                ))}
              </div>
              <div className="skel skel--btn" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  status: CatalogStatus;
  catalog: LoadedCatalog | null;
  onRetry: () => void;
}

export function CatalogPage({ status, catalog, onRetry }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(catalog?.products.map((p) => p.category) ?? [])].sort((a, b) => a.localeCompare(b, 'uk')),
    [catalog],
  );
  const sizes = useMemo(() => [...new Set(catalog?.products.flatMap((p) => p.variants.map((v) => v.size)) ?? [])], [catalog]);
  const results = useMemo(() => catalog?.search.search({ query, category, size }) ?? [], [catalog, query, category, size]);
  const groups = useMemo(() => groupByCategory(results), [results]);
  const ready = status === 'ready' && catalog !== null;
  const filtered = query.trim() !== '' || category !== null || size !== null;

  const pickCategory = (c: string | null) => () => {
    setCategory(c);
    setQuery('');
  };

  return (
    <div className="stack">
      <div role="search" className="stack stack--sm">
        <label htmlFor="q" className="sr-only">
          {t('search.label')}
        </label>
        <div className="searchbox">
          <span aria-hidden="true" className="searchbox__icon" />
          <input id="q" type="search" className="searchbox__input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search.placeholder')} autoComplete="off" />
          {query && (
            <button type="button" className="searchbox__clear" aria-label={t('search.clear')} onClick={() => setQuery('')}>
              ×
            </button>
          )}
        </div>

        <div role="group" aria-label={t('search.categories')} className="chips">
          {[null, ...categories].map((c) => (
            <button key={c ?? 'all'} type="button" className={`chip${category === c ? ' is-on' : ''}`} aria-pressed={category === c} onClick={pickCategory(c)}>
              {c ?? t('search.all')}
            </button>
          ))}
        </div>

        <div className="filterrow">
          <label htmlFor="sizeF" className="muted-text">
            {t('search.size')}
          </label>
          <select id="sizeF" className="select" value={size ?? ''} onChange={(e) => setSize(e.target.value || null)}>
            <option value="">{t('search.anySize')}</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {ready && filtered && results.length > 0 && (
            <span className="filterrow__count" aria-live="polite">
              {t('search.found', { count: results.length })}
            </span>
          )}
        </div>
      </div>

      {ready && catalog.source === 'snapshot' && (
        <div role="status" className="notice">
          <span aria-hidden="true" className="notice__icon">
            i
          </span>
          <span>{t('catalog.fallback', { date: catalog.dataDate ?? '' })}</span>
        </div>
      )}
      {ready && catalog.errors.length > 0 && <p className="muted-text">{t('catalog.partial')}</p>}

      {status === 'loading' && <Skeletons />}

      {status === 'error' && (
        <div className="panel panel--start">
          <h2 className="panel__title">{t('catalog.error.title')}</h2>
          <p className="muted-text">{t('catalog.error.text')}</p>
          <div className="row">
            <button type="button" className="btn btn--primary btn--lg" onClick={onRetry}>
              {t('catalog.error.retry')}
            </button>
            <a className="linkbtn" href="#/faq">
              {t('catalog.error.contacts')}
            </a>
          </div>
        </div>
      )}

      {ready && results.length === 0 && (
        <div className="panel panel--start">
          <h2 className="panel__title">{t('catalog.empty.title')}</h2>
          <p className="muted-text">{t('catalog.empty.text')}</p>
          <div className="row row--sm">
            {categories.map((c) => (
              <button key={c} type="button" className="chip" onClick={pickCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <a href="#/faq">{t('catalog.empty.write')}</a>
        </div>
      )}

      {ready && results.length > 0 && (
        <div className="stack stack--lg">
          {groups.map((g) => (
            <section key={g.category} className="stack stack--sm">
              <h2 className="group-title">
                {g.category} <span className="group-title__n">{g.products.length}</span>
              </h2>
              <div className="grid">
                {g.products.map((p) => (
                  <ProductCard key={p.productId} product={p} tint={categoryTint(categories.indexOf(p.category))} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
