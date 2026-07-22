require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const expressMongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const staffRoutes = require('./routes/staff.routes');
const trainingRoutes = require('./routes/training.routes');
const uploadRoutes = require('./routes/upload.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const masterRoutes = require('./routes/master.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();

// Security middlewares
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressMongoSanitize());

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Global API rate limiting
app.use('/api/', rateLimiter);

// Routing Matches
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/master', masterRoutes);
app.use('/api/v1/audit', auditRoutes);

// Heartbeat route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Training Management System API is active' });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
