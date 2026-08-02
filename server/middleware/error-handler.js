import { AppError } from '../errors/app-error.js';

export function notFound(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(error, _req, res, _next) {
  void _next;
  const known = error instanceof AppError;
  const statusCode = known ? error.statusCode : 500;

  if (!known) console.error(error);

  res.status(statusCode).json({
    success: false,
    message: known ? error.message : 'An unexpected error occurred',
    code: known ? error.code : 'INTERNAL_ERROR',
    errors: known ? error.errors : null,
  });
}
