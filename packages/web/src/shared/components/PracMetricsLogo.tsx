import { useId } from 'react';
import { cn } from '../lib/utils.js';

type LogoVariant = 'stacked' | 'compact' | 'icon';

interface PracMetricsLogoProps {
  variant?: LogoVariant;
  onLight?: boolean;
  className?: string;
}

export function PracMetricsLogo({
  variant = 'compact',
  onLight = false,
  className,
}: PracMetricsLogoProps) {
  const id = useId();

  const markHeight = variant === 'stacked' ? 84 : variant === 'compact' ? 38 : 32;

  const mark = (
    <svg
      viewBox="20 22 380 318"
      style={{ height: markHeight, width: 'auto', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f8bf9" />
          <stop offset="55%" stopColor="#1066e4" />
          <stop offset="100%" stopColor="#0246c2" />
        </linearGradient>
        <linearGradient id={`${id}-bowl-dark`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c2cddc" />
        </linearGradient>
        <linearGradient id={`${id}-bowl-light`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2c4c" />
          <stop offset="100%" stopColor="#0c1830" />
        </linearGradient>
      </defs>
      <path
        d="M 160,128 L 248,128 L 114,330 L 26,330 Z"
        fill={`url(#${id}-stem)`}
      />
      <path
        d="M 96,30 L 344,42 L 388,112 L 200,250 L 235,180 L 330,118 L 150,78 Z"
        fill={onLight ? `url(#${id}-bowl-light)` : `url(#${id}-bowl-dark)`}
      />
    </svg>
  );

  const wordmark = (
    <span
      style={{
        fontFamily: "'Saira Semi Condensed', sans-serif",
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: '0.005em',
        textTransform: 'uppercase' as const,
        whiteSpace: 'nowrap' as const,
        fontSize: variant === 'stacked' ? '2.25rem' : '1.2rem',
        display: 'flex',
      }}
    >
      <span
        style={{
          background: 'linear-gradient(180deg, #ffffff, #cfd8e6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        PRAC
      </span>
      <span
        style={{
          background: 'linear-gradient(95deg, #3a93ff 0%, #1e74f2 45%, #0d56d8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        METRICS
      </span>
    </span>
  );

  const tagline = (
    <div
      className="flex items-center gap-3"
      style={{
        fontFamily: "'Saira', sans-serif",
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        fontSize: variant === 'stacked' ? '0.7rem' : '0.6rem',
        letterSpacing: '0.3em',
        color: '#8fa0bb',
      }}
    >
      <span
        style={{
          width: variant === 'stacked' ? 20 : 14,
          height: 2,
          borderRadius: 2,
          background: 'linear-gradient(90deg, rgba(42,134,248,0), #2a86f8)',
          flexShrink: 0,
        }}
      />
      <span style={{ textAlign: 'center' as const }}>
        Train Smarter<b style={{ color: '#2a86f8', fontWeight: 700 }}>.</b>
        <br className="sm:hidden" />
        {' '}Improve Performance<b style={{ color: '#2a86f8', fontWeight: 700 }}>.</b>
      </span>
      <span
        style={{
          width: variant === 'stacked' ? 20 : 14,
          height: 2,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #2a86f8, rgba(42,134,248,0))',
          flexShrink: 0,
        }}
      />
    </div>
  );

  const divider = (
    <div
      style={{
        width: 2,
        alignSelf: 'stretch',
        borderRadius: 2,
        background: 'linear-gradient(180deg, rgba(180,200,230,0.55), rgba(42,134,248,0.9))',
        flexShrink: 0,
        margin: '0 4px',
      }}
    />
  );

  if (variant === 'icon') {
    return <div className={cn('inline-flex', className)}>{mark}</div>;
  }

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center', className)}>
        {mark}
        {divider}
        {wordmark}
      </div>
    );
  }

  // stacked — login page
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {mark}
      {wordmark}
      {tagline}
    </div>
  );
}
