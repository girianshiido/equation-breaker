import type { Save } from '../app/persistence';
import { campaign } from '../levels/campaign';
export const badges = (s: Save) => [
    ['⚖', 'Premier équilibre', Number(!!s.results['w1-1']), 1, 'Terminer le premier niveau'],
    ['◇', 'Sans trembler', s.stats.clean, 10, 'Réussites sans transformation interdite'],
    ['✳', 'Briseur de parenthèses', s.stats.expanded, 50, 'Développements dans des niveaux terminés'],
    ['⊕', 'Alchimiste algébrique', s.stats.combined, 100, 'Fusions dans des niveaux terminés'],
    ['ϟ', 'Éclair algébrique', s.stats.fast, 1, 'Réussite autonome en arcade en moins de 15 s'],
    ['⇄', 'Deux chemins, une solution', Object.values(s.results).filter(r => r.methods.length >= 2).length, 1, 'Réussir un même niveau avec deux méthodes'],
    ['∅', 'Zéro n’est pas rien', s.stats.none, 5, 'Équations sans solution reconnues'],
    ['∞', 'À l’infini', s.stats.all, 5, 'Identités reconnues'],
    ['⋈', 'Produit fatal', s.stats.products, 25, 'Équations produits nuls résolues'],
    ['½', 'Maître des fractions', s.stats.fractions, 30, 'Équations du monde 4 sans indice'],
    ['²', 'Bâtisseur de carrés', s.stats.quadratics, 30, 'Équations du second degré résolues'],
    ['✦', 'Équilibriste suprême', campaign.filter(l => s.results[l.id]?.stars === 3).length, campaign.length, 'Trois étoiles sur toute la campagne']
].map(([symbol, name, value, target, description]) => ({ symbol: String(symbol), name: String(name), value: Number(value), target: Number(target), description: String(description) }));
