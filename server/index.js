import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import patientRoutes from './routes/patients.js';
import taskRoutes from './routes/tasks.js';
import assessmentRoutes from './routes/assessments.js';
import ambulationRoutes from './routes/ambulations.js';
import notificationRoutes from './routes/notifications.js';
import incidentRoutes from './routes/incidents.js';
import checklistRoutes from './routes/checklist.js';
import auditRoutes from './routes/audit.js';
import authRoutes from './routes/auth.js';
import { verifyToken, requireHeadNurse } from './middleware/auth.js';
import { startScheduler, notifyOnRequest } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check (ใช้ปลุก server บน Render)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Route (Public)
app.use('/api/auth', authRoutes);

// Protected API Routes
app.use('/api', verifyToken, notifyOnRequest);
app.use('/api/patients', patientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/ambulations', ambulationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/audit', requireHeadNurse, auditRoutes);

startScheduler();

app.listen(PORT, () => {
  console.log(`🏥 SARA API Server running on http://localhost:${PORT}`);
});
