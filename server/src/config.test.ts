import { describe, expect, it } from 'vitest';
import { createClock } from './clock.ts';
import { ConfigError, loadConfig } from './config.ts';

const valid = { MONGODB_URI: 'mongodb://localhost:27017/homeclose' };

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig(valid)).toEqual({ nodeEnv: 'development', port: 3000, mongodbUri: valid.MONGODB_URI, timeZone: 'UTC', fixedToday: null });
  });

  it('reads every variable', () => {
    const config = loadConfig({ ...valid, NODE_ENV: 'test', PORT: '8080', APP_TIME_ZONE: 'America/Los_Angeles', FIXED_TODAY: '2026-10-07' });
    expect(config).toMatchObject({ nodeEnv: 'test', port: 8080, timeZone: 'America/Los_Angeles', fixedToday: '2026-10-07' });
  });

  it('reports every problem at once', () => {
    try {
      loadConfig({ NODE_ENV: 'staging', PORT: 'abc', APP_TIME_ZONE: 'Mars/Base', FIXED_TODAY: '10/07/2026' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).problems).toHaveLength(5);
    }
  });

  it('refuses a pinned date in production', () => {
    expect(() => loadConfig({ ...valid, NODE_ENV: 'production', FIXED_TODAY: '2026-10-07' })).toThrow(/not allowed in production/);
  });
});

describe('createClock', () => {
  it('returns the pinned date', () => {
    expect(createClock('UTC', '2026-10-07')()).toBe('2026-10-07');
  });

  it('formats today as YYYY-MM-DD in the zone', () => {
    expect(createClock('Pacific/Kiritimati', null)()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
