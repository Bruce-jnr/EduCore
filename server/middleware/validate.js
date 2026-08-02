import { AppError } from '../errors/app-error.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      return next(new AppError('Validation failed', 422, 'VALIDATION_ERROR', result.error.flatten()));
    }
    req.validated = result.data;
    next();
  };
}
