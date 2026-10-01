import { LangCode, localizeFields } from '@common/localization';
import {
  AlbumEntity,
  DepartmentEntity,
  EventEntity,
  FundraiserEntity,
  NewsEntity,
  PhotoEntity,
  ProgramEntity,
} from './entities';
import { currentPrice, currentTierIndex } from './price';

/** Публичные формы ответа: jsonb-поля → строки на языке `lang` + общий `fallback`. */

export function newsCard(n: NewsEntity, lang: LangCode) {
  const { values, fallback } = localizeFields(n, ['title', 'lead'], lang);
  return {
    id: n.id,
    slug: n.slug,
    kind: n.kind,
    cover: n.cover,
    publishedAt: n.publishedAt,
    ...values,
    fallback,
  };
}

export function newsItem(n: NewsEntity, lang: LangCode) {
  const card = newsCard(n, lang);
  const body = localizeFields(n, ['body'], lang);
  return {
    ...card,
    body: body.values.body,
    // postUrl — пост Telegram, откуда картинка (у приклеенных фото-постов свой)
    images: (n.images ?? []).map(({ url, width, height, source }) => ({
      url,
      width,
      height,
      postUrl: source ?? n.sourceUrl ?? null,
    })),
    sourceUrl: n.sourceUrl ?? null,
    fallback: card.fallback || body.fallback,
  };
}

export function eventItem(e: EventEntity, lang: LangCode, now: Date) {
  const { values, fallback } = localizeFields(
    e,
    ['title', 'description', 'place'],
    lang
  );
  return {
    id: e.id,
    slug: e.slug,
    cover: e.cover,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    isPaid: e.isPaid,
    priceTiers: e.priceTiers ?? [],
    priceNow: currentPrice(e, now),
    /** Индекс действующей ступени (по Калининграду) — фронт подсвечивает её, не пересчитывая. */
    priceTierIndex: currentTierIndex(e, now),
    capacity: e.capacity,
    ...values,
    fallback,
  };
}

export function fundraiserItem(f: FundraiserEntity, lang: LangCode) {
  const { values, fallback } = localizeFields(f, ['title', 'body'], lang);
  return {
    id: f.id,
    slug: f.slug,
    cover: f.cover,
    goalRub: f.goalRub,
    raisedRub: f.raisedRub,
    supporters: f.supporters,
    status: f.status,
    endsAt: f.endsAt,
    ...values,
    fallback,
  };
}

export function programItem(p: ProgramEntity, lang: LangCode) {
  const { values, fallback } = localizeFields(
    p,
    ['title', 'audience', 'schedule'],
    lang
  );
  return { id: p.id, contact: p.contact, cover: p.cover, ...values, fallback };
}

export function departmentItem(d: DepartmentEntity, lang: LangCode) {
  const { values, fallback } = localizeFields(
    d,
    ['title', 'description', 'address', 'hours'],
    lang
  );
  return {
    id: d.id,
    phones: d.phones,
    email: d.email,
    cover: d.cover,
    ...values,
    fallback,
  };
}

export function photoItem(p: PhotoEntity, lang: LangCode) {
  const { values, fallback } = localizeFields(p, ['caption'], lang);
  return { id: p.id, file: p.file, credit: p.credit, ...values, fallback };
}

export function albumCard(a: AlbumEntity, lang: LangCode, photosCount: number) {
  const { values, fallback } = localizeFields(a, ['title'], lang);
  return {
    id: a.id,
    slug: a.slug,
    cover: a.cover ?? a.photos?.[0]?.file ?? null,
    photosCount,
    ...values,
    fallback,
  };
}
