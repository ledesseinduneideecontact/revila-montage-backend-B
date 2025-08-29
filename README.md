# Revila Montage Video Backend

Backend Node.js pour l'application de montage vidéo automatique utilisant Editly.

## 🚀 Fonctionnalités

- ✅ Upload de médias (images, vidéos, audio)
- ✅ Génération automatique de montages vidéo avec Editly
- ✅ Différents styles de montage (memories, nostalgia, dynamic, classic)
- ✅ Socket.io pour les updates en temps réel
- ✅ Rate limiting et sécurité
- ✅ Monitoring et santé du système
- ✅ Nettoyage automatique des fichiers temporaires
- ✅ Support FFmpeg fallback sur Windows
- ✅ Optimisé pour Railway deployment

## 📁 Structure

```
backend/
├── server.js                 # Serveur Express principal
├── package.json              # Dépendances et scripts
├── Dockerfile               # Configuration Docker pour Railway
├── .env.example             # Template de configuration
├── src/
│   ├── routes/              # Routes API
│   │   ├── upload.js        # Gestion des uploads
│   │   ├── generate.js      # Génération de vidéos
│   │   ├── download.js      # Téléchargement des résultats
│   │   └── monitor.js       # Monitoring et santé
│   ├── services/            # Services métier
│   │   ├── videoGenerator.js # Générateur de vidéos
│   │   ├── mediaAnalyzer.js # Analyse des médias
│   │   └── storageManager.js # Gestion du stockage
│   ├── middleware/          # Middlewares Express
│   │   ├── errorHandler.js  # Gestion d'erreurs
│   │   ├── rateLimiter.js   # Limitation du taux de requêtes
│   │   └── security.js      # Middlewares de sécurité
│   └── utils/
│       └── editlyConfigs.js # Configurations Editly
├── uploads/                 # Fichiers uploadés
├── outputs/                 # Vidéos générées
└── assets/
    └── music/              # Musiques de fond
```

## 🛠️ Installation

### Prérequis

- Node.js 18+
- FFmpeg (pour développement Windows)
- Git

### Installation locale

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration**
   ```bash
   cp .env.example .env
   # Éditer .env avec vos paramètres
   ```

4. **Démarrer en développement**
   ```bash
   npm run dev
   ```

### Installation avec Docker

```bash
docker build -t revila-backend .
docker run -p 8080:8080 revila-backend
```

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Port du serveur | `8080` |
| `FRONTEND_URL` | URL du frontend pour CORS | `http://localhost:5173` |
| `UPLOAD_MAX_SIZE` | Taille max des fichiers (bytes) | `104857600` (100MB) |
| `CLEANUP_INTERVAL` | Intervalle de nettoyage (ms) | `3600000` (1h) |
| `USE_FFMPEG_ONLY` | Forcer l'utilisation de FFmpeg | `false` |

### Styles de montage disponibles

- **memories** : Transitions douces, parfait pour les souvenirs
- **nostalgia** : Style vintage avec transitions lentes
- **dynamic** : Énergique et rapide, idéal pour l'action
- **classic** : Simple et élégant, présentation intemporelle

## 📡 API Endpoints

### Upload
- `POST /api/upload` - Upload de fichiers médias
- `DELETE /api/upload/:id` - Supprimer un fichier

### Génération
- `POST /api/generate` - Démarrer la génération d'une vidéo
- `GET /api/generate/status/:jobId` - Statut d'un job
- `GET /api/generate/templates` - Liste des templates

### Download
- `GET /api/download/:filename` - Télécharger une vidéo
- `GET /api/download/stream/:filename` - Stream une vidéo
- `DELETE /api/download/:filename` - Supprimer une vidéo

### Monitoring
- `GET /api/monitor/health` - Santé du système
- `GET /api/monitor/stats` - Statistiques détaillées
- `GET /api/monitor/logs` - Logs récents
- `POST /api/monitor/cleanup` - Nettoyage manuel
- `GET /api/monitor/templates` - Info sur les templates

## 🔒 Sécurité

- Rate limiting par IP
- Validation stricte des fichiers
- Middlewares de sécurité
- Sanitisation des inputs
- Headers de sécurité (CSP, XSS, etc.)

## 📊 Monitoring

Le backend inclut des endpoints de monitoring pour :
- État de santé du système
- Statistiques d'utilisation
- Métriques de performance
- Statut des jobs de génération

## 🚢 Déploiement

### Railway

1. Connecter le repository à Railway
2. Les variables d'environnement seront automatiquement configurées
3. Le Dockerfile sera utilisé pour le build

### Autres plateformes

Le backend est compatible avec :
- Heroku
- DigitalOcean App Platform
- AWS ECS
- Google Cloud Run

## 🧪 Tests

```bash
# Tester FFmpeg
npm run test:ffmpeg

# Tester la génération
npm run test:generation

# Vérifier la santé
npm run health
```

## 📝 Scripts disponibles

- `npm start` - Démarrer en production
- `npm run dev` - Démarrer en développement avec nodemon
- `npm run cleanup` - Nettoyage manuel des fichiers
- `npm run health` - Vérifier la santé du serveur
- `npm run test:ffmpeg` - Tester FFmpeg
- `npm run test:generation` - Tester la génération vidéo

## 🔍 Troubleshooting

### Erreurs courantes

1. **FFmpeg non trouvé**
   - Windows : Installer FFmpeg et configurer le PATH
   - Linux : `apt install ffmpeg`

2. **Erreur de permissions**
   - Vérifier les permissions des dossiers uploads/ et outputs/

3. **Mémoire insuffisante**
   - Ajuster les limites de fichiers
   - Optimiser le cleanup automatique

4. **Port déjà utilisé**
   - Changer la variable PORT dans .env

## 📞 Support

Pour obtenir de l'aide :
1. Vérifier les logs via `/api/monitor/logs`
2. Consulter la santé via `/api/monitor/health`
3. Vérifier la configuration dans .env

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request