// Rate limiting middleware simple (sans Redis pour Railway)
class RateLimiter {
  constructor() {
    this.clients = new Map();
    this.cleanupInterval = 60000; // 1 minute
    this.startCleanup();
  }
  
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [ip, data] of this.clients) {
        // Nettoyer les entrées plus anciennes que 15 minutes
        if (now - data.lastRequest > 900000) {
          this.clients.delete(ip);
        }
      }
    }, this.cleanupInterval);
  }
  
  // Rate limiter pour les uploads
  uploadLimiter() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!this.clients.has(ip)) {
        this.clients.set(ip, {
          uploads: 1,
          lastRequest: now,
          resetTime: now + 3600000 // 1 heure
        });
        return next();
      }
      
      const client = this.clients.get(ip);
      
      // Reset counter si plus d'une heure
      if (now > client.resetTime) {
        client.uploads = 1;
        client.resetTime = now + 3600000;
        client.lastRequest = now;
        return next();
      }
      
      // Limite: 10 uploads par heure
      if (client.uploads >= 10) {
        return res.status(429).json({
          error: 'Too many uploads',
          message: 'Upload limit exceeded. Try again later.',
          retryAfter: Math.ceil((client.resetTime - now) / 1000)
        });
      }
      
      client.uploads++;
      client.lastRequest = now;
      next();
    };
  }
  
  // Rate limiter pour la génération de vidéos
  generationLimiter() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!this.clients.has(ip)) {
        this.clients.set(ip, {
          generations: 1,
          lastGeneration: now,
          resetTime: now + 3600000
        });
        return next();
      }
      
      const client = this.clients.get(ip);
      
      // Reset si plus d'une heure
      if (now > client.resetTime) {
        client.generations = 1;
        client.resetTime = now + 3600000;
        client.lastGeneration = now;
        return next();
      }
      
      // Limite: 5 générations par heure
      if (client.generations >= 5) {
        return res.status(429).json({
          error: 'Too many generation requests',
          message: 'Generation limit exceeded. Try again later.',
          retryAfter: Math.ceil((client.resetTime - now) / 1000)
        });
      }
      
      // Minimum 30 secondes entre les générations
      if (now - client.lastGeneration < 30000) {
        return res.status(429).json({
          error: 'Generation too frequent',
          message: 'Please wait 30 seconds between generation requests.',
          retryAfter: 30
        });
      }
      
      client.generations++;
      client.lastGeneration = now;
      next();
    };
  }
  
  // Rate limiter général pour les API
  apiLimiter() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!this.clients.has(ip)) {
        this.clients.set(ip, {
          requests: 1,
          windowStart: now
        });
        return next();
      }
      
      const client = this.clients.get(ip);
      
      // Fenêtre glissante de 1 minute
      if (now - client.windowStart > 60000) {
        client.requests = 1;
        client.windowStart = now;
        return next();
      }
      
      // Limite: 100 requêtes par minute
      if (client.requests >= 100) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Try again later.',
          retryAfter: 60
        });
      }
      
      client.requests++;
      next();
    };
  }
}

module.exports = new RateLimiter();