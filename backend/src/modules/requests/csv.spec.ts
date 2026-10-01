import { toCsv } from './csv';

const one = (v: string) => toCsv([{ v }], [['h', (r) => r.v]]).split('\r\n')[1];

describe('toCsv: защита от CSV-инъекций', () => {
  it("=1+1 выходит как текст «'=1+1»", () => {
    expect(one('=1+1')).toBe("'=1+1");
  });
  it.each(['+7 900', '-2', '@SUM(A1)', '=HYPERLINK("http://x","y")'])(
    "опасное начало «%s» нейтрализуется префиксом '",
    (v) => {
      expect(one(v).replace(/^"/, '').startsWith("'")).toBe(true);
    }
  );
  it('табуляция и \\r в начале тоже нейтрализуются', () => {
    expect(one('\tcmd')).toBe("'\tcmd");
    expect(one('\rcmd')).toBe('"\'\rcmd"');
  });
  it('кавычки, запятые, «;» и переводы строк экранируются', () => {
    expect(one('a "b"')).toBe('"a ""b"""');
    expect(one('a,b')).toBe('"a,b"');
    expect(one('a;b')).toBe('"a;b"');
    expect(one('a\nb')).toBe('"a\nb"');
  });
  it('обычный текст не меняется', () => {
    expect(one('Моше')).toBe('Моше');
  });
});
