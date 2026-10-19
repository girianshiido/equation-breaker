# Equation Breaker

**Libère l’inconnue.** Jeu d’algèbre tactile, en français, développé en TypeScript strict. Les élèves transforment réellement les expressions : le jeu ne demande pas de choisir une solution dans un QCM.

- Jouer : https://girianshiido.github.io/equation-breaker/
- Sources : https://github.com/girianshiido/equation-breaker

## Contenu disponible

72 niveaux fixes, 12 par monde, avec découverte, autonomie et transfert ; générateur reproductible pour chaque monde ; campagne progressive ; entraînement ciblé ; séries arcade de cinq équations avec chrono facultatif. Aucune contrainte de temps en campagne.

| Monde | Compétences et cas couverts |
| --- | --- |
| Équilibre | Addition identique, opposés, coefficients positifs/négatifs, division par constante non nulle |
| Face-à-face | Inconnue dans les deux membres, fusion locale, plusieurs stratégies, aucune solution et identités |
| Explosion | Distributivité, signes devant les groupes, plusieurs parenthèses, réduction |
| Fraction Lab | Coefficients rationnels exacts, dénominateurs constants, groupes fractionnés |
| Zero Product | Factorisation rationnelle, produit nul, résolution effective de chaque branche, union sans doublon |
| Quadratic Core | Discriminant exact, trois signes de Δ, racines doubles, rationnelles et radicaux exacts |

Douze succès, étoiles, records, indicateurs de maîtrise par compétence et apparences déblocables. Sons synthétisés optionnels, animations courtes, contraste renforcé, texte agrandi et mode léger. Pas de compte, publicité, serveur, CDN ou télémétrie.

## Jouer

1. Sélectionner un bloc au toucher, à la souris ou avec Tab puis Entrée/Espace.
2. Sélectionner un second terme de la même somme pour **Fusionner**. Les termes doivent avoir le même degré. La sélection ne traverse jamais le signe égal.
3. Choisir **Ajouter l’opposé** ou ouvrir **+ / − / × / ÷** pour une opération libre sur les deux membres. Un aperçu miroir explique l’équivalence avant confirmation.
4. Développer un groupe, simplifier une fraction ou sélectionner un membre entier via son en-tête pour le factoriser.
5. Pour un produit nul, ouvrir les portes, résoudre puis valider chaque branche avant de réunir les solutions. Pour un trinôme égal à zéro, calculer Δ puis construire les racines exactes.
6. **Valider** lorsque x est isolé, les constantes permettent une conclusion, ou toutes les racines sont construites.

Échap efface la sélection ou ferme une fenêtre. Toutes les commandes disposent de boutons ; aucun glissement n’est nécessaire. Les premiers niveaux donnent une consigne, les suivants laissent plusieurs stratégies possibles. Les indices sont gradués : conseil, mise en évidence, aperçu explicatif ; ils n’appliquent pas d’action à la place du joueur.

### Étoiles

- ★ : résolution exacte terminée.
- ★★ : au plus une erreur et un indice.
- ★★★ : aucune erreur ni indice, et nombre de transformations inférieur ou égal à l’objectif annoncé.

L’objectif est un seuil pédagogique, **pas un minimum prétendument optimal**. Les transformations annulées restent comptées, les erreurs et indices aussi. L’annulation conserve l’historique des états actifs (jusqu’à 200 événements). Une sélection annulée n’est pas une erreur. Aucun point n’est donné en répétant +1 puis −1. L’entraînement ne modifie pas les étoiles de campagne.

## Développement

Node.js 22.12+ (Node 24 recommandé) et pnpm 11.25+ :

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm preview --port 5194
```

L’équivalent `npm install`, `npm run dev`, `npm test`, `npm run build` fonctionne également. Le verrouillage reproductible de référence est `pnpm-lock.yaml` ; `pnpm-workspace.yaml` autorise uniquement le script de compilation d’esbuild.

Le build autonome se trouve dans `docs/`. `BASE_PATH` permet de changer le chemin de base. Par défaut `./` convient au sous-répertoire GitHub Pages comme à un hébergement statique local. Ne pas ouvrir le jeu avec `file://` pour tester la PWA.

```sh
BASE_PATH=/equation-breaker/ pnpm build
```

## Architecture et garanties

- `src/math/rational.ts` : fractions irréductibles en `bigint`, dénominateur positif, racine carrée entière.
- `src/math/ast.ts` : arbres d’expressions et analyseur récursif ; aucun `eval`.
- `src/math/normalize.ts` : polynômes de degré ≤ 2 pour vérifier les identités, indépendamment de la présentation.
- `src/math/transformations.ts` : règles locales et préconditions, sans déplacement magique de terme. Chaque transformation est vérifiée par proportionnalité non nulle du polynôme différence.
- `src/math/solve.ts` : résolution exacte dans ℝ, ensembles vide/universel/fini et radicaux symboliques. Les polynômes quadratiques sont rendus moniques en interne pour identifier les mêmes solutions après changement d’échelle.
- `src/levels/` : campagne et générateur à graines. Les résultats attendus de génération sont construits à partir des racines et contrôlés par le solveur.
- `src/gameplay/` : états, branches, validation, scores, indices et succès.
- `src/app/persistence.ts` : schéma versionné, validation, bornage, reprise par rejeu des événements ; sérialisation des opérandes exacts sans `bigint` brut.
- `src/ui/` et `src/main.ts` : présentation, navigation interne sans dépendance aux réécritures du serveur, événements, audio facultatif.

Les divisions et multiplications réversibles n’acceptent que des constantes rationnelles non nulles. Les dénominateurs contenant x et les degrés supérieurs à 2 sont refusés. Un produit nul donne une **union**, y compris pour une racine répétée. La validation finale compare aussi l’ensemble de solutions à celui de l’équation initiale. Les calculs ne dépendent pas des couleurs, des animations ou du nombre de clics.

Les équations à deux solutions irrationnelles gardent des radicaux exacts : aucune approximation flottante ne décide de l’exactitude. L’extraction des facteurs carrés est bornée pour préserver la réactivité ; des radicandes très grands peuvent conserver une écriture exacte non complètement simplifiée. Les coefficients et la longueur des entrées sont bornés. Les niveaux livrés ne rencontrent pas cette limite.

## Sauvegarde et installation

Progression et préférences restent dans le `localStorage` de cet appareil, sous `equation-breaker-v1`. Une sauvegarde de schéma inconnu/corrompue revient à un état valide avec avertissement. Un stockage indisponible laisse jouer en mémoire. L’export/import JSON se trouve dans les paramètres ; le remplacement et la remise à zéro demandent confirmation dans le jeu.

Le service worker précache le jeu, tous ses niveaux, les icônes et ses styles. L’indication **Prêt pour le hors-ligne** apparaît seulement après vérification de la présence de tous les fichiers du build courant. Une nouvelle version reste en attente : elle n’interrompt pas silencieusement une équation. Le bouton de mise à jour sauvegarde la partie avant le rechargement.

Sur Android/Chrome/Edge, utiliser Installer dans le menu. Sur iPhone/iPad, Partager → Sur l’écran d’accueil. L’installation native dépend du navigateur ; le hors-ligne requiert la fin du premier cache complet.

## Vérifications

```sh
pnpm typecheck
pnpm test
# Lancer le build de production puis un aperçu sur le port 5194 dans un autre terminal.
pnpm build
pnpm preview --port 5194
pnpm qa
pnpm qa:updates
```

Les tests Vitest couvrent les cas mathématiques de référence, les 72 résolutions complètes, 1 800 niveaux générés résolus, 1 200 transformations d’équivalence, les opérations interdites, l’annulation et la reconstruction des branches sauvegardées. Le scénario navigateur utilise uniquement les boutons réels : aucune commande de résolution n’est exposée par l’application.

Le script navigateur utilise Chrome installé sur macOS à son emplacement habituel. Adapter `executablePath` dans `scripts/browser-qa.mjs` pour un autre environnement. Les résultats détaillés et captures sont produits dans `test-results/` (exclus du dépôt). Voir [VALIDATION.md](VALIDATION.md) pour les mesures et la portée effective des essais.

## Publication GitHub Pages

Le dépôt est indépendant. La publication utilise **main /docs**. Les fichiers de production sont suivis pour permettre une publication statique sans dépendre d’une étape distante. Le workflow GitHub Actions exécute types, tests et compilation puis vérifie que `docs/` correspond aux sources.

Après une modification :

```sh
pnpm typecheck
pnpm test
pnpm build
# Vérifier visuellement et exécuter la QA appropriée avant le commit/push.
git add src public scripts tests docs README.md VALIDATION.md
git commit -m "Improve Equation Breaker"
git push
# Attendre le build Pages du commit poussé, puis vérifier le contenu distant.
node scripts/verify-public.mjs
```

Le script de vérification publique compare les SHA-256 de chaque fichier servi aux fichiers locaux. Une réussite locale ne constitue pas à elle seule une preuve de publication.

## Limites et évolutions

- Les statistiques pédagogiques sont des indicateurs d’usage local, pas une évaluation scolaire certifiée ni un classement mondial.
- Les essais mobiles utilisent les dimensions tactiles et le ralentissement CPU d’un navigateur de bureau. Ils ne remplacent pas une séance sur des appareils Android modestes et iOS réels.
- Les identifiants de sélection sont des chemins dans l’AST. Une transformation efface la sélection et verrouille brièvement les entrées pour éviter les références périmées et les doubles applications.
- La factorisation proposée se limite aux factorisations rationnelles prises en charge et vérifiées. La méthode du discriminant traite aussi les cas sans factorisation rationnelle.
- Les 72 niveaux constituent une campagne complète et finie ; davantage de séquences écrites, une révision espacée adaptative, le défi quotidien et un mode enseignant sont des évolutions distinctes, non annoncées comme présentes.
