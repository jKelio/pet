import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Gauge, Timer, FileText, ArrowRight } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Card, CardContent } from '../../shared/components/ui/card.js';
import { PracMetricsLogo } from '../../shared/components/PracMetricsLogo.js';
import { SURFACE_STYLE, HEADLINE_STYLE, MONO_STYLE } from './surface.js';

// Fixed dark marketing surface at the root route (ADR 0018); shared styling
// and the theme-independence rationale live in ./surface.ts.

interface Feature {
  index: string;
  icon: typeof Timer;
  titleKey: string;
  bodyKey: string;
}

const FEATURES: Feature[] = [
  { index: '01', icon: Timer, titleKey: 'landing.trackingTitle', bodyKey: 'landing.trackingBody' },
  { index: '02', icon: Gauge, titleKey: 'landing.teiTitle', bodyKey: 'landing.teiBody' },
  {
    index: '03',
    icon: FileText,
    titleKey: 'landing.federationTitle',
    bodyKey: 'landing.federationBody',
  },
];

export function LandingPage() {
  const { t } = useTranslation('pet');

  return (
    <div className="relative min-h-screen overflow-hidden" style={SURFACE_STYLE}>
      <style>{`
        @keyframes landing-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .landing-rise {
          opacity: 0;
          animation: landing-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-rise { opacity: 1; animation: none; }
        }
      `}</style>

      {/* Diagonal light streaks echoing the logo stem */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-[12%] h-[140%] w-40 -rotate-[33deg]"
          style={{
            background:
              'linear-gradient(180deg, rgba(47,139,249,0) 0%, rgba(47,139,249,0.07) 45%, rgba(2,70,194,0) 100%)',
          }}
        />
        <div
          className="absolute -top-40 right-[8%] h-[140%] w-24 -rotate-[33deg]"
          style={{
            background:
              'linear-gradient(180deg, rgba(47,139,249,0) 0%, rgba(47,139,249,0.045) 50%, rgba(2,70,194,0) 100%)',
          }}
        />
      </div>

      <main className="relative mx-auto flex max-w-5xl flex-col items-center px-6">
        {/* Hero */}
        <section className="flex flex-col items-center pb-20 pt-24 text-center sm:pt-32">
          <div className="landing-rise">
            <PracMetricsLogo variant="stacked" />
          </div>

          <h1
            className="landing-rise mt-12 max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl"
            style={{ ...HEADLINE_STYLE, animationDelay: '120ms' }}
          >
            {t('landing.claim')}
          </h1>

          <p
            className="landing-rise mt-5 max-w-2xl text-base leading-relaxed text-[#cfd8e6] sm:text-lg"
            style={{ animationDelay: '220ms' }}
          >
            {t('landing.subclaim')}
          </p>

          <div className="landing-rise mt-10" style={{ animationDelay: '320ms' }}>
            <Button
              asChild
              size="lg"
              className="h-13 border-0 px-10 text-base font-semibold text-white hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #2f8bf9 0%, #1066e4 55%, #0246c2 100%)',
                boxShadow: '0 8px 32px rgba(16, 102, 228, 0.35)',
              }}
            >
              <Link to="/auth/login">
                {t('landing.ctaLogin')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Feature blocks */}
        <section className="grid w-full gap-5 pb-24 sm:grid-cols-3">
          {FEATURES.map(({ index, icon: Icon, titleKey, bodyKey }, i) => (
            <Card
              key={index}
              className="landing-rise border-white/10 bg-white/[0.04] text-[#cfd8e6] shadow-none"
              style={{ animationDelay: `${420 + i * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-md"
                    style={{
                      background: 'linear-gradient(135deg, rgba(47,139,249,0.18), rgba(2,70,194,0.18))',
                    }}
                  >
                    <Icon className="h-5 w-5 text-[#2f8bf9]" aria-hidden="true" />
                  </span>
                  <span
                    className="text-[11px] tracking-[0.25em] text-[#8fa0bb]"
                    style={MONO_STYLE}
                  >
                    {index}
                  </span>
                </div>
                <h2
                  className="mt-5 text-lg font-bold text-white"
                  style={HEADLINE_STYLE}
                >
                  {t(titleKey)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#9fb0c8]">{t(bodyKey)}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-white/10 py-6 text-center">
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
