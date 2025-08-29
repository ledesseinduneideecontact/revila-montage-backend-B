const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    const sanitizedFilename = path.basename(filename);
    
    if (!sanitizedFilename.endsWith('.mp4')) {
      return res.status(400).json({ error: 'Invalid file format' });
    }

    const filepath = path.join(__dirname, '../../outputs', sanitizedFilename);

    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filepath, sanitizedFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process download request' });
  }
});

router.get('/stream/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(__dirname, '../../outputs', sanitizedFilename);

    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = await fs.stat(filepath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = require('fs').createReadStream(filepath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      require('fs').createReadStream(filepath).pipe(res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(__dirname, '../../outputs', sanitizedFilename);

    try {
      await fs.access(filepath);
      await fs.unlink(filepath);
      res.json({ success: true, message: 'File deleted successfully' });
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;