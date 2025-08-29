const path = require('path');
const exifr = require('exifr');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs').promises;

class MediaAnalyzer {
  constructor() {
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
    this.videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    this.audioExtensions = ['.mp3', '.wav', '.aac', '.m4a'];
  }

  async analyzeFile(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const type = this.getFileType(ext);

    let metadata = {
      type,
      extension: ext,
      mimeType: file.mimetype
    };

    try {
      if (type === 'image') {
        metadata = { ...metadata, ...(await this.analyzeImage(file.path)) };
      } else if (type === 'video') {
        metadata = { ...metadata, ...(await this.analyzeVideo(file.path)) };
      } else if (type === 'audio') {
        metadata = { ...metadata, ...(await this.analyzeAudio(file.path)) };
      }
    } catch (error) {
      console.error(`Error analyzing ${type} file:`, error);
    }

    return metadata;
  }

  getFileType(extension) {
    if (this.imageExtensions.includes(extension)) return 'image';
    if (this.videoExtensions.includes(extension)) return 'video';
    if (this.audioExtensions.includes(extension)) return 'audio';
    return 'unknown';
  }

  async analyzeImage(filepath) {
    try {
      const exifData = await exifr.parse(filepath, {
        pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude']
      });

      let thumbnailName = null;
      
      try {
        const sharpImage = sharp(filepath);
        const metadata = await sharpImage.metadata();
        
        const thumbnailPath = filepath.replace(path.extname(filepath), '_thumb.jpg');
        await sharpImage
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        
        thumbnailName = path.basename(thumbnailPath);
        
        return {
          width: metadata.width,
          height: metadata.height,
          orientation: metadata.orientation,
          date: exifData?.DateTimeOriginal || exifData?.CreateDate || new Date(),
          gps: exifData?.GPSLatitude && exifData?.GPSLongitude ? {
            lat: exifData.GPSLatitude,
            lng: exifData.GPSLongitude
          } : null,
          thumbnail: thumbnailName,
          dominantColors: metadata.channels ? await this.extractDominantColors(filepath) : []
        };
      } catch (sharpError) {
        console.error('Sharp error, using original as thumbnail:', sharpError);
        // Si Sharp échoue, utiliser l'image originale comme thumbnail
        return {
          width: 0,
          height: 0,
          orientation: 0,
          date: exifData?.DateTimeOriginal || exifData?.CreateDate || new Date(),
          gps: exifData?.GPSLatitude && exifData?.GPSLongitude ? {
            lat: exifData.GPSLatitude,
            lng: exifData.GPSLongitude
          } : null,
          thumbnail: path.basename(filepath), // Utiliser l'image originale
          dominantColors: []
        };
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        date: new Date(),
        width: 0,
        height: 0,
        thumbnail: path.basename(filepath) // Utiliser l'image originale
      };
    }
  }

  async analyzeVideo(filepath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          console.error('Video analysis error:', err);
          resolve({
            duration: 0,
            date: new Date(),
            width: 0,
            height: 0
          });
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        const thumbnailPath = filepath.replace(path.extname(filepath), '_thumb.jpg');
        
        ffmpeg(filepath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '300x300'
          })
          .on('end', () => {
            resolve({
              duration: metadata.format.duration,
              date: metadata.format.tags?.creation_time || new Date(),
              width: videoStream?.width || 0,
              height: videoStream?.height || 0,
              fps: videoStream ? eval(videoStream.r_frame_rate) : 30,
              bitrate: metadata.format.bit_rate,
              hasAudio: !!audioStream,
              thumbnail: path.basename(thumbnailPath)
            });
          })
          .on('error', (err) => {
            console.error('Thumbnail generation error:', err);
            resolve({
              duration: metadata.format.duration,
              date: metadata.format.tags?.creation_time || new Date(),
              width: videoStream?.width || 0,
              height: videoStream?.height || 0,
              fps: videoStream ? eval(videoStream.r_frame_rate) : 30,
              bitrate: metadata.format.bit_rate,
              hasAudio: !!audioStream
            });
          });
      });
    });
  }

  async analyzeAudio(filepath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          console.error('Audio analysis error:', err);
          resolve({
            duration: 0,
            bitrate: 0,
            sampleRate: 0
          });
          return;
        }

        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          sampleRate: audioStream?.sample_rate || 0,
          channels: audioStream?.channels || 0,
          codec: audioStream?.codec_name || 'unknown'
        });
      });
    });
  }

  async extractDominantColors(filepath) {
    try {
      const { dominant } = await sharp(filepath)
        .resize(50, 50, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      return [];
    } catch (error) {
      return [];
    }
  }

  calculateQualityScore(metadata) {
    let score = 50;
    
    if (metadata.type === 'image') {
      if (metadata.width >= 1920) score += 20;
      else if (metadata.width >= 1280) score += 10;
      
      if (metadata.height >= 1080) score += 20;
      else if (metadata.height >= 720) score += 10;
      
      if (metadata.gps) score += 10;
    } else if (metadata.type === 'video') {
      if (metadata.duration >= 3 && metadata.duration <= 30) score += 20;
      if (metadata.width >= 1280 && metadata.height >= 720) score += 20;
      if (metadata.hasAudio) score += 10;
    }

    return Math.min(100, score);
  }
}

module.exports = new MediaAnalyzer();