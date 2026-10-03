/** Site paths under the GitHub Pages base path (`/klg-synagogue`) and without it (dev/prod). */
const load = (base: string | undefined): typeof import('./demo') => {
  const prev = process.env.EXPO_BASE_URL;
  if (base === undefined) delete process.env.EXPO_BASE_URL;
  else process.env.EXPO_BASE_URL = base;
  let mod!: typeof import('./demo');
  jest.isolateModules(() => {
    mod = require('./demo');
  });
  if (prev === undefined) delete process.env.EXPO_BASE_URL;
  else process.env.EXPO_BASE_URL = prev;
  return mod;
};

describe('routeHref under /klg-synagogue', () => {
  const { routeHref, stripBase } = load('/klg-synagogue/');

  it('prefixes root-relative routes', () => {
    expect(routeHref('/visit/hours')).toBe('/klg-synagogue/visit/hours');
    expect(routeHref('/')).toBe('/klg-synagogue/');
    expect(routeHref('/news?from=a#b')).toBe('/klg-synagogue/news?from=a#b');
  });

  it('does not prefix twice', () => {
    expect(routeHref('/klg-synagogue/visit')).toBe('/klg-synagogue/visit');
    expect(routeHref('/klg-synagogue')).toBe('/klg-synagogue');
  });

  it('leaves external, protocol-relative and hash links alone', () => {
    expect(routeHref('https://t.me/x')).toBe('https://t.me/x');
    expect(routeHref('//cdn.example/x')).toBe('//cdn.example/x');
    expect(routeHref('tel:+74012')).toBe('tel:+74012');
    expect(routeHref('#main')).toBe('#main');
  });

  it('a prefixed href becomes a router path again', () => {
    expect(stripBase('/klg-synagogue/visit/hours')).toBe('/visit/hours');
    expect(stripBase('/klg-synagogue')).toBe('/');
    expect(stripBase('/klg-synagogue-old/x')).toBe('/klg-synagogue-old/x');
    expect(stripBase('/visit')).toBe('/visit');
  });
});

describe('routeHref without a base path', () => {
  const { routeHref, stripBase } = load(undefined);

  it('is the identity', () => {
    expect(routeHref('/visit/hours')).toBe('/visit/hours');
    expect(stripBase('/visit/hours')).toBe('/visit/hours');
  });
});
