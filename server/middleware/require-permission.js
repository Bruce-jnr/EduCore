import { AppError } from '../errors/app-error.js';

export function requirePermission(permission) {
  return (req, _res, next) => {
    if (!req.auth?.permissions.includes(permission)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }
    next();
  };
}
