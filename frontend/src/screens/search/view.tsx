import { useLang } from '@/i18n/use-lang';
import '@/screens/events/styles';
import {
  Button,
  Container,
  Empty,
  ErrorBox,
  Eyebrow,
  FallbackBadge,
  Link,
  Page,
  Section,
  Text,
  Title,
} from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import type { SearchViewProps } from './model';
import { staticPages } from './static-pages';

/** Разделы для пустой выдачи: первые несколько из общего списка страниц. */
const SECTIONS = ['/events', '/news', '/schedule', '/programs', '/departments', '/gallery'];

export const SearchView = ({
  draft,
  onDraft,
  onSubmit,
  q,
  vm,
  fetching,
  error,
  onRetry,
}: SearchViewProps) => {
  const { t, lang } = useLang('content');
  const l = lang === 'en' || lang === 'he' ? lang : 'ru';
  const sections = staticPages.filter((p) => SECTIONS.includes(p.path));
  return (
    <Page title={`${t('search.title')}${q ? `: ${q}` : ''}`}>
      <Section tone="cream" pattern className="cnt-head">
        <Container size="narrow">
          <Reveal>
            <Eyebrow>{t('search.eyebrow')}</Eyebrow>
            <Title as="h1" size="lg" text={t('search.title')} italicWord={t('search.italic')} />
          </Reveal>
          <form
            role="search"
            className="cnt-search"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <div className="field">
              <label className="field__label" htmlFor="site-search">
                {t('search.placeholder')}
              </label>
              <input
                id="site-search"
                name="q"
                type="search"
                className="field__input"
                value={draft}
                placeholder={t('search.placeholder')}
                autoFocus
                onChange={(e) => onDraft(e.target.value)}
                data-testid="search-input"
              />
            </div>
            <Button type="submit" arrow>
              {t('search.submit')}
            </Button>
          </form>
        </Container>
      </Section>
      <Section tone="canvas">
        <Container size="narrow">
          {vm.state === 'short' ? <Text>{t('search.hint')}</Text> : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {vm.state === 'empty' ? (
            <Empty title={t('search.empty')} text={t('search.emptyText')}>
              <ul className="cnt-sections" data-testid="search-empty">
                {sections.map((p) => (
                  <li key={p.path}>
                    <Link href={p.path}>{p.title[l]}</Link>
                  </li>
                ))}
              </ul>
            </Empty>
          ) : null}
          {vm.pages.length ? (
            <>
              <Title as="h2" size="sm" text={t('search.pages')} />
              <ul className="cnt-hits" data-testid="search-pages">
                {vm.pages.map((p) => (
                  <li key={p.path}>
                    <Link href={p.path}>
                      <small>{t('search.type.page')}</small>
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {vm.hits.length ? (
            <>
              <Title as="h2" size="sm" text={`${t('search.results')}: ${vm.hits.length}`} />
              <ul className="cnt-hits" data-testid="search-hits">
                {vm.hits.map((h) => (
                  <li key={`${h.type}-${h.id}`}>
                    <Link href={h.url}>
                      <small>{t(`search.type.${h.type}`)}</small>
                      <b>{h.title}</b>
                      {h.snippet ? <span className="cnt-hits__snip">{h.snippet}</span> : null}
                      <FallbackBadge show={h.fallback} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {vm.state === 'loading' && fetching ? (
            <p className="cnt-loading" aria-live="polite">
              …
            </p>
          ) : null}
        </Container>
      </Section>
    </Page>
  );
};
