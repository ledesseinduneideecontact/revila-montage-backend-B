# Backend Dockerfile avec image pré-construite pour Editly
# STRATÉGIE: Utiliser une image avec editly déjà compilé

# Une seule image complète pour éviter les problèmes de compatibilité
FROM node:18-bullseye

# Installer FFmpeg et toutes les dépendances nécessaires
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libgl1-mesa-dev \
    libxi-dev \
    pkg-config \
    python3 \
    python3-dev \
    libvips-dev \
    libglib2.0-dev \
    libgobject-introspection-dev \
    libgirepository1.0-dev \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier package.json d'abord pour le cache
COPY package*.json ./

# Installer TOUTES les dépendances, y compris sharp et editly
RUN npm install --production --platform=linux --arch=x64

# Rebuild les modules natifs pour être sûr
RUN npm rebuild sharp --build-from-source
RUN npm rebuild canvas --build-from-source
RUN npm rebuild gl --build-from-source

# Copier l'application
COPY . .

# Créer les dossiers
RUN mkdir -p uploads outputs assets/music

ENV NODE_ENV=production
ENV DISPLAY=:99

EXPOSE ${PORT:-8080}

HEALTHCHECK --interval=30s --timeout=3s \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["npm", "start"]