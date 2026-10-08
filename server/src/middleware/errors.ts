import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { HttpError, notFound, validationError } from '../errors.ts';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(notFound('Route'));
}

/** Every error leaves as `{ error: { code, message, fields? } }`, never with a stack trace. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let error: HttpError;
  if (err instanceof HttpError) {
    error = err;
  } else if (err instanceof SyntaxError && 'body' in err) {
    error = validationError({ body: 'Send valid JSON.' });
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = validationError(Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message])));
  } else if (typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large') {
    error = new HttpError(413, 'payload_too_large', 'The request body is too large.');
  } else {
    console.error(err);
    error = new HttpError(500, 'internal_error', 'Something went wrong.');
  }
  res.status(error.status).json(error.toJSON());
}
