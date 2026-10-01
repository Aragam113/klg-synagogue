import { mapLinks } from '@/config/maps';

// Координаты здания из геотега статьи Википедии (`SITE.geo`): 54.70568333, 20.51555278.
const point = { lat: 54.70568333, lon: 20.51555278 };

describe('mapLinks', () => {
  it('builds Yandex and Google links pinned to the synagogue coordinates', () => {
    const links = mapLinks(point);
    expect(links.yandex).toBe('https://yandex.ru/maps/?pt=20.51555278,54.70568333&z=17&l=map');
    expect(links.google).toBe(
      'https://www.google.com/maps/search/?api=1&query=54.70568333%2C20.51555278'
    );
  });

  it('builds an OpenStreetMap embed with a marker on the point and a bbox around it', () => {
    const url = new URL(mapLinks(point).osmEmbed);
    expect(url.origin + url.pathname).toBe('https://www.openstreetmap.org/export/embed.html');
    expect(url.searchParams.get('marker')).toBe('54.70568333,20.51555278');
    const [w, s, e, n] = (url.searchParams.get('bbox') ?? '').split(',').map(Number);
    expect(w).toBeLessThan(point.lon);
    expect(e).toBeGreaterThan(point.lon);
    expect(s).toBeLessThan(point.lat);
    expect(n).toBeGreaterThan(point.lat);
  });
});
