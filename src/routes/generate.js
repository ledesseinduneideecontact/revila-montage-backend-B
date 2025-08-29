const express = require('express');
const videoGenerator = require('../services/videoGenerator');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { files, style = 'memories', options = {} } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided for generation' });
    }

    if (files.length < 2) {
      return res.status(400).json({ 
        error: 'Please upload at least 2 media files to create a video' 
      });
    }

    const io = req.app.get('io');
    global.io = io;

    const job = await videoGenerator.generateVideo(files, style, {
      duration: options.duration || 90,
      ...options
    });

    io.emit('generation-started', {
      jobId: job.id,
      style,
      filesCount: files.length
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Video generation started',
      estimatedTime: Math.ceil(files.length * 2)
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to start video generation',
      details: error.message 
    });
  }
});

router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = videoGenerator.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      outputFilename: job.outputFilename,
      error: job.error
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

router.get('/templates', (req, res) => {
  const editlyConfigs = require('../utils/editlyConfigs');
  const templates = editlyConfigs.getAllTemplates();
  
  res.json({ templates });
});

module.exports = router;