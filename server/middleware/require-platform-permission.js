import{AppError}from'../errors/app-error.js';
export function requirePlatformPermission(permission){return(req,_res,next)=>{if(!req.auth?.isPlatformUser)return next(new AppError('Platform access required',403,'PLATFORM_ACCESS_REQUIRED'));if(!req.auth.permissions.includes(permission))return next(new AppError('You do not have this platform permission',403,'FORBIDDEN'));next()}}
