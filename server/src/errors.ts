/** HTTP errors with the API's single error shape: `{ error: { code, message, fields? } }`. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...(this.fields && { fields: this.fields }) } };
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} not found.`);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
export const unauthenticated = () => new HttpError(401, 'unauthenticated', 'Sign in to continue.');

export function validationError(fields: Record<string, string>) {
  return new HttpError(400, 'validation_failed', 'Some fields need attention.', fields);
}
