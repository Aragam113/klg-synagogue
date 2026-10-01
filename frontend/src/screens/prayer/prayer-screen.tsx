import { useEffect, useMemo } from 'react';

import { ConsentField, FormBanner, FormPage, RequestAccepted, SubmitRow } from '@/forms/ui';
import { useNearestYizkor } from '@/forms/use-nearest-yizkor';
import { useSubmitForm } from '@/forms/use-submit-form';
import { useLang } from '@/i18n/use-lang';
import { Button, Checkbox, Field, Form, Select } from '@/ui/kit';
import { kaliningradToday } from '@/utils/kld-time';

export const PRAYER_TYPES = ['misheberah', 'kaddish', 'yahrzeit', 'yizkor'] as const;
export type PrayerType = (typeof PRAYER_TYPES)[number];
export const isPrayerType = (v: unknown): v is PrayerType =>
  typeof v === 'string' && (PRAYER_TYPES as readonly string[]).includes(v);

const YIZKOR = ['yom_kippur', 'shmini_atzeret', 'pesach', 'shavuot'] as const;

interface PrayerValues {
  lastName: string;
  firstName: string;
  middleName: string;
  email: string;
  phone: string;
  forName: string;
  motherName: string;
  times: string;
  deceasedName: string;
  fatherName: string;
  deathDate: string;
  months: string;
  remind: boolean;
  remindByEmail: boolean;
  remindByPhone: boolean;
  yizkor: string;
  consent: boolean;
}

/** Only the fields of the chosen prayer go to the API. */
const FIELDS_OF: Record<PrayerType, (keyof PrayerValues)[]> = {
  misheberah: ['forName', 'motherName', 'times'],
  kaddish: ['deceasedName', 'fatherName', 'deathDate', 'months', 'remind'],
  yahrzeit: ['deceasedName', 'fatherName', 'deathDate', 'remindByEmail', 'remindByPhone'],
  yizkor: ['deceasedName', 'fatherName', 'yizkor'],
};
const NUMERIC = new Set<keyof PrayerValues>(['times', 'months']);

const bodyOf = (type: PrayerType) => (v: PrayerValues) => {
  const body: Record<string, unknown> = {
    prayerType: type,
    lastName: v.lastName,
    firstName: v.firstName,
    middleName: v.middleName,
    email: v.email,
    phone: v.phone,
    consent: v.consent,
  };
  for (const k of FIELDS_OF[type]) {
    const val = v[k];
    body[k] = NUMERIC.has(k) && val !== '' ? Number(val) : val;
  }
  return body;
};

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

export const PrayerScreen = ({ type }: { type: PrayerType }) => {
  const { t } = useLang('forms');
  const initial = useMemo<PrayerValues>(
    () => ({
      lastName: '',
      firstName: '',
      middleName: '',
      email: '',
      phone: '',
      forName: '',
      motherName: '',
      times: '1',
      deceasedName: '',
      fatherName: '',
      deathDate: '',
      months: '11',
      remind: false,
      remindByEmail: false,
      remindByPhone: false,
      /** Filled with the nearest Yizkor once the calendar API answers. */
      yizkor: '',
      consent: false,
    }),
    []
  );
  const form = useSubmitForm<PrayerValues>({
    path: '/requests/prayer',
    initial,
    toBody: bodyOf(type),
  });
  const { values: v, set, error: e } = form;
  const nearest = useNearestYizkor(type !== 'yizkor');
  const setYizkor = set('yizkor');
  useEffect(() => {
    if (nearest && v.yizkor === '') setYizkor(nearest);
  }, [nearest, v.yizkor, setYizkor]);
  const p = `prayer.types.${type}`;
  const title = t(`${p}.title`);
  const today = kaliningradToday();

  const aside = (
    <>
      <p className="text">{t(`${p}.text`)}</p>
      <nav className="fp__nav" aria-label={t('prayer.other')}>
        {PRAYER_TYPES.filter((x) => x !== type).map((x) => (
          <Button key={x} variant="ghost" href={`/prayers/${x}`}>
            {t(`prayer.types.${x}.title`)}
          </Button>
        ))}
      </nav>
    </>
  );

  return (
    <FormPage
      title={`${t('prayer.eyebrow')}: ${title}`}
      eyebrow={t('prayer.eyebrow')}
      heading={title}
      italic={title}
      lead={t(`${p}.lead`)}
      aside={aside}
      className={`prayer prayer--${type}`}
    >
      {form.result ? (
        <RequestAccepted
          result={form.result}
          onAgain={form.reset}
          payment={{
            purpose: 'prayer',
            prayerType: type,
            months: type === 'kaddish' ? Number(v.months) : undefined,
          }}
        />
      ) : (
        <Form onSubmit={form.submit} busy={form.busy}>
          <FormBanner text={form.banner} />
          <fieldset className="fp__group">
            <legend>{t('prayer.about')}</legend>
            {type === 'misheberah' ? (
              <>
                <Field
                  name="forName"
                  label={t('prayer.f.forName')}
                  required
                  value={v.forName}
                  onChangeText={set('forName')}
                  error={e('forName')}
                />
                <Field
                  name="motherName"
                  label={t('prayer.f.motherName')}
                  required
                  value={v.motherName}
                  onChangeText={set('motherName')}
                  error={e('motherName')}
                />
                <Select
                  name="times"
                  label={t('prayer.f.times')}
                  required
                  value={v.times}
                  onChange={set('times')}
                  error={e('times')}
                  options={range(1, 5).map((n) => ({ value: n, label: n }))}
                />
              </>
            ) : (
              <>
                <Field
                  name="deceasedName"
                  label={
                    type === 'yahrzeit' ? t('prayer.f.yahrzeitName') : t('prayer.f.deceasedName')
                  }
                  required
                  value={v.deceasedName}
                  onChangeText={set('deceasedName')}
                  error={e('deceasedName')}
                />
                <Field
                  name="fatherName"
                  label={t('prayer.f.fatherName')}
                  required
                  value={v.fatherName}
                  onChangeText={set('fatherName')}
                  error={e('fatherName')}
                />
              </>
            )}
            {type === 'kaddish' || type === 'yahrzeit' ? (
              <Field
                name="deathDate"
                type="date"
                max={today}
                label={t('prayer.f.deathDate')}
                required
                value={v.deathDate}
                onChangeText={set('deathDate')}
                error={e('deathDate')}
              />
            ) : null}
            {type === 'kaddish' ? (
              <>
                <Select
                  name="months"
                  label={t('prayer.f.months')}
                  required
                  value={v.months}
                  onChange={set('months')}
                  error={e('months')}
                  options={range(1, 11).map((n) => ({ value: n, label: n }))}
                />
                <Checkbox
                  name="remind"
                  label={t('prayer.f.remind')}
                  checked={v.remind}
                  onChange={set('remind')}
                />
              </>
            ) : null}
            {type === 'yahrzeit' ? (
              <div className="fp__checks">
                <Checkbox
                  name="remindByEmail"
                  label={t('prayer.f.remindByEmail')}
                  checked={v.remindByEmail}
                  onChange={set('remindByEmail')}
                />
                <Checkbox
                  name="remindByPhone"
                  label={t('prayer.f.remindByPhone')}
                  checked={v.remindByPhone}
                  onChange={set('remindByPhone')}
                />
              </div>
            ) : null}
            {type === 'yizkor' ? (
              <Select
                name="yizkor"
                label={t('prayer.f.yizkor')}
                required
                value={v.yizkor}
                placeholder={t('common.choose')}
                onChange={set('yizkor')}
                error={e('yizkor')}
                options={YIZKOR.map((y) => ({ value: y, label: t(`prayer.yizkorDays.${y}`) }))}
              />
            ) : null}
          </fieldset>
          <fieldset className="fp__group">
            <legend>{t('prayer.customer')}</legend>
            <div className="fp__row">
              <Field
                name="lastName"
                label={t('fields.lastName')}
                required
                autoComplete="family-name"
                value={v.lastName}
                onChangeText={set('lastName')}
                error={e('lastName')}
              />
              <Field
                name="firstName"
                label={t('fields.firstName')}
                required
                autoComplete="given-name"
                value={v.firstName}
                onChangeText={set('firstName')}
                error={e('firstName')}
              />
            </div>
            <Field
              name="middleName"
              label={t('fields.middleName')}
              value={v.middleName}
              onChangeText={set('middleName')}
              error={e('middleName')}
            />
            <div className="fp__row">
              <Field
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                label={t('fields.email')}
                required
                value={v.email}
                onChangeText={set('email')}
                error={e('email')}
              />
              <Field
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                label={t('fields.phone')}
                value={v.phone}
                onChangeText={set('phone')}
                error={e('phone')}
              />
            </div>
          </fieldset>
          <ConsentField form={form} />
          <SubmitRow busy={form.busy} />
        </Form>
      )}
    </FormPage>
  );
};
