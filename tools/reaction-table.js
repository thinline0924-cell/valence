// docs/chemistry.md の反応の一覧を、js/chem.js のデータから作る:node tools/reaction-table.js
import { REACTIONS, NUCLEAR_LIST } from '../js/chem.js';
const COND = { none: 'なし', ignite: '点火', heat: '加熱', light: '光', cat: '触媒' };
const sub = s => s.replace(/\^([+−])/g, (_, c) => c === '+' ? '⁺' : '⁻').replace(/([A-Za-z)])(\d+)/g, (_, a, d) => a + [...d].map(x => '₀₁₂₃₄₅₆₇₈₉'[x]).join(''));
console.log('| 反応 | 式 | ΔH (kJ) | 条件 |\n|---|---|---|---|');
for (const r of REACTIONS) console.log(`| ${r.name} | ${sub(r.eq)} | ${r.dH > 0 ? '+' : r.dH < 0 ? '−' : ''}${Math.abs(r.dH)} | ${COND[r.cond]} |`);
console.log('\n| 核反応 | 式 |\n|---|---|');
for (const r of NUCLEAR_LIST) console.log(`| ${r.name} | ${r.eq.replace(/<sup>(\d+)<\/sup>/g, (_, d) => [...d].map(x => '⁰¹²³⁴⁵⁶⁷⁸⁹'[x]).join(''))} |`);
