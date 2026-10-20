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


## Récupération du démarrage après publication — 20 octobre 2026

- Défaut confirmé : les fichiers JS/CSS de la version précédente répondaient 404 sur Pages après la publication suivante. Un HTML conservé par un cache HTTP, sans cache complet du service worker, peut alors afficher seulement le lien d’évitement.
- Rétablissement des entrées publiées lors des douze dernières révisions. La compilation conserve désormais les anciennes entrées nommées par empreinte. Leur contenu reste inchangé ; seul le JS/CSS référencé par l’HTML courant est précaché (27 ressources, sans augmentation du cache hors ligne).
- Navigation du nouveau service worker : page en ligne prioritaire, repli sur l’index précaché hors connexion. Aucun rechargement automatique d’une partie en cours. Écran initial lisible et bouton Recharger si le code principal ne peut pas être chargé ; aucune suppression de progression ou de paramètres.
- TypeScript et deux compilations successives réussis, manifestes de cache identiques. Test navigateur dédié : HTML de la version précédente associé aux anciens fichiers rétablis, chargement JS et CSS confirmé ; échec du module simulé et bouton de secours visible ; mise à jour en attente sans interruption, reprise exacte d’un coup, résolution puis navigation hors ligne et nouvelle partie. Fichiers anciens exclus du précache vérifié.


## Validation dans le cadre de l’équation — 20 octobre 2026

- Déplacement du bouton Valider vers une coche dans le coin inférieur droit du cadre, avec nom accessible et infobulle « Valider l’équation ». Zone tactile de 44 × 44 px ; espace réservé sous les termes pour éviter les chevauchements.
- Retrait de la validation de la barre inférieure. Les commandes Annuler, Indice et Étapes reviennent dans le flux de la page ; aucune barre fixe ne recouvre la coche. La coche est rendue inerte pendant une manipulation, comme les autres commandes.
- TypeScript strict et compilation réussis. 35 contrôles navigateur mobile réussis, aucune erreur JavaScript : visibilité de la coche avec l’équation à l’écran, appartenance au cadre, absence de recouvrement par les termes, cible tactile et hit-test sur six formats portrait/paysage, gestes conservés et verrouillage pendant le glissement, validation du niveau et bouton Continuer. Rendu inspecté dans le navigateur intégré. Ces essais restent réalisés sur ordinateur avec émulation mobile.


## Accolades extensibles des ensembles de solutions — 20 octobre 2026

- Accolades vectorielles adaptées à la hauteur de la solution la plus haute, avec une épaisseur constante. Même rendu pour l’ensemble affiché en cours de jeu et sur l’écran de résultat ; S = ∅ et S = ℝ conservent leur notation usuelle.
- TypeScript, compilation et 150 tests réussis. Inspection visuelle dans le navigateur intégré : résultat réel à 360 px pour {−1/2 ; 2}, puis exemples {−√6/3 ; √6/3} et {−1−√3 ; −1+√3}. Les noms accessibles conservent les accolades et la lecture textuelle exacte de l’ensemble.


## Version 1.5 — mode Systèmes — 21 octobre 2026

- 21 niveaux progressifs : 6 substitutions, 6 combinaisons, 6 choix de méthode, 3 bonus 3 × 3 ; accès depuis l’accueil et la navigation, lien direct #systems. Étoiles, reprise et export/import intégrés ; progression et statistiques des 72 équations conservées.
- Point de ligne : toucher pour activer la roue dentée dans le cadre, glisser directement sur une autre ligne pour l’addition. La source reste conservée ; seule la cible change. Le clone reprend les dimensions et la prise exactes de la ligne source. Cible surlignée, opération annoncée, géométrie mesurée au début du geste et dessins regroupés par image.
- Roue directe, sans menu : aperçu sur l’équation elle-même, tels que sont écrits ses membres ; relâcher valide un seul coup, Échap annule. × / ÷ mémorisé. Les opérandes sont des entiers positifs ou négatifs, avec 0 et 1 interdits. Les produits par des fractions passent par une division entière. Champ accessible au clavier et flèches sur la roue.
- Déplacements manuels des variables et des constantes entre les deux membres, changement de signe au franchissement du = et réduction au dépôt. Aucun bouton d’isolement automatique. Addition strictement membre à membre et substitution conservant les constantes dans leur membre, sans normalisation visuelle automatique de l’équation.
- Exemple utilisateur vérifié avec les vrais contrôles : x=2 et y=−5x+13 ; addition par glissement → x+y=−5x+15 ; déplacement manuel du x ensuite → y=−6x+15. Source conservée, prise ancrée au curseur et aucun déplacement de terme implicite.
- Substitution d’une inconnue isolée à gauche ou à droite dans toutes les autres équations concernées. Tests et parcours en 3 × 3 : deux remplacements simultanés et définition conservée. La substitution de x=2 dans x+y=5 affiche y+2=5 et ne permet pas une validation avant le déplacement du 2.
- Calculs en fractions bigint, représentation distincte des membres affichés et de la forme utilisée pour vérifier l’équivalence. La réduction interne n’est pas une commande du joueur. Validation uniquement lorsque les résultats sont construits dans l’affichage. Couples/triplets ordonnés, ensemble vide et familles paramétrées. Croissance et événements bornés.
- 166 tests automatiques et TypeScript strict réussis : les 21 systèmes résolus manuellement par les actions proposées sous leurs budgets, conservation des solutions sur 1 200 opérations aléatoires de ligne, substitutions, déplacements, membre droit isolé, contradictions, infinités, limites, sauvegardes et anciens profils. Les 150 tests du jeu précédent restent réussis.
- Régression navigateur Systèmes : 51 contrôles réussis, dont les 21 niveaux par les vrais boutons ; sept formats de 320×480 à 1280×800 avec paysage, membres non coupés et coche de 44×44 px visible dans le cadre. Molette immédiate, rotation réelle avec aperçu avant relâchement, 0/1/fractions refusés comme opérandes, négatifs et division autorisés, préférence persistée, clavier, annulations, reprise, explications facultatives et résolution hors ligne.
- Événements tactiles émulés : glissement direct de poignée, ancrage de la prise à moins de 2 px du pointeur, somme 3x=6, source conservée, verrouillage de validation et annulations par Échap/second doigt. Déplacement de terme avec changement de signe également exercé. Inspection complémentaire dans le navigateur intégré, dont rotation de la roue faisant passer x+y=5 à 7x+7y=35 en un seul coup. Aucune erreur JavaScript.
- CPU ×6 sur 30 sélections de variable : médiane 13,5 ms, 95e percentile 21,1 ms, maximum 23,8 ms. Essais sur ordinateur avec émulation ; aucun téléphone physique revendiqué.
- Régression des équations existantes : 48 contrôles navigateur réussis, sans erreur JavaScript. Geste sur coefficient irrationnel, identités, préférences, reprise, mode agrandi, dimensions variées et hors ligne conservés.
- Build : environ 147 Ko de JavaScript et 76 Ko de CSS, soit environ 68 Ko compressés au total. Aucune dépendance ni ressource distante ajoutée, 27 ressources précachées. Anciennes entrées publiées conservées ; brouillons locaux non publiés exclus de la livraison.


## Version 1.5.1 — gestes et substitution littérale — 21 octobre 2026

- Chaque ligne propose la transposition, la saisie des coefficients entiers ou fractionnaires (dont −1), du numérateur et du dénominateur, × (−1), et l’ajout/soustraction d’un nombre ou d’une fraction aux deux membres. La roue conserve la restriction aux entiers. Saisie sur appui de 420 ms, prise conservée après relâchement, commande de remplacement au clavier et annulations sans modification.
- Pendant la saisie d’un facteur, tous les termes du membre source sont déjà divisés ou multipliés ; le membre cible reste inchangé jusqu’au dépôt. Les autres lignes restent intactes. Essais de 2x=8, coefficients négatifs, 3x/4, coefficient d’un groupe, prise à droite et troisième ligne d’un système 3 × 3.
- Membres centrés sur le même axe (y et 2x), sans colonne invisible réservée par variable. Espaces des opérateurs + et − vérifiés géométriquement, signe transporté avec le terme.
- Les expressions linéaires écrites possèdent leur propre arbre : la substitution remplace chaque occurrence sans distribution, calcul de produit ou fusion implicite. Les deux membres, les groupes, les répétitions et la définition source sont conservés. Exemples : 2(2y+1)+y=7, et 3×2+y=9. Le joueur développe ou calcule un produit sélectionné, puis fusionne les termes sélectionnés. La forme canonique interne sert seulement à vérifier l’équivalence et les résultats.
- Sauvegarde et annulation rejouent les remplacements, développements, fusions et prises de facteurs. Une écriture non réduite ne devient pas une solution validable grâce à la seule réduction interne. Taille des arbres, profondeur et nombres bornés. Budgets des niveaux adaptés aux étapes explicites.
- 175 tests automatiques réussis et vérification TypeScript : dont 25 tests systèmes, les 21 niveaux sous leurs budgets, les occurrences présentes sur les deux membres même lorsque leurs coefficients se compensent, absence de mutation des anciennes étapes, produits numériques conservés et opérations sur un groupe non développé. Les 150 tests des équations restent réussis.
- 57 contrôles navigateur Systèmes réussis, 21 niveaux joués par les vrais contrôles, sept formats dont 320×480, aucune erreur JavaScript. Vérifications du remplacement littéral, du développement puis de la fusion, des groupes après reprise, des gestes de coefficient, de la roue sans menu, de l’alignement et des signes, de la validation, des annulations et du hors-ligne. Rapports et captures dans test-results/.
- Essais sur ordinateur avec émulation ; aucun test sur téléphone physique revendiqué. Les mesures finales de performance figurent dans test-results/systems-report.json.
- Build : environ 163 Ko de JavaScript et 76 Ko de CSS, environ 72 Ko compressés ensemble ; 27 ressources précachées, sans nouvelle dépendance ou requête distante.


## Version 1.5.2 — fusion après transposition et dépôt tolérant — 21 octobre 2026

- Après transposition d’un terme, fusion automatique avec les termes semblables du membre d’arrivée, y compris dans une ligne conservant une écriture de substitution : 5x−3=2 → 5x=5. Les substitutions restent littérales et les groupes ne sont pas développés par ce changement. Même comportement au clavier et par glissement. Calculs exacts en fractions, sans déplacer un autre terme.
- Zone de dépôt étendue de la ligne de séparation = à l’extrémité du membre, sur toute la hauteur de la ligne, avec une marge dans les espaces externes du cadre. Surlignage de la zone complète et confirmation visuelle sous le pointeur. Mesure refaite au relâchement. Les dépôts dans une autre ligne ou hors du cadre restent annulés. Les facteurs utilisent la même zone élargie.
- Les anciens événements de transposition sans fusion restent rejouables afin de préserver les parties enregistrées, y compris lorsqu’une fusion explicite les suit. Les nouveaux événements conservent le choix de fusion à l’arrivée pour la reprise et l’annulation.
- 179 tests automatiques réussis, dont 29 systèmes : exemple exact de l’utilisateur, monômes et fractions dans les deux sens, groupes conservés, ancien et nouveau journal de partie. Vérification TypeScript réussie.
- 61 contrôles navigateur : 21 niveaux, sept formats, et nouveaux essais ciblés à 320×480, 390×844 et 1280×800 sous CPU ×6. Souris et événements tactiles : juste après le =, en haut et en bas hors de la hauteur des caractères, bord éloigné, trajet inverse ; fusion automatique à chaque arrivée valable. Dépôt sur autre ligne/hors du cadre annulé, autres lignes conservées, annulation/reprise vérifiées, facteur déposé dans la marge et 5x=5 obtenu en un geste. Aucun téléphone physique revendiqué.


## Version 1.5.3 — passage de terme comme geste de base — 21 octobre 2026

- Retrait des boutons « Passer … à droite/gauche » du panneau de sélection. La transposition se fait par glissement direct dans la ligne ; zone élargie et fusion automatique conservées. Le raccourci Alt + flèche droite/gauche sur le terme focalisé assure l’accès au clavier, annoncé par aria-keyshortcuts et dans l’aide.
- 179 tests automatiques et vérification TypeScript réussis. 62 contrôles navigateur réussis, sans erreur JavaScript ; tous les passages de termes des 21 parcours sont exécutés par de vrais glissements. Absence du bouton vérifiée sur le panneau, raccourcis dans les deux sens, explications facultatives, dépôts en marge à la souris et au toucher, sauvegarde et annulation contrôlés.
- CPU ×6, 30 sélections jusqu’à l’image suivante : médiane 16,4 ms, 95e percentile 19,5 ms, maximum 21,2 ms. Émulation sur ordinateur, sans téléphone physique.


## Version 1.5.4 — calcul numérique automatique après remplacement — 21 octobre 2026

- Une substitution affiche brièvement ses valeurs remplacées (220 ms), puis termine automatiquement les sous-expressions purement numériques : x=y+1 et y=3 → x=3+1 → x=4 ; x=2y+1 → x=2×3+1 → x=7. Les groupes contenant des inconnues et leurs termes semblables restent à développer/fusionner par le joueur. Aucun bouton de calcul ou de fusion n’intervient pour un calcul devenu numérique.
- Résultat enregistré dès l’action, avec aperçu visuel temporaire dans le système et un seul coup compté. Une navigation ou un rechargement pendant l’aperçu conserve le résultat. Le minuteur est supprimé au changement d’écran. L’annulation restaure la substitution précédente.
- Les anciennes écritures numériques en attente (notamment −3+5) sont terminées à la reprise. Un événement automatique compatible avec le nouveau journal conserve ce résultat sans ajouter de transformation ; Annuler retire l’action du joueur et ses calculs automatiques associés. Les anciens développements/fusions restent rejouables dans leur ordre d’origine. Calculs exacts, y compris fractions et signes.
- 183 tests automatiques réussis, dont 33 systèmes ; TypeScript et build réussis. 64 contrôles navigateur sans erreur JavaScript : aperçu puis résultat, aucun calcul à cliquer, reprise pendant l’aperçu, anciennes écritures bloquées, absence de boutons Passer, raccourcis, 21 niveaux par gestes réels, dépôts élargis souris/toucher sous CPU ×6 et hors ligne.
- CPU ×6, 30 sélections : médiane 14,5 ms, 95e percentile 30 ms, maximum 49,1 ms. Mesures sur ordinateur avec émulation.


## Version 1.6.0 — deux mondes de systèmes et solutions variées — 21 octobre 2026

- Deux cartes de monde : 21 systèmes 2 × 2, puis 9 systèmes 3 × 3 ; aucun système 4 × 4. Numérotation locale, progression et étoiles par monde, seuil de déblocage et bouton de passage au monde suivant. Les anciens niveaux réussis restent accessibles.
- Le couple (2 ; 3) apparaît une seule fois dans les 18 systèmes 2 × 2 à solution unique ; 17 couples distincts. Zéros, signes variés et fractions exactes. Trois niveaux de fractions préservent des constantes et inconnues dans les deux membres, dont x/3+2=y/4−1/3. Six nouveaux 3 × 3 couvrent combinaisons, valeurs négatives/nulles/fractionnaires, contradiction et dépendance.
- Révision explicite de l’équation de départ pour les sauvegardes : reprise, annulation, historique et validation utilisent la version commencée. Les anciennes sauvegardes sans révision gardent leur équation d’origine ; les étoiles sont conservées ; Rejouer ouvre le contenu actualisé.
- 186 tests automatiques réussis (36 systèmes), vérification TypeScript et build de production réussis. Chaque système est résolu par des opérations permises, avec conservation exacte de l’ensemble solution à chaque étape et un nombre de gestes inférieur à son budget.
- 73 contrôles navigateur réussis sans erreur JavaScript : les 30 systèmes joués par les gestes et commandes du jeu, sept formats, gestes souris/tactiles sous CPU ×6, reprise, clavier et hors ligne. Cinq scénarios supplémentaires contrôlent la frontière des mondes, l’accès aux anciens 3 × 3, la reprise/historique/annulation/validation d’un niveau révisé et les fractions à 320, 360, 390 px, en paysage et sur ordinateur. Captures inspectées : carte des mondes et x/3+2=y/4−1/3.
- CPU ×6, 30 sélections : médiane 30,5 ms, 95e percentile 32,3 ms, maximum 38,1 ms. Émulation sur ordinateur, sans essai sur un téléphone physique.


## Version 1.6.1 — méthodes imposées pendant l’apprentissage — 21 octobre 2026

- Chapitres Substitution : aucune poignée active, molette ni addition de lignes ; les transpositions, prises de coefficients, × (−1) et opérations numériques sur les deux membres restent disponibles. Chapitres Combinaison : molette et addition disponibles, aucune substitution. Les chapitres libres conservent les deux méthodes, en 2 × 2 et en 3 × 3.
- Garde commune sur les nouvelles actions ; les anciens événements restent rejouables pour conserver les parties en cours et l’annulation. Les indices de substitution proposent une prise de coefficient et ne passent plus par la molette ; aucune combinaison n’est suggérée. Les indices de combinaison n’utilisent jamais de substitution. Aide, sélection, noms accessibles et repères de ligne adaptés aux outils disponibles.
- 187 tests automatiques réussis, dont les 30 résolutions complètes passant par le filtre de méthode à chaque action ; TypeScript et build de production réussis. Quatre scénarios navigateur spécifiques passent : contrôle de tous les chapitres 2 × 2/3 × 3, absence des poignées et de la molette en substitution, gestes de ligne inchangés, étiquette de ligne non déplaçable, variable isolée sans substitution en combinaison, choix libre avec reprise et annulation. Captures mobiles inspectées ; aucune erreur JavaScript.
- Les 73 contrôles généraux passent également : chacun des 30 parcours emploie les outils autorisés (prises de coefficients en substitution, molette/additions en combinaison), sept formats, gestes tactiles et souris, clavier, calculs après substitution et hors ligne. Les anciens scénarios de préparation devenus interdits dans un chapitre passent explicitement par la reprise de journaux historiques ; ils ne réactivent aucun contrôle interdit dans l’interface. CPU ×6, 30 sélections : médiane 30,7 ms, 95e percentile 32,3 ms, maximum 32,7 ms (émulation sur ordinateur).


## Version 1.6.2 — parenthèses des facteurs négatifs — 21 octobre 2026

- Après une substitution, un facteur négatif symbolique est encadré : 4x−3y avec x=−y affiche 4×(−y)−3y, sans développement ni fusion automatique. Même correction pour l’expression transportée, un facteur fractionnaire et les opposés imbriqués (−(−x), y−(−x)). La description textuelle garde également les parenthèses.
- 189 tests automatiques réussis ; vérification TypeScript et build réussis. Reproduction navigateur depuis le niveau fractionnaire s28 : multiplication de L1 par 12, déplacements usuels, isolement de x=−y dans L2 et substitution. Vérification visuelle des parenthèses, puis développement explicite en −4y−3y et fusion explicite en −7y. Les restrictions de méthode et la reprise sont recontrôlées avec ce scénario.
