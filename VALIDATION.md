# Validation — Equation Breaker 1.0

Vérifications réalisées le 19 octobre 2026, sur macOS, avec Node 24, TypeScript 5.9.3, Vite 7.3.7, Vitest 3.2.7 et Google Chrome piloté par Playwright.

## Moteur et parcours

- Compilation TypeScript stricte : réussie.
- 100 tests Vitest : réussis.
- Les 72 niveaux fixes sont terminés par une suite de transformations légales, dans leur objectif annoncé de transformations.
- 1 800 équations générées (300 graines par monde) : reproductibilité, résultat attendu indépendant et résolution accessible vérifiés.
- 1 200 transformations d’équivalence : ajout de termes, multiplication et division rationnelles, signes et cas dégénérés.
- Cas explicitement vérifiés : solution unique, aucune solution, identité, fractions, distributivité avec signe négatif, racine double, union des branches et radicaux exacts.
- Division par 0, multiplication par 0, fusion entre membres ou degrés différents et dénominateur en x : rejet sans mutation.
- Annulation avec conservation des compteurs ; restauration par rejeu, dont branches validées et union reconstruite ; données corrompues ou schéma inconnu.

## Navigateur

Le parcours complet produit 187 contrôles consignés dans `test-results/browser-report.json` :

- Première expérience résolue au clavier, aperçu miroir et trois étoiles.
- Les 72 niveaux résolus avec les vrais boutons de l’application, sans point d’entrée de résolution caché.
- Sept tailles de jeu : 320×568, 360×640, 390×844, 430×932, 768×1024, 1440×900 et 844×390. Vérification des limites des blocs et de l’absence de débordement horizontal, y compris parenthèses et fractions.
- Page d’accueil vérifiée en téléphone et ordinateur ; captures du jeu et des résultats inspectées.
- Division par zéro expliquée, état mathématique inchangé.
- Annulation, reprise après rechargement, validations et pressions répétées sans double transformation.
- Mode léger, texte agrandi, entraînement et lancement d’arcade.
- Zéro erreur JavaScript relevée.

Après l’ajustement demandé de la notation des diviseurs négatifs, une passe supplémentaire vérifie les dimensions, la reprise, le hors-ligne et le rendu effectif « ÷ (−2) », y compris aperçu et historique. Son rapport est distinct : `test-results/browser-quick-report.json`.

## Hors ligne et mise à jour

- Cache complet réellement contrôlé avant affichage de l’état prêt.
- Connexion coupée dans le navigateur, rechargement complet, lancement d’un niveau et résolution réussie sans réseau.
- Les fichiers statiques du cache sont retrouvés malgré les variantes d’en-têtes de l’aperçu local (`Vary`).
- Test d’une vraie installation de nouveau service worker : il reste en attente pendant le niveau. Après acceptation de la mise à jour, la partie reprend avec une transformation déjà effectuée, puis se termine correctement. Rapport : `test-results/update-report.json`.
- L’apparition du dialogue natif d’installation dépend du navigateur. L’ajout sur un écran d’accueil Android/iOS réel n’a pas été vérifié physiquement.

## Performance

Build : environ 65 Ko de JavaScript et 37 Ko de CSS, soit environ **33 Ko compressés** au total pour code et styles. Le dossier statique complet occupe environ 128 Ko sur disque. Aucun framework d’interface ni police distante, aucun téléchargement requis pour générer les niveaux, aucune animation permanente de fond.

Sur Chrome avec **ralentissement CPU ×6**, 30 sélections répétées mesurées jusqu’au prochain `requestAnimationFrame` donnent, lors de la passe complète :

| Mesure | Résultat |
| --- | --- |
| Médiane | 16,7 ms |
| 95e percentile | 17,5 ms |
| Maximum | 19,0 ms |

Ces chiffres caractérisent cette simulation et ce scénario ; ils ne constituent pas une garantie sur tout matériel. Pas de calcul symbolique dans une boucle d’animation. Les effets utilisent `transform`/`opacity`, sont transitoires et peuvent être désactivés. Les actions sont brièvement verrouillées, avec un état `aria-busy` explicite. Le chronomètre facultatif n’actualise qu’un élément une fois par seconde.

## Portée et limites des essais

Tests réellement exécutés : Chrome sur macOS, vues tactiles émulées, CPU ralenti, clavier, cache et coupure réseau réels du navigateur. Le navigateur reste celui d’un ordinateur : **aucun appareil Android d’entrée de gamme physique, Safari iOS/macOS ou Edge n’a été utilisé pour cette validation**. Une campagne de compatibilité matérielle reste donc à conduire.

Les paramètres et aides pédagogiques, les modalités de score et le périmètre mathématique sont documentés dans le README. Les prochaines fonctionnalités ne sont pas présentées comme déjà disponibles.


## Mise à jour 1.1 — 20 octobre 2026

- 115 tests automatiques, dont les nouveaux tests de déplacement et de carré complété. Les propriétés des gestes sont vérifiées sur 300 équations générées, pour les opérations applicables.
- Régression complète des 72 niveaux par les commandes existantes, incluant factorisation, produits nuls et discriminants.
- Vérifications spécifiques des gestes : changement de signe au franchissement, calcul non réduit visible au dépôt, membre de départ divisé avant le membre d’arrivée, déplacement de dénominateur, révélation de −1 et touche × (−1).
- Vérification que le modèle mathématique, les coups et les erreurs restent inchangés durant un trajet non terminé ou annulé ; un dépôt valide n’enregistre qu’une action.
- Sélection prolongée des termes du carré complété, ajout exact de 25/4, extraction en deux branches rationnelles, résolution et réunion des solutions.
- Gestes tactiles réels émis dans Chrome via son protocole d’entrée, en portrait 320×568 et paysage 844×390 ; ces essais restent ceux d’un navigateur de bureau, pas d’un téléphone physique.
- Reprise après rechargement des nouveaux événements ; alternative sans glissement au clavier ; annulation par Échap et changement d’orientation ; déplacements répétés sous CPU ×6.

Les rapports détaillés sont `test-results/gesture-report.json`, `test-results/browser-report.json` et `test-results/browser-quick-report.json`. Les résultats des racines carrées rationnelles ouvrent des branches manipulables. Les cas irrationnels conservent deux relations symboliques et un résultat exact, sans prétendre offrir le glissement des radicaux dans des branches.


## Mise à jour 1.2 — 20 octobre 2026

- Typographie locale Outfit pour les expressions et DM Sans pour les textes ; aucune requête vers un service de polices à l’exécution. Licences OFL conservées.
- Nouvelle présentation : membres côte à côte, labels hors de la ligne mathématique, termes sans cadres permanents. Trente contrôles d’alignement du signe égal sur six formats (320×568 à 1440×900), contrôle des polices effectivement chargées et des tailles homogènes des chiffres.
- La touche × (−1) simplifie les facteurs des groupes : `−(x+2)=4` donne directement `x+2=−4`. Vérification dans les deux membres, avec facteurs négatifs, fractions, autres termes et reprise.
- Les termes semblables gardent leur notation compacte pendant le dépôt : `2x + 3x`, puis `5x`, sans décomposition des coefficients en multiplications explicites.
- Simplification après dépôt : délai de 380 ms avec animations, 180 ms sans. Mesure navigateur locale : environ 398 ms jusqu’au résultat réduit.
- Sept bruitages originaux précalculés : 7 OGG/Opus et 7 MP3. Décodage réel des 14 fichiers, absence de saturation, déclenchement par un vrai glissement, quatre voix simultanées au maximum, bouton muet et paramètres synchronisés, repli MP3 forcé et lecture après rechargement hors ligne.
- Saisie des constantes devant une parenthèse et des dénominateurs de groupes : `3(x+3)=6` devient `x+3=2` sans développement. `(x+4)/2=6` devient `x+4=12`. Tests des signes négatifs, de l’autre sens, des autres termes du membre, des fractions composées, de la reprise et de l’alternative au clavier. Le développement reste disponible, y compris pour une somme divisée par une constante.
- 22 scénarios navigateur de gestes réussis, dont les appuis prolongés tactiles sur groupes à 320×568.
- 122 tests Vitest réussis, dont les propriétés de ces facteurs sur 300 équations générées supplémentaires. Régression navigateur des 72 niveaux : 187 contrôles réussis, sans erreur JavaScript.
- Ralentissement CPU ×6, 30 sélections : médiane 16,8 ms, 95e percentile 18,6 ms, maximum 21,6 ms, pendant la passe locale complète. Aucun calcul audio par oscillateur pendant les gestes : buffers enregistrés et décodés une fois.

Build final : environ 83 Ko de JavaScript et 51 Ko de CSS (42 Ko compressés ensemble), 69 Ko de polices et 49 Ko de sons dans les deux formats. Le dossier de publication occupe environ 324 Ko sur disque. Tous ces fichiers sont précachés pour le hors-ligne. Rapports : `polish-report.json`, `audio-report.json`, `gesture-report.json`, `browser-report.json` dans `test-results/`.

Essais réalisés sur Chrome/macOS avec formats mobiles, entrées tactiles et CPU ralenti. Aucun téléphone physique ni Safari n’a été utilisé.


## Mise à jour 1.3 — 20 octobre 2026

- Surlignage natif et menus de sélection désactivés sur les appareils à pointeur tactile principal. Les champs restent éditables et sélectionnables ; la sélection des termes du jeu reste active.
- Gestes de zoom bloqués par la politique tactile, le viewport mobile et les événements de geste WebKit. Essais Chromium avec vrais doubles touchers et mouvements à deux doigts : échelle du viewport inchangée. Un deuxième doigt annule le glissement sans transformer l’équation. La loupe et les réglages d’accessibilité du système restent sous le contrôle de l’appareil.
- Barre de validation fixe avec prise en compte des marges de sécurité. Vérification de la visibilité réelle et de la cible tactile de Valider, avant et après défilement, sur 320×480, 320×568, 360×640, 390×844, 568×320 et 844×390. En paysage court, l’en-tête est également compacté.
- Signes binaires placés entre les termes : le modèle conserve le signe du terme déplacé. L’essai `x−4=2` montre un jeton `−4`, puis `4` et le calcul `2 + 4` avec un signe centré, avant `6`.
- Produits numériques sans parenthèses autour des nombres positifs, ni autour du premier facteur négatif. Les parenthèses d’une somme et d’un facteur négatif suivant sont conservées.
- 124 tests Vitest, 23 scénarios de gestes, 19 contrôles mobiles et passe de régression des commandes et dimensions. Rapports : `gesture-report.json`, `mobile-report.json`, `browser-quick-report.json`.

Les gestes tactiles et mesures sont exécutés dans Chrome/macOS avec émulation mobile. Les événements WebKit sont vérifiés par émission d’événements annulables ; cela ne constitue pas un essai de Safari sur un iPhone réel. Android et iOS physiques restent à vérifier.


## Écran de réussite — 20 octobre 2026

Le bouton de continuation est placé après la solution, avant les statistiques et les succès. Sur les petits écrans, il reste fixé en bas avec les marges de sécurité ; la navigation de bas de page est masquée pendant la réussite. Le résultat s’ouvre en haut de page. Les commandes Rejouer, Voir mes étapes et Retour aux mondes restent disponibles.

Contrôle par résolution réelle du premier niveau avec une progression neuve (et ses succès débloqués) : 320×480, 320×568, 390×844, 568×320, 844×390 et 1440×768. Visibilité et cible tactile de Continuer contrôlées avant et après défilement sur mobile, puis clic et ouverture du niveau suivant. Rapport intégré à `test-results/mobile-report.json`. Essais Chromium sur macOS avec émulation mobile.


## Signe de soustraction — 20 octobre 2026

Le signe binaire et le moins unaire utilisent désormais la même police, la même graisse et la même taille responsive, y compris en texte agrandi. Les marges des termes sont symétriques sans largeur minimale artificielle ; leurs zones tactiles invisibles conservent au moins 44 px de largeur. Contrôle de `5x − 7` en 320×480, 390×844 et 1440×900 : tailles calculées identiques et décalage du signe par rapport au milieu des deux termes inférieur à un pixel. Contrôle intégré à la QA mobile.


Le jeton `−3` et le dénominateur d’une fraction verticale provisoire sont écrits sans parenthèses. La barre de fraction sépare déjà les opérandes ; les parenthèses sont conservées dans les libellés textuels de division `÷ (−3)`. Cas de référence : `−3x=4`, dépôt affichant 4 sur −3.

Vérification finale de ces ajustements : 125 tests automatiques, 34 contrôles mobiles, 23 scénarios de gestes et 43 contrôles de régression navigateur réussis.


## Noms des membres facultatifs — 20 octobre 2026

Nouvelle préférence « Afficher les noms des membres », désactivée par défaut pour les nouvelles progressions comme pour les anciennes sauvegardes dépourvues de cette préférence. Activés, les libellés sont centrés au-dessus des deux membres. Désactivés, leurs commandes restent présentes pour les lecteurs d’écran et deviennent visibles au focus clavier. Les marges de l’arène restent symétriques.

126 tests automatiques, dont la valeur par défaut, la migration implicite et le décodage du nouveau choix. Le parcours mobile contrôle l’activation, le centrage, la conservation après rechargement, la désactivation et la sélection de tout le membre par Entrée, sans transformation de l’équation.


## Taille commune adaptée à l’équation — 20 octobre 2026

La taille est mesurée à l’affichage, au redimensionnement et lors des étapes de geste qui changent le contenu. Les deux membres et les opérateurs utilisent un facteur commun ; une simplification libérant de la place restaure une taille plus grande, plafonnée à la taille normale de l’écran. Aucune mesure de texte n’est effectuée dans les mouvements de pointeur. La taille minimale est de 16 px (20 px en texte agrandi). Si une expression reste trop large à ce seuil, le repli à la ligne reste possible et une indication propose la rotation du téléphone.

Essai dédié à 320×568 sur `3(x−2)+5=2x+7` : taille commune réduite, puis agrandissement après saisie du coefficient 3 et après passage en paysage. Contrôle des étapes provisoires et du dépôt avec la géométrie recalculée avant de déterminer la cible.

Contrôle visuel de cette présentation dans le navigateur intégré à une largeur de 320 px ; un passage regroupé Chrome a validé 28 scénarios de gestes, dont la taille commune et son agrandissement. Aucun appareil physique n’est revendiqué pour ces essais.

## Coefficient fractionnaire complet et portes automatiques — 20 octobre 2026

- Appui prolongé sur `x` dans `3x/4` : saisie de `3/4` en un jeton. Le membre source est entièrement divisé pendant le trajet ; l’autre reste inchangé jusqu’au dépôt. Les prises séparées du numérateur et du dénominateur restent disponibles, ainsi que le bouton et le clavier pour le coefficient complet.
- Cas exact `3x/4=5` : `x=20/3`. Tests des coefficients négatifs, des groupes, des autres termes du membre, du sens droite-gauche et du maintien du comportement des anciennes sauvegardes de saisie du numérateur.
- Validation d’une porte : passage à la prochaine porte inachevée ; dernière validation : union sans doublon et fin de l’équation. Même comportement pour les branches issues d’un carré. Tests d’une résolution commencée par la seconde porte, des racines doubles, d’une porte unique, du refus de validation prématurée et de la reprise après rechargement.
- TypeScript strict et 133 tests automatiques réussis, dont les 72 niveaux résolus avec la progression automatique.
- 32 scénarios navigateur de gestes réussis : produit nul et carré complété sans navigation manuelle entre portes ni clic supplémentaire pour réunir ; coefficient rationnel complet, annulation, clavier, reprise et vraie séquence d’entrée tactile émulée à 320×568. Régression des gestes existants et mouvements sous CPU ×6. Aucune erreur JavaScript.
- Contrôle visuel supplémentaire dans le navigateur intégré, à 320 px : appui long sur x reconnaissant le coefficient complet et bouton Valider visible. Les essais tactiles restent des simulations sur navigateur de bureau ; aucun téléphone physique n’a été utilisé.

## Une seule porte pour un carré nul — 20 octobre 2026

- `(x−2)²=0` ouvre directement l’unique équation `x−2=0`. Les facteurs ayant les mêmes zéros sont regroupés ; deux facteurs distincts restent deux portes. La règle `X²=0 ⇔ X=0` est indiquée dans la commande et l’explication.
- 135 tests automatiques réussis : carrés nuls à gauche et à droite, facteurs répétés ou proportionnels, facteur constant non nul, conservation de deux racines distinctes, annulation et restauration. Les 72 niveaux restent résolubles.
- Les anciens événements d’ouverture sont rejoués selon leur structure d’origine pour préserver les parties sauvegardées ; une seule porte représentative est affichée et les portes équivalentes sont validées ensemble. Une ancienne partie située sur la seconde porte dupliquée a été reprise et terminée dans les tests.
- Parcours vérifié dans le navigateur intégré à 320×568 : une seule porte affichée, résolution `x=2`, un seul clic Valider et écran de réussite `S={2}` avec Continuer visible. Aucun Chrome lancé pour cet essai.

## Mise à jour 1.4 — identités construites et racines manipulables

- Retrait des commandes de factorisation globale des trinômes et de discriminant dans le jeu et les indices. Les anciennes actions restent rejouables dans les sauvegardes.
- « Écrire comme un carré » sur un nombre ou ax², signe moins conservé à l’extérieur ; identité a²−b² accessible après sélection de deux carrés préparés ; facteurs linéaires réduits exactement. Tests explicites de x²−9=0 et 2x²−9=0.
- Complétion locale d’ax²+bx pour a positif : carré et compensation −b²/(4a) visibles, autres termes et autre membre conservés. Parcours complet x²−5x+6 : compensation −25/4, fusion avec 6, écriture de 1/4 comme carré puis différence de carrés. Propriété d’identité vérifiée pour 84 paires de coefficients, y compris non moniques.
- Facteur commun choisi : x ou facteur rationnel maximal, par exemple 4x²+2x → x(4x+2) ou 2x(2x+1). La racine zéro est conservée.
- Constantes multiquadratiques exactes en bigint, inversion bornée à 16 composantes et signe par intervalles rationnels. Aucune comparaison approchée des racines pour vérifier les transformations, l’union ou la victoire. Polynômes et racines calculés en cache ; aucun calcul de disposition dans les mouvements tactiles.
- Racines dessinées avec une barre couvrant le radicande entier, y compris les fractions longues. Le trait supérieur est abaissé pour rejoindre le crochet, avec son épaisseur conservée. Vérification visuelle dans le navigateur intégré sur trois tailles, jusqu’à un numérateur de 28 chiffres.
- Portes irrationnelles manipulables : déplacement des constantes, puis saisie de √2 pour diviser les deux membres. Résolution complète, annulation et rejeu des nouvelles identités ; anciennes complétions avec ajout aux deux membres et anciennes extractions symboliques restaurées selon leur sémantique précédente.
- Correction du menu : formules en flux typographique normal, coefficient et x accolés, exposants relevés ; contrôle géométrique des exposants et inspection des trois dernières cartes à 320 px.
- TypeScript strict et 147 tests automatiques réussis. Les 72 niveaux fixes et les 1 800 équations générées sont résolus ; les objectifs d’étoiles des niveaux fixes restent atteignables.
- Passe navigateur complète : 190 contrôles réussis, dont les 72 niveaux avec les vrais boutons, les identités explicitement choisies, le facteur commun et une vraie séquence tactile émulée sur un coefficient irrationnel à 320×568. Aucune erreur JavaScript.
- Passe ciblée après les derniers ajustements : 47 contrôles réussis, comprenant menu, gestes avec racines, reprise après rechargement, géométrie responsive, cache complet et résolution hors ligne. Sous CPU ×6 : médiane 16,5 ms, 95e percentile 18 ms et maximum 18,3 ms sur 30 sélections jusqu’à la prochaine image. Ces mesures restent des simulations sur ordinateur, sans téléphone physique.
- Build final : environ 101 Ko de JavaScript et 58 Ko de CSS, soit environ 49 Ko compressés au total. Aucune dépendance de calcul ou de rendu ajoutée, aucune ressource distante à l’exécution.


## Typographie cohérente et explications facultatives — 20 octobre 2026

- Option « Expliquer chaque étape » désactivée par défaut, y compris lors de la lecture des anciennes sauvegardes. Une transformation choisie s’applique directement et compte un seul coup ; l’option rétablit l’aperçu avant application. Le bouton « Pourquoi ? » reste disponible. Choix conservé après rechargement et dans les exports.
- Parenthèses vectorielles ajustées à la hauteur du contenu, carré regroupé en une expression et exposant placé en haut. Le coefficient −3√2/4 présente tout 3√2 au numérateur, sans multiplication développée inutile.
- Fractions à la taille des termes voisins, sans réduction cumulative dans les racines. Deux lignes de hauteur égale placent la barre au centre, même lorsque le numérateur contient une racine ; les radicandes partagent la ligne de base du texte. Les racines gardent aussi la taille du texte dans les résultats.
- Contrôle visuel dans le navigateur intégré du carré (√2x−3√2/4)² et de x/4+3=0, avec une partie à 320×568 et un agrandissement de la formule. Rendu confirmé par l’utilisateur. Validation toujours visible.
- TypeScript strict et 150 tests automatiques réussis. Passe navigateur ciblée : 48 contrôles, aucune erreur JavaScript, gestes tactiles avec coefficient irrationnel, reprise, géométrie sur sept tailles, mode texte agrandi et fonctionnement hors ligne. Contrôles de taille identique du numérateur, dénominateur et texte voisin, centrage de la barre et hauteur des parenthèses.
- CPU ×6 sur 30 sélections : médiane 16,6 ms, 95e percentile 17,8 ms, maximum 18,2 ms. Ces essais sont réalisés sur ordinateur avec émulation ; aucun téléphone physique n’est revendiqué.


## Navigation par cas — 20 octobre 2026

- Boutons « Cas 1 », « Cas 2 », sans équations : seul le numéro et une coche de validation restent affichés. Le cas actif est distingué visuellement et par aria-pressed ; la validation est annoncée dans son nom accessible.
- Terminologie « cas » harmonisée dans les commandes, consignes, indices, titres des niveaux concernés et messages de validation. Les identifiants internes et le format des sauvegardes restent compatibles.
- TypeScript strict, 150 tests et compilation réussis. Vérification dans le navigateur intégré avec une largeur de 360 px : navigation vers le second cas, résolution, validation, coche affichée et retour automatique au premier cas restant.
