#!/usr/bin/env node
/* Regenerate docs/GLOSSARY.md from glossary.js, taking input labels/units from the form in app.js.
 * Usage: node tools/build_glossary.js
 * Fails (exit 1) if a sidebar input has no glossary entry, or a glossary key is not a sidebar input.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const G = require(path.join(root, 'glossary.js'));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const groupsSrc = app.slice(app.indexOf('const GROUPS'), app.indexOf('const BASE_DEFAULTS'));
const FIELDS = {};
const re = /\{ k: '(\w+)', l: '([^']+)'(?:, u: '([^']*)')?/g;
let m;
while ((m = re.exec(groupsSrc))) FIELDS[m[1]] = { l: m[2], u: m[3] || '' };

const keys = new Set(G.filter((e) => e.key).map((e) => e.key));
const missing = Object.keys(FIELDS).filter((k) => !keys.has(k));
const unknown = [...keys].filter((k) => !FIELDS[k]);
if (missing.length || unknown.length) {
  if (missing.length) console.error('Sidebar inputs with no glossary entry:', missing.join(', '));
  if (unknown.length) console.error('Glossary keys that are not sidebar inputs:', unknown.join(', '));
  process.exit(1);
}

const KIND = {
  input: 'Input',
  preset: 'Input (preset)',
  library: 'Data library',
  calc: 'Calculated',
  concept: 'Concept',
};
const row = (e) => {
  const f = e.key ? FIELDS[e.key] : null;
  const term = f ? f.l : e.t;
  const unit = (f ? f.u : e.u) || '';
  const d = e.d.replace(/\|/g, '\\|');
  return `| **${term}** | ${KIND[e.kind]} | ${unit} | ${e.where || ''} | ${d} |`;
};
const head = '| Term | Type | Unit | Where | Meaning |\n|---|---|---|---|---|';
const section = (title, kinds, intro) => {
  const rows = G.filter((e) => kinds.includes(e.kind));
  return `## ${title}\n${intro}\n\n${head}\n${rows.map(row).join('\n')}\n`;
};

const md = `# Glossary

Every term in PhaseFarm, and whether you **enter** it or the model **calculates** it.
This file is generated from \`glossary.js\` by \`node tools/build_glossary.js\`. Edit that file, not this one.
The same glossary is searchable in the app (bottom of the page).

| Type | Meaning | How to change it |
|---|---|---|
| **Input** | A value you set | Sidebar |
| **Input (preset)** | Filled in automatically when you pick a facility type or crop, then editable | Sidebar (after choosing facility and crop) |
| **Data library** | Data stored per location, PCM material, crop or facility | Customize → Data library, or Method → + Add a PCM |
| **Calculated** | A model result | Change the inputs it depends on. Energy can also be replaced with imported COMSOL loads |
| **Concept** | A background term | — |

${section('Inputs', ['input', 'preset'], 'All sidebar inputs, in sidebar order.')}
${section('Data library', ['library'], 'Values stored with each location, PCM material or cost item rather than in the sidebar.')}
${section('Calculated results', ['calc'], 'Outputs. To change one, change its inputs.')}
${section('Concepts and strategy names', ['concept'], 'Background terms.')}`;

fs.writeFileSync(path.join(root, 'docs', 'GLOSSARY.md'), md);
console.log(`docs/GLOSSARY.md written: ${G.length} entries (${Object.keys(FIELDS).length} sidebar inputs, all covered).`);
