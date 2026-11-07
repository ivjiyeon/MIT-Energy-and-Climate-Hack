#!/usr/bin/env node
/* Reproduce the "where can PCM win?" lever study behind docs/WHERE_PCM_WINS.md.
 * Usage:  node tools/explore_levers.js            → markdown tables to stdout
 *         node tools/explore_levers.js > out.md
 * Every case optimizes PCM melt point × quantity × (with / without insulation upgrade),
 * exactly like the app's "Paths to a PCM win" section.
 */
const path = require('path');
const PF = require(path.join(__dirname, '..', 'model.js'));

// Same defaults as the web app (BASE_DEFAULTS in app.js).
const DEFAULTS = {
  tempOffset: 0, pcmType: 'paraffin', pcmKg: 12, pcmMelt: 20, pcmRange: 2, pcmThick: 15, hConv: 6, pcmPrice: 5, pcmInstall: 12,
  smart: true, preHours: 4, prePower: 25, heating: 'hp', boilerEff: 0.85, priceOff: 0.14, pricePeak: 0.32, peakStart: 16, peakEnd: 21,
  demandCharge: 18, gasPrice: 1.4, gridCO2: 0.38, carbonPrice: 0, horizon: 20, discount: 6, escalation: 2.5, insCost: 10,
  creditHVAC: true, hvacCost: 900, sizing: 1.2, includeOutage: false, outagesPerYear: 1, outageHours: 8, massMult: 1, extras: [],
  pcmFan: false, fanH: 15, fanW: 0.5, fanCapex: 4,
  copH: 3.0, copHSlope: 0.07, copC: 4.2, copCSlope: 0.08, econCOP: 15, maintPct: 0.5, gasCO2: 0.181, lightSens: 0.75, filmR: 0.17, ventACH: 20,
};
function scenario(climate, facility = 'greenhouse', crop = 'lettuce') {
  const f = { ...PF.FACILITIES[facility] }; delete f.name;
  const c = PF.CROPS[crop];
  return { ...DEFAULTS, ...f, climate, facility, crop, lo: c.lo, hi: c.hi, critLo: c.critLo, critHi: c.critHi, yieldKg: c.yieldKg, cropPrice: c.price, cycle: c.cycle };
}
function bestDesign(q) {
  const melts = [...new Set([q.lo, q.lo + 1.5, (q.lo + q.hi) / 2, q.hi - 1.5, q.hi].map((x) => Math.round(x * 2) / 2))];
  const ecoOf = (p, s) => PF.economics(p, s, PF.simulateYear(p, s));
  const non = [PF.STRATEGIES[0], PF.STRATEGIES[1]].map((s) => ecoOf(q, s)).sort((a, b) => a.lcc - b.lcc)[0];
  let b = null;
  for (const m of melts) for (const kg of [4, 10, 20, 35]) for (const s of [PF.STRATEGIES[2], PF.STRATEGIES[3]]) {
    const r = { ...q, pcmMelt: m, pcmKg: kg };
    const sim = PF.simulateYear(r, s), e = PF.economics(r, s, sim);
    if (!b || e.lcc < b.e.lcc) b = { e, sim, m, kg, s };
  }
  const use = b.sim.months.reduce((a, mo) => a + Math.max(...mo.hr.liq) - Math.min(...mo.hr.liq), 0) / 12;
  return { sav: non.lcc - b.e.lcc, pct: 100 * (non.lcc - b.e.lcc) / non.lcc, m: b.m, kg: b.kg, s: b.s.id, use, rt: b.sim.rideThrough };
}
function utilisation(q) {
  const sim = PF.simulateYear(q, PF.STRATEGIES[2]);
  return sim.months.map((mo) => Math.max(...mo.hr.liq) - Math.min(...mo.hr.liq));
}

const FAN = { pcmFan: true, pcmThick: 6 };
const LEVERS = [
  ['Current defaults (passive 15 mm panels)', {}],
  ['Salt hydrate ($2.5/kg)', { pcmType: 'salt', pcmPrice: 2.5 }],
  ['PCM at scale ($1.5/kg, $6/m² install)', { pcmPrice: 1.5, pcmInstall: 6 }],
  ['Closed greenhouse (no venting)', { econ: false }],
  ['Steep TOU (peak $0.55) + $30/kW demand', { pricePeak: 0.55, demandCharge: 30 }],
  ['Off-grid / diesel $0.45/kWh', { priceOff: 0.45, pricePeak: 0.45, demandCharge: 0 }],
  ['Outage protection valued (1/yr, 8 h)', { includeOutage: true, outagesPerYear: 1, outageHours: 8 }],
  ['Carbon price $150/t', { carbonPrice: 150 }],
  ['**Fan-assisted thin panels** (6 mm, h=15, 0.5 W/m²)', FAN],
  ['Fans + closed greenhouse', { ...FAN, econ: false }],
  ['Fans + salt hydrate + steep TOU', { ...FAN, pcmType: 'salt', pcmPrice: 2.5, pricePeak: 0.55, demandCharge: 30 }],
  ['Fans + off-grid', { ...FAN, priceOff: 0.45, pricePeak: 0.45, demandCharge: 0 }],
  ['Fans + outage protection', { ...FAN, includeOutage: true, outagesPerYear: 1, outageHours: 8 }],
  ['Fans, pessimistic fan power (1.5 W/m²)', { ...FAN, fanW: 1.5 }],
];
const SITES = ['nairobi', 'denver', 'phoenix', 'boston', 'minneapolis', 'seattle', 'miami', 'dubai'];
const k = (x) => `${x >= 0 ? '+' : '−'}$${Math.abs(x / 1000).toFixed(0)}k`;

const out = [];
out.push(`_Generated ${new Date().toISOString().slice(0, 10)} by \`tools/explore_levers.js\`. Hydroponic greenhouse, lettuce, 1000 m². Value = 20-yr life-cycle savings of the best PCM option vs the best non-PCM option (positive = PCM wins). Each cell uses its own optimal PCM design._\n`);
out.push('### Savings by lever and site\n');
out.push('| Lever | ' + SITES.map((s) => PF.CLIMATES[s].name.split(',')[0]).join(' | ') + ' |');
out.push('|---|' + SITES.map(() => '---:').join('|') + '|');
const detail = {};
for (const [name, v] of LEVERS) {
  const cells = SITES.map((s) => { const r = bestDesign({ ...scenario(s), ...v }); (detail[s] = detail[s] || []).push([name, r]); return r.sav >= 0 ? `**${k(r.sav)}**` : k(r.sav); });
  out.push(`| ${name} | ${cells.join(' | ')} |`);
}

out.push('\n### PCM utilisation: share of capacity melted and refrozen each day (Baseline + PCM, 12 kg/m², 20 °C)\n');
out.push('| Panels | ' + SITES.map((s) => PF.CLIMATES[s].name.split(',')[0]).join(' | ') + ' |');
out.push('|---|' + SITES.map(() => '---:').join('|') + '|');
for (const [n, v] of [['Passive 15 mm, h=6', {}], ['Fan-assisted 6 mm, h=15', FAN]]) {
  out.push(`| ${n} | ` + SITES.map((s) => { const u = utilisation({ ...scenario(s), ...v }); return `${Math.round(100 * u.reduce((a, b) => a + b, 0) / 12)}% (max ${Math.round(100 * Math.max(...u))}%)`; }).join(' | ') + ' |');
}

out.push('\n### Best design for each winning case\n');
out.push('| Site | Lever | Savings | % of LCC | PCM design | Strategy | Daily use | Ride-through |');
out.push('|---|---|---:|---:|---|---|---:|---:|');
for (const s of SITES) for (const [name, r] of detail[s]) if (r.sav >= 0) {
  out.push(`| ${PF.CLIMATES[s].name.split(',')[0]} | ${name.replace(/\*\*/g, '')} | ${k(r.sav)} | ${r.pct.toFixed(1)}% | ${r.kg} kg/m² @ ${r.m} °C | ${r.s === 'pcm' ? 'Baseline + PCM' : 'Upgraded + PCM'} | ${Math.round(r.use * 100)}% | ${r.rt.toFixed(1)} h |`);
}

out.push('\n### Other facility types (best lever combination: fans + off-grid)\n');
out.push('| Facility | Phoenix | Boston | Nairobi |');
out.push('|---|---:|---:|---:|');
for (const [fac, crop] of [['vertical', 'basil'], ['container', 'lettuce']]) {
  out.push(`| ${PF.FACILITIES[fac].name} | ` + ['phoenix', 'boston', 'nairobi'].map((s) => k(bestDesign({ ...scenario(s, fac, crop), ...FAN, priceOff: 0.45, pricePeak: 0.45, demandCharge: 0 }).sav)).join(' | ') + ' |');
}
console.log(out.join('\n'));
