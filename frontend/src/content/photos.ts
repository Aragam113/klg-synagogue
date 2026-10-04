/**
 * Фото разделов — только Wikimedia Commons со свободной лицензией (автор, лицензия и страница файла — у каждого фото ниже).
 * Файлы — `public/media/sections/*` (уменьшены до 1600px), атрибуция — подпись под фото + `public/media/CREDITS.md`.
 * Фото с официального сайта (без лицензии) на сайт не ставятся.
 */
import { assetUrl } from '@/config/demo';

export interface Photo {
  src: string;
  author: string;
  license: string;
  year: string;
  page: string;
  alt: { ru: string; en: string; he: string };
}

const C = 'https://commons.wikimedia.org/wiki/File:';

const photo = (
  file: string,
  author: string,
  license: string,
  year: string,
  page: string,
  ru: string,
  en: string,
  he: string
): Photo => ({
  src: assetUrl(`/media/sections/${file}`),
  author,
  license,
  year,
  page: C + page,
  alt: { ru, en, he },
});

export const PHOTOS: Record<string, Photo> = {
  k1900: photo(
    'k1900.jpg',
    'unknown',
    'Public domain',
    '1900',
    'K%C3%B6nigsberg._Neue_Synagoge_-01.jpg',
    'Новая синагога Кёнигсберга, открытка 1900 года',
    'The New Synagogue of Königsberg, postcard, 1900',
    'בית הכנסת החדש של קניגסברג, גלויה, 1900'
  ),
  k1925: photo(
    'k1925.jpg',
    'Dankelmann',
    'Public domain',
    '1925',
    'Syna_Konigsberg_-2a-W.jpg',
    'Синагога на Линденштрассе, 1925',
    'The synagogue on Lindenstrasse, 1925',
    'בית הכנסת ברחוב לינדנשטראסה, 1925'
  ),
  honeyBridge: photo(
    'honey-bridge.jpg',
    'Landsmannschaft Ostpreußen e.V.',
    'CC BY-SA 3.0',
    '—',
    'HonigbrNeuSynagoge.jpg',
    'Медовый мост и Новая синагога, Кёнигсберг',
    'The Honey Bridge and the New Synagogue, Königsberg',
    'גשר הדבש ובית הכנסת החדש, קניגסברג'
  ),
  interior1896: photo(
    'interior-1896.jpg',
    'Landsmannschaft Ostpreußen e.V.',
    'CC BY-SA 3.0',
    '1896–1938',
    'Synagogen_Innenraum.jpg',
    'Интерьер Новой синагоги Кёнигсберга (1896–1938)',
    'Interior of the New Synagogue of Königsberg (1896–1938)',
    'פנים בית הכנסת החדש של קניגסברג (1896–1938)'
  ),
  stone2012: photo(
    'stone-2012.jpg',
    'Avner',
    'CC0',
    '2012',
    'Kenigsberg-place_of_synagogue_1a.jpg',
    'Памятный камень на месте разрушенной синагоги, 2012',
    'Memorial stone on the site of the destroyed synagogue, 2012',
    'אבן זיכרון במקום בית הכנסת שנהרס, 2012'
  ),
  site2016: photo(
    'site-2016.jpg',
    'Uberbufty',
    'CC0',
    '2016',
    'Konigsberg_Synagogue_Construction_Site.jpg',
    'Закладной камень и стройплощадка, август 2016',
    'Foundation stone and construction site, August 2016',
    'אבן הפינה ואתר הבנייה, אוגוסט 2016'
  ),
  build2017: photo(
    'build-2017.jpg',
    'Michael Leiserowitz',
    'CC BY-SA 4.0',
    '2017',
    'New_Koenigsberg_Synagogue_construction_progress_10th._December_2017.jpg',
    'Стройка, 10 декабря 2017',
    'Construction, 10 December 2017',
    'הבנייה, 10 בדצמבר 2017'
  ),
  eve2018: photo(
    'eve-2018.jpg',
    'Emma Cornelia Jerusalem',
    'CC BY-SA 4.0',
    '2018',
    'Rekonstruierte_neue_Synagoge_Kaliningrad_am_Vorabend_der_Er%C3%B6ffnung.jpg',
    'Синагога накануне открытия, 7 ноября 2018',
    'The synagogue on the eve of its opening, 7 November 2018',
    'בית הכנסת ערב פתיחתו, 7 בנובמבר 2018'
  ),
  facade2019: photo(
    'facade-2019.jpg',
    'Zairon',
    'CC BY-SA 4.0',
    '2019',
    'Kaliningrad_Synagoge_1.jpg',
    'Фасад Новой синагоги, 2019',
    'Facade of the New Synagogue, 2019',
    'חזית בית הכנסת החדש, 2019'
  ),
  facade2019b: photo(
    'facade-2019b.jpg',
    'Zairon',
    'CC BY-SA 4.0',
    '2019',
    'Kaliningrad_Synagoge_2.jpg',
    'Синагога на ул. Октябрьской, 2019',
    'The synagogue on Oktyabrskaya St., 2019',
    'בית הכנסת ברחוב אוקטיאברסקאיה, 2019'
  ),
  nightRiver: photo(
    'night-river.jpg',
    'Amber bracelet',
    'CC BY-SA 4.0',
    '2023',
    '%D0%A1%D0%B8%D0%BD%D0%B0%D0%B3%D0%BE%D0%B3%D0%B0_(%D0%9A%D0%B0%D0%BB%D0%B8%D0%BD%D0%B8%D0%BD%D0%B3%D1%80%D0%B0%D0%B4).jpg',
    'Синагога ночью, отражение в Преголе',
    'The synagogue at night reflected in the Pregolya',
    'בית הכנסת בלילה, משתקף בנהר פרגוליה'
  ),
  nightLit: photo(
    'night-lit.jpg',
    'Amber bracelet',
    'CC BY-SA 4.0',
    '2023',
    '%D0%A1%D0%B8%D0%BD%D0%B0%D0%B3%D0%BE%D0%B3%D0%B0_%D0%B2_%D0%9A%D0%B0%D0%BB%D0%B8%D0%BD%D0%B8%D0%BD%D0%B3%D1%80%D0%B0%D0%B4%D0%B5.jpg',
    'Синагога и Медовый мост вечером',
    'The synagogue and the Honey Bridge in the evening',
    'בית הכנסת וגשר הדבש בערב'
  ),
  fromWater: photo(
    'from-water.jpg',
    'Alexander Grebenkov',
    'CC BY 3.0',
    '2021',
    'Kaliningrad_-_Synagogue_view_from_water.jpg',
    'Вид на синагогу с воды',
    'The synagogue seen from the water',
    'בית הכנסת במבט מן המים'
  ),
  fishVillage: photo(
    'fish-village.jpg',
    'Zairon',
    'CC BY-SA 4.0',
    '2019',
    'Kaliningrad_Synagoge_%26_Fischerdorf_1.jpg',
    'Синагога и Рыбная деревня',
    'The synagogue and the Fish Village',
    'בית הכנסת וכפר הדייגים'
  ),
  domeSky: photo(
    'dome-sky.jpg',
    'Kamil Miftakhov',
    'CC BY-SA 4.0',
    '—',
    '%D0%A1%D0%B8%D0%BD%D0%B0%D0%B3%D0%BE%D0%B3%D0%B0_(32895).jpg',
    'Купол синагоги',
    'The dome of the synagogue',
    'כיפת בית הכנסת'
  ),
  domeDarafsh: photo(
    'dome-darafsh.jpg',
    'Darafsh',
    'CC BY-SA 4.0',
    '2024',
    'Kaliningrad_by_Darafsh_13_47_12_881000.jpeg',
    'Синагога, 2024',
    'The synagogue, 2024',
    'בית הכנסת, 2024'
  ),
  winter2025: photo(
    'winter-2025.jpg',
    'Рина Мороз',
    'CC BY-SA 4.0',
    '2025',
    '%D0%97%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5_%D1%81%D0%B8%D1%80%D0%BE%D1%82%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B5%D0%B2%D1%80%D0%B5%D0%B9%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B0_%D0%B8_%D0%B5%D0%B2%D1%80%D0%B5%D0%B9%D1%81%D0%BA%D0%B0%D1%8F_%D1%81%D0%B8%D0%BD%D0%B0%D0%B3%D0%BE%D0%B3%D0%B0_-_%D0%9A%D0%B0%D0%BB%D0%B8%D0%BD%D0%B8%D0%BD%D0%B3%D1%80%D0%B0%D0%B4_-_2025%D0%B3.jpg',
    'Синагога и бывший сиротский приют зимой',
    'The synagogue and the former orphanage in winter',
    'בית הכנסת ובית היתומים לשעבר בחורף'
  ),
  orphanage2025: photo(
    'orphanage-2025.jpg',
    'Masha.Kondrasheva',
    'CC BY-SA 4.0',
    '2025',
    '%D0%97%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5_%D1%81%D0%B8%D1%80%D0%BE%D1%82%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%B5%D0%B2%D1%80%D0%B5%D0%B9%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B0_%D0%B8_%D0%A1%D0%B8%D0%BD%D0%B0%D0%B3%D0%BE%D0%B3%D0%B0_2025.jpg',
    'Бывший еврейский сиротский приют (ул. Октябрьская, 3) и синагога',
    'The former Jewish orphanage (3 Oktyabrskaya St.) and the synagogue',
    'בית היתומים היהודי לשעבר (אוקטיאברסקאיה 3) ובית הכנסת'
  ),
  evening2024: photo(
    'evening-2024.jpg',
    'Александр Сигачёв',
    'CC BY-SA 4.0',
    '2024',
    'IMG_Kaliningrad_-_New_Synagogue_in_K%C3%B6nigsberg_-_2024-06-11_-_p2.jpg',
    'Синагога вечером, вид сверху',
    'The synagogue in the evening, from above',
    'בית הכנסת בערב, מבט מלמעלה'
  ),
};

/**
 * Portrait crops for full-height phone frames («Community life» on the home page): 1200×2000, cut from the Commons
 * originals (`.autopilot/ref/kld-img`, 3840px wide — no upscaling) around the building; same files, same credit.
 */
const tall = (file: string) => assetUrl(`/media/sections/${file}`);
export const PHOTO_TALL: Partial<Record<keyof typeof PHOTOS, string>> = {
  facade2019: tall('facade-2019-tall.jpg'),
  evening2024: tall('evening-2024-tall.jpg'),
  winter2025: tall('winter-2025-tall.jpg'),
  orphanage2025: tall('orphanage-2025-tall.jpg'),
};
