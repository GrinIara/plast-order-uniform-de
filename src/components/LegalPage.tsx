import type { ReactNode } from 'react';
import { t } from '../lib/i18n';

export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <article lang="de" className="legal">
      <a href="#/" lang="uk" className="backlink">
        {t('app.back')}
      </a>
      {children}
    </article>
  );
}
