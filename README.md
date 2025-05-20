# NFT Discord Tracker Bot

Un bot Discord pour suivre les transferts de NFT sur la blockchain **Polygon** et envoyer des notifications dans des threads Discord spécifiques. Le bot peut fonctionner en mode **TEST** (limité à 3 notifications) ou en mode **PROD**. Un ping périodique est envoyé pour signaler que le bot est **alive**.

## Fonctionnalités

- **Suivi des transferts NFT** via Infura (Polygon).
- **Envoi de messages** dans différents threads Discord selon le type de NFT.
- **Mode TEST** : Le bot s'arrête après 3 notifications.
- **Ping Alive** : Le bot envoie régulièrement un message `🟢 Alive` pour signaler qu’il fonctionne.

## Prérequis

1. **Node.js** >= v20
2. **Discord bot token**.
3. **Infura project ID** (ou autre fournisseur RPC compatible Polygon).
4. Un **contrat ERC721** sur Polygon.

## Installation

### 1. Clonez ce dépôt

```bash
git clone https://github.com/votre-repository/nft-discord-tracker.git
cd nft-discord-tracker
````

### 2. Installez les dépendances

```bash
npm install
```

### 3. Créez un fichier `.env`

Copiez le modèle suivant dans un fichier `.env` à la racine du projet :

```env
MODE=TEST  # ou MODE=PROD

INFURA_WSS=wss://polygon-mainnet.infura.io/ws/v3/TO_REPLACE
DISCORD_BOT_TOKEN=TO_REPLACE
NFT_CONTRACT_ADDRESS=TO_REPLACE

FRANCK_ADDRESS=TO_REPLACE
NICO_ADDRESS=TO_REPLACE
FRANCK_DISCORD_USER_ID=TO_REPLACE
NICO_DISCORD_USER_ID=TO_REPLACE

STATUS_THREAD_ID=TO_REPLACE
THREAD_ID_1=TO_REPLACE       # Thread pour NFT type A
THREAD_ID_2=TO_REPLACE       # Thread pour NFT type B
THREAD_ID_3=TO_REPLACE       # Thread pour NFT type C
THREAD_ID_FRANCK=TO_REPLACE  # Thread pour NFT pour les ventes de Franck
THREAD_ID_NICO=TO_REPLACE    # Thread pour NFT pour les ventes de Nico

COMETH_API_KEY=TO_REPLACE

COMETH_API_INTERVAL=10 # en min
ALIVE_PING_INTERVAL=10 # en min

DOLZ_PRICE="0.006" # Prix du dolz en $
```

### 4. Lancez le bot

```bash
npm run start
```

Le bot démarrera et commencera à écouter les événements de transfert NFT. Si le mode **TEST** est activé, le bot enverra un maximum de 3 notifications avant de s'arrêter.

---

## Fonctionnalités supplémentaires

### **Ping Alive**

Le bot envoie un message `🟢 Alive` dans le thread de statut à un intervalle configurable. Par défaut, le bot envoie un message toutes les 10 minutes.

### **Mode TEST**

Le bot s'arrête après 3 notifications si le mode **TEST** est activé. Cela permet de tester le comportement du bot sans générer trop de notifications.

### **Notifications dans des threads Discord**

Les notifications de transfert NFT sont envoyées dans 3 threads distincts. Le bot choisit quel thread utiliser en fonction du `tokenId` (par exemple : modulo 3).

---

## Gestion des erreurs

Le bot gère les erreurs suivantes :

* **Uncaught Exceptions** et **Unhandled Rejections** : en cas d’erreurs non gérées, un message est envoyé dans le thread de statut, et le bot s’arrête.
* **Erreurs Discord** : si une erreur survient lors de l'envoi d'une notification Discord, un message d'erreur est envoyé dans le thread de statut.

---

## Contribution

1. Fork ce repository.
2. Crée une branche pour ta fonctionnalité (`git checkout -b feature/ma-fonctionnalité`).
3. Commit tes modifications (`git commit -am 'Ajoute une fonctionnalité'`).
4. Push vers ta branche (`git push origin feature/ma-fonctionnalité`).
5. Crée une pull request.

---

## Licence

Ce projet est sous la licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.