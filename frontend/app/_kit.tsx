import { Redirect } from 'expo-router';
import { useState } from 'react';

import {
  ArchFrame,
  BRUCHIM_HABAIM,
  GhostHebrew,
  MagenDavid,
  Menorah,
  Rosette,
  SHALOM,
} from '@/ui/judaica';
import {
  Button,
  Card,
  Checkbox,
  Container,
  Empty,
  ErrorBox,
  Eyebrow,
  Field,
  useFieldErrorText,
  Form,
  Page,
  Placeholder,
  Section,
  Select,
  Text,
  Title,
} from '@/ui/kit';
import { LangSwitch } from '@/ui/layout';
import { HandStroke, Marquee, Pinned, Reveal } from '@/ui/motion';

/** Dev-only showcase of every primitive in motion: /_kit. Not a product page, texts are samples. */
const CHAPTERS = [
  {
    n: '01',
    title: 'Шаббат',
    text: 'Пример главы: заголовок и текст въезжают и уезжают по прогрессу прокрутки.',
  },
  {
    n: '02',
    title: 'Праздники',
    text: 'Вторая глава. Счётчик-барабан справа перелистывается, линия сверху растёт.',
  },
  {
    n: '03',
    title: 'Уроки',
    text: 'Третья глава. На телефоне и при «уменьшить движение» главы идут стопкой.',
  },
  {
    n: '04',
    title: 'Добрые дела',
    text: 'Четвёртая глава остаётся на экране до конца закреплённой секции.',
  },
];
const SHADES = ['#233a45', '#8a7352', '#15242b', '#4d5a52'];

export default function KitPage() {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fieldErrorText = useFieldErrorText();
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Page title="UI-кит">
      <Section tone="cream" id="kit-hero">
        <GhostHebrew text={SHALOM} />
        <Container size="narrow">
          <Eyebrow>UI-кит · только в dev</Eyebrow>
          <Title
            as="h1"
            size="hero"
            text="Дом общины в Калининграде"
            italicWord="общины"
            stroke="reveal"
          />
          <Text lead>
            Токены, шрифты, символы и scroll-движок. Прокрутите вниз — всё должно жить.
          </Text>
          <div className="btns">
            <Button arrow>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="gold">Gold</Button>
            <Button variant="ghost" disabled>
              Disabled
            </Button>
          </div>
          <div className="btns">
            <LangSwitch />
          </div>
        </Container>
      </Section>

      <Section tone="deep" curtain pattern={0.05} id="kit-threshold">
        <GhostHebrew text={BRUCHIM_HABAIM} />
        <Container size="narrow" className="kit-center">
          <Eyebrow>Шторка · решётка из гексаграмм</Eyebrow>
          <Title size="xl" text="Добро пожаловать домой" italicWord="домой" stroke="progress" />
          <Reveal delay={0.1}>
            <Text lead>Штрих под словом рисуется по --p секции, решётка уходит с параллаксом.</Text>
          </Reveal>
          <div className="kit-p" data-kit="p-readout" />
        </Container>
      </Section>

      <Section tone="deeper" flush id="kit-pinned">
        <Container>
          <Pinned
            header={
              <>
                <Eyebrow>Pinned · 4 главы</Eyebrow>
                <Title size="lg" text="Жизнь общины по неделям" italicWord="общины" />
              </>
            }
            chapters={CHAPTERS.map((c) => (
              <div key={c.n} className="kit-chapter">
                <span className="num num--outline kit-chapter__n">{c.n}</span>
                <Title size="md" as="h3" text={c.title} />
                <Text>{c.text}</Text>
              </div>
            ))}
            renderAside={(active) => (
              <ArchFrame ratio="3 / 4" className="kit-arch">
                <div className="kit-arch__fill" style={{ background: SHADES[active] }}>
                  <Menorah size="45%" />
                </div>
              </ArchFrame>
            )}
          />
        </Container>
      </Section>

      <Section tone="deeper" flush id="kit-marquee">
        <Marquee
          items={[
            { text: 'Шаббат шалом' },
            { text: 'Шалом', italic: true },
            { text: 'Ханука' },
            { text: 'Песах', italic: true },
            { text: 'Рош ха-Шана' },
            { text: 'Тора', italic: true },
          ]}
        />
      </Section>

      <Section tone="canvas" id="kit-dawn" className="kit-dawn">
        <div className="kit-rosette">
          <Rosette size="min(64.286rem, 140vw)" />
        </div>
        <Container size="text" className="kit-center">
          <Eyebrow>Розетта вращается от прокрутки</Eyebrow>
          <Title size="xl" text="Начните с малого" italicWord="малого" />
          <div className="kit-symbols">
            <MagenDavid size="2rem" title="Маген Давид" />
            <MagenDavid size="3rem" strokeWidth={1} />
            <Menorah size="7rem" />
            <span className="kit-he" lang="he" dir="rtl">
              {SHALOM}
            </span>
          </div>
          <p className="text">
            Рукописный штрих по reveal:{' '}
            <span className="kit-mark">
              зачёркнуто
              <HandStroke placement="strike" strokeWidth={3} />
            </span>
          </p>
        </Container>
      </Section>

      <Section tone="cream" id="kit-forms">
        <Container>
          <Eyebrow>Формы и состояния</Eyebrow>
          <Title size="lg" text="Кит для форм и карточек" italicWord="карточек" />
          <div className="kit-grid2">
            <Form
              onSubmit={() =>
                setErrors({
                  name: name ? '' : (fieldErrorText('required') ?? ''),
                  kind: fieldErrorText('date_closed') ?? '',
                  agree: agree ? '' : (fieldErrorText('consent') ?? ''),
                })
              }
            >
              <Field
                label="Имя"
                value={name}
                onChangeText={setName}
                required
                error={errors.name || undefined}
              />
              <Select
                label="Повод"
                value={kind}
                onChange={setKind}
                placeholder="Выберите"
                options={[
                  { value: 'a', label: 'Экскурсия' },
                  { value: 'b', label: 'Молитва' },
                ]}
                error={errors.kind || undefined}
              />
              <Checkbox
                label="Согласен на обработку данных"
                checked={agree}
                onChange={setAgree}
                error={errors.agree || undefined}
              />
              <div>
                <Button type="submit">Отправить</Button>
              </div>
            </Form>
            <div className="kit-stack">
              <ErrorBox
                error={{ status: 'network', message: 'Сервер недоступен (пример ErrorBox).' }}
                onRetry={() => undefined}
              />
              <Empty />
              <p className="text">
                Телефон: <Placeholder>телефон общины</Placeholder>
              </p>
            </div>
          </div>
          <div className="grid grid--3 kit-cards">
            {[0, 1, 2].map((i) => (
              <Reveal key={i} delay={i * 0.08}>
                <Card
                  href="/_kit"
                  eyebrow={`Карточка 0${i + 1}`}
                  title="Reveal со сдвигом"
                  footer={<span className="link-arrow">Подробнее</span>}
                >
                  <Text>Hover — подъём и тень. Появление по очереди.</Text>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </Page>
  );
}
