import { describe, expect, it } from 'vitest';
import { centsToInput, formatDay, formatLongDate, formatMoney, formatPeriod, parseMoney } from './format';

describe('money', () => {
  it('formats cents for display', () => {
    expect(formatMoney(128455)).toBe('$1,284.55');
    expect(formatMoney(-8427)).toBe('−$84.27');
    expect(formatMoney(385000, { sign: true })).toBe('+$3,850.00');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(5)).toBe('$0.05');
  });

  it('parses typed amounts to integer cents without floats', () => {
    expect(parseMoney('1,284.55')).toBe(128455);
    expect(parseMoney('$12')).toBe(1200);
    expect(parseMoney('0.1')).toBe(10);
    expect(parseMoney('.07')).toBe(7);
    expect(parseMoney('−45.20')).toBe(-4520);
    expect(parseMoney('-0')).toBe(0);
    expect(parseMoney('0.29')).toBe(29);
  });

  it('rejects text that is not an amount', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('1.234')).toBeNull();
    expect(parseMoney('.')).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });

  it('round-trips through the input format', () => {
    for (const cents of [0, 7, 128455, -8427]) expect(parseMoney(centsToInput(cents))).toBe(cents);
    expect(centsToInput(null)).toBe('');
  });
});

describe('dates', () => {
  it('formats ISO dates and periods', () => {
    expect(formatDay('2026-10-03')).toBe('Oct 3');
    expect(formatLongDate('2026-10-07')).toBe('Wednesday, October 7, 2026');
    expect(formatPeriod('2026-11')).toBe('November 2026');
  });
});
