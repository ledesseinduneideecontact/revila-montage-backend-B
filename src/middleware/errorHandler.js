const multer = require('multer');

// Middleware de gestion d'erreurs
const errorHandler = (err, req, res, next) => {
  console.error('Error stack:', err.stack);
  
  // Erreur de validation Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size exceeds the maximum allowed limit (100MB)'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 100 files allowed per upload'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  
  // Erreur de type de fichier
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only images, videos, and audio files are allowed'
    });
  }
  
  // Erreur FFmpeg/Editly
  if (err.message && (err.message.includes('ffmpeg') || err.message.includes('editly'))) {
    return res.status(500).json({
      error: 'Video processing error',
      message: 'Failed to process video. Please try again with different files.'
    });
  }
  
  // Erreur d'espace disque
  if (err.code === 'ENOSPC') {
    return res.status(507).json({
      error: 'Storage full',
      message: 'Server storage is full. Please try again later.'
    });
  }
  
  // Erreur de fichier non trouvé
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      error: 'File not found',
      message: 'Requested file does not exist'
    });
  }
  
  // Erreur de permission
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Server lacks permission to access the resource'
    });
  }
  
  // Erreur générique
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
};

// Middleware de gestion des routes non trouvées
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/upload',
      'DELETE /api/upload/:id',
      'POST /api/generate',
      'GET /api/generate/status/:jobId',
      'GET /api/generate/templates',
      'GET /api/download/:filename',
      'GET /api/download/stream/:filename',
      'DELETE /api/download/:filename'
    ]
  });
};

// Middleware de validation des requêtes
const validateRequest = (req, res, next) => {
  // Validation générale
  if (req.method === 'POST' && req.headers['content-length'] > 104857600) { // 100MB
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request size exceeds 100MB limit'
    });
  }
  
  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  validateRequest
};