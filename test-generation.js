const videoGenerator = require('./src/services/videoGenerator');
const path = require('path');

// Test avec des fichiers existants
const testFiles = [
  {
    id: 'test1',
    filename: 'siberian-husky-4735878_640.jpg',
    originalName: 'siberian-husky-4735878_640.jpg',
    path: path.join(__dirname, 'uploads', 'siberian-husky-4735878_640.jpg'),
    relativePath: 'siberian-husky-4735878_640.jpg',
    size: 96000,
    type: 'image',
    metadata: {
      width: 640,
      height: 427,
      type: 'image'
    },
    uploadedAt: new Date().toISOString()
  },
  {
    id: 'test2',
    filename: 'siberian-husky-7169324_640.jpg',
    originalName: 'siberian-husky-7169324_640.jpg',
    path: path.join(__dirname, 'uploads', 'siberian-husky-7169324_640.jpg'),
    relativePath: 'siberian-husky-7169324_640.jpg',
    size: 99000,
    type: 'image',
    metadata: {
      width: 640,
      height: 425,
      type: 'image'
    },
    uploadedAt: new Date().toISOString()
  }
];

console.log('Starting test generation...');

videoGenerator.generateVideo(testFiles, 'memories', { duration: 30 })
  .then(job => {
    console.log('Job created:', job.id);
    console.log('Output will be:', job.outputPath);
    
    // Attendre la fin
    const checkStatus = setInterval(() => {
      const status = videoGenerator.getJobStatus(job.id);
      if (status) {
        console.log(`Status: ${status.status}, Progress: ${status.progress}%`);
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(checkStatus);
          console.log('Final status:', status);
          process.exit(status.status === 'completed' ? 0 : 1);
        }
      }
    }, 1000);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });