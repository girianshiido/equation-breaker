import {it,expect} from 'vitest';
import {sRoot,scalar,sAdd,sMul,sDiv,sSub,sEqual,sSign,exactPoly,pEqual,rationalPoly,rootExpr} from '../src/math/exact';
import {rat} from '../src/math/rational';
import {c,product,x} from '../src/math/ast';
import {solve,solutionText} from '../src/math/solve';
it('calcule des racines et leurs inverses exactement, sans flottants',()=>{
 const a=sRoot(rat(2)),b=sRoot(rat(3)),mixed=sAdd(scalar(3),sAdd(a,b));
 expect(sEqual(sMul(a,a),scalar(2))).toBe(true);
 expect(sEqual(sMul(mixed,sDiv(scalar(1),mixed)),scalar(1))).toBe(true);
 expect(sEqual(sRoot(rat(8)),sMul(scalar(2),a))).toBe(true);
 expect(sEqual(sRoot(rat(9,2)),sMul(scalar(rat(3,2)),a))).toBe(true);
 expect(sSign(sSub(a,scalar(rat(1414,1000))))).toBe(1);
 expect(()=>sDiv(a,scalar(0))).toThrow();
});
it('vérifie un carré de coefficient irrationnel et résout sa porte linéaire',()=>{
 const base=product(rootExpr(rat(2)),x());
 expect(rationalPoly(exactPoly({kind:'square',base}))).toEqual([rat(0),rat(0),rat(2)]);
 expect(solutionText(solve({left:base,right:c(3)}))).toBe('S = { 3/2√2 }');
 expect(pEqual(exactPoly({kind:'quotient',numerator:base,denominator:rootExpr(rat(2))}),exactPoly(x()))).toBe(true);
});
