/**
 * dsh-about client entry: registers the About tab into the settings dialog
 * navigation (settings.section slot), mirroring ui-settings-models.
 */
import { createElement as h } from 'react';
import type { ReactNode } from 'react';
import { AboutSection, type Translate } from './AboutSection.tsx';
import { en, zh } from './locales.ts';

const NS = 'settings.about';

export type { Translate } from './AboutSection.tsx';

/** ctx 服务注入声明：slots（设置 tab 注册）+ locale（i18n）。 */
export const inject = ['slots', 'locale'];

/** Minimal client context surface used here. */
export interface AboutClientContext {
  effect<T>(body: () => T, label: string): T;
  locale: {
    register(ns: string, dicts: Record<string, Record<string, string>>): unknown;
    bind(ns: string): Translate;
  };
  slots: {
    inject(name: string, register: () => unknown): unknown;
    register(
      opts: Record<string, unknown>,
      component: (props: { t: Translate }) => ReactNode,
    ): unknown;
  };
}

export function apply(ctx: AboutClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-about: dictionaries');
  const t = ctx.locale.bind(NS);

  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'about',
        order: 100,
        label: () => t('nav'),
      },
      (props: { t: Translate }) => h(AboutSection, { t: props.t ?? t }),
    ),
  );
}
