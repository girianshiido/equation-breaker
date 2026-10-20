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
| Zero Product | Facteur commun choisi, carrés préparés et différence de carrés, produit nul et union sans doublon |
| Quadratic Core | Complétion du carré avec compensation, identités choisies, racines rationnelles ou irrationnelles manipulables |

Douze succès, étoiles, records, indicateurs de maîtrise par compétence et apparences déblocables. Sept bruitages mélodieux originaux en OGG/Opus, avec repli MP3, animations courtes, contraste renforcé, texte agrandi et mode léger. Pas de compte, publicité, serveur, CDN ou télémétrie.

## Jouer

La typographie des nombres utilise Outfit, associée à DM Sans pour les textes. Les deux polices sont intégrées localement, utilisables hors ligne et distribuées sous licence OFL (sources et licences dans `public/fonts/`). Les membres restent côte à côte sur téléphone, avec un signe égal centré sur les expressions. La taille des caractères s’adapte aux deux membres ensemble : elle diminue pour une équation longue, puis remonte après simplification lorsque l’espace le permet. Une taille minimale de 16 px (20 px en texte agrandi) préserve la lisibilité ; les cas qui dépassent encore l’espace disponible affichent une invitation à tourner le téléphone. Leurs noms sont masqués par défaut ; l’option **Afficher les noms des membres** les rétablit centrés. Ce choix est conservé. La sélection de tout un membre reste accessible au clavier et aux lecteurs d’écran.

Sur téléphone, le surlignage natif du navigateur et les gestes de zoom sont désactivés. La sélection des termes du jeu, le défilement et les champs de saisie restent disponibles. Un deuxième doigt annule une manipulation en cours. **Valider reste accessible dans une barre fixe en bas de l’écran**, en portrait comme en paysage ; les écrans courts utilisent une présentation plus compacte. Sur l’écran de réussite, **Continuer** reste également fixé en bas sur téléphone, tandis que les statistiques et les succès peuvent défiler.

Les signes binaires sont centrés entre les termes, y compris pendant le dépôt (`2 + 4`). Un terme négatif conserve son signe dans le jeton transporté (`−7`, puis `7` après franchissement). Les produits numériques évitent les parenthèses superflues : `4 × 3`, `4 × (−3)`, `−3 × 4`.

Les fractions conservent la taille de caractères des termes voisins : numérateurs, dénominateurs et nombres entiers utilisent la même taille. Leurs barres et les opérateurs partagent le même axe ; les racines suivent la ligne du texte et les parenthèses s’étirent à la hauteur de leur contenu.

Les termes apparaissent sans cadres permanents. Leurs zones tactiles restent généreuses ; une sélection se souligne, et la zone de dépôt apparaît pendant le geste.

Le bouton haut-parleur, en haut, active ou coupe les sons ; ce choix est conservé. Saisie, franchissement, dépôt, fusion et réussite ont des notes distinctes, courtes et douces. Les fichiers sont précalculés par `scripts/generate-sounds.py`, décodés une fois et limités à quatre voix simultanées.

### Déplacer et saisir

- **Glisser un terme entier vers l’autre membre** : il quitte son membre d’origine et change de signe en traversant le signe égal. Le dépôt affiche d’abord le calcul non réduit, puis fusionne les termes semblables après 380 ms (180 ms en mode sans animations). Par exemple, `3x + 5 = −3` donne visuellement `3x = −3 − 5`, puis `3x = −8`.
- **Appui prolongé sur un coefficient** : le facteur suit le doigt. Tout le membre de départ est déjà divisé, tandis que le membre d’arrivée reste inchangé jusqu’au dépôt. Pour `3x + 5 = −3`, on voit donc `x + 5/3` à gauche, puis `−3/3` à droite au dépôt, et enfin `−1`.
- **Facteur devant une parenthèse** : maintenir le `3` de `3(x + 3) = 6` permet de le saisir sans développer. Le membre gauche devient `x + 3` pendant le trajet ; le dépôt donne `6/3`, puis `2`, à droite. Les autres termes éventuels du membre sont eux aussi divisés.
- **Appui prolongé sur le x d’un terme fractionnaire** : saisit le coefficient rationnel complet. Pour `3x/4 = 5`, le jeton `3/4` part d’un bloc : `x` apparaît à gauche pendant le trajet, puis `5 ÷ (3/4)` se réduit à `20/3` au dépôt. Un appui sur le `3` ou le `4` conserve leur saisie séparée. Le bouton « Saisir le coefficient complet » donne la même possibilité au clavier. Les coefficients négatifs conservent leur signe.
- **Appui prolongé sur un dénominateur** : même principe, avec multiplication de tous les termes. `x/4 + 5 = −3` devient `x + 20 = −12`. On peut aussi saisir le `2` de `(x + 4)/2` : tout le numérateur devient `x + 4`, puis l’autre membre est multiplié par `2` au dépôt. Développer le groupe fractionné reste une autre possibilité.
- Sélectionner **−x** révèle **(−1) × x**, dont le facteur peut être saisi. La touche **× (−1)** applique directement une multiplication aux deux membres.
- Pendant une transformation incomplète, **le signe égal est suspendu**. Ce dessin transitoire n’est pas enregistré comme une égalité : seul le dépôt valide produit une transformation mathématique et compte un coup.
- Lâcher hors de la zone, Échap, changement d’orientation ou interruption du geste : retour intégral à l’état d’origine, sans coup ni erreur supplémentaires.

Un toucher court sélectionne un terme ; deux touchers sélectionnent des termes d’une même somme. Les boutons permettent fusion, développement et opérations libres. **Saisir le coefficient / le dénominateur** et **÷ / × aux deux membres** offrent une alternative complète au glissement, utilisable au clavier avec Tab puis Entrée/Espace. Les diviseurs négatifs sont parenthésés dans les écritures textuelles (`÷ (−3)`). Sous une barre de fraction, le dénominateur négatif est directement écrit `−3`.

Les transformations s’appliquent directement au toucher. L’option **Expliquer chaque étape**, désactivée par défaut, rétablit l’aperçu explicatif avant application ; ce choix est conservé. Le bouton **Pourquoi ?** reste disponible à tout moment.

### Choisir une méthode

Les trinômes n’ont plus de bouton de factorisation globale ni de commande de discriminant. Le joueur prépare et choisit l’identité à appliquer ; les indices suivent ces mêmes manipulations.

- **Écrire comme un carré**, après sélection d’un nombre ou d’un terme en x² : `−9 → −(3)²`, `−1/4 → −(1/2)²`, `2x² → (√2 x)²`. Le signe moins reste à l’extérieur.
- Sélectionner deux termes préparés comme **a² − b²** donne accès à **a² − b² = (a + b)(a − b)**. Les facteurs linéaires sont réduits lisiblement, sans rechercher automatiquement les racines du trinôme.
- Sélectionner **ax² et bx**, par deux touchers ou un appui prolongé suivi d’un balayage, permet de **compléter le carré sur place**. `x² − 5x + 6 = 0` devient `(x − 5/2)² − 25/4 + 6 = 0`. La compensation reste un terme séparé : le joueur fusionne ensuite `−25/4` et `6`, écrit `−1/4` comme `−(1/2)²`, puis choisit la différence de carrés. Les coefficients positifs non moniques sont acceptés avec des racines exactes ; un coefficient négatif demande d’abord la multiplication par −1.
- La même paire permet de choisir un **facteur commun** : `4x² + 2x` donne au choix `x(4x + 2)` ou `2x(2x + 1)`. Il s’agit de factoriser, jamais de diviser l’équation par x : la racine zéro reste présente.
- Un carré plus une constante **strictement positive**, égal à zéro, permet de conclure qu’il n’existe aucune solution réelle. Une constante nulle garde l’unique cas du carré nul.

Quand un carré est isolé, **Extraire les racines** reste une autre méthode : valeur négative → aucune solution réelle ; zéro → un cas ; valeur positive → deux cas. Les racines irrationnelles sont désormais des constantes exactes manipulables dans les termes, les fractions et les coefficients. Par exemple, dans `√2 x + 3 = 0`, on peut déplacer `3`, puis saisir `√2` pour diviser les deux membres. Les aperçus et les résultats dessinent une barre de racine extensible couvrant toute la fraction ou tout le nombre.

Un carré nul ne crée qu’un cas : `(x−2)² = 0 ⇔ x−2 = 0`. Les facteurs ayant les mêmes zéros sont regroupés ; les facteurs distincts restent séparés. Les boutons « Cas 1 », « Cas 2 » indiquent seulement le numéro et la validation, sans reprendre les équations. Valider un cas ouvre automatiquement le prochain cas inachevé ; valider le dernier réunit les solutions sans doublon et termine l’équation.

**Valider** termine le niveau lorsque x est isolé, que des constantes permettent une conclusion, ou que les racines sont construites. Les indices sont gradués et ne jouent pas à la place de l’élève. L’annulation conserve les tentatives. Les niveaux, statistiques et préférences existants restent compatibles avec cette version.

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
- `src/math/exact.ts` : constantes multiquadratiques exactes en bigint, opérations réversibles, signe par intervalles rationnels et polynômes bornés mis en cache.
- `src/math/ast.ts` : arbres d’expressions et analyseur récursif ; aucun `eval`.
- `src/math/normalize.ts` : polynômes de degré ≤ 2 pour vérifier les identités, indépendamment de la présentation.
- `src/math/transformations.ts` : règles locales et préconditions, sans déplacement magique de terme. Chaque transformation est vérifiée par proportionnalité non nulle du polynôme différence.
- `src/math/solve.ts` : résolution exacte dans ℝ, ensembles vide/universel/fini et radicaux symboliques. Les polynômes quadratiques sont rendus moniques en interne pour identifier les mêmes solutions après changement d’échelle.
- `src/levels/` : campagne et générateur à graines. Les résultats attendus de génération sont construits à partir des racines et contrôlés par le solveur.
- `src/gameplay/` : états, branches, validation, scores, indices et succès.
- `src/app/persistence.ts` : schéma versionné, validation, bornage, reprise par rejeu des événements ; sérialisation des opérandes exacts sans `bigint` brut.
- `src/ui/` et `src/main.ts` : présentation, navigation interne sans dépendance aux réécritures du serveur, événements, audio facultatif.

Le formulaire libre accepte les constantes rationnelles non nulles ; la saisie d’un coefficient contenant une racine permet aussi une division algébrique exacte non nulle. Les dénominateurs contenant x et les degrés supérieurs à 2 sont refusés. Un produit nul donne une **union**, y compris pour une racine répétée. La validation finale compare aussi l’ensemble de solutions à celui de l’équation initiale. Les calculs ne dépendent pas des couleurs, des animations ou du nombre de clics.

Les équations à deux solutions irrationnelles gardent des radicaux exacts : aucune approximation flottante ne décide de l’exactitude. L’extraction des facteurs carrés est bornée pour préserver la réactivité ; des radicandes très grands peuvent conserver une écriture exacte non complètement simplifiée. Les coefficients et la longueur des entrées sont bornés. Les niveaux livrés ne rencontrent pas cette limite.

## Sauvegarde et installation

Progression et préférences restent dans le `localStorage` de cet appareil, sous `equation-breaker-v1`. Une sauvegarde de schéma inconnu/corrompue revient à un état valide avec avertissement. Un stockage indisponible laisse jouer en mémoire. L’export/import JSON se trouve dans les paramètres ; le remplacement et la remise à zéro demandent confirmation dans le jeu.

Le service worker précache le jeu, tous ses niveaux, les icônes, ses styles, les polices et les bruitages. L’indication **Prêt pour le hors-ligne** apparaît seulement après vérification de la présence de tous les fichiers du build courant. Une nouvelle version reste en attente : elle n’interrompt pas silencieusement une équation. Le bouton de mise à jour sauvegarde la partie avant le rechargement.

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
pnpm qa:gestures
pnpm qa:polish
pnpm qa:audio
pnpm qa:mobile
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
- Les identités proposées portent sur les expressions réelles de degré au plus 2, avec coefficients rationnels au départ. Les champs de racines sont bornés à 16 composantes pour préserver la réactivité. Les anciennes actions de factorisation globale et de discriminant restent lisibles uniquement pour rejouer les sauvegardes précédentes.
- Les 72 niveaux constituent une campagne complète et finie ; davantage de séquences écrites, une révision espacée adaptative, le défi quotidien et un mode enseignant sont des évolutions distinctes, non annoncées comme présentes.
