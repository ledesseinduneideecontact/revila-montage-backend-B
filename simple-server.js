const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Test FFmpeg
app.get('/api/health', (req, res) => {
  exec('ffmpeg -version', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'FFmpeg not available',
        error: error.message 
      });
    }
    
    const version = stdout.split('\n')[0];
    res.json({ 
      status: 'ok', 
      message: 'API is running',
      ffmpeg: version
    });
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Simple backend running on port ${PORT}`);
});