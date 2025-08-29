const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const uploadRoutes = require('./src/routes/upload');
const generateRoutes = require('./src/routes/generate');
const downloadRoutes = require('./src/routes/download');
const monitorRoutes = require('./src/routes/monitor');
const storageManager = require('./src/services/storageManager');

// Middlewares
const { errorHandler, notFoundHandler, validateRequest } = require('./src/middleware/errorHandler');
const rateLimiter = require('./src/middleware/rateLimiter');
const security = require('./src/middleware/security');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 8080;

// Middlewares de sécurité et rate limiting
app.use(security.securityHeaders);
app.use(security.sanitizeInputs);
app.use(rateLimiter.apiLimiter());
app.use(validateRequest);

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

async function ensureDirectories() {
  const dirs = ['uploads', 'outputs', 'assets/music'];
  for (const dir of dirs) {
    await fs.mkdir(path.join(__dirname, dir), { recursive: true });
  }
}

app.set('io', io);

// Routes avec middlewares spécifiques
app.use('/api/upload', rateLimiter.uploadLimiter(), security.validateUpload, uploadRoutes);
app.use('/api/generate', rateLimiter.generationLimiter(), security.validateGenerationParams, generateRoutes);
app.use('/api/download', security.validateFilePath, downloadRoutes);
app.use('/api/monitor', monitorRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Servir le frontend en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Route de santé simple (redirect vers monitor)
app.get('/api/health', (req, res) => {
  res.redirect('/api/monitor/health');
});

// Route catch-all pour le frontend en production (doit être après toutes les routes API)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/outputs')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
}

// Gestion des erreurs avec les nouveaux middlewares
app.use(notFoundHandler);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function startServer() {
  try {
    await ensureDirectories();
    
    storageManager.startCleanupScheduler();
    
    server.listen(PORT, () => {
      console.log(`✨ Memories Maker Backend running on port ${PORT}`);
      console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
      console.log(`🎬 Output directory: ${path.join(__dirname, 'outputs')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await storageManager.cleanup();
  process.exit(0);
});