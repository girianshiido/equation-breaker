import { campaign } from '../src/levels/campaign';
import { start, perform, validate, suggestion } from '../src/gameplay/game';
import { format } from '../src/math/format';
import { str } from '../src/math/rational';
import { solve, solutionText } from '../src/math/solve';
export const plans = campaign.map(level => { const g = start(level), events: unknown[] = []; for (let i = 0; i < 60 && !g.won; i++) {
    const tip = suggestion(g);
    if (tip.action) {
        const a = tip.action;
        events.push(a.kind === 'add' ? { kind: a.kind, value: format(a.expression) } : a.kind === 'divide' || a.kind === 'multiply' ? { kind: a.kind, value: str(a.constant) } : a);
        perform(g, a);
    }
    else {
        events.push({ kind: 'validate' });
        validate(g);
    }
} return { id: level.id, world: level.world, index: level.index, source: level.source, answer: solutionText(solve(level.initial)), events }; });
