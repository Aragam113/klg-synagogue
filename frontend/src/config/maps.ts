/** Ссылки на карты для точки: кнопки «Яндекс Карты» / «Google Maps» и встраиваемая карта OpenStreetMap. */
export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface MapLinks {
  yandex: string;
  google: string;
  /** src для <iframe> (OpenStreetMap export/embed с маркером). */
  osmEmbed: string;
  /** Полная карта OpenStreetMap. */
  osm: string;
}

/** Половина стороны окна встраиваемой карты в градусах (~350 м по широте). */
const SPAN = 0.0032;

export const mapLinks = ({ lat, lon }: GeoPoint): MapLinks => {
  const bbox = [lon - SPAN * 1.8, lat - SPAN, lon + SPAN * 1.8, lat + SPAN]
    .map((v) => v.toFixed(6))
    .join('%2C');
  return {
    yandex: `https://yandex.ru/maps/?pt=${lon},${lat}&z=17&l=map`,
    google: `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lon}`,
    osmEmbed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
  };
};
