# Equation Breaker

**Libère l’inconnue.** Jeu d’algèbre tactile, en français, développé en TypeScript strict. Les élèves transforment réellement les expressions : le jeu ne demande pas de choisir une solution dans un QCM.

- Jouer : https://girianshiido.github.io/equation-breaker/
- Sources : https://github.com/girianshiido/equation-breaker

## Contenu disponible

72 niveaux d’équations fixes, 12 par monde, avec découverte, autonomie et transfert ; générateur reproductible pour chaque monde ; campagne progressive ; entraînement ciblé ; séries arcade de cinq équations avec chrono facultatif. Aucune contrainte de temps en campagne. La même campagne se poursuit avec **21 systèmes 2 × 2**, **21 systèmes 3 × 3**, puis **12 systèmes du second degré en x et y** : **9 mondes, 126 niveaux fixes et 378 étoiles**. Chaque niveau exige la réussite de tous les précédents, y compris entre mondes.

| Monde | Compétences et cas couverts |
| --- | --- |
| Équilibre | Addition identique, opposés, coefficients positifs/négatifs, division par constante non nulle |
| Face-à-face | Inconnue dans les deux membres, fusion locale, plusieurs stratégies, aucune solution et identités |
| Explosion | Distributivité, signes devant les groupes, plusieurs parenthèses, réduction |
| Fraction Lab | Coefficients rationnels exacts, dénominateurs constants, groupes fractionnés |
| Zero Product | Facteur commun choisi, carrés préparés et différence de carrés, produit nul et union sans doublon |
| Quadratic Core | Complétion du carré avec compensation, identités choisies, racines rationnelles ou irrationnelles manipulables |
| Systèmes 2 × 2 | Substitution, combinaison, libre choix, fractions et termes dans les deux membres |
| Systèmes 3 × 3 | 21 niveaux, substitutions multiples et éliminations successives |
| Intersections | 12 systèmes du second degré en x et y, entièrement algébriques |

Douze succès, étoiles, records, indicateurs de maîtrise par compétence et apparences déblocables. Sept bruitages mélodieux originaux en OGG/Opus, avec repli MP3, animations courtes, contraste renforcé, texte agrandi et mode léger. Pas de compte, publicité, serveur, CDN ou télémétrie.

## Jouer

La typographie des nombres utilise Outfit, associée à DM Sans pour les textes. Les deux polices sont intégrées localement, utilisables hors ligne et distribuées sous licence OFL (sources et licences dans `public/fonts/`). Les membres restent côte à côte sur téléphone, avec un signe égal centré sur les expressions. La taille des caractères s’adapte aux deux membres ensemble : elle diminue pour une équation longue, puis remonte après simplification lorsque l’espace le permet. Une taille minimale de 16 px (20 px en texte agrandi) préserve la lisibilité ; les cas qui dépassent encore l’espace disponible affichent une invitation à tourner le téléphone. Leurs noms sont masqués par défaut ; l’option **Afficher les noms des membres** les rétablit centrés. Ce choix est conservé. La sélection de tout un membre reste accessible au clavier et aux lecteurs d’écran.

Sur téléphone, le surlignage natif du navigateur et les gestes de zoom sont désactivés. La sélection des termes du jeu, le défilement et les champs de saisie restent disponibles. Un deuxième doigt annule une manipulation en cours. **La validation est une coche dans le coin inférieur droit du cadre de l’équation**, avec une zone tactile de 44 × 44 px et le nom accessible « Valider l’équation ». Un espace réservé la sépare des termes, en portrait comme en paysage ; les écrans courts utilisent une présentation plus compacte. Les commandes Annuler, Indice et Étapes restent dans le flux de la page. Sur l’écran de réussite, **Continuer** reste également fixé en bas sur téléphone, tandis que les statistiques et les succès peuvent défiler.

Les signes binaires sont centrés entre les termes, y compris pendant le dépôt (`2 + 4`). Un terme négatif conserve son signe dans le jeton transporté (`−7`, puis `7` après franchissement). Les produits numériques évitent les parenthèses superflues : `4 × 3`, `4 × (−3)`, `−3 × 4`.

Les fractions conservent la taille de caractères des termes voisins : numérateurs, dénominateurs et nombres entiers utilisent la même taille. Leurs barres et les opérateurs partagent le même axe ; les racines suivent la ligne du texte et les parenthèses s’étirent à la hauteur de leur contenu. Les accolades de l’ensemble des solutions s’adaptent également aux fractions et aux racines, dans le jeu et sur l’écran de réussite.

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

### Mode Systèmes

Les systèmes occupent les mondes 7 et 8 de la carte commune : 21 niveaux 2 × 2, puis 21 niveaux 3 × 3. Le monde 7 s’ouvre après les 72 équations, et le monde 8 après les 21 systèmes 2 × 2. Le lien historique `#systems` respecte ces mêmes prérequis. Les anciennes étoiles sont conservées, même si un niveau ajouté doit être terminé avant de pouvoir poursuivre. Le bouton Continuer et les compteurs couvrent toute la campagne.

- **Méthode imposée pendant l’apprentissage** : les chapitres Substitution masquent les points de lignes, la molette et l’addition de lignes. On isole les inconnues par les gestes usuels (déplacements, prises de coefficients, × (−1), opérations numériques aux deux membres), puis on substitue. Les chapitres Combinaison gardent points, molette et addition, mais ne proposent aucune substitution. Les niveaux Choix de méthode et Fractions et deux membres autorisent les deux approches. Ces règles valent aussi pour le monde 3 × 3 et les indices ; les historiques plus anciens restent rejouables.
- **Toucher le point d’une ligne** affiche une petite roue dentée directement dans le cadre. Tourner la roue modifie immédiatement les deux membres de cette ligne, tels qu’ils sont écrits ; relâcher valide une opération. Échap annule l’aperçu. Le sélecteur discret **× / ÷** conserve le choix. Les opérandes sont des entiers : **0 et 1 sont exclus**, les négatifs sont autorisés. Pour × 1/2 ou × (−1/2), choisir ÷ 2 ou ÷ (−2). Le champ à côté de la roue permet aussi une saisie au clavier, validée par Entrée.
- **Glisser directement le point sur une autre ligne** additionne membre à membre. La prise reste sous le doigt ou le curseur ; la cible est surlignée. La source est conservée, seule la cible est remplacée. Les termes semblables se réduisent dans leur membre, sans changement automatique de membre : ajouter `x=2` à `y=−5x+13` donne `x+y=−5x+15`.
- **Glisser un terme de l’autre côté du signe égal**, dans sa propre ligne, change son signe et fusionne automatiquement avec les termes semblables du membre d’arrivée. Les groupes restent entre parenthèses tant que le joueur ne les développe pas. Toute la zone du membre opposé dans la même ligne accepte le dépôt, y compris les espaces près du signe égal et au-dessus ou au-dessous des caractères ; elle se surligne pendant le geste. Le joueur isole ainsi lui-même les variables ; aucun bouton d’isolement automatique n’est proposé. Les constantes se déplacent de la même façon. Aucun bouton « Passer » ne double ce geste de base. Au clavier, placer le focus sur le terme puis utiliser **Alt + flèche droite/gauche** vers l’autre membre.
- **Un appui prolongé sur un terme** saisit son coefficient ; sur x dans une fraction, il prend le coefficient complet, sur le numérateur ou le dénominateur, la partie correspondante. Le membre de départ change pendant le geste, celui d’arrivée seulement au dépôt ; la ligne entière est divisée ou multipliée, les autres lignes restent intactes. Une saisie suivie d’un relâchement sélectionne le facteur pour le prochain glissement. Les commandes de sélection offrent aussi un accès au clavier.
- Chaque ligne dispose également de **× (−1)** et d’une saisie pour **ajouter ou soustraire un nombre ou une fraction à ses deux membres**. La molette garde ses opérandes entiers. Les membres sont centrés, les opérateurs + et − ont des espaces égaux de chaque côté et la taille de caractères est commune à tout le système.
- **Sélectionner une variable isolée**, puis **Substituer**, remplace littéralement toutes ses occurrences dans toutes les autres équations, sur les deux membres, en conservant la définition. Par exemple, x=y+1 transforme 2x+y=7 en **2(y+1)+y=7**, à développer puis fusionner par le joueur. Un remplacement négatif garde ses parenthèses : 4x−3y avec x=−y affiche **4×(−y)−3y**. Les calculs purement numériques se terminent en revanche automatiquement après un aperçu de 220 ms : y=3 dans x=y+1 affiche **x=3+1**, puis **x=4** ; dans x=2y+1, **x=2×3+1**, puis **x=7**. Aucun bouton de calcul ou de fusion n’est demandé pour une expression devenue numérique. Les produits numériques sont aussi calculés au sein d’une expression encore symbolique, sans distribuer les groupes contenant des inconnues. Sélectionner un produit symbolique permet de **Développer** ; sélectionner plusieurs termes semblables donne **Fusionner les termes**. Le monde 3 × 3 propose notamment deux remplacements simultanés. Les objectifs de transformations comptent ces étapes manuelles.
- La coche reste dans le cadre. La validation demande les inconnues visiblement isolées ou une égalité constante permettant de conclure : contradiction → ensemble vide ; dépendance → famille de solutions paramétrée. Les réponses sont des couples ou triplets ordonnés dans l’ordre x, y, z. Les opérations et les comparaisons utilisent des fractions exactes en bigint.
- Annulation, étapes, indices, étoiles, explications facultatives, sons, reprise, export/import et hors ligne sont disponibles. Les indices décrivent un geste et ne l’appliquent pas. Lâcher hors d’une cible, Échap, un second doigt, le redimensionnement et la mise en arrière-plan annulent les déplacements sans changer le système.

Les couples solutions sont variés : (2 ; 3) est réservé au premier niveau. Valeurs négatives, nulles et fractions réduites apparaissent ensuite. Trois niveaux 2 × 2 conservent volontairement des termes des deux côtés, par exemple **x/3 + 2 = y/4 − 1/3**. Une révision du contenu ne réinterprète pas les parties en cours : leur équation de départ et leur historique restent ceux de la version commencée ; les étoiles restent acquises. Rejouer utilise la nouvelle équation.

### Systèmes du second degré — monde 9

Le premier niveau cherche les intersections du cercle **x² + y² = 5** et de la droite **y − x = −1**. Le joueur isole une inconnue, la substitue, développe et fusionne, puis résout l’équation obtenue avec les mêmes outils manuels que dans les mondes précédents. Chaque valeur ouvre le calcul de l’autre coordonnée ; les couples sont réunis et vérifiés exactement dans les deux équations d’origine.

Les douze niveaux comprennent cercle-droite, parabole-droite, deux cercles, tangences, absence d’intersection réelle, hyperbole, ellipse, deux paraboles et un cas à quatre points. Aucun tracé n’est affiché. Les racines et fractions restent exactes. L’écriture substituée reste visible avant développement ; les identités et la complétion du carré restent des choix du joueur. Les accolades et parenthèses s’étirent, et les ensembles de quatre couples passent sur deux lignes sur téléphone.

Le monde se débloque après tous les niveaux 3 × 3. Les manipulations et les résolutions de coordonnées sont sauvegardées par rejeu, y compris une équation du second degré encore en cours.

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
- `src/systems/` : moteur linéaire exact, expressions écrites conservant groupes et occurrences, 42 niveaux en deux mondes, gestes de termes et de ligne, molette, substitution multiple et sauvegardes.
- `src/curves/` : 12 systèmes quadratiques, substitutions littérales, réduction à une inconnue et vérification exacte des couples.
- `src/levels/progression.ts` : ordre commun des 126 niveaux, prérequis, étoiles et reprise.
- `src/gameplay/` : états, branches, validation, scores, indices, succès et sérialisation des événements.
- `src/app/persistence.ts` : schéma versionné, validation, bornage, reprise par rejeu des événements ; sérialisation des opérandes exacts sans `bigint` brut.
- `src/ui/` et `src/main.ts` : présentation, navigation interne sans dépendance aux réécritures du serveur, événements, audio facultatif.

Le formulaire libre accepte les constantes rationnelles non nulles ; la saisie d’un coefficient contenant une racine permet aussi une division algébrique exacte non nulle. Les dénominateurs contenant x et les degrés supérieurs à 2 sont refusés. Un produit nul donne une **union**, y compris pour une racine répétée. La validation finale compare aussi l’ensemble de solutions à celui de l’équation initiale. Les calculs ne dépendent pas des couleurs, des animations ou du nombre de clics.

Les équations à deux solutions irrationnelles gardent des radicaux exacts : aucune approximation flottante ne décide de l’exactitude. L’extraction des facteurs carrés est bornée pour préserver la réactivité ; des radicandes très grands peuvent conserver une écriture exacte non complètement simplifiée. Les coefficients et la longueur des entrées sont bornés. Les niveaux livrés ne rencontrent pas cette limite.

## Sauvegarde et installation

Progression et préférences restent dans le `localStorage` de cet appareil, sous `equation-breaker-v1`. La progression Systèmes y est intégrée et possède une copie de compatibilité sous `equation-breaker-systems-v1`, afin de survivre à la réécriture du profil par une ancienne version encore en cache. Une sauvegarde de schéma inconnu/corrompue revient à un état valide avec avertissement. Un stockage indisponible laisse jouer en mémoire. L’export/import JSON se trouve dans les paramètres ; le remplacement et la remise à zéro demandent confirmation dans le jeu.

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
pnpm qa:systems
pnpm qa:system-worlds
pnpm qa:system-methods
pnpm qa:curves
pnpm qa:curve-gestures
```

Les tests Vitest couvrent aussi les 42 systèmes linéaires et les 12 systèmes quadratiques résolus, les substitutions multiples, les combinaisons exactes et la reprise des nouveaux profils. Ils couvrent les cas mathématiques de référence, les 72 résolutions complètes, 1 800 niveaux générés résolus, 1 200 transformations d’équivalence, les opérations interdites, l’annulation et la reconstruction des branches sauvegardées. Le scénario navigateur utilise uniquement les boutons réels : aucune commande de résolution n’est exposée par l’application.

Les scripts de régression navigateur utilisent Chrome installé sur macOS à son emplacement habituel. Adapter `executablePath` dans `scripts/browser-qa.mjs` pour un autre environnement. Les résultats détaillés et captures sont produits dans `test-results/` (exclus du dépôt). Voir [VALIDATION.md](VALIDATION.md) pour les mesures et la portée effective des essais.

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

La compilation conserve les anciens fichiers JavaScript et CSS nommés par leur empreinte : une page HTML encore en cache continue ainsi à fonctionner après une publication. Ces fichiers de compatibilité ne sont pas précachés ; seul le jeu courant occupe le cache hors ligne. Les navigations en ligne privilégient la page publiée, avec repli sur le cache sans connexion. Un écran de chargement avec bouton de rechargement remplace la page vide si le démarrage échoue.

Le script de vérification publique compare les SHA-256 de chaque fichier servi aux fichiers locaux. Une réussite locale ne constitue pas à elle seule une preuve de publication.

## Limites et évolutions

- Les systèmes quadratiques proposés se ramènent à des équations de degré au plus 2 ; le jeu ne propose pas de résolution générale des quartiques.
- Les statistiques pédagogiques sont des indicateurs d’usage local, pas une évaluation scolaire certifiée ni un classement mondial.
- Les essais mobiles utilisent les dimensions tactiles et le ralentissement CPU d’un navigateur de bureau. Ils ne remplacent pas une séance sur des appareils Android modestes et iOS réels.
- Les identifiants de sélection sont des chemins dans l’AST. Une transformation efface la sélection et verrouille brièvement les entrées pour éviter les références périmées et les doubles applications.
- Les identités proposées portent sur les expressions réelles de degré au plus 2, avec coefficients rationnels au départ. Les champs de racines sont bornés à 16 composantes pour préserver la réactivité. Les anciennes actions de factorisation globale et de discriminant restent lisibles uniquement pour rejouer les sauvegardes précédentes.
- Les 126 niveaux constituent une campagne commune complète et finie ; davantage de séquences écrites, une révision espacée adaptative, le défi quotidien et un mode enseignant sont des évolutions distinctes, non annoncées comme présentes.
