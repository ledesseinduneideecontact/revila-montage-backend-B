const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mediaAnalyzer = require('../services/mediaAnalyzer');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 104857600
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|mp4|mov|webm|avi|mkv|mp3|wav|aac|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname || mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos and audio files are allowed.'));
    }
  }
});

router.post('/', upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const io = req.app.get('io');
    io.emit('upload-progress', { status: 'analyzing', count: req.files.length });

    const analyzedFiles = [];
    
    for (const file of req.files) {
      try {
        const metadata = await mediaAnalyzer.analyzeFile(file);
        analyzedFiles.push({
          id: file.filename.split('.')[0],
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          relativePath: file.filename,
          size: file.size,
          type: metadata.type,
          metadata,
          uploadedAt: new Date().toISOString()
        });
      } catch (analyzeError) {
        console.error(`Error analyzing file ${file.filename}:`, analyzeError);
        analyzedFiles.push({
          id: file.filename.split('.')[0],
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          relativePath: file.filename,
          size: file.size,
          type: 'unknown',
          metadata: {},
          uploadedAt: new Date().toISOString()
        });
      }
    }

    analyzedFiles.sort((a, b) => {
      const dateA = a.metadata.date || a.uploadedAt;
      const dateB = b.metadata.date || b.uploadedAt;
      return new Date(dateA) - new Date(dateB);
    });

    io.emit('upload-complete', { files: analyzedFiles });

    res.json({
      success: true,
      message: `${req.files.length} files uploaded successfully`,
      files: analyzedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs').promises;
    const uploadDir = path.join(__dirname, '../../uploads');
    
    const files = await fs.readdir(uploadDir);
    const fileToDelete = files.find(f => f.startsWith(id));
    
    if (fileToDelete) {
      await fs.unlink(path.join(uploadDir, fileToDelete));
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;