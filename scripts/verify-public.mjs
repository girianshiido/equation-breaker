import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.argv[2] || 'https://girianshiido.github.io/equation-breaker/';
const hash = b => createHash('sha256').update(b).digest('hex');
async function walk(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat(); }
let count = 0;
for (const file of await walk('docs')) {
    if (file.endsWith('.nojekyll'))
        continue;
    const local = await readFile(file);
    const response = await fetch(new URL(file.slice(5), base), { cache: 'no-store' });
    if (!response.ok)
        throw Error(`${response.status}: ${file}`);
    const remote = Buffer.from(await response.arrayBuffer());
    if (hash(local) !== hash(remote))
        throw Error(`Contenu distant différent : ${file}`);
    count++;
}
console.log(`${count} fichiers publics identiques au build local : ${base}`);
