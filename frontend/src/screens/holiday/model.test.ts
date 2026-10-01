import { holidayState } from '@/screens/holiday/model';

describe('holidayState', () => {
  it('404 from the API means the holiday is not in the guide; other errors are retryable', () => {
    expect(holidayState(undefined, { status: 404, message: 'x' } as never)).toBe('not_found');
    expect(holidayState(undefined, { status: 'network', message: 'x' } as never)).toBe('error');
    expect(holidayState(undefined, null)).toBe('loading');
  });
});
