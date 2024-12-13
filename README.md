# Bot Discord de Transcription Vocale

Un bot Discord qui transcrit la voix en texte et interagit via Voxta pour générer des réponses vocales.

## Fonctionnalités

- Transcription vocale en temps réel via Deepgram
- Génération de réponses via Voxta
- Lecture audio des réponses dans le canal vocal
- Gestion automatique des sessions de chat
- Redémarrage automatique en cas d'erreur

## Prérequis

- Node.js 20 ou supérieur
- Docker (optionnel)
- Une clé API Deepgram
- Un token Discord Bot
- Un serveur Voxta

## Configuration

1. Copiez le fichier `.env.example` en `.env`
2. Configurez les variables d'environnement :
   ```
   DISCORD_TOKEN=votre_token_discord
   DEEPGRAM_API_KEY=votre_clé_api_deepgram
   VOXTA_URL=url_de_votre_serveur_voxta
   LANGUAGE=fr-FR  # ou en-US, etc.
   ```

## Installation

### Sans Docker

```bash
npm install
node src/daemon.js
```

### Avec Docker

```bash
make build  # Construit l'image
make run    # Lance le conteneur
# ou
make dev    # Construit et lance en une commande
```

## Utilisation

1. Invitez le bot sur votre serveur Discord
2. Rejoignez un canal vocal
3. Le bot rejoindra automatiquement le canal
4. Parlez normalement, le bot transcrira votre voix
5. Les réponses seront générées et lues automatiquement

## Structure du Projet

- `src/`
  - `services/` : Services principaux (Deepgram, Voxta, Audio, etc.)
  - `utils/` : Utilitaires (logger, eventBus)
  - `config/` : Configuration
  - `daemon.js` : Gestionnaire de processus
  - `index.js` : Point d'entrée principal

## Développement

Le code suit une architecture orientée événements avec les composants suivants :
- EventBus pour la communication inter-services
- Services modulaires pour chaque fonctionnalité
- Gestion robuste des erreurs et reconnexions

## Licence

MIT
