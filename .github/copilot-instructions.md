# Instructions pour Agents IA - Backend E-commerce

## Architecture & Structure

Cette application est une **API REST e-commerce** Node.js avec Express et MongoDB utilisant une architecture **MVC modulaire** :

- **Models** (`/models`) : Schémas Mongoose avec validation intégrée et middleware pre/post
- **Controllers** (`/controllers`) : Logique métier avec `handlersFactory.js` pour les opérations CRUD génériques
- **Routes** (`/routes`) : Définition des endpoints, montées via `routes/index.js`
- **Middlewares** (`/middlewares`) : Gestion d'erreurs globale, validation, upload d'images
- **Utils** (`/utils`) : Classes utilitaires (`ApiFeatures`, `ApiError`), email, seeding

## Patterns Critiques

### Factory Pattern pour CRUD
Utilisez `controllers/handlersFactory.js` pour les opérations standard :
```javascript
const factory = require('./handlersFactory');
exports.createCategory = factory.createOne(Category);
exports.getCategories = factory.getAll(Category);
```

### Gestion d'Erreurs Unifiée
- Utilisez `ApiError` pour les erreurs business : `new ApiError('message', statusCode)`
- Wrap les fonctions async avec `express-async-handler`
- Le middleware `globalError` gère automatiquement dev/prod modes

### Query Features avec ApiFeatures
La classe `utils/apiFeatures.js` chaîne :
- Filtrage avancé (gte, lt, etc.)
- Recherche (par nom ou title/description pour produits)
- Tri, pagination, limitation de champs
```javascript
const apiFeatures = new ApiFeatures(Model.find(), req.query)
  .filter().search(modelName).sort().paginate(docsCount);
```

### Structure des Routes
Routes organisées par domaine (`categoryRoute.js`, `productRoute.js`, etc.) et montées via `mountRoutes(app)`. Utilisez le préfixe `/api/v1/` pour tous les endpoints.

## Configuration & Environnement

### Variables Clés (`config.env`)
- `NODE_ENV` : development/production (affecte logs et gestion d'erreurs)
- `DB_URI` : MongoDB local ou Atlas
- `JWT_SECRET` & `JWT_EXPIRES_IN` : Configuration JWT
- `EMAIL_*` : Configuration SMTP Gmail (nécessite App Password)
- `STRIPE_*` : Intégration paiements

### Scripts NPM
- `npm run start:dev` : Développement avec nodemon
- `npm start` : Production (Windows batch avec SET NODE_ENV)

## Fonctionnalités Spécifiques

### Authentification JWT
Pattern standard : `signup`/`login` retournent token, middleware `protect` valide les tokens. Gestion de reset password par email.

### Upload & Images
- Multer configuré dans `middlewares/imageUpload.js`
- Sharp pour redimensionnement automatique
- Fichiers stockés dans `/uploads/{domain}/`

### Validation
- `express-validator` dans `utils/validators/`
- Validation côté Mongoose avec messages d'erreur personnalisés
- Middleware `validatorMiddleware.js` formate les erreurs

### Stripe Webhooks
Endpoint spécial `/webhook-checkout` avec `bodyParser.raw()` avant le parsing JSON général.

### Stock Management
- **Cart Operations** : `addProductToCart` accepte maintenant un paramètre `count` optionnel pour spécifier la quantité
- **API Usage** : `POST /api/v1/cart` avec `{ "productId": "...", "color": "red", "count": 3 }`
- **Validation automatique** : Vérifie que `count` est entre 1 et 999, et ne dépasse pas le stock
- **Error Messages** : Messages clairs indiquant stock disponible vs. quantité demandée
- **Order Creation** : Vérification finale du stock avant création de commande

## Commandes de Développement

```bash
# Démarrage développement
npm run start:dev

# Seeding de données
node utils/dummyData/seeder.js

# Base de données locale
mongod --dbpath ./data
```

## Dépendances Critiques

- **mongoose** : ODM avec auto-increment
- **express-async-handler** : Gestion async/await
- **express-validator** : Validation des entrées
- **bcryptjs** : Hachage des mots de passe
- **jsonwebtoken** : Authentification
- **nodemailer** : Envoi d'emails
- **stripe** : Paiements
- **multer** + **sharp** : Gestion images