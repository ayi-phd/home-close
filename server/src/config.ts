/** Configuration comes only from environment variables, validated once at startup. */
import { isIsoDate } from './services/domain/dates.ts';

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  mongodbUri: string;
  /** IANA zone used to decide the household's "today". */
  timeZone: string;
  /** Pins "today" (YYYY-MM-DD), e.g. to work with the October 2026 sample data. Not for production. */
  fixedToday: string | null;
}

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    problems.push('NODE_ENV must be development, test or production.');
  }
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push('PORT must be an integer from 1 to 65535.');
  const mongodbUri = env.MONGODB_URI ?? '';
  if (!/^mongodb(\+srv)?:\/\//.test(mongodbUri)) problems.push('MONGODB_URI is required and must start with mongodb:// or mongodb+srv://.');
  const timeZone = env.APP_TIME_ZONE || 'UTC';
  if (!isTimeZone(timeZone)) problems.push(`APP_TIME_ZONE "${timeZone}" is not a valid IANA time zone.`);
  const fixedToday = env.FIXED_TODAY || null;
  if (fixedToday !== null && !isIsoDate(fixedToday)) problems.push('FIXED_TODAY must be a YYYY-MM-DD date.');
  if (fixedToday !== null && nodeEnv === 'production') problems.push('FIXED_TODAY is not allowed in production.');
  if (problems.length > 0) throw new ConfigError(problems);
  return { nodeEnv: nodeEnv as Config['nodeEnv'], port, mongodbUri, timeZone, fixedToday };
}
