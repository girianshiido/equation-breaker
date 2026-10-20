import { makeRows, type Row } from './engine';
export interface SystemLevel { id:string; title:string; method:'substitution'|'combination'|'choice'; chapter:string; rows:Row[]; budget:number; tip:string }
const definitions: [string,SystemLevel['method'],number[][],number,string][] = [
 ['Une valeur à transmettre','substitution',[[1,0,2],[1,1,5]],3,'Sélectionne x dans la première ligne, puis touche « Substituer x ».'],
 ['Le relais de y','substitution',[[0,1,3],[2,1,11]],5,'Une variable isolée peut remplacer toutes ses occurrences dans les autres équations.'],
 ['Une expression à transmettre','substitution',[[1,-1,1],[1,1,7]],10,'Isole x ou y, puis remplace cette inconnue dans l’autre équation.'],
 ['Deux y et un x','substitution',[[1,-2,1],[2,1,7]],11,'Une expression entière peut remplacer une inconnue.'],
 ['Le signe change','substitution',[[2,-1,1],[1,1,5]],13,'Isoler y peut être pratique, même avec un coefficient négatif.'],
 ['Le retour de la valeur','substitution',[[3,1,2],[2,-1,3]],13,'Une fois une valeur trouvée, substitue-la pour libérer la seconde inconnue.'],
 ['Les opposés se rencontrent','combination',[[1,1,5],[2,-1,1]],7,'Glisse le point de la première ligne sur la seconde.'],
 ['Préparer une soustraction','combination',[[2,1,7],[1,1,5]],9,'La molette propose −1 : multiplie une ligne, puis additionne les lignes.'],
 ['Trois contre trois','combination',[[2,3,12],[4,-3,6]],9,'Additionne les deux lignes pour faire disparaître y.'],
 ['Les bons multiplicateurs','combination',[[1,2,8],[3,4,18]],10,'Choisis un facteur pour obtenir deux coefficients opposés.'],
 ['Deux préparations','combination',[[2,-3,-1],[3,2,18]],12,'Tu peux multiplier chacune des lignes avant de les additionner.'],
 ['La combinaison précise','combination',[[3,2,1],[5,-3,8]],14,'Utilise des multiplicateurs entiers, négatifs si besoin, ou divise les deux membres.'],
 ['Les fractions arrivent','choice',[[2,1,1],[1,-1,1]],13,'Choisis la substitution ou la combinaison. Les résultats restent exacts.'],
 ['À toi de choisir','choice',[[3,-2,4],[1,1,3]],13,'La méthode est libre. Cherche le coefficient le plus commode.'],
 ['La contradiction','choice',[[2,4,6],[1,2,4]],6,'Fais apparaître une égalité impossible, par exemple 0 = 2.'],
 ['La même information','choice',[[3,-6,9],[1,-2,3]],6,'Une ligne peut devenir 0 = 0. Le système possède alors une infinité de solutions.'],
 ['Des opposés trompeurs','choice',[[1,1,2],[-2,-2,-5]],6,'Des membres gauches proportionnels ne garantissent pas la compatibilité.'],
 ['Le double équilibre','choice',[[3,2,1],[5,-1,4]],12,'Deux inconnues, deux fractions exactes, une méthode à choisir.'],
 ['Le troisième relais','substitution',[[1,0,0,2],[1,1,0,5],[0,1,1,7]],7,'La substitution remplace une inconnue dans toutes les autres équations où elle apparaît.'],
 ['Une expression, deux remplacements','substitution',[[1,-1,0,1],[1,1,1,6],[2,-1,1,5]],26,'Isole x : la même expression remplacera x dans les deux autres lignes.'],
 ['Trois lignes en mouvement','choice',[[1,1,1,6],[2,-1,1,3],[1,2,-1,2]],31,'Combine ou substitue. Chaque inconnue doit finir isolée.']
];
export const systemLevels: SystemLevel[] = definitions.map(([title,method,values,budget,tip],index)=>({id:`s${index+1}`,title,method,rows:makeRows(values),budget,tip,chapter:index<6?'Substitution':index<12?'Combinaison':index<18?'Choix de méthode':'Bonus · 3 inconnues'}));
