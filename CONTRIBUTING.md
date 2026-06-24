# Flux de travail Git

- `main` : version stable, déployée.
- `develop` : intégration des nouvelles fonctionnalités avant passage en `main`.
- Toute nouvelle fonctionnalité ou correction passe par une branche dédiée, créée depuis
  `develop` :

```bash
git checkout develop
git pull
git checkout -b feature/nom-de-la-fonctionnalite
# ... travail ...
git push origin feature/nom-de-la-fonctionnalite
# Ouvrir une pull request vers develop
```

- Une fois `develop` validé et stable, il est mergé dans `main` pour déploiement.
- Convention de nommage des branches : `feature/...`, `fix/...`, `chore/...`.
