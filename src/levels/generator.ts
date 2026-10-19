import { equation } from '../math/ast';
import { rat, str } from '../math/rational';
import type { Level } from './campaign';
import { solve, solutionKey, type Solution } from '../math/solve';
export function rng(seed: number) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function generated(world: number, seed: number): Level & {
    expected: Solution;
} {
    const r = rng(seed), pick = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
    const nz = () => { const v = pick(-6, 6); return v || 2; };
    let source = '', expected: Solution;
    const root = pick(-8, 8), a = nz(), b = nz(), k = nz(), flavor = pick(0, 5);
    const unique = (n: number, d = 1): Solution => ({ kind: 'finite', roots: [{ kind: 'rational', value: rat(n, d) }] });
    if (world === 0) {
        source = flavor % 3 === 0 ? `x+(${b})=${root + b}` : flavor % 3 === 1 ? `${a}x=${a * root}` : `${a}x+(${b})=${a * root + b}`;
        expected = unique(root);
    }
    else if (world === 1) {
        const c = a + k;
        if (flavor === 0) {
            source = `${a}x+(${b})=${a}x+(${b + 1})`;
            expected = { kind: 'none' };
        }
        else if (flavor === 1) {
            source = `${a}x+(${b})=${a}x+(${b})`;
            expected = { kind: 'all' };
        }
        else {
            source = flavor === 2 ? `${a}x+(${k}x)+(${b})=${a + k}x+(${b + 2})` : `${a}x+(${b})=${c}x+(${b - k * root})`;
            expected = flavor === 2 ? { kind: 'none' } : unique(root);
        }
    }
    else if (world === 2) {
        source = flavor === 0 ? `${a}(x+(${b}))=${a}x+(${a * b})` : flavor === 1 ? `${a}(x+(${b}))=${a}x+(${a * b + 1})` : flavor % 2 === 0 ? `${a}(x+(${b}))+${k}(x-1)=${(a + k) * root + a * b - k}` : `${a}(x+(${b}))=${a * (root + b)}`;
        expected = flavor === 0 ? { kind: 'all' } : flavor === 1 ? { kind: 'none' } : flavor % 2 === 0 && a + k === 0 ? { kind: 'all' } : unique(root);
    }
    else if (world === 3) {
        const d = pick(2, 6);
        source = flavor % 2 ? `(${a}x+(${b}))/${d}=${str(rat(a * root + b, d))}` : `x/${d}+x/${d + 1}=${str(rat(root * (2 * d + 1), d * (d + 1)))}`;
        expected = unique(root);
    }
    else {
        const root2 = flavor === 0 ? root : root + pick(1, 7);
        source = world === 4 ? `(${a}x-(${a * root}))(x-(${root2}))=0` : flavor === 1 ? `x^2+${pick(1, 6)}=0` : `${a}x^2+(${-a * (root + root2)}x)+(${a * root * root2})=0`;
        expected = world === 5 && flavor === 1 ? { kind: 'none' } : { kind: 'finite', roots: [root, root2].filter((v, i, aa) => aa.indexOf(v) === i).sort((u, v) => u - v).map(n => ({ kind: 'rational', value: rat(n) })) };
    }
    const initial = equation(source);
    if (solutionKey(solve(initial)) !== solutionKey(expected))
        throw Error(`Génération incohérente : ${source}`);
    return { id: `g${world}-${seed}`, world, index: 0, title: 'Nouvelle expérience', source, initial, goal: world < 4 ? 'Isole x ou conclus sur les solutions' : 'Trouve toutes les solutions réelles', budget: 16, tutorial: false, transfer: true, seed, expected };
}
