# SneakR

Plateforme e-commerce de sneakers avec catalogue, gestion des stocks par taille et back-office.

## Fonctionnalités

- catalogue avec 100+ produits ;
- import catalogue depuis KicksDB ou fallback vers des catalogues publics Shopify ;
- stock par taille et catégorie ;
- panier complet ;
- checkout ;
- authentification ;
- rôles `admin`, `seller`, `client` ;
- back-office pour produits, stocks et commandes ;
- RGPD : consentement stocké, export et suppression des données ;
- recherche, filtres taille/prix/catégorie et tri.

## Lancer le projet

### Backend

```bash
cd sneakers-backend
cp .env.example .env
npm install
npm run mapping:api
npm start
```

### Frontend

```bash
cd sneakers-frontend
npm install
npm run dev
```

Site : http://localhost:5173
Backend : http://localhost:5051

## Comptes de test

```text
admin@test.com / admin
seller@test.com / seller
client@test.com / client
```

## Import catalogue

```bash
npm run mapping:api
```

Essaye d'abord KicksDB si `KICKSDB_API_KEY` est dans `.env`. Si l'API ne répond pas, il bascule sur des catalogues publics Shopify puis sur un fallback local.

Le stock par taille est géré par le backend et décrémenté au checkout.

## État du projet

- Backend : authentification, rôles, catalogue, stock par taille, panier, checkout, commandes, export RGPD, suppression RGPD.
- Frontend : recherche, filtres, tri, sélection de taille, back-office, panier persistant, cookie consent.
- Import catalogue : KicksDB si clé présente, sinon catalogues publics Shopify, sinon fallback local.

## Démo

1. Accepter/refuser les cookies et montrer que le choix est stocké.
2. Se connecter en client.
3. Rechercher une sneaker et filtrer par taille.
4. Ouvrir une fiche produit et montrer le stock par taille.
5. Ajouter au panier, modifier la quantité, valider le checkout.
6. Revenir sur le produit et montrer que le stock a baissé.
7. Se connecter en seller/admin et modifier un stock.
8. Montrer l'export/suppression RGPD.
