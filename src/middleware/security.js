const path = require('path');
const crypto = require('crypto');

// Middleware de sécurité
const security = {
  // Validation des chemins de fichiers
  validateFilePath: (req, res, next) => {
    const { filename, id } = req.params;
    
    if (filename) {
      // Sécuriser le nom de fichier
      const sanitized = path.basename(filename);
      if (sanitized !== filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({
          error: 'Invalid filename',
          message: 'Filename contains invalid characters'
        });
      }
    }
    
    if (id) {
      // Valider l'ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id) && !id.match(/^[a-zA-Z0-9_-]+$/)) {
        return res.status(400).json({
          error: 'Invalid ID format',
          message: 'ID must be a valid UUID or alphanumeric string'
        });
      }
    }
    
    next();
  },
  
  // Headers de sécurité
  securityHeaders: (req, res, next) => {
    // Empêcher le sniffing MIME
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Protection XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Empêcher l'embedding dans des frames
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Politique de référent stricte
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy basique
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; media-src 'self' blob:;");
    
    next();
  },
  
  // Validation des uploads
  validateUpload: (req, res, next) => {
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Vérifier la taille
        if (file.size > 104857600) { // 100MB
          return res.status(400).json({
            error: 'File too large',
            message: 'Each file must be smaller than 100MB'
          });
        }
        
        // Vérifier l'extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.mp4', '.mov', '.webm', '.avi', '.mkv', '.mp3', '.wav', '.aac', '.m4a'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'Invalid file type',
            message: `File type ${ext} is not allowed`
          });
        }
        
        // Vérifier le nom de fichier original
        if (file.originalname.length > 255) {
          return res.status(400).json({
            error: 'Filename too long',
            message: 'Filename must be shorter than 255 characters'
          });
        }
        
        // Vérifier les caractères dans le nom
        if (!/^[a-zA-Z0-9._\-\s()]+$/.test(file.originalname)) {
          return res.status(400).json({
            error: 'Invalid filename',
            message: 'Filename contains invalid characters'
          });
        }
      }
    }
    
    next();
  },
  
  // Génération de CSP nonce pour les scripts inline
  generateNonce: (req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  },
  
  // Validation des paramètres de génération
  validateGenerationParams: (req, res, next) => {
    const { files, style, options } = req.body;
    
    // Vérifier les fichiers
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        error: 'Invalid files parameter',
        message: 'Files must be an array'
      });
    }
    
    if (files.length > 100) {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 100 files allowed'
      });
    }
    
    // Vérifier le style
    const allowedStyles = ['dynamic', 'smooth', 'minimal', 'memories', 'nostalgia', 'classic'];
    if (style && !allowedStyles.includes(style)) {
      return res.status(400).json({
        error: 'Invalid style',
        message: 'Style must be one of: ' + allowedStyles.join(', ')
      });
    }
    
    // Vérifier les options
    if (options && typeof options === 'object') {
      if (options.duration && (typeof options.duration !== 'number' || options.duration < 10 || options.duration > 600)) {
        return res.status(400).json({
          error: 'Invalid duration',
          message: 'Duration must be between 10 and 600 seconds'
        });
      }
    }
    
    next();
  },
  
  // Nettoyage des inputs
  sanitizeInputs: (req, res, next) => {
    // Nettoyer les paramètres de query
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/[<>]/g, '');
      }
    }
    
    // Nettoyer les paramètres de corps
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].replace(/[<>]/g, '');
        }
      }
    }
    
    next();
  }
};

module.exports = security;