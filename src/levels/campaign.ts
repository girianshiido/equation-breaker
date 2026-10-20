import { equation, type Equation } from '../math/ast';
export interface World {
    name: string;
    subtitle: string;
    symbol: string;
    color: string;
    rule: string;
    example: string;
}
export const worlds: World[] = [
    { name: 'Équilibre', subtitle: 'Libère l’inconnue', symbol: '⚖', color: '#62edc0', rule: 'Une égalité est un équilibre. Ajoute la même quantité ou divise par la même constante non nulle des deux côtés.', example: 'x + 3 = 8 ⇔ x + 3 − 3 = 8 − 3 ⇔ x = 5' },
    { name: 'Face-à-face', subtitle: 'Choisis ton chemin', symbol: '⇄', color: '#78b6ff', rule: 'Les termes en x se regroupent en ajoutant leur opposé aux deux membres. Une contradiction donne ∅ ; une identité donne ℝ.', example: '3x + 2 = x + 10 ⇔ 2x + 2 = 10' },
    { name: 'Explosion', subtitle: 'Déploie les parenthèses', symbol: '✳', color: '#ffb86b', rule: 'Distribue le facteur à tous les termes, avec leurs signes. Ensuite, fusionne les termes semblables.', example: '−2(x + 3) = −2x − 6' },
    { name: 'Fraction Lab', subtitle: 'La précision au fragment près', symbol: '½', color: '#bfa0ff', rule: 'Les fractions sont exactes. Diviser par une fraction non nulle revient à multiplier par son inverse. Aucun dénominateur ne contient x.', example: '(3/4)x = 3 ⇔ x = 3 × 4/3 = 4' },
    { name: 'Zero Product', subtitle: 'Résous tous les cas', symbol: '⋈', color: '#ff8eae', rule: 'Un produit est nul si au moins un facteur est nul. Résous chaque cas, puis réunis leurs solutions sans doublon.', example: '(x − 2)(x + 3) = 0 ⇔ x − 2 = 0 ou x + 3 = 0' },
    { name: 'Quadratic Core', subtitle: 'Explore les racines', symbol: '²', color: '#f1db82', rule: 'Prépare les carrés, choisis une identité remarquable ou complète le carré avec sa compensation. Un facteur commun peut aussi faire apparaître un produit nul.', example: 'x² − 5x + 6 = (x − 5/2)² − 1/4 = (x − 2)(x − 3)' }
];
export interface Level {
    id: string;
    world: number;
    index: number;
    title: string;
    source: string;
    initial: Equation;
    goal: string;
    budget: number;
    tutorial: boolean;
    transfer: boolean;
    seed?: number;
}
const sources = [
    ['x+3=8', 'x-4=2', '3x=12', '-2x=10', '2x+3=11', '5x-7=18', '-3x+4=16', 'x/4+2=5', '4x+8=0', '7-2x=15', '-x+9=3', '6x-5=16'],
    ['3x+2=x+10', '7x-5=2x+15', '4-2x=x+10', '2x+3=2x+8', '3x+3=3x+3', '3x-2x+5=11', '-2x+6=3x-9', '5x-7=5x-7', '4x+1=-2x+13', '2x-4x+3=-x+8', '6x+2=6x-1', '-3x+7=-5x+2'],
    ['2(x+3)=14', '3(x-2)+5=2x+7', '-2(x-4)=x-1', '2(x+1)-3(x-2)=5', '-(x+2)=4', '3(x+1)=3x+3', '4(x-2)=4x+1', '2(3x-1)+4=14', '-(2x-5)+x=9', '3(2x+1)-2(x-4)=19', '2(x+3)+x=3x+6', '5-2(x+1)=x-9'],
    ['x/2+3=7', '(2x-1)/3=5', 'x/3-x/2=1', '3x/4+1/2=2', '-2x/3=4', '(x+2)/4=(x-1)/2', 'x/5+2/3=7/3', '(3x-2)/6=1/3', 'x/2+1/3=x/2+2/3', '3x/5-1/2=x/5+1/2', '(x-3)/2+1/4=7/4', '-x/4+2=1/2'],
    ['(x-2)(x+3)=0', 'x(x-4)=0', '(2x-6)(x+1)=0', '(x-2)^2=0', 'x^2-5x+6=0', '(3x+2)(x-5)=0', '(x+4)(x-4)=0', '2x(x+3)=0', 'x^2-9=0', '(x/2-1)(x+1)=0', '(2x+1)^2=0', '2x^2-6x=0'],
    ['x^2-4x+4=0', 'x^2-5x+6=0', 'x^2+1=0', '2x^2-3x-2=0', 'x^2-2=0', 'x^2+2x-1=0', '-x^2+4=0', '4x^2+4x+1=0', 'x^2+6x+10=0', '3x^2-12x=0', '(x+1)^2=3', '2x^2+x=3']
];
const names = [['Premier équilibre', 'L’opposé positif', 'Le coefficient', 'Signe inverse', 'Deux temps', 'Contrepoids', 'En négatif', 'Quart de tour', 'Point zéro', 'L’autre ordre', 'L’inconnue masquée', 'Épreuve d’équilibre'], ['Deux plateaux', 'Même quantité', 'Sens opposés', 'L’impossible', 'À l’infini', 'Fusion froide', 'Le croisement', 'Miroir parfait', 'Choix de stratégie', 'Double fusion', 'La contradiction', 'Duel final'], ['Première étincelle', 'Explosion contrôlée', 'Le signe distribué', 'Double détonation', 'Le moins devant', 'Identité révélée', 'Fausse jumelle', 'Réaction en chaîne', 'Signe fantôme', 'Collision de groupes', 'Égalité universelle', 'Briseur de noyau'], ['Demi-mesure', 'Le groupe fractionné', 'Dénominateurs croisés', 'Trois quarts', 'La fraction négative', 'Deux solutions de méthode', 'Cinquième élément', 'Six fragments', 'L’écart irréductible', 'Le laboratoire double', 'Fragments imbriqués', 'Précision absolue'], ['Deux cas', 'Zéro fait partie du jeu', 'Facteurs asymétriques', 'La racine répétée', 'Du trinôme au produit', 'Cas fractionnaire', 'Opposés parfaits', 'Le facteur constant', 'Différence de carrés', 'Moitié de facteur', 'Carré miniature', 'Produit fatal'], ['Le noyau double', 'Deux racines', 'Au-delà du réel', 'L’autre coefficient', 'Racines exactes', 'Le radical déplacé', 'Le noyau inversé', 'Le carré rationnel', 'Aucune issue réelle', 'Le zéro et l’autre', 'La parenthèse finale', 'Quadratic Core']];
export const campaign: Level[] = sources.flatMap((ss, w) => ss.map((source, index) => ({ id: `w${w + 1}-${index + 1}`, world: w, index, title: names[w][index], source, initial: equation(source), goal: w < 4 ? 'Isole x ou conclus sur les solutions' : 'Trouve toutes les solutions réelles', budget: w < 2 ? 7 : w < 4 ? 10 : 14, tutorial: index < 3, transfer: index >= 9 })));
export const worldLevels = (w: number) => campaign.filter(l => l.world === w);
