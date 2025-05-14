# Utilise une image officielle Node.js
FROM node:24

# Dossier de travail
WORKDIR /app

# Copier les fichiers
COPY package*.json ./
RUN npm install

COPY . .

# Expose le port
EXPOSE 3000

# Lancer l'app
CMD ["npm", "start"]
