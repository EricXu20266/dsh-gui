/** dsh-about About tab body: fetch the version manifest and render it. */
import { type ReactNode, useEffect, useState } from 'react';
import type { AboutInfo } from '../routes.ts';

export type Translate = (key: string) => string;

/** About tab props: the injected locale translate seat. */
export interface AboutSectionProps {
  t: Translate;
}

/* ── inline styles (aligned with native settings rows) ── */

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const heroStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '4px 0 20px',
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  lineHeight: '28px',
  color: 'var(--dsw-alias-label-primary)',
};

const heroSubStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: '20px',
  color: 'var(--dsw-alias-label-secondary)',
};

const groupTitleStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-tertiary)',
  padding: '14px 0 4px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 0',
  borderBottom: '1px solid var(--dsw-alias-border-l2)',
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '22px',
  color: 'var(--dsw-alias-label-primary)',
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '22px',
  color: 'var(--dsw-alias-label-tertiary)',
  textAlign: 'right',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-dimmed)',
  paddingTop: 12,
};

/** One label/value row. */
function Row({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{label}</span>
      <span style={rowValueStyle}>{value}</span>
    </div>
  );
}

/**
 * Render the About tab.
 * @param props - injected props.
 * @returns the tab element tree.
 */
export function AboutSection({ t }: AboutSectionProps): ReactNode {
  const [info, setInfo] = useState<AboutInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/dsh-about/info')
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<AboutInfo>;
      })
      .then((data) => {
        if (alive) {
          setInfo(data);
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div style={rootStyle}>
        <span style={rowLabelStyle}>{t('loadError')}</span>
      </div>
    );
  }
  if (info === null) {
    return (
      <div style={rootStyle}>
        <span style={rowLabelStyle}>{t('loading')}</span>
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <div style={heroStyle}>
        <span style={heroTitleStyle}>{info.gui.name}</span>
        <span style={heroSubStyle}>v{info.gui.version}</span>
      </div>

      <div style={groupTitleStyle}>{t('sectionKernel')}</div>
      <Row label={t('kernelTitle')} value={`v${info.kernel}`} />

      <div style={groupTitleStyle}>{t('sectionRuntime')}</div>
      <Row label={t('electronTitle')} value={info.runtime.electron} />
      <Row label={t('nodeTitle')} value={info.runtime.node} />
      <Row label={t('platformTitle')} value={info.runtime.platform} />

      <div style={groupTitleStyle}>{t('sectionPlugins')}</div>
      {info.plugins.map((p) => (
        <Row key={p.name} label={p.name} value={`v${p.version}`} />
      ))}

      <div style={hintStyle}>
        {info.gui.name} · dsh · {info.runtime.platform}
      </div>
    </div>
  );
}
