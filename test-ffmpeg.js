const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// Set FFmpeg path for Windows
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\ffmpeg\\bin\\ffprobe.exe');

// Test with one of the example images
const inputFile = path.join(__dirname, '..', 'medias', 'siberian-husky-4735878_640.jpg');
const outputFile = path.join(__dirname, 'outputs', 'test-output.mp4');

console.log('Starting FFmpeg test...');
console.log('Input:', inputFile);
console.log('Output:', outputFile);

ffmpeg(inputFile)
  .loop()
  .duration(5)
  .videoCodec('libx264')
  .outputOptions([
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2'
  ])
  .on('start', (cmd) => {
    console.log('FFmpeg command:', cmd);
  })
  .on('progress', (progress) => {
    console.log('Progress:', Math.round(progress.percent || 0) + '%');
  })
  .on('end', () => {
    console.log('✓ Video created successfully!');
    console.log('Output file:', outputFile);
    process.exit(0);
  })
  .on('error', (err) => {
    console.error('✗ Error:', err.message);
    process.exit(1);
  })
  .save(outputFile);