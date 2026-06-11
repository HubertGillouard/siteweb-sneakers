# Checklist de démo rattrapage

## À vérifier avant la soutenance

- [ ] `npm run mapping:api` a été lancé une fois.
- [ ] Le backend démarre sur le port 5051.
- [ ] Le frontend démarre sur le port 5173.
- [ ] Les 3 comptes fonctionnent.
- [ ] Le filtre taille affiche uniquement les produits disponibles.
- [ ] Le panier garde les articles.
- [ ] Le checkout crée une commande.
- [ ] Le stock baisse après commande.
- [ ] Le back-office permet de modifier un stock.
- [ ] Le bandeau cookies ne revient pas après consentement.
- [ ] La page RGPD exporte/supprime les données.

## Phrases utiles

- Le catalogue est alimenté par un import externe quand disponible, puis mappé dans notre modèle produit.
- Le stock par taille est interne et décrémenté par le backend après commande.
- Les rôles sont liés à une authentification et changent les droits dans l'application.
- Le paiement est fictif, mais la commande et le suivi sont bien enregistrés.
