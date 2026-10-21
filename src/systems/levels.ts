import { makeRows, type Row } from './engine';
import { readRational, sub } from '../math/rational';
export interface SystemLevel { id:string; title:string; method:'substitution'|'combination'|'choice'; chapter:string; world:2|3; revision:number; rows:Row[]; budget:number; tip:string }
const definitions: [string,SystemLevel['method'],number[][],number,string][] = [
 ['Une valeur à transmettre','substitution',[[1,0,2],[1,1,5]],3,'Sélectionne x dans la première ligne, puis touche « Substituer x ».'],
 ['Le relais de y','substitution',[[0,1,3],[2,1,11]],5,'Une variable isolée peut remplacer toutes ses occurrences dans les autres équations.'],
 ['Une expression à transmettre','substitution',[[1,-1,1],[1,1,7]],10,'Isole x ou y, puis remplace cette inconnue dans l’autre équation.'],
 ['Deux y et un x','substitution',[[1,-2,-4],[2,1,2]],11,'Une expression entière peut remplacer une inconnue.'],
 ['Le signe change','substitution',[[2,-1,-7],[1,1,-2]],13,'Isoler y peut être pratique, même avec un coefficient négatif.'],
 ['Le retour de la valeur','substitution',[[3,1,2],[2,-1,3]],13,'Une fois une valeur trouvée, substitue-la pour libérer la seconde inconnue.'],
 ['Les opposés se rencontrent','combination',[[1,1,3],[2,-1,-9]],7,'Glisse le point de la première ligne sur la seconde.'],
 ['Préparer une soustraction','combination',[[2,1,1],[1,1,-3]],9,'La molette propose −1 : multiplie une ligne, puis additionne les lignes.'],
 ['Trois contre trois','combination',[[2,3,-6],[4,-3,6]],9,'Additionne les deux lignes pour faire disparaître y.'],
 ['Les bons multiplicateurs','combination',[[1,2,4],[3,4,2]],10,'Choisis un facteur pour obtenir deux coefficients opposés.'],
 ['Deux préparations','combination',[[2,-3,-5],[3,2,-14]],12,'Tu peux multiplier chacune des lignes avant de les additionner.'],
 ['La combinaison précise','combination',[[3,2,-1],[5,-3,11]],14,'Utilise des multiplicateurs entiers, négatifs si besoin, ou divise les deux membres.'],
 ['Les fractions arrivent','choice',[[2,1,1],[1,-1,1]],13,'Choisis la substitution ou la combinaison. Les résultats restent exacts.'],
 ['À toi de choisir','choice',[[3,-2,12],[1,1,-1]],13,'La méthode est libre. Cherche le coefficient le plus commode.'],
 ['La contradiction','choice',[[2,4,6],[1,2,4]],6,'Fais apparaître une égalité impossible, par exemple 0 = 2.'],
 ['La même information','choice',[[3,-6,9],[1,-2,3]],6,'Une ligne peut devenir 0 = 0. Le système possède alors une infinité de solutions.'],
 ['Des opposés trompeurs','choice',[[1,1,2],[-2,-2,-5]],6,'Des membres gauches proportionnels ne garantissent pas la compatibilité.'],
 ['Le double équilibre','choice',[[3,2,1],[5,-1,4]],12,'Deux inconnues, deux fractions exactes, une méthode à choisir.'],
 ['Le troisième relais','substitution',[[1,0,0,2],[1,1,0,5],[0,1,1,7]],7,'La substitution remplace une inconnue dans toutes les autres équations où elle apparaît.'],
 ['Une expression, deux remplacements','substitution',[[1,-1,0,1],[1,1,1,6],[2,-1,1,5]],26,'Isole x : la même expression remplacera x dans les deux autres lignes.'],
 ['Trois lignes en mouvement','combination',[[1,1,1,6],[2,-1,1,3],[1,2,-1,2]],31,'Combine ou substitue. Chaque inconnue doit finir isolée.'],
 ['Les signes se croisent','combination',[[1,1,0,2],[0,1,1,1],[1,0,1,-5]],38,'Prépare des opposés, puis combine les lignes deux à deux.'],
 ['Une inconnue s’annule','combination',[[1,1,1,1],[2,-1,1,-4],[1,2,-1,3]],40,'Une inconnue peut valoir zéro. Les trois valeurs doivent être isolées.'],
 ['Trois fractions exactes','choice',[[2,2,0,0],[0,2,3,2],[2,0,3,4]],40,'Les divisions gardent des fractions exactes. Choisis les lignes les plus simples.'],
 ['Une contradiction à trois','choice',[[1,1,1,2],[2,2,2,5],[1,-1,1,0]],12,'Une seule égalité impossible suffit pour conclure.'],
 ['Un paramètre reste libre','choice',[[1,1,1,3],[1,-1,1,1],[2,0,2,4]],24,'Une équation peut dépendre des deux autres.'],
 ['Le dernier équilibre','choice',[[1,1,1,-2],[2,-1,1,-10],[1,2,-1,5]],42,'Combine les gestes appris pour libérer les trois inconnues.']
];
// Keep the initial equations of older in-progress games replayable after a content update.
const previousRows:Record<string,number[][]> = {"s4": [[1, -2, 1], [2, 1, 7]], "s5": [[2, -1, 1], [1, 1, 5]], "s7": [[1, 1, 5], [2, -1, 1]], "s8": [[2, 1, 7], [1, 1, 5]], "s9": [[2, 3, 12], [4, -3, 6]], "s10": [[1, 2, 8], [3, 4, 18]], "s11": [[2, -3, -1], [3, 2, 18]], "s12": [[3, 2, 1], [5, -3, 8]], "s14": [[3, -2, 4], [1, 1, 3]]};
export const systemWorlds = [
 {id:2 as const,title:'Deux inconnues',subtitle:'Substituer, combiner, puis apprivoiser les fractions.'},
 {id:3 as const,title:'Trois inconnues',subtitle:'Les mêmes gestes, une ligne de plus.'}
];
export const systemLevels:SystemLevel[] = definitions.map(([title,method,values,budget,tip],index)=>({id:`s${index+1}`,title,method,rows:makeRows(values),budget,tip,world:index<18?2:3,revision:previousRows[`s${index+1}`]?2:1,chapter:index<6?'Substitution':index<12?'Combinaison':index<18?'Choix de méthode':index<20?'Substitution':index<23?'Combinaison':'Choix de méthode'}));
// These equations deliberately retain constants and rational terms on both sides.
const q=readRational;
function sides(left:string[],leftConstant:string,right:string[],rightConstant:string):Row {
 const a=left.map(q),b=right.map(q),c=q(leftConstant),d=q(rightConstant);
 return {coefficients:a.map((v,j)=>sub(v,b[j])),right:sub(d,c),layout:{rightVariables:b,leftConstant:c}};
}
systemLevels.push(
 {id:'s28',title:'De part et d’autre',method:'choice',world:2,revision:1,chapter:'Fractions et deux membres',budget:24,tip:'Les constantes et les inconnues peuvent se trouver des deux côtés. Déplace les termes pour préparer une substitution.',rows:[sides(['1/3','0'],'2',['0','1/4'],'-1/3'),...makeRows([[1,1,0]])]},
 {id:'s29',title:'Des dénominateurs à dompter',method:'choice',world:2,revision:1,chapter:'Fractions et deux membres',budget:30,tip:'La molette peut éliminer un dénominateur en multipliant toute une ligne.',rows:[sides(['1/2','0'],'-1',['0','1/3'],'-1'),sides(['0','1/2'],'1/4',['1','0'],'3/4')]},
 {id:'s30',title:'Le passage aux trois inconnues',method:'choice',world:2,revision:1,chapter:'Fractions et deux membres',budget:32,tip:'Choisis ta méthode : les deux membres contiennent des fractions et des constantes.',rows:[sides(['1/3','0'],'1/2',['0','1/2'],'1/3'),sides(['0','1/4'],'-1/6',['1/2','0'],'-1/6')]}
);
const extraThree:[string,SystemLevel['method'],number[][],string][]=[
 ['Le relais négatif','substitution',[[0,1,0,-2],[1,1,0,1],[1,0,1,-1]],'Une valeur négative se remplace avec son signe.'],
 ['Une expression à deux reprises','substitution',[[1,-2,0,1],[0,1,1,-3],[2,-1,1,-3]],'La même expression remplace x dans les deux autres lignes.'],
 ['Trois coordonnées fractionnaires','substitution',[[1,1,0,0],[0,1,1,1],[2,-1,1,3]],'Conserve les fractions exactes pendant les remplacements.'],
 ['La coordonnée nulle','substitution',[[1,-1,0,-2],[0,1,-1,3],[2,1,1,1]],'Zéro est une valeur comme une autre.'],
 ['Les signes en miroir','combination',[[1,1,1,2],[1,-1,1,0],[1,1,-1,-4]],'Prépare les opposés pour éliminer une inconnue.'],
 ['Les coefficients se répondent','combination',[[2,3,-1,1],[4,-3,1,11],[1,1,1,1]],'Une addition peut faire disparaître deux inconnues.'],
 ['Trois préparations','combination',[[1,2,1,-2],[2,-1,-1,-3],[3,1,-2,-11]],'Combine les lignes sans changer leurs solutions.'],
 ['Les quarts au rendez-vous','combination',[[2,-2,0,2],[0,2,4,0],[2,0,-4,0]],'Les mêmes gestes conduisent à des fractions réduites.'],
 ['Le choix des opposés','choice',[[2,1,-1,-8],[1,-2,1,-1],[3,1,2,-5]],'Choisis les coefficients les plus commodes.'],
 ['Une contradiction cachée','choice',[[1,-2,1,1],[2,-4,2,3],[1,1,1,0]],'Cherche une égalité impossible.'],
 ['Trois lignes, deux informations','choice',[[1,1,1,2],[2,-1,1,3],[3,0,2,5]],'Une ligne peut dépendre des deux autres.'],
 ['Le dernier triplet exact','choice',[[2,1,1,0],[2,-4,2,-1],[2,2,-4,-3]],'Les trois coordonnées sont des fractions exactes.']
];
extraThree.forEach(([title,method,values,tip],i)=>systemLevels.push({id:`s${31+i}`,title,method,world:3,revision:1,chapter:method==='substitution'?'Substitution':method==='combination'?'Combinaison':'Choix de méthode',rows:makeRows(values),budget:80,tip}));
const chapters=['Substitution','Combinaison','Choix de méthode','Fractions et deux membres'];
systemLevels.sort((a,b)=>a.world-b.world||chapters.indexOf(a.chapter)-chapters.indexOf(b.chapter)); // Stable IDs preserve stars; the 2×2 world is completed first.
export function systemInitialRows(level:SystemLevel,revision=level.revision):Row[]{return revision===1&&previousRows[level.id]?makeRows(previousRows[level.id]):level.rows;}
