const express = require('express');
const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const employeeRoutes = require('../modules/employees/employee.routes');
const leadRoutes = require('../modules/leads/lead.routes');
const pipelineRoutes = require('../modules/pipeline/pipeline.routes');
const studentRoutes = require('../modules/students/student.routes');
const taskRoutes = require('../modules/tasks/task.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const communicationRoutes = require('../modules/communications/communications.routes');
const reportsRoutes = require('../modules/reports/reports.routes');
const institutionRoutes = require('../modules/institutions/institution.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const { serveStorageFile } = require('../modules/vault/vault.controller');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/leads', leadRoutes);
router.use('/pipeline', pipelineRoutes);
router.use('/students', studentRoutes);
router.use('/institutions', institutionRoutes);
router.use('/tasks', taskRoutes);
router.use('/notifications', notificationRoutes);
router.use('/communications', communicationRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);

// Secure short-lived signed storage delivery endpoint
router.get('/vault-storage/file', serveStorageFile);

module.exports = router;
