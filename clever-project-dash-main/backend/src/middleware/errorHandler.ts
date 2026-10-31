// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Handle 404 for unknown routes.
 * Guarantees a consistent JSON response instead of Express default HTML.
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Centralized error handler.
 * Catches all errors from synchronous and asynchronous middleware and routes.
 * Guarantees JSON response and prevents exposure of stack traces or internal secrets.
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 1. Invalid JSON body parsing error from express.json()
  if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }

  // 2. Mongoose CastError (e.g. invalid ObjectId)
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path || 'ID'}` });
  }

  // 3. Mongoose ValidationError
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: err.message || 'Validation error' });
  }

  // 4. JWT Errors
  if (err?.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid access token' });
  }
  if (err?.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Access token expired' });
  }

  // 5. Explicit HTTP error status codes (e.g. 400, 401, 403, 404, 409, 429, 502, 503)
  const status =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.statusCode === 'number'
      ? err.statusCode
      : null;

  if (status && status >= 400 && status < 600) {
    return res.status(status).json({
      message: err.message || 'An error occurred',
      ...(err.code ? { code: err.code } : {}),
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // 6. Generic 500 error - sanitize without leaking stack traces or internal details
  console.error('[Unhandled Server Error]:', err?.message || err);
  return res.status(500).json({ message: 'Internal server error' });
};
