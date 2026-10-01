import { cleanPayload, nextAttempt, outcomeOf } from '@/forms/submit-model';

describe('cleanPayload', () => {
  it('trims strings and drops empty optional values, keeps booleans/numbers/arrays', () => {
    expect(
      cleanPayload({
        name: '  Анна ',
        email: '',
        middle: '   ',
        consent: false,
        seats: 2,
        areas: ['it'],
      })
    ).toEqual({ name: 'Анна', consent: false, seats: 2, areas: ['it'] });
  });
});

describe('nextAttempt (idempotency key lifecycle)', () => {
  it('keeps the same key after a failed send, so a retry does not create a duplicate', () => {
    const first = nextAttempt(null, () => 'k1');
    expect(first).toBe('k1');
    const afterNetworkError = nextAttempt({ key: 'k1', sent: false }, () => 'k2');
    expect(afterNetworkError).toBe('k1');
  });
  it('issues a new key once the previous submission succeeded', () => {
    expect(nextAttempt({ key: 'k1', sent: true }, () => 'k2')).toBe('k2');
  });
});

describe('outcomeOf', () => {
  it('demo build refused the send → banner "demo" (Pages demo: forms are disabled)', () => {
    expect(outcomeOf({ status: 'demo', message: 'x' })).toEqual({ banner: 'demo', fields: {} });
  });
  it('network failure → banner "network", no field errors (values stay in the form)', () => {
    expect(outcomeOf({ status: 'network', message: 'x' })).toEqual({
      banner: 'network',
      fields: {},
    });
  });
  it('400 with fields → field keys, banner "fields"', () => {
    expect(
      outcomeOf({
        status: 400,
        message: 'Проверьте',
        fields: { date: 'date_closed', consent: 'required' },
      })
    ).toEqual({ banner: 'fields', fields: { date: 'date_closed', consent: 'required' } });
  });
  it('429 → banner "too_many"; other server error → "server"', () => {
    expect(outcomeOf({ status: 429, message: 'x' }).banner).toBe('too_many');
    expect(outcomeOf({ status: 500, message: 'x' }).banner).toBe('server');
  });
  it('409 sold_out keeps the seats_left key as a field error', () => {
    expect(
      outcomeOf({ status: 409, message: 'sold_out', fields: { seats: 'seats_left:2' } })
    ).toEqual({
      banner: 'fields',
      fields: { seats: 'seats_left:2' },
    });
  });
});
