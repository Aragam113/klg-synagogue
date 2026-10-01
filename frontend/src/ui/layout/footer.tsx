import { useLang } from '@/i18n/use-lang';
import { HexPattern } from '@/ui/judaica/hex-pattern';
import { Placeholder } from '@/ui/kit/blocks';
import { Link } from '@/ui/kit/link';
import { DemoBadge } from '@/ui/layout/demo';

import { Logo } from './header';
import { FOOTER_COLUMNS } from './nav';
import { CONTACTS, type SocialKind } from './slots/contacts';
import { SubscribeForm } from './slots/subscribe-form';
import { useSiteContacts } from './slots/use-site-contacts';

const SOCIAL_LABEL: Record<SocialKind, string> = {
  telegram: 'Telegram',
  vk: 'VK',
  youtube: 'YouTube',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  site: 'Web',
};
const SOCIAL_SHORT: Record<SocialKind, string> = {
  telegram: 'TG',
  vk: 'VK',
  youtube: 'YT',
  instagram: 'IG',
  whatsapp: 'WA',
  site: 'WWW',
};

export const SiteFooter = () => {
  const { t, lang } = useLang();
  const site = useSiteContacts(); // settings first, site.ts fallback
  const address = CONTACTS.address ? (CONTACTS.address[lang] ?? CONTACTS.address.ru) : null;
  return (
    <footer className="ftr tone-deep">
      <HexPattern opacity={0.035} parallax={0} />
      <div className="container ftr__inner">
        <div className="ftr__top">
          <div className="ftr__brand">
            <Logo light />
            <p className="ftr__motto">{t('site.tagline')}</p>
            <DemoBadge />
            <address className="ftr__contacts">
              <span>
                <b>{t('footer.address')}</b>{' '}
                {address ?? <Placeholder>{t('footer.address')}</Placeholder>}
              </span>
              <span>
                <b>{t('footer.phone')}</b>{' '}
                {site.phone ? (
                  <Link href={`tel:${site.phone.replace(/[^+\d]/g, '')}`}>{site.phone}</Link>
                ) : (
                  <Placeholder>{t('footer.phone')}</Placeholder>
                )}
              </span>
              <span>
                <b>{t('footer.email')}</b>{' '}
                {CONTACTS.email ? (
                  <Link href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</Link>
                ) : (
                  <Placeholder>{t('footer.email')}</Placeholder>
                )}
              </span>
            </address>
          </div>
          <div className="ftr__subscribe">
            <p className="eyebrow">{t('footer.subscribeTitle')}</p>
            <p className="ftr__note">{t('footer.subscribeNote')}</p>
            <SubscribeForm />
          </div>
        </div>
        <div className="ftr__cols">
          {FOOTER_COLUMNS.map((c) => (
            <div key={c.key} className="ftr__col">
              <p className="eyebrow">{t(`footer.${c.key}`)}</p>
              {c.links.map((l) => (
                <Link key={l.key} href={l.href} className="ftr__link">
                  {t(`links.${l.key}`)}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="ftr__bottom">
          <div className="ftr__socials" aria-label={t('footer.social')}>
            {site.socials.map((s) =>
              s.url ? (
                <Link key={s.kind} href={s.url} className="social" ariaLabel={SOCIAL_LABEL[s.kind]}>
                  {SOCIAL_SHORT[s.kind]}
                </Link>
              ) : (
                <span
                  key={s.kind}
                  className="social social--ph"
                  title={`[ВПИШИ: ${SOCIAL_LABEL[s.kind]}]`}
                >
                  {SOCIAL_SHORT[s.kind]}
                </span>
              )
            )}
          </div>
          <div className="ftr__legal">
            <Link href="/privacy" className="ftr__link">
              {t('footer.privacy')}
            </Link>
            <Link href="/consent" className="ftr__link">
              {t('footer.consent')}
            </Link>
            <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
