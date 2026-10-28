import { buildCatalogData, groupProducts, latestUpdate } from './catalog';
import { resolveUrl, type SiteConfig } from './config';
import { describeOrderWindowErrors, parseOrderWindow, type OrderWindow } from './orderWindow';
import { createSearch, type CatalogSearch } from './search';
import type { CatalogData, Product, Settings, Snapshot } from './types';

export interface LoadedCatalog {
  products: Product[];
  settings: Settings;
  /** order_open / order_close з settings, розібрані один раз при завантаженні. */
  orderWindow: OrderWindow;
  search: CatalogSearch;
  errors: CatalogData['errors'];
  /** live — свіжі дані з Google; snapshot — збережена версія. */
  source: 'live' | 'snapshot';
  /** Дата для підпису «Дані на». */
  dataDate: string | null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** Невалідні order_open / order_close — у консоль (один раз на завантаження каталогу). */
function reportOrderWindow(win: OrderWindow): void {
  if (win.kind !== 'invalid') return;
  for (const line of describeOrderWindowErrors(win.errors)) console.error(line);
}

function assemble(data: CatalogData, source: 'live' | 'snapshot', dataDate: string | null): LoadedCatalog {
  const products = groupProducts(data.rows);
  const orderWindow = parseOrderWindow(data.settings);
  reportOrderWindow(orderWindow);
  return {
    products,
    settings: data.settings,
    orderWindow,
    search: createSearch(products, data.synonymGroups),
    errors: data.errors,
    source,
    dataDate,
  };
}

export async function loadCatalog(config: SiteConfig, baseUrl: string): Promise<LoadedCatalog> {
  try {
    const [catalog, synonyms, settings] = await Promise.all([
      fetchText(resolveUrl(config.csv.catalog, baseUrl)),
      fetchText(resolveUrl(config.csv.synonyms, baseUrl)),
      fetchText(resolveUrl(config.csv.settings, baseUrl)),
    ]);
    const data = buildCatalogData(catalog, synonyms, settings);
    if (data.errors.length > 0) {
      console.warn('Некоректні рядки каталогу пропущено:', data.errors.map((e) => `рядок ${e.row}: ${e.message}`));
    }
    return assemble(data, 'live', latestUpdate(data.rows));
  } catch (liveError) {
    console.warn('Не вдалося завантажити каталог з Google, пробуємо знімок:', liveError);
    const res = await fetch(`${baseUrl}catalog.json`);
    if (!res.ok) throw new Error('Каталог і знімок недоступні');
    const snap = (await res.json()) as Snapshot;
    return assemble(
      { rows: snap.rows, synonymGroups: snap.synonymGroups, settings: snap.settings, errors: [] },
      'snapshot',
      snap.generatedAt.slice(0, 10),
    );
  }
}
