import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PracMetricsLogo } from '../../shared/components/PracMetricsLogo.js';
import { SURFACE_STYLE, HEADLINE_STYLE, MONO_STYLE } from './surface.js';

/*
 * Shell for the public legal pages (Impressum / Datenschutz, ADR 0018).
 * Same fixed dark surface as the landing page; the logo links back to it.
 * The legal body text is German-only by design — it is a legal document,
 * not UI copy, so it is not routed through i18n.
 */
export function LegalPageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTranslation('pet');

  return (
    <div className="min-h-screen" style={SURFACE_STYLE}>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <Link to="/" className="inline-block" aria-label="PracMetrics">
          <PracMetricsLogo />
        </Link>

        <h1
          className="mt-12 text-3xl font-extrabold text-white sm:text-4xl"
          style={HEADLINE_STYLE}
        >
          {title}
        </h1>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#9fb0c8] [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_p+p]:mt-3">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/10 py-6 text-center">
        <span className="text-[11px] tracking-[0.25em] text-[#8fa0bb]" style={MONO_STYLE}>
          © {new Date().getFullYear()} PRACMETRICS ·{' '}
          <Link to="/impressum" className="hover:text-white">
            {t('landing.footerImprint')}
          </Link>{' '}
          ·{' '}
          <Link to="/datenschutz" className="hover:text-white">
            {t('landing.footerPrivacy')}
          </Link>
        </span>
      </footer>
    </div>
  );
}
