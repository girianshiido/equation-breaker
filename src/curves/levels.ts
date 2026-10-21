/** a x² + b xy + c y² + d x + e y = f. All manipulations are algebraic and exact; no plot is displayed. */
export interface CurveLevel {id:string;title:string;curves:[number[],number[]];names:[string,string];tip:string;expected:[string,string][];budget:number;range:number}
const definitions:[string,[number[],number[]],[string,string],string,[string,string][]][]=[
 ['Un cercle et une droite',[[1,0,1,0,0,5],[0,0,0,-1,1,-1]],['Cercle','Droite'],'Isole y dans la droite, puis remplace y dans le cercle.',[['-1','-2'],['2','1']]],
 ['La parabole rencontre la droite',[[1,0,0,0,-1,0],[0,0,0,1,1,2]],['Parabole','Droite'],'Isole y dans une ligne, puis substitue son expression dans l’autre.',[['-2','4'],['1','1']]],
 ['Deux cercles, deux rencontres',[[1,0,1,0,0,5],[1,0,1,-4,0,1]],['Cercle C₁','Cercle C₂'],'Multiplie une ligne par −1, puis additionne-la à l’autre pour éliminer x² et y².',[['1','-2'],['1','2']]],
 ['Juste un contact',[[1,0,1,0,0,4],[0,0,0,0,1,2]],['Cercle','Tangente'],'Une coordonnée est déjà isolée. Un seul point peut suffire.',[['0','2']]],
 ['La droite reste à distance',[[1,0,1,0,0,1],[0,0,0,0,1,2]],['Cercle','Droite'],'Substitue la valeur de y, puis étudie l’équation obtenue.',[]],
 ['Une hyperbole, deux branches',[[0,1,0,0,0,2],[0,0,0,-1,1,-1]],['Hyperbole','Droite'],'Isole y dans la droite. Le produit xy deviendra un produit à développer.',[['-1','-2'],['2','1']]],
 ['Une ellipse et des racines',[[1,0,4,0,0,4],[0,0,0,-1,1,0]],['Ellipse','Droite'],'Substitue y=x. Les coordonnées sont des racines exactes, pas des décimales.',[['-sqrt(4/5)','-sqrt(4/5)'],['sqrt(4/5)','sqrt(4/5)']]],
 ['Les cercles et l’irrationnel',[[1,0,1,0,0,9],[1,0,1,-4,0,5]],['Cercle C₁','Cercle C₂'],'La différence des deux équations élimine les carrés.',[['1','-sqrt(8)'],['1','sqrt(8)']]],
 ['Deux paraboles face à face',[[1,0,0,0,-1,0],[1,0,0,0,1,2]],['Parabole P₁','Parabole P₂'],'Additionne les lignes : les termes en y s’annulent.',[['-1','1'],['1','1']]],
 ['Quatre points d’intersection',[[1,0,1,0,0,5],[1,0,4,0,0,8]],['Cercle','Ellipse'],'Élimine x² par une combinaison. Chaque valeur de y peut donner deux valeurs de x.',[['-2','-1'],['2','-1'],['-2','1'],['2','1']]],
 ['La tangente à la parabole',[[1,0,0,0,-1,0],[0,0,0,-2,1,-1]],['Parabole','Tangente'],'Substitue l’expression de y, puis complète le carré.',[['1','1']]],
 ['Le cercle décentré',[[1,0,1,-2,-2,3],[0,0,0,-1,2,1]],['Cercle','Droite'],'Isole une coordonnée dans la droite, puis avance avec des fractions exactes.',[['-1','0'],['3','2']]]
];
export const curveLevels:CurveLevel[]=definitions.map(([title,curves,names,tip,expected],i)=>({id:`c${i+1}`,title,curves,names,tip,expected,budget:90,range:5}));
