const express = require('express');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const storageManager = require('../services/storageManager');
const videoGenerator = require('../services/videoGenerator');

const router = express.Router();

// Route de santé détaillée
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        system: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024)
      },
      cpu: {
        cores: os.cpus().length,
        load: os.loadavg()
      },
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Vérifier FFmpeg
    try {
      const ffmpeg = require('fluent-ffmpeg');
      health.ffmpeg = 'available';
    } catch (error) {
      health.ffmpeg = 'unavailable';
    }

    // Vérifier Editly
    try {
      if (process.env.NODE_ENV === 'production') {
        const editly = require('editly');
        health.editly = 'available';
      } else {
        health.editly = 'disabled (development)';
      }
    } catch (error) {
      health.editly = 'unavailable';
    }

    // Vérifier les dossiers
    const uploadDir = path.join(__dirname, '../../uploads');
    const outputDir = path.join(__dirname, '../../outputs');
    
    try {
      await fs.access(uploadDir);
      health.uploadDir = 'accessible';
    } catch {
      health.uploadDir = 'inaccessible';
    }
    
    try {
      await fs.access(outputDir);
      health.outputDir = 'accessible';
    } catch {
      health.outputDir = 'inaccessible';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Statistiques du système
router.get('/stats', async (req, res) => {
  try {
    const stats = await storageManager.getStorageStats();
    
    const systemStats = {
      storage: stats,
      queue: videoGenerator.getStats(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024),
          used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
        },
        cpu: {
          count: os.cpus().length,
          model: os.cpus()[0].model,
          load: os.loadavg()
        }
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    };

    res.json(systemStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logs récents (dernières 100 lignes)
router.get('/logs', (req, res) => {
  try {
    // Simuler des logs (en production, vous pourriez lire un fichier de log)
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Health check requested',
        service: 'monitor'
      }
    ];
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Nettoyage manuel
router.post('/cleanup', async (req, res) => {
  try {
    await storageManager.cleanup();
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Information sur les templates disponibles
router.get('/templates', (req, res) => {
  try {
    const editlyConfigs = require('../utils/editlyConfigs');
    const templates = editlyConfigs.getAllTemplates();
    
    res.json({
      templates,
      count: templates.length,
      default: 'memories'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;