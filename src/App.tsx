import { useCallback, useEffect, useState } from 'react';
import { loadConfig, type SiteConfig } from './lib/config';
import { loadCatalog, type LoadedCatalog } from './lib/data';
import { t } from './lib/i18n';
import { parseOrderWindow } from './lib/orderWindow';
import { recheckOrderWindow } from './lib/orderWindowClock';
import { useRoute } from './lib/route';
import { useTheme } from './lib/theme';
import { Datenschutz, Impressum } from './content/legal';
import { CartPage } from './components/CartPage';
import { CatalogPage, type CatalogStatus } from './components/CatalogPage';
import { FaqPage } from './components/FaqPage';
import { Layout } from './components/Layout';
import { LegalPage } from './components/LegalPage';
import { ThanksPage } from './components/ThanksPage';

const BASE = import.meta.env.BASE_URL;

interface State {
  status: CatalogStatus;
  config: SiteConfig | null;
  catalog: LoadedCatalog | null;
  /** Не вдалося прочитати навіть config.json. */
  fatal: boolean;
}

export function App() {
  const [state, setState] = useState<State>({ status: 'loading', config: null, catalog: null, fatal: false });
  const [theme, toggleTheme] = useTheme();
  const route = useRoute();

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', fatal: false }));
    let config: SiteConfig;
    try {
      config = await loadConfig(BASE);
    } catch (e) {
      console.error(e);
      setState({ status: 'error', config: null, catalog: null, fatal: true });
      return;
    }
    try {
      const catalog = await loadCatalog(config, BASE);
      recheckOrderWindow();
      setState({ status: 'ready', config, catalog, fatal: false });
    } catch (e) {
      console.error(e);
      setState({ status: 'error', config, catalog: null, fatal: false });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const { status, config, catalog, fatal } = state;
  const orderWindow = status === 'ready' && catalog ? parseOrderWindow(catalog.settings) : null;
  const needsData = route === 'cart' || route === 'thanks';

  let content;
  if (route === 'impressum') content = <LegalPage><Impressum /></LegalPage>;
  else if (route === 'datenschutz') content = <LegalPage><Datenschutz /></LegalPage>;
  else if (route === 'faq') content = <FaqPage config={config} />;
  else if (route === 'notfound') content = <h1 className="h1">{t('notfound.title')}</h1>;
  else if (needsData && status === 'ready' && config && catalog) {
    content = route === 'cart' ? <CartPage config={config} catalog={catalog} /> : <ThanksPage config={config} />;
  } else if (fatal) {
    content = (
      <div className="panel panel--start" role="alert">
        <h1 className="panel__title">{t('app.error.title')}</h1>
        <p className="muted-text">{t('app.error.text')}</p>
        <button type="button" className="btn btn--primary btn--lg" onClick={() => void load()}>
          {t('app.error.retry')}
        </button>
      </div>
    );
  } else {
    content = <CatalogPage status={status} catalog={catalog} onRetry={() => void load()} />;
  }

  return (
    <Layout station={config?.station ?? null} dataDate={catalog?.dataDate ?? null} orderWindow={orderWindow} theme={theme} onToggleTheme={toggleTheme}>
      {content}
    </Layout>
  );
}
