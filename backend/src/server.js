import express from 'express';
import cors from 'cors';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { upload } from './middleware/upload.js';
import { notFound, errorHandler, asyncHandler } from './middleware/errors.js';
import { ENV } from './config/env.js';
import * as authCtrl from './controllers/authController.js';
import * as vehicleCtrl from './controllers/vehicleController.js';
import * as driverCtrl from './controllers/driverController.js';
import * as driverDocsCtrl from './controllers/driverDocsController.js';
import * as shiftCtrl from './controllers/shiftController.js';
import * as issueCtrl from './controllers/issueController.js';
import * as dashboardCtrl from './controllers/dashboardController.js';

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fleet-backend' }));

app.get('/', (_req, res) =>
  res.json({
    ok: true,
    service: 'fleet-backend',
    api: 'http://localhost:' + ENV.port + '/api',
    health: '/api/health'
  })
);

/* ------------------------- auth ------------------------- */
app.post('/api/auth/login', asyncHandler(authCtrl.login));
app.get('/api/auth/me', authenticate, asyncHandler(authCtrl.me));
app.post('/api/auth/create-user', authenticate, requireAdmin, asyncHandler(authCtrl.createUser));
app.get('/api/auth/users', authenticate, requireAdmin, asyncHandler(authCtrl.listUsers));
app.patch('/api/auth/users/:uid', authenticate, requireAdmin, asyncHandler(authCtrl.updateUser));

/* ------------------------- dashboard ------------------------- */
app.get('/api/dashboard', authenticate, asyncHandler(dashboardCtrl.dashboard));

/* ------------------------- vehicles ------------------------- */
app.get('/api/vehicles', authenticate, asyncHandler(vehicleCtrl.listVehicles));
app.post('/api/vehicles', authenticate, requireAdmin, asyncHandler(vehicleCtrl.createVehicle));
app.get('/api/vehicles/:id', authenticate, asyncHandler(vehicleCtrl.getVehicle));
app.put('/api/vehicles/:id', authenticate, requireAdmin, asyncHandler(vehicleCtrl.updateVehicle));
app.delete('/api/vehicles/:id', authenticate, requireAdmin, asyncHandler(vehicleCtrl.deleteVehicle));
app.get('/api/vehicles/:id/history', authenticate, asyncHandler(vehicleCtrl.vehicleHistory));

app.post('/api/vehicles/:id/documents', authenticate, requireAdmin, upload.single('file'), asyncHandler(vehicleCtrl.uploadDocument));
app.post('/api/vehicles/:id/documents/:docId/replace', authenticate, requireAdmin, upload.single('file'), asyncHandler(vehicleCtrl.replaceDocument));
app.delete('/api/vehicles/:id/documents/:docId', authenticate, requireAdmin, asyncHandler(vehicleCtrl.deleteDocument));
app.get('/api/vehicles/:id/documents/:docId/download', authenticate, asyncHandler(vehicleCtrl.downloadDocument));

/* ------------------------- drivers ------------------------- */
app.get('/api/drivers', authenticate, asyncHandler(driverCtrl.listDrivers));
app.post('/api/drivers', authenticate, requireAdmin, upload.single('photoFile'), asyncHandler(driverCtrl.createDriver));
app.get('/api/drivers/my', authenticate, asyncHandler(driverCtrl.myDriver));
app.get('/api/drivers/:id', authenticate, asyncHandler(driverCtrl.getDriver));
app.put('/api/drivers/:id', authenticate, requireAdmin, asyncHandler(driverCtrl.updateDriver));
app.patch('/api/drivers/:id/status', authenticate, requireAdmin, asyncHandler(driverCtrl.updateDriverStatus));
app.get('/api/drivers/:id/history', authenticate, asyncHandler(driverCtrl.getDriver));

app.post('/api/drivers/:id/documents', authenticate, requireAdmin, upload.single('file'), asyncHandler(driverDocsCtrl.uploadDriverDocument));
app.post('/api/drivers/:id/documents/:docId/replace', authenticate, requireAdmin, upload.single('file'), asyncHandler(driverDocsCtrl.replaceDriverDocument));
app.delete('/api/drivers/:id/documents/:docId', authenticate, requireAdmin, asyncHandler(driverDocsCtrl.deleteDriverDocument));
app.get('/api/drivers/:id/documents/:docId/download', authenticate, asyncHandler(driverDocsCtrl.downloadDriverDocument));
app.post('/api/drivers/:id/photo', authenticate, requireAdmin, upload.single('file'), asyncHandler(driverDocsCtrl.replaceDriverPhoto));

/* ------------------------- shifts ------------------------- */
app.get('/api/shifts', authenticate, asyncHandler(shiftCtrl.listShifts));
app.post('/api/shifts', authenticate, requireAdmin, asyncHandler(shiftCtrl.createShift));
app.get('/api/shifts/:id', authenticate, asyncHandler(shiftCtrl.getShift));
app.put('/api/shifts/:id', authenticate, requireAdmin, asyncHandler(shiftCtrl.updateShift));
app.delete('/api/shifts/:id', authenticate, requireAdmin, asyncHandler(shiftCtrl.deleteShift));

/* ------------------------- issues ------------------------- */
app.get('/api/issues', authenticate, asyncHandler(issueCtrl.listIssues));
app.post('/api/issues', authenticate, upload.array('images', 6), asyncHandler(issueCtrl.createIssue));
app.get('/api/issues/:id', authenticate, asyncHandler(issueCtrl.getIssue));
app.post('/api/issues/:id/messages', authenticate, upload.array('attachments', 4), asyncHandler(issueCtrl.sendIssueMessage));
app.patch('/api/issues/:id/status', authenticate, requireAdmin, asyncHandler(issueCtrl.updateIssueStatus));

app.use(notFound);
app.use(errorHandler);

app.listen(ENV.port, () => {
  console.log(`[fleet-backend] listening on http://localhost:${ENV.port}`);
});