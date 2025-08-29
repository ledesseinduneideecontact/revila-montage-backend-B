/**
 * Script de test pour vérifier l'installation complète du backend
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

console.log('🧪 Test de configuration du backend Revila Montage Video\n');

async function testDirectories() {
  console.log('📁 Test des dossiers...');
  
  const requiredDirs = [
    'uploads',
    'outputs', 
    'assets/music',
    'src/routes',
    'src/services',
    'src/middleware',
    'src/utils'
  ];
  
  for (const dir of requiredDirs) {
    const fullPath = path.join(__dirname, dir);
    try {
      await fs.access(fullPath);
      console.log(`✅ ${dir}/`);
    } catch {
      console.log(`❌ ${dir}/ - MANQUANT`);
      return false;
    }
  }
  return true;
}

async function testFiles() {
  console.log('\n📄 Test des fichiers essentiels...');
  
  const requiredFiles = [
    'server.js',
    'package.json',
    'Dockerfile',
    '.gitignore',
    '.env.example',
    'README.md',
    'src/routes/upload.js',
    'src/routes/generate.js',
    'src/routes/download.js',
    'src/routes/monitor.js',
    'src/services/videoGenerator.js',
    'src/services/mediaAnalyzer.js',
    'src/services/storageManager.js',
    'src/middleware/errorHandler.js',
    'src/middleware/rateLimiter.js',
    'src/middleware/security.js',
    'src/utils/editlyConfigs.js'
  ];
  
  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, file);
    try {
      await fs.access(fullPath);
      console.log(`✅ ${file}`);
    } catch {
      console.log(`❌ ${file} - MANQUANT`);
      return false;
    }
  }
  return true;
}

async function testPackageJson() {
  console.log('\n📦 Test du package.json...');
  
  try {
    const packageData = await fs.readFile(path.join(__dirname, 'package.json'), 'utf8');
    const pkg = JSON.parse(packageData);
    
    const requiredDeps = [
      'express', 'cors', 'multer', 'editly', 'exifr',
      'fluent-ffmpeg', 'uuid', 'morgan', 'dotenv',
      'socket.io', 'sharp', 'helmet'
    ];
    
    console.log('Dépendances:');
    for (const dep of requiredDeps) {
      if (pkg.dependencies[dep]) {
        console.log(`✅ ${dep} v${pkg.dependencies[dep]}`);
      } else {
        console.log(`❌ ${dep} - MANQUANT`);
        return false;
      }
    }
    
    console.log('\nScripts:');
    const requiredScripts = ['start', 'dev'];
    for (const script of requiredScripts) {
      if (pkg.scripts[script]) {
        console.log(`✅ ${script}: ${pkg.scripts[script]}`);
      } else {
        console.log(`❌ ${script} - MANQUANT`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Erreur lors du test package.json: ${error.message}`);
    return false;
  }
}

async function testNodeModules() {
  console.log('\n📚 Test des node_modules...');
  
  try {
    await fs.access(path.join(__dirname, 'node_modules'));
    console.log('✅ node_modules/ existe');
    
    // Tester quelques modules clés
    const keyModules = ['express', 'socket.io', 'editly', 'sharp'];
    for (const module of keyModules) {
      try {
        await fs.access(path.join(__dirname, 'node_modules', module));
        console.log(`✅ ${module} installé`);
      } catch {
        console.log(`⚠️  ${module} non installé - exécuter 'npm install'`);
      }
    }
    
    return true;
  } catch {
    console.log('❌ node_modules/ manquant - exécuter "npm install"');
    return false;
  }
}

async function testFFmpeg() {
  console.log('\n🎬 Test FFmpeg...');
  
  try {
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.log('⚠️  FFmpeg non disponible - installé mais non configuré');
          console.log('   Windows: Télécharger FFmpeg et configurer le PATH');
          console.log('   Linux: sudo apt install ffmpeg');
          resolve(false);
        } else {
          console.log('✅ FFmpeg disponible');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.log('⚠️  Module fluent-ffmpeg non installé');
    return false;
  }
}

async function testEnvironment() {
  console.log('\n🌍 Test de l\'environnement...');
  
  console.log(`✅ Node.js: ${process.version}`);
  console.log(`✅ Plateforme: ${process.platform}`);
  console.log(`✅ Architecture: ${process.arch}`);
  
  // Test de la création de fichiers
  try {
    const testFile = path.join(__dirname, 'uploads', 'test.tmp');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    console.log('✅ Permissions d\'écriture OK');
  } catch (error) {
    console.log(`❌ Problème de permissions: ${error.message}`);
    return false;
  }
  
  return true;
}

async function runAllTests() {
  console.log('🚀 Début des tests...\n');
  
  const tests = [
    { name: 'Dossiers', fn: testDirectories },
    { name: 'Fichiers', fn: testFiles },
    { name: 'package.json', fn: testPackageJson },
    { name: 'node_modules', fn: testNodeModules },
    { name: 'Environnement', fn: testEnvironment },
    { name: 'FFmpeg', fn: testFFmpeg }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ Erreur durant le test ${test.name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 TOUS LES TESTS PASSÉS !');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Créer un fichier .env basé sur .env.example');
    console.log('2. Démarrer avec: npm run dev');
    console.log('3. Tester l\'API sur http://localhost:8080/api/monitor/health');
  } else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('\n🔧 Actions nécessaires:');
    console.log('- Installer les dépendances manquantes: npm install');
    console.log('- Configurer FFmpeg si nécessaire');
    console.log('- Vérifier les permissions de fichiers');
  }
}

// Exécuter les tests si ce script est lancé directement
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testDirectories, testFiles, testPackageJson, testNodeModules, testFFmpeg, testEnvironment };