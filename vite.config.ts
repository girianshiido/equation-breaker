import { defineConfig, type Plugin } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
// Cached HTML may still refer to a previous hashed entry after a deployment.
// Keep these small files available online; only the current release is precached.
function previousEntries(): Plugin {
    let entries: { name: string; bytes: Buffer }[] = [];
    return {
        name: 'preserve-previous-entries', apply: 'build',
        async buildStart() {
            let names: string[];
            try { names = await readdir('docs/assets'); }
            catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
            entries = await Promise.all(names.filter(n => /^index-[\w-]+\.(js|css)$/.test(n)).map(async name => ({ name, bytes: await readFile(`docs/assets/${name}`) })));
        },
        async closeBundle() {
            for (const entry of entries) {
                try { await writeFile(`docs/assets/${entry.name}`, entry.bytes, { flag: 'wx' }); }
                catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
            }
        }
    };
}
export default defineConfig({ plugins: [previousEntries()], base: process.env.BASE_PATH || './', build: { outDir: 'docs', target: 'es2022', assetsInlineLimit: 0 }, server: { port: 5194, strictPort: true } });
