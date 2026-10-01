import { LANGS } from '@/i18n/lang';
import { useLang } from '@/i18n/use-lang';

/** RU / EN / HE pills. Choice persists (AsyncStorage) and updates ?lang= if present. */
export const LangSwitch = ({ className = '' }: { className?: string }) => {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`lang ${className}`} role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className="lang__btn"
          aria-pressed={lang === l}
          lang={l}
          title={t(`lang.name.${l}`)}
          data-lang={l}
          onClick={() => setLang(l)}
        >
          {t(`lang.short.${l}`)}
        </button>
      ))}
    </div>
  );
};
