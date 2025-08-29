const fs = require('fs').promises;
const path = require('path');

class StorageManager {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.outputDir = path.join(__dirname, '../../outputs');
    this.cleanupInterval = parseInt(process.env.CLEANUP_INTERVAL) || 3600000;
    this.fileLifetime = this.cleanupInterval;
  }

  startCleanupScheduler() {
    console.log(`📁 Storage cleanup scheduled every ${this.cleanupInterval / 1000 / 60} minutes`);
    
    setInterval(async () => {
      await this.cleanup();
    }, this.cleanupInterval);

    this.cleanup();
  }

  async cleanup() {
    try {
      console.log('🧹 Starting cleanup...');
      
      const uploadsCleaned = await this.cleanupDirectory(this.uploadDir);
      const outputsCleaned = await this.cleanupDirectory(this.outputDir);
      
      console.log(`✨ Cleanup completed: ${uploadsCleaned + outputsCleaned} files removed`);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  async cleanupDirectory(dirPath) {
    let cleanedCount = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      const now = Date.now();

      for (const file of files) {
        if (file === '.gitkeep') continue;
        
        const filePath = path.join(dirPath, file);
        
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;
          
          if (age > this.fileLifetime) {
            await fs.unlink(filePath);
            cleanedCount++;
            console.log(`Deleted old file: ${file}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return cleanedCount;
  }

  async getStorageStats() {
    const uploadStats = await this.getDirectoryStats(this.uploadDir);
    const outputStats = await this.getDirectoryStats(this.outputDir);

    return {
      uploads: uploadStats,
      outputs: outputStats,
      total: {
        files: uploadStats.files + outputStats.files,
        size: uploadStats.size + outputStats.size
      }
    };
  }

  async getDirectoryStats(dirPath) {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file === '.gitkeep') continue;
        
        const filePath = path.join(dirPath, file);
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          fileCount++;
        } catch (error) {
          console.error(`Error getting stats for ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return {
      files: fileCount,
      size: totalSize,
      sizeReadable: this.formatBytes(totalSize)
    };
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async ensureDirectories() {
    const dirs = [
      this.uploadDir,
      this.outputDir,
      path.join(__dirname, '../../assets/music'),
      path.join(__dirname, '../../logs')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      
      // Créer un .gitkeep si nécessaire
      const gitkeep = path.join(dir, '.gitkeep');
      try {
        await fs.access(gitkeep);
      } catch {
        await fs.writeFile(gitkeep, '');
      }
    }
    
    console.log('📁 All directories ensured');
  }
  
  // Nouvelle méthode pour obtenir l'espace disque
  async getDiskSpace() {
    try {
      // Sur Unix/Linux
      if (process.platform !== 'win32') {
        const { execSync } = require('child_process');
        const output = execSync('df -h /', { encoding: 'utf8' });
        const lines = output.split('\n');
        const data = lines[1].split(/\s+/);
        return {
          total: data[1],
          used: data[2],
          available: data[3],
          percentage: data[4]
        };
      } else {
        // Sur Windows, estimation basique
        return {
          total: 'N/A',
          used: 'N/A',
          available: 'N/A',
          percentage: 'N/A'
        };
      }
    } catch (error) {
      return { error: 'Cannot determine disk space' };
    }
  }
}

module.exports = new StorageManager();