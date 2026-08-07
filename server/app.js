import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { studentRouter } from './modules/students/student.routes.js';
import { academicRouter } from './modules/academics/academic.routes.js';
import { staffRouter } from './modules/staff/staff.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { financeRouter } from './modules/finance/finance.routes.js';
import { platformRouter } from './modules/platform/platform.routes.js';
import { resultRouter } from './modules/results/result.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(env.UPLOAD_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { service: 'educore-api', status: 'healthy' }, message: null });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/students', studentRouter);
app.use('/api/academics', academicRouter);
app.use('/api/staff', staffRouter);
app.use('/api/users', userRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/finance', financeRouter);
app.use('/api/platform', platformRouter);
app.use('/api/results', resultRouter);
app.use('/api/notifications', notificationRouter);

app.use(notFound);
app.use(errorHandler);
