import express from 'express';
import cors from 'cors';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { upload } from './middleware/upload.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { ENV } from './config/env.js';
import * as authCtrl from './controllers/authController.js';
import * as vehicleCtrl from './controllers/vehicleController.js';
import * as driverCtrl from './controllers/driverController.js';
import * as driverDocsCtrl from './controllers/driverDocsController.js';
import * as shiftCtrl from './controllers/shiftController.js';
import * as issueCtrl from './controllers/issueController.js';
import * as dashboardCtrl from './controllers/dashboardController.js';

const app = express();
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fleet-backend' }));

/* ------------------------- auth ------------------------- */
app.post('/api/auth/login', authCtrl.login);
app.get('/api/auth/me', authenticate, authCtrl.me);
app.post('/api/auth/create-user', authenticate, requireAdmin, authCtrl.createUser);
app.get('/api/auth/users', authenticate, requireAdmin, authCtrl.listUsers);
app.patch('/api/auth/users/:uid', authenticate, requireAdmin, authCtrl.updateUser);

/* ------------------------- dashboard ------------------------- */
app.get('/api/dashboard', authenticate, dashboardCtrl.dashboard);

/* ------------------------- vehicles ------------------------- */
app.get('/api/vehicles', authenticate, vehicleCtrl.listVehicles);
app.post('/api/vehicles', authenticate, requireAdmin, vehicleCtrl.createVehicle);
app.get('/api/vehicles/:id', authenticate, vehicleCtrl.getVehicle);
app.put('/api/vehicles/:id', authenticate, requireAdmin, vehicleCtrl.updateVehicle);
app.delete('/api/vehicles/:id', authenticate, requireAdmin, vehicleCtrl.deleteVehicle);
app.get('/api/vehicles/:id/history', authenticate, vehicleCtrl.vehicleHistory);

app.post('/api/vehicles/:id/documents', authenticate, requireAdmin, upload.single('file'), vehicleCtrl.uploadDocument);
app.post('/api/vehicles/:id/documents/:docId/replace', authenticate, requireAdmin, upload.single('file'), vehicleCtrl.replaceDocument);
app.delete('/api/vehicles/:id/documents/:docId', authenticate, requireAdmin, vehicleCtrl.deleteDocument);
app.get('/api/vehicles/:id/documents/:docId/download', authenticate, vehicleCtrl.downloadDocument);

/* ------------------------- drivers ------------------------- */
app.get('/api/drivers', authenticate, driverCtrl.listDrivers);
app.post('/api/drivers', authenticate, requireAdmin, upload.single('photoFile'), driverCtrl.createDriver);
app.get('/api/drivers/my', authenticate, driverCtrl.myDriver);
app.get('/api/drivers/:id', authenticate, driverCtrl.getDriver);
app.put('/api/drivers/:id', authenticate, requireAdmin, driverCtrl.updateDriver);
app.patch('/api/drivers/:id/status', authenticate, requireAdmin, driverCtrl.updateDriverStatus);
app.get('/api/drivers/:id/history', authenticate, driverCtrl.getDriver);

app.post('/api/drivers/:id/documents', authenticate, requireAdmin, upload.single('file'), driverDocsCtrl.uploadDriverDocument);
app.post('/api/drivers/:id/documents/:docId/replace', authenticate, requireAdmin, upload.single('file'), driverDocsCtrl.replaceDriverDocument);
app.delete('/api/drivers/:id/documents/:docId', authenticate, requireAdmin, driverDocsCtrl.deleteDriverDocument);
app.get('/api/drivers/:id/documents/:docId/download', authenticate, driverDocsCtrl.downloadDriverDocument);
app.post('/api/drivers/:id/photo', authenticate, requireAdmin, upload.single('file'), driverDocsCtrl.replaceDriverPhoto);

/* ------------------------- shifts ------------------------- */
app.get('/api/shifts', authenticate, shiftCtrl.listShifts);
app.post('/api/shifts', authenticate, requireAdmin, shiftCtrl.createShift);
app.get('/api/shifts/:id', authenticate, shiftCtrl.getShift);
app.put('/api/shifts/:id', authenticate, requireAdmin, shiftCtrl.updateShift);
app.delete('/api/shifts/:id', authenticate, requireAdmin, shiftCtrl.deleteShift);

/* ------------------------- issues ------------------------- */
app.get('/api/issues', authenticate, issueCtrl.listIssues);
app.post('/api/issues', authenticate, upload.array('images', 6), issueCtrl.createIssue);
app.get('/api/issues/:id', authenticate, issueCtrl.getIssue);
app.post('/api/issues/:id/messages', authenticate, upload.array('attachments', 4), issueCtrl.sendIssueMessage);
app.patch('/api/issues/:id/status', authenticate, requireAdmin, issueCtrl.updateIssueStatus);

app.use(notFound);
app.use(errorHandler);

app.listen(ENV.port, () => {
  console.log(`[fleet-backend] listening on http://localhost:${ENV.port}`);
});
