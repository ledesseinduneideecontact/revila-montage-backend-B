// Use editly on Railway (Linux) or FFmpeg fallback on Windows
const isProduction = process.env.NODE_ENV === 'production';
const editly = isProduction ? require('editly') : null;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const editlyConfigs = require('../utils/editlyConfigs');

// Set FFmpeg path
if (!isProduction && process.platform === 'win32') {
  ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
  ffmpeg.setFfprobePath('C:\\ffmpeg\\bin\\ffprobe.exe');
}

class VideoGenerator {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentJob = null;
    this.completedJobs = new Map(); // Cache des jobs complétés (dernières 24h)
    this.startCleanupScheduler();
  }
  
  startCleanupScheduler() {
    // Nettoyer les jobs complétés toutes les heures
    setInterval(() => {
      const now = Date.now();
      for (const [jobId, job] of this.completedJobs) {
        // Supprimer les jobs plus anciens que 24h
        if (now - job.completedAt > 86400000) {
          this.completedJobs.delete(jobId);
        }
      }
    }, 3600000);
  }

  async generateVideo(files, style = 'memories', options = {}) {
    const jobId = uuidv4();
    const outputFilename = `memory_${jobId}.mp4`;
    const outputPath = path.join(__dirname, '../../outputs', outputFilename);

    const job = {
      id: jobId,
      files,
      style,
      options,
      outputPath,
      outputFilename,
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };

    this.queue.push(job);
    
    if (!this.processing) {
      this.processQueue();
    }

    return job;
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    this.currentJob = this.queue.shift();
    
    try {
      await this.processJob(this.currentJob);
    } catch (error) {
      console.error('Error processing job:', error);
      this.currentJob.status = 'failed';
      this.currentJob.error = error.message;
    }

    this.processQueue();
  }

  async processJob(job) {
    job.status = 'processing';
    console.log('Processing job:', job.id);
    console.log('Files received:', job.files);
    
    const selectedMedia = await this.selectBestMedia(job.files, job.options.duration);
    console.log('Selected media:', selectedMedia);
    
    const template = editlyConfigs.getTemplate(job.style);
    
    const clips = await this.createClips(selectedMedia, template);
    console.log('Created clips:', clips);
    
    const musicPath = await this.getMusicForStyle(job.style);
    console.log('Music path:', musicPath);
    
    const config = {
      ...template.base,
      outPath: job.outputPath,
      clips,
      ...(musicPath && { 
        audioFilePath: musicPath,
        audioNorm: { enable: true, gaussSize: 5, maxGain: 30 }
      }),
      onProgress: (progress) => {
        job.progress = Math.round(progress * 100);
        this.emitProgress(job);
      }
    };

    // Use editly on Railway/Linux, FFmpeg fallback on Windows or if forced
    const forceFFmpeg = process.env.USE_FFMPEG_ONLY === 'true';
    
    if (isProduction && editly && !forceFFmpeg) {
      console.log('Using editly for video generation');
      await this.generateWithEditly(config);
    } else {
      console.log('Using FFmpeg fallback for video generation');
      await this.generateWithFFmpeg(clips, job.outputPath, musicPath, (progress) => {
        job.progress = Math.round(progress);
        this.emitProgress(job);
      });
    }
    
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = Date.now();
    
    // Ajouter au cache des jobs complétés
    this.completedJobs.set(job.id, { ...job });
    
    this.emitProgress(job);
  }

  async generateWithEditly(config) {
    console.log('Starting editly generation with config:', {
      outPath: config.outPath,
      clips: config.clips.length,
      audio: config.audioFilePath ? 'yes' : 'no'
    });
    
    return await editly(config);
  }

  async selectBestMedia(files, targetDuration = 90) {
    const scoredFiles = files.map(file => ({
      ...file,
      score: this.calculateMediaScore(file)
    }));

    scoredFiles.sort((a, b) => {
      const dateA = new Date(a.metadata.date || a.uploadedAt);
      const dateB = new Date(b.metadata.date || b.uploadedAt);
      return dateA - dateB;
    });

    const images = scoredFiles.filter(f => f.type === 'image');
    const videos = scoredFiles.filter(f => f.type === 'video');

    const selected = [];
    let currentDuration = 0;
    const photoDuration = 3.5;
    
    const maxPhotos = Math.ceil(targetDuration / photoDuration * 0.6);
    const maxVideos = Math.ceil(targetDuration / 10 * 0.4);

    let photoCount = 0;
    let videoCount = 0;

    const totalItems = Math.min(files.length, Math.ceil(targetDuration / 4));

    for (let i = 0; i < totalItems; i++) {
      let nextItem;
      
      if (videoCount < maxVideos && videos.length > videoCount && Math.random() > 0.6) {
        nextItem = videos[videoCount++];
        currentDuration += Math.min(nextItem.metadata.duration || 5, 8);
      } else if (photoCount < maxPhotos && images.length > photoCount) {
        nextItem = images[photoCount++];
        currentDuration += photoDuration;
      } else if (videos.length > videoCount) {
        nextItem = videos[videoCount++];
        currentDuration += Math.min(nextItem.metadata.duration || 5, 8);
      } else if (images.length > photoCount) {
        nextItem = images[photoCount++];
        currentDuration += photoDuration;
      }

      if (nextItem) {
        selected.push(nextItem);
      }

      if (currentDuration >= targetDuration) {
        break;
      }
    }

    return selected;
  }

  calculateMediaScore(file) {
    let score = 50;

    if (file.metadata.width >= 1920) score += 15;
    else if (file.metadata.width >= 1280) score += 10;

    if (file.metadata.height >= 1080) score += 15;
    else if (file.metadata.height >= 720) score += 10;

    if (file.metadata.gps) score += 5;

    if (file.type === 'video') {
      if (file.metadata.hasAudio) score += 10;
      if (file.metadata.duration >= 3 && file.metadata.duration <= 15) score += 10;
    }

    if (file.metadata.date) score += 5;

    return Math.min(100, score);
  }

  async createClips(mediaFiles, template) {
    const clips = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const isLast = i === mediaFiles.length - 1;

      if (file.type === 'image') {
        clips.push({
          duration: template.defaults.imageDuration || 3.5,
          layers: [{
            type: 'image',
            path: isProduction ? file.path : path.join(__dirname, '../../uploads', file.filename || path.basename(file.path)),
            ...template.defaults.imageLayer
          }],
          ...((!isLast && template.defaults.transition) && {
            transition: template.defaults.transition
          })
        });
      } else if (file.type === 'video') {
        const videoDuration = Math.min(
          file.metadata.duration || 5,
          template.defaults.maxVideoDuration || 8
        );

        clips.push({
          duration: videoDuration,
          layers: [{
            type: 'video',
            path: isProduction ? file.path : path.join(__dirname, '../../uploads', file.filename || path.basename(file.path)),
            ...template.defaults.videoLayer
          }],
          ...((!isLast && template.defaults.transition) && {
            transition: template.defaults.transition
          })
        });
      }
    }

    if (template.intro) {
      clips.unshift(template.intro);
    }

    if (template.outro) {
      clips.push(template.outro);
    }

    return clips;
  }

  async getMusicForStyle(style) {
    const musicMap = {
      memories: 'gentle-piano.mp3',
      nostalgia: 'nostalgic-strings.mp3',
      dynamic: 'upbeat-electronic.mp3',
      classic: 'classical-light.mp3'
    };

    const musicFile = musicMap[style] || musicMap.memories;
    const musicPath = path.join(__dirname, '../../assets/music', musicFile);

    try {
      await fs.access(musicPath);
      return musicPath;
    } catch {
      console.warn(`Music file not found: ${musicFile}`);
      return null;
    }
  }

  emitProgress(job) {
    if (global.io) {
      global.io.emit('generation-progress', {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        outputFilename: job.outputFilename
      });
    }
  }

  async generateWithFFmpeg(clips, outputPath, musicPath, onProgress) {
    console.log('Starting video generation with FFmpeg');
    console.log('Clips:', clips.length);
    console.log('Output path:', outputPath);
    
    return new Promise((resolve, reject) => {
      const tempDir = path.join(path.dirname(outputPath), 'temp_' + Date.now());
      
      fs.mkdir(tempDir, { recursive: true }).then(async () => {
        try {
          // Create a simple slideshow from images/videos
          const inputFiles = [];
          
          // Process each clip
          for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            if (clip.layers && clip.layers[0]) {
              const layer = clip.layers[0];
              // Skip title clips or clips without valid path
              if (layer.type === 'title' || !layer.path) {
                console.log('Skipping title/invalid clip:', layer.type);
                continue;
              }
              inputFiles.push({
                path: layer.path,
                duration: clip.duration || 3,
                type: layer.type
              });
            }
          }
          
          if (inputFiles.length === 0) {
            throw new Error('No valid input files');
          }
          
          console.log('Input files:', inputFiles);
          
          // For simplicity, just use the first file to create a basic video
          const firstFile = inputFiles[0];
          console.log('Using first file:', firstFile);
          
          // Ensure the file exists
          const fileExists = await fs.access(firstFile.path).then(() => true).catch(() => false);
          if (!fileExists) {
            throw new Error(`File not found: ${firstFile.path}`);
          }
          
          const command = ffmpeg(firstFile.path);
          
          if (firstFile.type === 'image') {
            command
              .loop()
              .duration(10) // Simple 10 second video
              .videoCodec('libx264')
              .outputOptions([
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p'
              ]);
          } else {
            command
              .videoCodec('libx264')
              .duration(10)
              .outputOptions([
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2'
              ]);
          }
          
          // Add music if available
          if (musicPath && await fs.access(musicPath).then(() => true).catch(() => false)) {
            command
              .input(musicPath)
              .audioCodec('aac')
              .outputOptions(['-shortest']);
          }
          
          command
            .on('start', (cmd) => {
              console.log('FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
              console.log('Progress:', progress);
              if (onProgress && progress.percent) {
                onProgress(progress.percent);
              }
            })
            .on('end', async () => {
              console.log('Video generation completed');
              // Clean up temp directory
              try {
                await fs.rm(tempDir, { recursive: true });
              } catch (e) {
                console.error('Error cleaning temp dir:', e);
              }
              resolve();
            })
            .on('error', async (err) => {
              console.error('FFmpeg error:', err);
              // Clean up temp directory
              try {
                await fs.rm(tempDir, { recursive: true });
              } catch (e) {}
              reject(err);
            })
            .save(outputPath);
        } catch (error) {
          console.error('Error in generateWithFFmpeg:', error);
          // Clean up temp directory
          try {
            await fs.rm(tempDir, { recursive: true });
          } catch (e) {}
          reject(error);
        }
      }).catch(reject);
    });
  }

  getJobStatus(jobId) {
    // Vérifier le job en cours
    if (this.currentJob && this.currentJob.id === jobId) {
      return this.currentJob;
    }

    // Vérifier la queue
    const queuedJob = this.queue.find(j => j.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }

    // Vérifier les jobs complétés
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) {
      return completedJob;
    }

    return null;
  }
  
  // Nouvelle méthode pour obtenir toutes les statistiques
  getStats() {
    return {
      processing: this.processing,
      queueLength: this.queue.length,
      completedJobsCount: this.completedJobs.size,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        status: this.currentJob.status,
        progress: this.currentJob.progress,
        style: this.currentJob.style,
        filesCount: this.currentJob.files.length
      } : null
    };
  }
}

module.exports = new VideoGenerator();