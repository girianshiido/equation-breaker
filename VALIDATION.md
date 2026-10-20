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
- Les termes semblables gardent leur notation compacte pendant le dépôt : `2x + 3x`, puis `5x`, sans décomposition des coefficients en multiplications explicites.
- Simplification après dépôt : délai de 380 ms avec animations, 180 ms sans. Mesure navigateur locale : environ 398 ms jusqu’au résultat réduit.
- Sept bruitages originaux précalculés : 7 OGG/Opus et 7 MP3. Décodage réel des 14 fichiers, absence de saturation, déclenchement par un vrai glissement, quatre voix simultanées au maximum, bouton muet et paramètres synchronisés, repli MP3 forcé et lecture après rechargement hors ligne.
- Saisie des constantes devant une parenthèse et des dénominateurs de groupes : `3(x+3)=6` devient `x+3=2` sans développement. `(x+4)/2=6` devient `x+4=12`. Tests des signes négatifs, de l’autre sens, des autres termes du membre, des fractions composées, de la reprise et de l’alternative au clavier. Le développement reste disponible, y compris pour une somme divisée par une constante.
- 21 scénarios navigateur de gestes réussis, dont les appuis prolongés tactiles sur groupes à 320×568.
- 121 tests Vitest réussis, dont les propriétés de ces facteurs sur 300 équations générées supplémentaires. Régression navigateur des 72 niveaux : 187 contrôles réussis, sans erreur JavaScript.
- Ralentissement CPU ×6, 30 sélections : médiane 16,8 ms, 95e percentile 18,6 ms, maximum 21,6 ms, pendant la passe locale complète. Aucun calcul audio par oscillateur pendant les gestes : buffers enregistrés et décodés une fois.

Build final : environ 83 Ko de JavaScript et 51 Ko de CSS (42 Ko compressés ensemble), 69 Ko de polices et 49 Ko de sons dans les deux formats. Le dossier de publication occupe environ 324 Ko sur disque. Tous ces fichiers sont précachés pour le hors-ligne. Rapports : `polish-report.json`, `audio-report.json`, `gesture-report.json`, `browser-report.json` dans `test-results/`.

Essais réalisés sur Chrome/macOS avec formats mobiles, entrées tactiles et CPU ralenti. Aucun téléphone physique ni Safari n’a été utilisé.
