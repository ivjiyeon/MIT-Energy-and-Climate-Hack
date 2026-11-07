/* PhaseFarm UI */
(function () {
  'use strict';
  const { MONTHS, CLIMATES, FACILITIES, PCMS, CROPS, STRATEGIES } = PF;
  const $ = (s) => document.querySelector(s);
  const opts = (o) => Object.entries(o).map(([v, x]) => [v, x.name]);

  // ---------- Input schema ----------
  const GROUPS = [
    { id: 'scn', title: 'Scenario', open: true, fields: [
      { k: 'climate', l: 'Location', t: 'select', o: () => opts(CLIMATES) },
      { k: 'facility', l: 'Facility type', t: 'select', o: () => opts(FACILITIES), h: 'Loads typical building values below.' },
      { k: 'crop', l: 'Crop', t: 'select', o: () => opts(CROPS), h: 'Sets the temperature band, critical limits and value.' },
      { k: 'floorArea', l: 'Floor area', u: 'm²', t: 'number', min: 10, max: 100000, step: 10 },
      { k: 'tempOffset', l: 'Climate warming', u: '°C', t: 'range', min: -2, max: 4, step: 0.5, h: 'Shift all outdoor temperatures to test future climates.' },
    ] },
    { id: 'pcm', title: 'Phase change material', open: true, fields: [
      { k: 'pcmType', l: 'PCM type', t: 'select', o: () => opts(PCMS) },
      { k: 'pcmKg', l: 'PCM quantity', u: 'kg/m² floor', t: 'range', min: 0, max: 50, step: 1 },
      { k: 'pcmMelt', l: 'Melting point', u: '°C', t: 'range', min: 10, max: 32, step: 0.5, h: 'Best inside the crop band.' },
      { k: 'pcmRange', l: 'Melting range', u: '°C', t: 'range', min: 0.5, max: 6, step: 0.5 },
      { k: 'pcmThick', l: 'Panel thickness', u: 'mm', t: 'range', min: 5, max: 50, step: 1, h: 'Thinner panels = more surface, faster charging.' },
      { k: 'pcmPrice', l: 'PCM price (encapsulated)', u: '$/kg', t: 'number', min: 0, max: 100, step: 0.1 },
      { k: 'pcmInstall', l: 'Installation', u: '$/m² panel', t: 'number', min: 0, max: 200, step: 1 },
      { k: 'pcmFan', l: 'Fan-assisted panels (forced air over PCM)', t: 'toggle', h: 'Faster heat transfer, so the PCM fully melts and freezes each day. Adds fan energy and cost.' },
      { k: 'fanH', l: 'Film coefficient with fans', u: 'W/m²K', t: 'number', min: 2, max: 60, step: 1 },
      { k: 'fanW', l: 'Fan power', u: 'W per m² panel', t: 'number', min: 0, max: 10, step: 0.1 },
      { k: 'fanCapex', l: 'Fan / duct cost', u: '$/m² panel', t: 'number', min: 0, max: 50, step: 0.5 },
      { k: 'smart', l: 'Smart load-shifting (pre-charge PCM before peak)', t: 'toggle' },
      { k: 'preHours', l: 'Pre-charge window', u: 'h before peak', t: 'range', min: 1, max: 10, step: 1 },
      { k: 'prePower', l: 'Pre-charge power limit', u: 'W/m²', t: 'range', min: 5, max: 100, step: 5 },
    ] },
    { id: 'env', title: 'Building & insulation', open: false, fields: [
      { k: 'height', l: 'Height', u: 'm', t: 'number', min: 2, max: 20, step: 0.1 },
      { k: 'tiers', l: 'Growing tiers', u: '', t: 'number', min: 1, max: 20, step: 1 },
      { k: 'glazedFrac', l: 'Glazed fraction of envelope', u: '', t: 'range', min: 0, max: 1, step: 0.05 },
      { k: 'Uglaz', l: 'Glazing U — baseline', u: 'W/m²K', t: 'number', min: 0.5, max: 7, step: 0.1 },
      { k: 'UglazUp', l: 'Glazing U — upgraded', u: 'W/m²K', t: 'number', min: 0.5, max: 7, step: 0.1 },
      { k: 'R', l: 'Opaque insulation R — baseline', u: 'm²K/W', t: 'number', min: 0, max: 15, step: 0.1 },
      { k: 'Rup', l: 'Opaque insulation R — upgraded', u: 'm²K/W', t: 'number', min: 0, max: 15, step: 0.1 },
      { k: 'ach', l: 'Infiltration', u: 'ACH', t: 'number', min: 0, max: 5, step: 0.05 },
      { k: 'waterL', l: 'Nutrient water volume', u: 'L/m²', t: 'number', min: 0, max: 300, step: 5, h: 'Hydroponic reservoirs are a "free" thermal battery.' },
      { k: 'lightW', l: 'Grow-light power', u: 'W/m² floor', t: 'number', min: 0, max: 600, step: 5 },
      { k: 'lightH', l: 'Photoperiod', u: 'h/day', t: 'range', min: 0, max: 24, step: 1 },
      { k: 'lightStart', l: 'Lights on at', u: 'h', t: 'range', min: 0, max: 23, step: 1, h: 'Running lights at night shifts load off-peak.' },
      { k: 'econ', l: 'Free cooling with outside air (vents)', t: 'toggle' },
    ] },
    { id: 'crop', title: 'Crop', open: false, fields: [
      { k: 'lo', l: 'Band — low setpoint', u: '°C', t: 'number', min: 0, max: 35, step: 0.5 },
      { k: 'hi', l: 'Band — high setpoint', u: '°C', t: 'number', min: 0, max: 40, step: 0.5 },
      { k: 'critLo', l: 'Critical low (crop damage)', u: '°C', t: 'number', min: -5, max: 30, step: 0.5 },
      { k: 'critHi', l: 'Critical high (crop damage)', u: '°C', t: 'number', min: 20, max: 50, step: 0.5 },
      { k: 'yieldKg', l: 'Yield', u: 'kg/m²·tier·yr', t: 'number', min: 0, max: 200, step: 1 },
      { k: 'cropPrice', l: 'Wholesale price', u: '$/kg', t: 'number', min: 0, max: 100, step: 0.5 },
      { k: 'cycle', l: 'Crop cycle', u: 'days', t: 'number', min: 7, max: 365, step: 1 },
    ] },
    { id: 'tariff', title: 'Energy & tariffs', open: false, fields: [
      { k: 'heating', l: 'Heating source', t: 'select', o: [['hp', 'Electric heat pump'], ['gas', 'Natural-gas boiler']] },
      { k: 'boilerEff', l: 'Boiler efficiency', u: '', t: 'number', min: 0.5, max: 1, step: 0.01 },
      { k: 'priceOff', l: 'Electricity — off-peak', u: '$/kWh', t: 'number', min: 0, max: 2, step: 0.01 },
      { k: 'pricePeak', l: 'Electricity — on-peak', u: '$/kWh', t: 'number', min: 0, max: 2, step: 0.01 },
      { k: 'peakStart', l: 'Peak window start', u: 'h', t: 'range', min: 0, max: 23, step: 1 },
      { k: 'peakEnd', l: 'Peak window end', u: 'h', t: 'range', min: 0, max: 24, step: 1 },
      { k: 'demandCharge', l: 'Demand charge', u: '$/kW·month', t: 'number', min: 0, max: 60, step: 0.5 },
      { k: 'gasPrice', l: 'Natural gas', u: '$/therm', t: 'number', min: 0, max: 5, step: 0.05 },
      { k: 'gridCO2', l: 'Grid carbon intensity', u: 'kg/kWh', t: 'number', min: 0, max: 1.2, step: 0.01 },
      { k: 'carbonPrice', l: 'Carbon price', u: '$/t CO₂', t: 'number', min: 0, max: 300, step: 5 },
    ] },
    { id: 'fin', title: 'Finance & capital costs', open: false, fields: [
      { k: 'horizon', l: 'Analysis period', u: 'years', t: 'range', min: 5, max: 40, step: 1 },
      { k: 'discount', l: 'Discount rate', u: '%', t: 'number', min: 0, max: 20, step: 0.5 },
      { k: 'escalation', l: 'Energy price escalation', u: '%/yr', t: 'number', min: -5, max: 10, step: 0.5 },
      { k: 'insCost', l: 'Insulation cost', u: '$/m² per RSI', t: 'number', min: 0, max: 100, step: 1 },
      { k: 'glazUpCost', l: 'Glazing upgrade cost', u: '$/m² glazing', t: 'number', min: 0, max: 300, step: 1 },
      { k: 'creditHVAC', l: 'New build / HVAC replacement (credit downsizing)', t: 'toggle' },
      { k: 'hvacCost', l: 'HVAC capital cost', u: '$/kW thermal', t: 'number', min: 0, max: 3000, step: 50 },
      { k: 'sizing', l: 'HVAC sizing factor', u: '×', t: 'number', min: 1, max: 2, step: 0.05 },
    ] },
    { id: 'adv', title: 'Advanced model (calibration)', open: false, fields: [
      { k: 'hConv', l: 'PCM surface film coefficient h', u: 'W/m²K', t: 'number', min: 0.5, max: 50, step: 0.5, h: 'Heat transfer from air to PCM panels. Fit to COMSOL with Calibrate.' },
      { k: 'massMult', l: 'Thermal mass multiplier', u: '×', t: 'number', min: 0.1, max: 5, step: 0.05, h: 'Scales air, water and structure heat capacity.' },
      { k: 'structKJ', l: 'Structure heat capacity', u: 'kJ/K per m² floor', t: 'number', min: 0, max: 500, step: 5 },
      { k: 'tau', l: 'Glazing solar transmittance', u: '0–1', t: 'number', min: 0, max: 1, step: 0.01 },
      { k: 'solarSens', l: 'Solar → sensible heat fraction', u: '0–1', t: 'number', min: 0, max: 1, step: 0.05, h: 'The rest drives plant transpiration (latent).' },
      { k: 'lightSens', l: 'Grow light → sensible heat fraction', u: '0–1', t: 'number', min: 0, max: 1, step: 0.05 },
      { k: 'filmR', l: 'Surface film resistance (inside + outside)', u: 'm²K/W', t: 'number', min: 0, max: 1, step: 0.01 },
      { k: 'ventACH', l: 'Passive vent rate during outages', u: 'ACH', t: 'number', min: 0, max: 100, step: 1 },
    ] },
    { id: 'hvacEff', title: 'HVAC efficiency & other constants', open: false, fields: [
      { k: 'copH', l: 'Heat pump COP at 7 °C outdoor', u: '', t: 'number', min: 1, max: 8, step: 0.1 },
      { k: 'copHSlope', l: 'Heat pump COP change', u: 'per °C', t: 'number', min: 0, max: 0.3, step: 0.01, h: 'COP rises this much per °C warmer outside (clipped to sensible limits).' },
      { k: 'copC', l: 'Chiller / AC COP at 27 °C outdoor', u: '', t: 'number', min: 1, max: 10, step: 0.1 },
      { k: 'copCSlope', l: 'Cooling COP change', u: 'per °C', t: 'number', min: 0, max: 0.3, step: 0.01 },
      { k: 'econCOP', l: 'Ventilation-cooling COP (fans only)', u: '', t: 'number', min: 1, max: 50, step: 1 },
      { k: 'maintPct', l: 'PCM maintenance', u: '% of PCM capex / yr', t: 'number', min: 0, max: 10, step: 0.1 },
      { k: 'gasCO2', l: 'Natural gas emissions', u: 'kg CO₂/kWh', t: 'number', min: 0, max: 0.5, step: 0.001 },
    ] },
    { id: 'res', title: 'Resilience (power outages)', open: false, fields: [
      { k: 'includeOutage', l: 'Include crop-loss risk in cost', t: 'toggle' },
      { k: 'outagesPerYear', l: 'Outages per year', u: '/yr', t: 'number', min: 0, max: 20, step: 0.1 },
      { k: 'outageHours', l: 'Typical outage duration', u: 'h', t: 'number', min: 0.5, max: 72, step: 0.5 },
    ] },
  ];

  const BASE_DEFAULTS = {
    // climate: 'boston', facility: 'greenhouse', crop: 'lettuce', tempOffset: 0, weatherProfile: null,
    climate: 'denver', facility: 'greenhouse', crop: 'tomato', tempOffset: 0, weatherProfile: null,
    pcmType: 'paraffin', pcmKg: 12, pcmMelt: 20, pcmRange: 2, pcmThick: 15, hConv: 6, pcmPrice: 5, pcmInstall: 12,
    smart: true, preHours: 4, prePower: 25,
    heating: 'hp', boilerEff: 0.85, priceOff: 0.14, pricePeak: 0.32, peakStart: 16, peakEnd: 21, demandCharge: 18,
    gasPrice: 1.4, gridCO2: 0.38, carbonPrice: 0,
    horizon: 20, discount: 6, escalation: 2.5, insCost: 10, creditHVAC: true, hvacCost: 900, sizing: 1.2,
    includeOutage: false, outagesPerYear: 1, outageHours: 8, massMult: 1, extras: [], copH: 3.0, copHSlope: 0.07, copC: 4.2, copCSlope: 0.08, econCOP: 15, maintPct: 0.5, gasCO2: 0.181,
    lightSens: 0.75, filmR: 0.17, ventACH: 20, pcmFan: false, fanH: 15, fanW: 0.5, fanCapex: 4,
  };
  const facilityVals = (f) => ({ ...FACILITIES[f] });
  const cropVals = (c) => { const x = CROPS[c]; return { lo: x.lo, hi: x.hi, critLo: x.critLo, critHi: x.critHi, yieldKg: x.yieldKg, cropPrice: x.price, cycle: x.cycle }; };
  const defaults = () => {
    const d = { ...BASE_DEFAULTS, ...facilityVals('greenhouse'), ...cropVals('lettuce'), extras: [] };
    delete d.name; return d;
  };

  const PRESETS = [
    { n: 'Boston greenhouse', v: { climate: 'boston', facility: 'greenhouse', crop: 'lettuce' } },
    { n: 'Denver greenhouse', v: { climate: 'denver', facility: 'greenhouse', crop: 'tomato' } },
    { n: 'Nairobi greenhouse', v: { climate: 'nairobi', facility: 'greenhouse', crop: 'lettuce' } },
    { n: 'Phoenix vertical farm', v: { climate: 'phoenix', facility: 'vertical', crop: 'basil' } },
    { n: 'Oslo container farm', v: { climate: 'oslo', facility: 'container', crop: 'lettuce' } },
    { n: '★ Nairobi fan-assisted PCM', v: { climate: 'nairobi', facility: 'greenhouse', crop: 'lettuce', pcmFan: true, pcmThick: 6, pcmKg: 6, pcmMelt: 21 } },
    { n: '★ Off-grid Denver greenhouse', v: { climate: 'denver', facility: 'greenhouse', crop: 'lettuce', pcmFan: true, pcmThick: 6, pcmKg: 6, pcmMelt: 20.5, priceOff: 0.45, pricePeak: 0.45, demandCharge: 0 } },
    { n: '★ Boston + outage protection', v: { climate: 'boston', facility: 'greenhouse', crop: 'lettuce', pcmFan: true, pcmThick: 6, pcmKg: 20, pcmMelt: 24, includeOutage: true, outagesPerYear: 1, outageHours: 8 } },
    { n: 'Pricey power + outages', v: { climate: 'denver', facility: 'greenhouse', crop: 'basil', priceOff: 0.28, pricePeak: 0.6, demandCharge: 30, includeOutage: true, outagesPerYear: 2, outageHours: 6, pcmPrice: 2.5, pcmType: 'salt' } },
  ];

  let CFG = { library: {}, notes: [], scenarios: [], method: {} };
  const allPresets = () => PRESETS.concat(CFG.scenarios || []);
  let LOADS = null;
  let P = defaults();
  let R = null; // latest runAll result
  let month = 0;
  let comsol = null;
  let weatherRequestId = 0;
  let weatherRequestKey = null;
  let weatherStatusState = null;
  const charts = {};

  // ---------- Form ----------
  function fmtVal(f, v) {
    if (f.t === 'range') return `${v}${f.u ? ' ' + f.u : ''}`;
    return '';
  }
  function buildForm() {
    const form = $('#form');
    form.innerHTML = '';
    for (const g of GROUPS) {
      const fs = document.createElement('fieldset');
      fs.className = g.open ? '' : 'closed';
      fs.innerHTML = `<legend>${g.title}</legend><button type="button" class="fs-head">${g.title}</button><div class="fs-body"></div>`;
      fs.querySelector('.fs-head').onclick = () => fs.classList.toggle('closed');
      const body = fs.querySelector('.fs-body');
      for (const f of g.fields) {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const id = 'f_' + f.k;
        if (f.t === 'toggle') {
          wrap.innerHTML = `<label class="toggle"><input type="checkbox" id="${id}" data-k="${f.k}"> ${f.l}</label>`;
        } else if (f.t === 'select') {
          wrap.innerHTML = `<label for="${id}">${f.l}</label><select id="${id}" data-k="${f.k}">${(typeof f.o === 'function' ? f.o() : f.o).map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>`;
        } else {
          const unit = f.u ? ` <span class="muted">(${f.u})</span>` : '';
          wrap.innerHTML = `<label for="${id}"><span>${f.l}${f.t === 'number' ? unit : ''}</span>${f.t === 'range' ? `<span class="val" id="v_${f.k}"></span>` : ''}</label>
            <input type="${f.t}" id="${id}" data-k="${f.k}" min="${f.min}" max="${f.max}" step="${f.step}">`;
        }
        if (f.h) wrap.insertAdjacentHTML('beforeend', `<div class="help">${f.h}</div>`);
        const gl = GLOSS_BY_KEY[f.k]; const lab = wrap.querySelector('label'); if (gl && lab) lab.title = gl.d;
        body.appendChild(wrap);
      }
      form.appendChild(fs);
    }
  }
  const FIELD = {}; GROUPS.forEach((g) => g.fields.forEach((f) => (FIELD[f.k] = f)));
  const GLOSS = window.PF_GLOSSARY || [];
  const GLOSS_BY_KEY = {}; GLOSS.forEach((e) => { if (e.key) GLOSS_BY_KEY[e.key] = e; });

  function syncForm() {
    for (const k in FIELD) {
      const el = document.getElementById('f_' + k); if (!el) continue;
      const f = FIELD[k];
      if (f.t === 'toggle') el.checked = !!P[k]; else el.value = P[k];
      const v = document.getElementById('v_' + k); if (v) v.textContent = fmtVal(f, P[k]);
    }
    const gas = P.heating === 'gas';
    document.getElementById('f_boilerEff').closest('.field').style.display = gas ? '' : 'none';
    document.getElementById('f_gasPrice').closest('.field').style.display = gas ? '' : 'none';
    ['preHours', 'prePower'].forEach((k) => (document.getElementById('f_' + k).closest('.field').style.opacity = P.smart ? 1 : 0.45));
    ['fanH', 'fanW', 'fanCapex'].forEach((k) => (document.getElementById('f_' + k).closest('.field').style.display = P.pcmFan ? '' : 'none'));
    ['outagesPerYear', 'outageHours'].forEach((k) => (document.getElementById('f_' + k).closest('.field').style.opacity = P.includeOutage ? 1 : 0.45));
  }

  function onInput(e) {
    const el = e.target; const k = el.dataset.k; if (!k) return;
    const f = FIELD[k];
    let v = f.t === 'toggle' ? el.checked : f.t === 'select' ? el.value : parseFloat(el.value);
    if (f.t !== 'toggle' && f.t !== 'select' && !isFinite(v)) return;
    P[k] = v;
    if (k === 'facility' && e.type === 'change') { const fv = facilityVals(v); delete fv.name; Object.assign(P, fv); }
    if (k === 'crop' && e.type === 'change') Object.assign(P, cropVals(v));
    if (k === 'pcmType' && e.type === 'change') usePcm(v);
    if (k === 'climate' && e.type === 'change') fetchWeatherProfile(true);
    syncForm();
    markPresets();
    schedule();
  }

  let timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(update, 120); }

  function buildPresets() {
    const c = $('#presetChips');
    c.innerHTML = allPresets().map((p, i) => `<button class="chip" type="button" data-i="${i}">${p.n}</button>`).join('');
    c.onclick = (e) => {
      const i = e.target.dataset.i; if (i == null) return;
      applyScenario(allPresets()[i].v);
    };
  }
  function applyScenario(v) {
    const keepExtras = P.extras;
    P = defaults(); P.extras = keepExtras;
    const fv = facilityVals(FACILITIES[v.facility] ? v.facility : P.facility); delete fv.name;
    Object.assign(P, fv, cropVals(CROPS[v.crop] ? v.crop : P.crop), v);
    if (v.pcmType && v.pcmPrice == null) P.pcmPrice = PCMS[v.pcmType].price;
    syncForm(); markPresets(); update(); fetchWeatherProfile(true);
  }
  function markPresets() {
    document.querySelectorAll('#presetChips .chip').forEach((ch, i) => {
      const v = allPresets()[i].v; ch.classList.toggle('on', Object.keys(v).every((k) => JSON.stringify(P[k]) === JSON.stringify(v[k])));
    });
  }

  // ---------- Formatting ----------
  const money = (x, d) => {
    const a = Math.abs(x), s = x < 0 ? '−' : '';
    if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(d == null ? 2 : d)}M`;
    if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(0)}k`;
    if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}k`;
    return `${s}$${a.toFixed(a < 10 ? 2 : 0)}`;
  };
  const num = (x, d = 0) => x.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const COLORS = () => ({ base: css('--c-base'), trad: css('--c-trad'), pcm: css('--c-pcm'), hybrid: css('--c-hybrid'), out: css('--c-out'), text: css('--text'), muted: css('--muted'), border: css('--border'), good: css('--good'), bad: css('--bad') });

  // ---------- Break-even helpers ----------
  function breakEvenPcmPrice(p, out) {
    const nonL = Math.min(out.base.eco.lcc, out.trad.eco.lcc);
    let best = null;
    for (const id of ['pcm', 'hybrid']) {
      const o = out[id];
      const a = PF.economics(p, o.s, o.sim, { pcmPrice: 0 }).lcc;
      const b = PF.economics(p, o.s, o.sim, { pcmPrice: 1 }).lcc - a;
      if (b <= 0) continue;
      const x = (nonL - a) / b;
      if (best == null || x > best) best = x;
    }
    return best;
  }
  function savingsAt(p, out, mult) {
    const e = (id) => PF.economics(p, out[id].s, out[id].sim, mult).lcc;
    return Math.min(e('base'), e('trad')) - Math.min(e('pcm'), e('hybrid'));
  }
  function breakEvenEnergy(p, out) {
    // savings is (nearly) piecewise-linear in energy multiplier; bisection on [0, 20]
    const f = (m) => savingsAt(p, out, { energy: m });
    if (f(1) >= 0) return 1;
    let lo = 1, hi = 20;
    if (f(hi) < 0) return null;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) >= 0) hi = m; else lo = m; }
    return hi;
  }

  // ---------- Main update ----------
  function update() {
    sanitize();
    P._loads = LOADS && $('#useLoads').checked ? LOADS : null;
    R = PF.runAll(P);
    renderVerdict();
    renderCards();
    renderCum();
    renderBreak();
    renderDetail();
    renderCalc();
    renderDay();
    renderMonthly();
    renderPriceMap();
    renderDesignMap(null);
    renderTornado();
    renderRef();
    renderWeatherStatus();
    saveHash();
  }

  function renderWeatherStatus(message, kind) {
    const status = $('#weatherStatus');
    if (!status) return;
    if (message) {
      weatherStatusState = { climate: P.climate, message, kind: kind || 'info' };
    }
    const profile = P.weatherProfile;
    const active = profile && profile.climate === P.climate;
    const state = weatherStatusState && weatherStatusState.climate === P.climate ? weatherStatusState : null;
    status.textContent = state ? state.message : active
      ? `Using Open-Meteo hourly averages for ${profile.year}.`
      : 'Using built-in climate normals.';
    const classes = { warning: 'warning', error: 'err', success: 'ok', info: 'muted' };
    status.className = `small ${state ? classes[state.kind] || 'muted' : 'muted'}`;
  }
  async function fetchWeatherProfile(force) {
    const climateKey = P.climate, climate = CLIMATES[climateKey];
    const year = new Date().getFullYear() - 1;
    const requestKey = `${climateKey}:${climate.lat}:${climate.lon}:${year}`;
    if (!force && P.weatherProfile && P.weatherProfile.climate === climateKey && P.weatherProfile.year === year) return;
    if (weatherRequestKey === requestKey) return;
    const requestId = ++weatherRequestId;
    weatherRequestKey = null;
    if (!Number.isFinite(climate.lat) || !Number.isFinite(climate.lon)) {
      P.weatherProfile = null;
      update();
      renderWeatherStatus('Open-Meteo location coordinates are unavailable; using built-in climate normals.', 'warning');
      return;
    }
    weatherRequestKey = requestKey;
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.search = new URLSearchParams({
      latitude: climate.lat,
      longitude: climate.lon,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      hourly: 'temperature_2m',
      timezone: 'auto',
    }).toString();
    const hadProfile = P.weatherProfile && P.weatherProfile.climate === climateKey;
    if (hadProfile) {
      P.weatherProfile = null;
      update();
    }
    renderWeatherStatus(`Loading Open-Meteo hourly temperatures for ${climate.name} (${year})…`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}`);
      const data = await response.json();
      const times = data.hourly && data.hourly.time;
      const values = data.hourly && data.hourly.temperature_2m;
      if (!Array.isArray(times) || !Array.isArray(values) || times.length !== values.length) {
        throw new Error('The response did not contain hourly temperatures.');
      }
      const sums = Array.from({ length: 12 }, () => new Array(24).fill(0));
      const counts = Array.from({ length: 12 }, () => new Array(24).fill(0));
      times.forEach((timestamp, i) => {
        const monthIndex = Number(timestamp.slice(5, 7)) - 1;
        const hour = Number(timestamp.slice(11, 13));
        if (monthIndex >= 0 && monthIndex < 12 && hour >= 0 && hour < 24 && Number.isFinite(values[i])) {
          sums[monthIndex][hour] += values[i];
          counts[monthIndex][hour]++;
        }
      });
      if (counts.some((monthCounts) => monthCounts.some((count) => count === 0))) {
        throw new Error('The response did not include valid temperatures for every hour of all 12 months.');
      }
      if (requestId !== weatherRequestId || P.climate !== climateKey) return;
      const hourly = sums.map((monthSums, m) => monthSums.map((sum, h) => sum / counts[m][h]));
      const mean = sums.map((monthSums, m) =>
        monthSums.reduce((sum, value) => sum + value, 0) /
        counts[m].reduce((sum, count) => sum + count, 0)
      );
      P.weatherProfile = { climate: climateKey, year, mean, hourly };
      month = P.weatherProfile.mean.indexOf(Math.min(...P.weatherProfile.mean));
      renderWeatherStatus(`Using Open-Meteo hourly averages for ${year}.`, 'success');
      update();
    } catch (error) {
      if (requestId !== weatherRequestId || P.climate !== climateKey) return;
      P.weatherProfile = null;
      update();
      renderWeatherStatus(`Open-Meteo unavailable (${error.message}); using built-in climate normals.`, 'warning');
    } finally {
      clearTimeout(timeout);
      if (requestId === weatherRequestId) weatherRequestKey = null;
    }
  }

  function renderVerdict() {
    const v = R.verdict, out = R;
    const win = v.savings > 0;
    const bePrice = breakEvenPcmPrice(P, out);
    const beE = win ? null : breakEvenEnergy(P, out);
    const name = STRATEGIES.find((s) => s.id === v.best).name;
    const pcmS = out[v.bestPcm], nonS = out[v.bestNon];
    const dE = nonS.eco.elecKWh + nonS.eco.gasKWh - (pcmS.eco.elecKWh + pcmS.eco.gasKWh);
    const dPeak = (nonS.sim.peakHeat + nonS.sim.peakCool) - (pcmS.sim.peakHeat + pcmS.sim.peakCool);
    const h = $('#verdict');
    h.className = 'hero ' + (win ? 'win' : 'lose');
    const where = `${FACILITIES[P.facility].name.toLowerCase()} in ${CLIMATES[P.climate].name}`;
    h.innerHTML = `<div>
      <h1>${win ? 'Yes, PCM lowers total cost' : 'Not yet, PCM costs more'} for a ${where}</h1>
      <p>Over ${P.horizon} years, the best option is <b>${name}</b>. The best PCM option (${STRATEGIES.find((s) => s.id === v.bestPcm).name.replace(/^U/, 'u').replace(/^B/, 'b')})
      ${win ? 'beats' : 'trails'} the best traditional option by <b>${money(Math.abs(v.savings))}</b>.
      ${win ? '' : ' <a href="#paths">See what would make PCM win →</a> '}${bePrice != null ? `PCM breaks even at <b>${bePrice > 0 ? '$' + bePrice.toFixed(2) + '/kg' : 'no price, not even free'}</b> (now $${P.pcmPrice}/kg)` : ''}${beE ? `, or with energy prices <b>${beE.toFixed(1)}×</b> today's` : ''}.</p>
      <div class="kpis">
        <div><b>${num(dE / 1000, 1)} MWh/yr</b>energy saved by PCM</div>
        <div><b>${num(dPeak, 0)} kW</b>HVAC peak reduction</div>
        <div><b>${num((nonS.eco.co2t - pcmS.eco.co2t), 1)} t/yr</b>CO₂ avoided</div>
        <div><b>${num(pcmS.sim.rideThrough, 1)} h vs ${num(nonS.sim.rideThrough, 1)} h</b>outage ride-through</div>
      </div></div>
      <div class="big"><b class="${win ? 'pos' : 'neg'}">${win ? '+' : '−'}${money(Math.abs(v.savings)).replace('−', '')}</b><span>PCM life-cycle savings<br>vs best traditional option</span></div>`;
  }

  function renderCards() {
    const c = COLORS();
    $('#horizonNote').innerHTML = `${P.horizon}-year life-cycle cost at ${P.discount}% discount rate. Payback is measured against the baseline.` +
      (P._loads ? ' <span class="pill good">Energy from imported COMSOL loads</span>' : '') +
      ((P.extras || []).some((x) => x.enabled !== false) ? ` <span class="pill good">${P.extras.filter((x) => x.enabled !== false).length} custom cost item(s)</span>` : '');
    $('#strategyCards').innerHTML = STRATEGIES.map((s) => {
      const o = R[s.id], e = o.eco;
      const pb = s.id === 'base' ? '—' : (() => { const y = PF.paybackYear(e.cum, R.base.eco.cum); return y == null ? `> ${P.horizon} yr` : y === 0 ? 'Immediate' : `${y} yr`; })();
      const best = R.verdict.best === s.id;
      return `<div class="strat ${best ? 'best' : ''}" style="--c:${c[s.id]}">
        ${best ? '<span class="tag">Lowest cost</span>' : ''}
        <h4>${s.name}</h4><div class="lcc">${money(e.lcc)}</div><div class="muted small">life-cycle cost</div>
        <dl>
          <dt>Upfront</dt><dd>${money(e.capex)}</dd>
          <dt>Annual operating</dt><dd>${money(e.annualOpex)}</dd>
          <dt>Payback</dt><dd>${pb}</dd>
          <dt>Energy cost / kg crop</dt><dd>$${e.costPerKg.toFixed(2)}</dd>
          <dt>CO₂</dt><dd>${num(e.co2t, 1)} t/yr</dd>
          <dt>Outage ride-through</dt><dd>${num(o.sim.rideThrough, 1)} h</dd>
        </dl></div>`;
    }).join('');
  }

  function baseChartOpts(extra) {
    const c = COLORS();
    return Object.assign({
      responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: c.text, boxWidth: 12, usePointStyle: true } }, tooltip: {} },
      scales: {
        x: { ticks: { color: c.muted }, grid: { color: c.border } },
        y: { ticks: { color: c.muted }, grid: { color: c.border } },
      },
    }, extra || {});
  }
  function upsert(id, cfg) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), cfg);
  }

  function renderCum() {
    const c = COLORS();
    const years = R.base.eco.cum.map((_, i) => i);
    upsert('chCum', {
      type: 'line',
      data: { labels: years, datasets: STRATEGIES.map((s) => ({ label: s.name, data: R[s.id].eco.cum, borderColor: c[s.id], backgroundColor: c[s.id], pointRadius: 0, borderWidth: 2.5, tension: 0.15 })) },
      options: baseChartOpts({
        scales: { x: { title: { display: true, text: 'Year', color: c.muted }, ticks: { color: c.muted }, grid: { color: c.border } },
          y: { ticks: { color: c.muted, callback: (v) => money(v, 1) }, grid: { color: c.border } } },
        plugins: { legend: { labels: { color: c.text, boxWidth: 12, usePointStyle: true } }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${money(x.raw)}` } } },
      }),
    });
  }

  function pvParts(id) {
    const e = R[id].eco, r = P.discount / 100, esc = P.escalation / 100;
    let pvE = 0, pvD = 0, pvO = 0;
    for (let y = 1; y <= P.horizon; y++) {
      const d = Math.pow(1 + r, y), g = Math.pow(1 + esc, y - 1);
      pvE += e.energyCost * g / d; pvD += e.demandCost * g / d; pvO += (e.carbonCost + e.maint + e.outageRisk) / d;
    }
    const repl = e.lcc - e.capex - pvE - pvD - pvO;
    return { pcm: e.pcmCapex, ins: e.insCapex, hvac: e.hvacCapex, energy: pvE, demand: pvD, other: pvO + repl };
  }
  function renderBreak() {
    const c = COLORS();
    const parts = STRATEGIES.map((s) => pvParts(s.id));
    const keys = [['energy', 'Energy (PV)', '#0ea5e9'], ['demand', 'Demand charges (PV)', '#6366f1'], ['hvac', 'HVAC equipment', '#94a3b8'],
      ['ins', 'Insulation upgrade', c.trad], ['pcm', 'PCM', c.pcm], ['other', 'Carbon, upkeep, replacements, risk', '#f43f5e']];
    upsert('chBreak', {
      type: 'bar',
      data: { labels: STRATEGIES.map((s) => s.name.replace('insulation', 'insul.')), datasets: keys.map(([k, l, col]) => ({ label: l, data: parts.map((p) => p[k]), backgroundColor: col, borderRadius: 3 })) },
      options: baseChartOpts({
        scales: { x: { stacked: true, ticks: { color: c.muted }, grid: { display: false } }, y: { stacked: true, ticks: { color: c.muted, callback: (v) => money(v, 1) }, grid: { color: c.border } } },
        plugins: { legend: { position: 'bottom', labels: { color: c.text, boxWidth: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${money(x.raw)}` } } },
      }),
    });
  }

  function renderDetail() {
    const rows = [
      ['Electricity purchased (MWh/yr)', (e) => num(e.elecKWh / 1000, 1)],
      ['… of which on-peak', (e) => num(e.peakKWh / 1000, 1)],
      ['Natural gas (MWh/yr)', (e) => num(e.gasKWh / 1000, 1)],
      ['Energy cost ($/yr)', (e) => money(e.energyCost)],
      ['Demand charges ($/yr)', (e) => money(e.demandCost)],
      ['HVAC capacity heat / cool (kW)', (e) => `${num(e.capHeat)} / ${num(e.capCool)}`],
      ['PCM fan electricity (MWh/yr)', (e, o) => num(o.sim.months.reduce((a, m, i) => a + m.hr.fanKWh.reduce((x, y) => x + y, 0) * PF.DAYS_IN_MONTH[i], 0) / 1000, 1)],
      ['PCM daily melt/freeze use (avg)', (e, o) => (o.sim.tp.m ? Math.round(100 * o.sim.months.reduce((a, m) => a + Math.max(...m.hr.liq) - Math.min(...m.hr.liq), 0) / 12) + '%' : '—')],
      ['PCM capex', (e) => money(e.pcmCapex)],
      ['Insulation capex', (e) => money(e.insCapex)],
      ['HVAC capex', (e) => money(e.hvacCapex)],
      ['Custom items: capex / annual', (e) => `${money(e.extraCapex)} / ${money(e.extraAnnual)}`],
      ['Cold / hot outage ride-through (h)', (e, o) => `${num(o.sim.rtCold, 1)} / ${num(o.sim.rtHot, 1)}`],
      ['PCM mass / panel area', (e, o) => (o.sim.tp.m ? `${num(o.sim.tp.m / 1000, 1)} t / ${num(o.sim.tp.area)} m²` : '—')],
    ];
    const c = COLORS();
    $('#detailTable').innerHTML = `<thead><tr><th>Detail</th>${STRATEGIES.map((s) => `<th style="color:${c[s.id]}">${s.name}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(([l, f]) => `<tr><td>${l}</td>${STRATEGIES.map((s) => `<td>${f(R[s.id].eco, R[s.id])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const tp = R.pcm.sim.tp;
    if (tp.area > tp.g.envA * 1.5) $('#detailTable').insertAdjacentHTML('beforeend', `<caption class="muted small" style="caption-side:bottom;text-align:left;padding-top:8px">⚠ PCM panel area (${num(tp.area)} m²) exceeds 1.5× envelope area. Use thicker panels or less PCM.</caption>`);
  }

  // ---------- Exact cost calculation (worked example) ----------
  let calcId = 'pcm';
  function renderCalc() {
    if (!R) return;
    $('#calcChips').innerHTML = STRATEGIES.map((s) => `<button type="button" class="chip ${s.id === calcId ? 'on' : ''}" data-id="${s.id}">${s.name}</button>`).join('');
    const o = R[calcId], e = o.eco, s = o.s, tp = o.sim.tp;
    const r = P.discount / 100, g = P.escalation / 100, N = P.horizon, life = PCMS[P.pcmType].life;
    const n0 = (x, d = 0) => num(x, d), usd = (x) => '$' + num(x, 0);
    const off = e.elecKWh - e.peakKWh;
    const peaks = o.sim.months.map((m) => m.peakElecKW);
    const fanCost = P.pcmFan ? P.fanCapex : 0;
    const ED = e.energyCost + e.demandCost, other = e.carbonCost + e.maint + e.outageRisk + e.extraAnnual;
    const repl = []; if (s.pcm) for (let y = life; y < N; y += life) repl.push(y);
    let rows = '', cum = e.capex;
    for (let y = 1; y <= N; y++) {
      const ed = ED * Math.pow(1 + g, y - 1), rp = repl.includes(y) ? e.pcmCapex : 0, cf = ed + other + rp, df = 1 / Math.pow(1 + r, y);
      cum += cf * df;
      rows += `<tr><td>${y}</td><td>${usd(ed)}</td><td>${usd(other)}</td><td>${rp ? usd(rp) : '—'}</td><td>${usd(cf)}</td><td>${df.toFixed(4)}</td><td>${usd(cf * df)}</td><td><b>${usd(cum)}</b></td></tr>`;
    }
    const gas = P.heating === 'gas';
    const fanNote = P.pcmFan && s.pcm ? ' and PCM fans' : '';
    $('#calcBody').innerHTML = `
      <p class="muted">${s.name}. Every number below comes from the current inputs. y = year (1…${N}), r = discount rate ${P.discount}%, g = energy escalation ${P.escalation}%.</p>

      <h4>1 · Energy purchased (from the hourly simulation)</h4>
      <p class="calc-note">For each month m: the representative day's hourly purchased electricity e(m,h) × days in the month. Includes HVAC${fanNote}, but not lighting (identical in all strategies).</p>
      <div class="eq">Electricity  E = Σₘ daysₘ × Σₕ e(m,h)              = ${n0(e.elecKWh)} kWh/yr
   on-peak  (${P.peakStart}:00–${P.peakEnd}:00)                        = ${n0(e.peakKWh)} kWh
   off-peak                                        = ${n0(off)} kWh${gas ? `
Gas          G = Σₘ daysₘ × Σₕ heat(m,h) ÷ boiler eff.  = ${n0(e.gasKWh)} kWh/yr` : ''}</div>

      <h4>2 · Yearly energy cost (year 1)</h4>
      <div class="eq">Energy = on-peak kWh × on-peak price + off-peak kWh × off-peak price${gas ? ' + gas kWh ÷ 29.31 × $/therm' : ''}
       = ${n0(e.peakKWh)} × $${P.pricePeak} + ${n0(off)} × $${P.priceOff}${gas ? ` + ${n0(e.gasKWh)} ÷ 29.31 × $${P.gasPrice}` : ''}
       = <b>${usd(e.energyCost)}</b></div>

      <h4>3 · Demand charges (year 1)</h4>
      <p class="calc-note">Each month's highest hourly electric draw (kW) × the demand charge, summed over the 12 months.</p>
      <div class="eq">Demand = Σₘ peak_kWₘ × $${P.demandCharge}/kW
       = (${peaks.slice(0, 6).map((x) => n0(x, 1)).join(' + ')}
          + ${peaks.slice(6).map((x) => n0(x, 1)).join(' + ')}) × ${P.demandCharge}
       = <b>${usd(e.demandCost)}</b></div>

      <h4>4 · Other yearly costs (constant, not escalated)</h4>
      <div class="eq">Carbon      = (E × ${P.gridCO2} + G × ${P.gasCO2}) ÷ 1000 × $${P.carbonPrice}/t = ${n0(e.co2t, 1)} t × ${P.carbonPrice} = ${usd(e.carbonCost)}
PCM upkeep  = PCM upfront cost × ${P.maintPct}%                              = ${usd(e.maint)}
Outage risk = ${P.includeOutage ? `outages/yr × standing crop, only if ride-through (${n0(o.sim.rideThrough, 1)} h) < outage (${P.outageHours} h)
            = ${P.outagesPerYear} × ${e.survives ? '0 (crop survives)' : usd(e.standingCrop)}` : '0 (resilience not included)'}   = ${usd(e.outageRisk)}
Custom yearly items                                            = ${usd(e.extraAnnual)}
Other total                                                    = <b>${usd(other)}</b></div>

      <h4>5 · Upfront cost (year 0)</h4>
      <div class="eq">PCM        = ${s.pcm ? `mass × $/kg + panel area × (install${P.pcmFan ? ' + fans' : ''}) $/m²
           = ${n0(tp.m)} kg × $${P.pcmPrice} + ${n0(tp.area)} m² × $${P.pcmInstall + fanCost}` : 'not used'}   = ${usd(e.pcmCapex)}${s.pcm ? `
             mass = ${P.pcmKg} kg/m² × ${P.floorArea} m² floor;  area = mass ÷ ${PCMS[P.pcmType].rho} kg/m³ ÷ ${P.pcmThick / 1000} m` : ''}
Insulation = ${s.upgrade ? `(R_up − R) × $/m²·RSI × opaque area + glazed area × $/m² glazing
           = (${P.Rup} − ${P.R}) × $${P.insCost} × ${n0(tp.g.opA)} m² + ${P.Uglaz > P.UglazUp ? `${n0(tp.g.glazA)} m² × $${P.glazUpCost}` : '0'}` : 'not upgraded'}   = ${usd(e.insCapex)}
HVAC       = ${P.creditHVAC ? `(heating kW + cooling kW) × $/kW = (${n0(e.capHeat)} + ${n0(e.capCool)}) × $${P.hvacCost}
             capacity = largest hourly load in the year × sizing factor ${P.sizing}` : '0 (no new HVAC purchase)'}   = ${usd(e.hvacCapex)}
Custom one-time items                                          = ${usd(e.extraCapex)}
Upfront total                                                  = <b>${usd(e.capex)}</b></div>

      <h4>6 · Life-cycle cost</h4>
      <div class="eq">LCC = Upfront + Σ_{y=1..${N}} [ (Energy + Demand) × (1+g)^(y−1) + Other + Replacement_y ] ÷ (1+r)^y
Replacement_y = full PCM upfront cost in years that are multiples of the PCM life (${life} yr) and before year ${N}${repl.length ? `: years ${repl.join(', ')}` : ': none'}
No salvage value is credited at the end of the period.
LCC = ${usd(e.capex)} + Σ (present values in the table) = <b>${usd(e.lcc)}</b></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Year</th><th>Energy + demand</th><th>Other</th><th>PCM replacement</th><th>Cash flow</th><th>Discount factor</th><th>Present value</th><th>Cumulative = LCC</th></tr></thead>
        <tbody><tr><td>0</td><td colspan="3" class="muted">Upfront</td><td>${usd(e.capex)}</td><td>1.0000</td><td>${usd(e.capex)}</td><td><b>${usd(e.capex)}</b></td></tr>${rows}</tbody></table></div>

      <h4>7 · Derived figures</h4>
      <div class="eq">Annual operating (card) = Energy + Demand + Other, year 1            = ${usd(e.annualOpex)}
Energy cost / kg crop   = (Energy + Demand) ÷ (floor × tiers × yield)    = ${usd(ED)} ÷ ${n0(e.annualYieldKg)} kg = $${e.costPerKg.toFixed(2)}/kg
Payback                 = first year where this strategy's cumulative LCC ≤ Baseline's cumulative LCC
PCM savings (verdict)   = min(LCC Baseline, LCC Upgraded) − min(LCC Baseline+PCM, LCC Upgraded+PCM)
                        = ${usd(Math.min(R.base.eco.lcc, R.trad.eco.lcc))} − ${usd(Math.min(R.pcm.eco.lcc, R.hybrid.eco.lcc))} = ${money(R.verdict.savings)}
Break-even PCM price    = the $/kg at which a PCM strategy's LCC equals the best non-PCM LCC (LCC is linear in $/kg)</div>`;
  }

  // ---------- Thermal day ----------
  function initCalc() { $('#calcChips').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; calcId = b.dataset.id; renderCalc(); }; }
  function buildMonthChips() {
    const c = $('#monthChips');
    c.innerHTML = MONTHS.map((m, i) => `<button type="button" class="chip" data-m="${i}">${m}</button>`).join('');
    c.onclick = (e) => { const m = e.target.dataset.m; if (m == null) return; month = +m; renderDay(); };
    $('#pairSel').onchange = renderDay;
  }
  function renderDay() {
    document.querySelectorAll('#monthChips .chip').forEach((ch, i) => ch.classList.toggle('on', i === month));
    const c = COLORS();
    const [a, b] = $('#pairSel').value.split('|');
    const A = R[a].sim.months[month].hr, B = R[b].sim.months[month].hr;
    const hours = [...Array(24).keys()].map((h) => `${String(h).padStart(2, '0')}:00`);
    const nameA = STRATEGIES.find((s) => s.id === a).name, nameB = STRATEGIES.find((s) => s.id === b).name;
    const band = (v) => hours.map(() => v);
    const PCM_T = '#ea580c', FF = '#e11d48';
    const ds = [
      { label: 'Outdoor air', data: A.Tout, borderColor: c.out, backgroundColor: c.out, borderDash: [2, 4], pointRadius: 0, pointStyle: 'line', borderWidth: 2, order: 5 },
      { label: `Indoor · ${nameA}`, data: A.Tin, borderColor: c[a], backgroundColor: c[a], borderWidth: 4, pointRadius: 3, pointStyle: 'circle', order: 3 },
      { label: `Indoor · ${nameB}`, data: B.Tin, borderColor: c[b], backgroundColor: c[b], borderWidth: 2.5, borderDash: [9, 5], pointRadius: 4.5, pointStyle: 'triangle', order: 2 },
      { label: 'Crop band', data: band(P.hi), borderColor: 'rgba(34,197,94,.55)', borderWidth: 1, backgroundColor: 'rgba(34,197,94,.10)', fill: '+1', pointRadius: 0, pointStyle: 'rect', order: 9 },
      { label: '_lo', data: band(P.lo), borderColor: 'rgba(34,197,94,.55)', borderWidth: 1, pointRadius: 0, order: 9 },
    ];
    const pcmSide = R[b].sim.tp.m ? B : R[a].sim.tp.m ? A : null;
    if (pcmSide) ds.splice(3, 0, { label: 'PCM panel temperature', data: pcmSide.Tpcm, borderColor: PCM_T, backgroundColor: PCM_T, borderWidth: 2.5, pointRadius: 0, pointStyle: 'line', order: 1 });
    if (comsol && $('#ffMode').checked) ds.push({ label: `PhaseFarm free-float · ${nameB}`, data: ffDay(b).Tin, borderColor: FF, backgroundColor: FF, borderDash: [4, 3], pointRadius: 0, pointStyle: 'line', borderWidth: 2, order: 1 });
    if (comsol) ds.push({ label: 'COMSOL import', type: 'scatter', data: comsol.map(([t, T]) => ({ x: t, y: T })), xAxisID: 'xs', backgroundColor: c.text, pointStyle: 'rectRot', pointRadius: 3, showLine: false, order: 0 });
    const scales = {
      x: { ticks: { color: c.muted, maxTicksLimit: 8 }, grid: { color: c.border } },
      y: { title: { display: true, text: '°C', color: c.muted }, ticks: { color: c.muted }, grid: { color: c.border } },
    };
    if (comsol) scales.xs = { type: 'linear', min: -0.5, max: 23.5, display: false, offset: false };
    upsert('chTemp', { type: 'line', data: { labels: hours, datasets: ds },
      options: baseChartOpts({ scales, plugins: { legend: { position: 'bottom', labels: { color: c.text, padding: 16, usePointStyle: true, pointStyleWidth: 26, font: { size: 12 }, filter: (i) => !i.text.startsWith('_'), sort: (x, y) => x.datasetIndex - y.datasetIndex } }, tooltip: { filter: (i) => !i.dataset.label.startsWith('_') && i.dataset.label !== 'Crop band', callbacks: { label: (x) => `${x.dataset.label}: ${(+x.parsed.y).toFixed(1)} °C` } } } }) });

    const load = (hr) => hr.heatW.map((h, i) => (h - hr.coolW[i]) / 1000);
    const lds = [
      { type: 'bar', label: `HVAC: ${nameA}`, data: load(A), backgroundColor: c[a] + '99', borderRadius: 2 },
      { type: 'bar', label: `HVAC: ${nameB}`, data: load(B), backgroundColor: c[b] + 'cc', borderRadius: 2 },
    ];
    if (pcmSide) lds.push({ type: 'line', label: 'PCM melted (%)', data: pcmSide.liq.map((x) => x * 100), borderColor: '#ea580c', backgroundColor: '#ea580c', yAxisID: 'y2', pointRadius: 0, borderWidth: 2.5 });
    upsert('chLoad', { data: { labels: hours, datasets: lds },
      options: baseChartOpts({ scales: {
        x: { ticks: { color: c.muted, maxTicksLimit: 8 }, grid: { color: c.border } },
        y: { title: { display: true, text: 'kW (+heat / −cool)', color: c.muted }, ticks: { color: c.muted }, grid: { color: c.border } },
        y2: { position: 'right', min: 0, max: 100, display: !!pcmSide, title: { display: true, text: '% melted', color: c.muted }, ticks: { color: c.muted }, grid: { display: false } },
      } }) });

    const sum = (x) => x.reduce((s, v) => s + v, 0);
    const kwhA = sum(A.elecKWh) + sum(A.gasKWh), kwhB = sum(B.elecKWh) + sum(B.gasKWh);
    const cost = (hr) => hr.elecKWh.reduce((s, e, h) => s + e * (inPeak(h) ? P.pricePeak : P.priceOff), 0) + sum(hr.gasKWh) * P.gasPrice / 29.31;
    const pkA = Math.max(...A.heatW, ...A.coolW) / 1000, pkB = Math.max(...B.heatW, ...B.coolW) / 1000;
    const onPk = (hr) => hr.elecKWh.reduce((s, e, h) => s + (inPeak(h) ? e : 0), 0);
    $('#dayStats').innerHTML = `
      <div><b>${num(kwhA)} → ${num(kwhB)} kWh</b>energy purchased this day</div>
      <div><b>${money(cost(A))} → ${money(cost(B))}</b>energy cost this day</div>
      <div><b>${num(pkA)} → ${num(pkB)} kW</b>peak HVAC load</div>
      <div><b>${num(onPk(A))} → ${num(onPk(B))} kWh</b>on-peak electricity</div>`;
    if (comsol) scoreComsol(B);
  }
  const inPeak = (h) => (P.peakStart <= P.peakEnd ? h >= P.peakStart && h < P.peakEnd : h >= P.peakStart || h < P.peakEnd);

  function renderMonthly() {
    const c = COLORS();
    upsert('chMonthly', {
      type: 'bar',
      data: { labels: MONTHS, datasets: STRATEGIES.map((s) => ({ label: s.name, data: R[s.id].sim.months.map((m, i) => (m.hr.elecKWh.reduce((a, b) => a + b, 0) + m.hr.gasKWh.reduce((a, b) => a + b, 0)) * PF.DAYS_IN_MONTH[i] / 1000), backgroundColor: c[s.id], borderRadius: 2 })) },
      options: baseChartOpts({ scales: { x: { ticks: { color: c.muted }, grid: { display: false } }, y: { title: { display: true, text: 'MWh purchased', color: c.muted }, ticks: { color: c.muted }, grid: { color: c.border } } } }),
    });
  }

  // ---------- COMSOL overlay ----------
  function parseCsv(text) {
    const rows = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim() || /^[%#]/.test(line.trim())) continue;
      const nums = line.split(/[,;\t ]+/).map(parseFloat).filter((x) => isFinite(x));
      if (nums.length >= 2) rows.push([nums[0], nums[1]]);
    }
    if (rows.length < 2) return null;
    const maxT = Math.max(...rows.map((r) => r[0]));
    const toH = maxT > 48 ? 1 / 3600 : 1;
    const isK = rows.every((r) => r[1] > 200);
    return rows.map(([t, T]) => [(t * toH) % 24, isK ? T - 273.15 : T]);
  }
  function ffDay(id, q) {
    q = q || P; const s = STRATEGIES.find((x) => x.id === id);
    return PF.simulateDay({ ...q, _loads: null }, PF.thermalParams(q, s), month, { freeFloat: true }).hr;
  }
  function scoreComsol(hr) {
    if ($('#ffMode').checked) hr = ffDay($('#pairSel').value.split('|')[1]);
    let se = 0;
    for (const [t, T] of comsol) {
      const i = Math.floor(t), f = t - i, a = hr.Tin[i % 24], b = hr.Tin[(i + 1) % 24];
      se += Math.pow(a + (b - a) * f - T, 2);
    }
    $('#comsolStat').textContent = `${comsol.length} points · RMSE vs PhaseFarm (${MONTHS[month]}): ${Math.sqrt(se / comsol.length).toFixed(2)} °C`;
  }
  function initComsol() {
    $('#comsolFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const d = parseCsv(await f.text());
      if (!d) { toast('Could not read two numeric columns from that file'); return; }
      comsol = d; renderDay(); toast('COMSOL data overlaid');
    };
    $('#comsolClear').onclick = () => { comsol = null; $('#comsolFile').value = ''; $('#comsolStat').textContent = ''; renderDay(); };
  }

  // ---------- Heatmaps ----------
  function heatColor(v, max) {
    const t = Math.max(-1, Math.min(1, v / (max || 1)));
    const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    const mid = dark ? [27, 38, 34] : [245, 245, 240];
    const pos = [22, 163, 74], neg = [220, 38, 38];
    const to = t >= 0 ? pos : neg, a = Math.pow(Math.abs(t), 0.6);
    return `rgb(${mid.map((m, i) => Math.round(m + (to[i] - m) * a)).join(',')})`;
  }
  function drawHeatmap(canvas, cfg) {
    const { xs, ys, val, xLabel, yLabel, fx, fy, marker, onPick, fv } = cfg;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const c = COLORS();
    const L = 54, Rm = 64, T = 8, B = 40;
    const pw = W - L - Rm, ph = H - T - B, cw = pw / xs.length, chh = ph / ys.length;
    let max = 0; val.forEach((r) => r.forEach((v) => (max = Math.max(max, Math.abs(v)))));
    for (let j = 0; j < ys.length; j++) for (let i = 0; i < xs.length; i++) {
      ctx.fillStyle = heatColor(val[j][i], max);
      ctx.fillRect(L + i * cw, T + (ys.length - 1 - j) * chh, cw + 0.6, chh + 0.6);
    }
    // break-even contour
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let j = 0; j < ys.length; j++) for (let i = 0; i < xs.length; i++) {
      const s = val[j][i] >= 0, x = L + i * cw, y = T + (ys.length - 1 - j) * chh;
      if (i + 1 < xs.length && (val[j][i + 1] >= 0) !== s) { ctx.moveTo(x + cw, y); ctx.lineTo(x + cw, y + chh); }
      if (j + 1 < ys.length && (val[j + 1][i] >= 0) !== s) { ctx.moveTo(x, y); ctx.lineTo(x + cw, y); }
    }
    ctx.stroke();
    // axes
    ctx.fillStyle = c.muted; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const xStep = Math.ceil(xs.length / 7), yStep = Math.ceil(ys.length / 7);
    xs.forEach((x, i) => { if (i % xStep === 0) ctx.fillText(fx(x), L + (i + 0.5) * cw, T + ph + 5); });
    ctx.fillText(xLabel, L + pw / 2, T + ph + 22);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ys.forEach((y, j) => { if (j % yStep === 0) ctx.fillText(fy(y), L - 6, T + (ys.length - 1 - j + 0.5) * chh); });
    ctx.save(); ctx.translate(12, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(yLabel, 0, 0); ctx.restore();
    // legend
    const lx = L + pw + 18, lh = ph;
    for (let k = 0; k < lh; k++) { ctx.fillStyle = heatColor(max * (1 - 2 * k / lh), max); ctx.fillRect(lx, T + k, 12, 1.5); }
    ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(money(max, 1), lx + 15, T + 5); ctx.fillText('$0', lx + 15, T + lh / 2); ctx.fillText(money(-max, 1), lx + 15, T + lh - 5);
    // marker
    if (marker) {
      const mi = nearest(xs, marker.x), mj = nearest(ys, marker.y);
      ctx.beginPath(); ctx.arc(L + (mi + 0.5) * cw, T + (ys.length - 1 - mj + 0.5) * chh, 5, 0, 2 * Math.PI);
      ctx.fillStyle = c.text; ctx.fill(); ctx.strokeStyle = css('--surface'); ctx.lineWidth = 2; ctx.stroke();
    }
    const hit = (e) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const i = Math.floor((x - L) / cw), j = ys.length - 1 - Math.floor((y - T) / chh);
      return i >= 0 && i < xs.length && j >= 0 && j < ys.length ? [i, j] : null;
    };
    canvas.onmousemove = (e) => {
      const h = hit(e), tip = $('#tip');
      if (!h) { tip.style.opacity = 0; return; }
      const [i, j] = h; const v = val[j][i];
      tip.textContent = `${xLabel}: ${fx(xs[i])}\n${yLabel}: ${fy(ys[j])}\n${fv ? fv(v) : (v >= 0 ? 'PCM saves ' : 'PCM costs ') + money(Math.abs(v))}`;
      tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; tip.style.opacity = 1;
    };
    canvas.onmouseleave = () => ($('#tip').style.opacity = 0);
    canvas.onclick = (e) => { const h = hit(e); if (h && onPick) onPick(xs[h[0]], ys[h[1]]); };
  }
  const nearest = (arr, v) => arr.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(arr[bi] - v) ? i : bi), 0);
  const range = (a, b, n) => [...Array(n)].map((_, i) => a + (b - a) * i / (n - 1));

  function renderPriceMap() {
    const xs = range(0.5, 4, 36), ys = range(0.5, 15, 30);
    const eco = (id, m) => PF.economics(P, R[id].s, R[id].sim, m).lcc;
    const val = ys.map((pp) => xs.map((em) => Math.min(eco('base', { energy: em }), eco('trad', { energy: em })) - Math.min(eco('pcm', { energy: em, pcmPrice: pp }), eco('hybrid', { energy: em, pcmPrice: pp }))));
    drawHeatmap($('#hmPrice'), {
      xs, ys, val, xLabel: 'Energy price multiplier', yLabel: 'PCM price ($/kg)', fx: (x) => x.toFixed(1) + '×', fy: (y) => '$' + y.toFixed(1),
      marker: { x: 1, y: P.pcmPrice },
      onPick: (em, pp) => {
        P.pcmPrice = Math.round(pp * 10) / 10;
        ['priceOff', 'pricePeak', 'demandCharge', 'gasPrice'].forEach((k) => (P[k] = Math.round(P[k] * em * 100) / 100));
        syncForm(); update(); toast(`Applied PCM $${P.pcmPrice}/kg and energy prices ×${em.toFixed(1)}`);
      },
    });
  }

  let designCache = null;
  function designKey() { const p = { ...P }; delete p.pcmKg; delete p.pcmMelt; return JSON.stringify(p); }
  function renderDesignMap(data) {
    const cv = $('#hmDesign');
    if (data) designCache = { key: designKey(), data };
    if (!designCache || designCache.key !== designKey()) {
      const ctx = cv.getContext('2d'); const dpr = window.devicePixelRatio || 1;
      cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = css('--muted'); ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Click “Run optimizer” to search melt point × quantity', cv.clientWidth / 2, cv.clientHeight / 2);
      cv.onmousemove = null; cv.onclick = null;
      return;
    }
    const { xs, ys, val } = designCache.data;
    drawHeatmap(cv, {
      xs, ys, val, xLabel: 'Melting point (°C)', yLabel: 'PCM (kg/m²)', fx: (x) => x + '°', fy: (y) => String(y),
      marker: { x: P.pcmMelt, y: P.pcmKg },
      onPick: (m, kg) => { P.pcmMelt = m; P.pcmKg = kg; syncForm(); update(); toast(`Applied ${kg} kg/m² at ${m} °C`); },
    });
  }
  async function runOptimizer() {
    const btn = $('#btnOpt'); btn.disabled = true;
    const xs = range(14, 30, 17), ys = range(2, 40, 20).map(Math.round);
    const P0 = { ...P, _loads: null }; const base = PF.simulateYear(P0, STRATEGIES[0]), trad = PF.simulateYear(P0, STRATEGIES[1]);
    const nonL = Math.min(PF.economics(P0, STRATEGIES[0], base).lcc, PF.economics(P0, STRATEGIES[1], trad).lcc);
    const val = [];
    let best = { v: -Infinity };
    for (let j = 0; j < ys.length; j++) {
      const row = [];
      for (let i = 0; i < xs.length; i++) {
        const q = { ...P, pcmMelt: xs[i], pcmKg: ys[j], _loads: null };
        let l = Infinity;
        for (const s of [STRATEGIES[2], STRATEGIES[3]]) l = Math.min(l, PF.economics(q, s, PF.simulateYear(q, s)).lcc);
        row.push(nonL - l);
        if (nonL - l > best.v) best = { v: nonL - l, m: xs[i], kg: ys[j] };
      }
      val.push(row);
      $('#optStat').textContent = `Simulating… ${Math.round(100 * (j + 1) / ys.length)}%`;
      await new Promise((r) => setTimeout(r, 0));
    }
    renderDesignMap({ xs, ys, val });
    $('#optStat').innerHTML = `Best design: <b>${best.kg} kg/m² at ${best.m} °C</b>, ${best.v >= 0 ? 'saves' : 'still costs'} ${money(Math.abs(best.v))}. Click the map to apply.`;
    btn.disabled = false;
  }

  // ---------- Tornado ----------
  function renderTornado() {
    const base = R.verdict.savings;
    const tests = [
      ['PCM price ±50%', { pcmPrice: P.pcmPrice * 0.5 }, { pcmPrice: P.pcmPrice * 1.5 }, true],
      ['Electricity price ±30%', { priceOff: P.priceOff * 0.7, pricePeak: P.pricePeak * 0.7 }, { priceOff: P.priceOff * 1.3, pricePeak: P.pricePeak * 1.3 }, true],
      ['Demand charge ±50%', { demandCharge: P.demandCharge * 0.5 }, { demandCharge: P.demandCharge * 1.5 }, true],
      ['Discount rate 3% / 10%', { discount: 3 }, { discount: 10 }, true],
      ['HVAC $/kW ±50%', { hvacCost: P.hvacCost * 0.5 }, { hvacCost: P.hvacCost * 1.5 }, true],
      ['Peak/off-peak spread ×0.5 / ×2', { pricePeak: P.priceOff + (P.pricePeak - P.priceOff) * 0.5 }, { pricePeak: P.priceOff + (P.pricePeak - P.priceOff) * 2 }, true],
      ['PCM quantity ±50%', { pcmKg: P.pcmKg * 0.5 }, { pcmKg: P.pcmKg * 1.5 }, false],
      ['Melting point ±3 °C', { pcmMelt: P.pcmMelt - 3 }, { pcmMelt: P.pcmMelt + 3 }, false],
      ['Warming −1 / +2 °C', { tempOffset: P.tempOffset - 1 }, { tempOffset: P.tempOffset + 2 }, false],
      ['Panel thickness ×0.5 / ×2', { pcmThick: P.pcmThick * 0.5 }, { pcmThick: P.pcmThick * 2 }, false],
      ['Smart control off / on', { smart: false }, { smart: true }, false],
      ['PCM heat transfer h ×0.5 / ×2', P.pcmFan ? { fanH: P.fanH * 0.5 } : { hConv: P.hConv * 0.5 }, P.pcmFan ? { fanH: P.fanH * 2 } : { hConv: P.hConv * 2 }, false],
    ];
    const res = tests.map(([l, lo, hi, econOnly]) => {
      const f = (d) => {
        const q = { ...P, ...d };
        if (econOnly) {
          const e = (id) => PF.economics(q, R[id].s, R[id].sim).lcc;
          return Math.min(e('base'), e('trad')) - Math.min(e('pcm'), e('hybrid'));
        }
        return PF.runAll(q).verdict.savings;
      };
      return { l, lo: f(lo) - base, hi: f(hi) - base };
    }).sort((a, b) => Math.max(Math.abs(b.lo), Math.abs(b.hi)) - Math.max(Math.abs(a.lo), Math.abs(a.hi)));
    const c = COLORS();
    upsert('chTornado', {
      type: 'bar',
      data: { labels: res.map((r) => r.l), datasets: [
        { label: 'Low case', data: res.map((r) => r.lo), backgroundColor: '#0ea5e9', borderRadius: 3 },
        { label: 'High case', data: res.map((r) => r.hi), backgroundColor: '#f97316', borderRadius: 3 },
      ] },
      options: baseChartOpts({ indexAxis: 'y', interaction: { mode: 'nearest', intersect: true },
        scales: { x: { stacked: false, ticks: { color: c.muted, callback: (v) => money(v, 1) }, grid: { color: c.border }, title: { display: true, text: `Change in PCM savings (now ${money(base)})`, color: c.muted } },
          y: { ticks: { color: c.text, autoSkip: false }, grid: { display: false } } },
        plugins: { legend: { labels: { color: c.text, boxWidth: 12 } }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${x.raw >= 0 ? '+' : ''}${money(x.raw)}` } } } }),
    });
  }

  // ---------- Paths to a PCM win ----------
  function leverList() {
    const fan = { pcmFan: true, pcmThick: Math.min(P.pcmThick, 6) };
    const tou = { pricePeak: Math.max(P.pricePeak, 0.55), demandCharge: Math.max(P.demandCharge, 30) };
    const grid = { priceOff: 0.45, pricePeak: 0.45, demandCharge: 0 };
    const L = [
      ['Your current inputs (best PCM design)', 'Same inputs; only the PCM melt point and quantity are optimized.', {}],
      ['Fan-assisted thin panels', 'Forced air over 6 mm panels, so the PCM fully cycles each day. Fan energy and cost included.', fan],
      ['Salt-hydrate PCM ($2.5/kg)', 'A cheaper material class with a shorter service life (12 yr, replaced in the analysis).', { pcmType: 'salt', pcmPrice: Math.min(P.pcmPrice, 2.5) }],
      ['PCM at scale ($1.5/kg, $6/m² install)', 'Bulk purchase or local manufacturing. Is this price plausible? Ask suppliers.', { pcmPrice: 1.5, pcmInstall: 6 }],
      ['Steep time-of-use + demand charges', 'Peak $0.55/kWh, $30/kW·month, as in California, Hawaii or many commercial tariffs.', tou],
      ['Off-grid / diesel power ($0.45/kWh)', 'Remote or off-grid farms where every kWh is expensive.', grid],
      ['Value outage protection (1/yr, 8 h)', 'Losing a standing crop counts as a cost. PCM extends ride-through.', { includeOutage: true, outagesPerYear: Math.max(1, P.outagesPerYear), outageHours: 8 }],
      ['Carbon price $150/t', 'A social cost of carbon or a strict carbon tax.', { carbonPrice: Math.max(P.carbonPrice, 150) }],
      ['Combo: fans + salt hydrate + steep TOU', 'Combines three levers that are realistic today.', { ...fan, pcmType: 'salt', pcmPrice: Math.min(P.pcmPrice, 2.5), ...tou }],
      ['Combo: fans + off-grid', 'A remote greenhouse with forced-air PCM.', { ...fan, ...grid }],
      ['Combo: fans + outage protection', 'Forced-air PCM sized to carry the crop through an 8 h outage.', { ...fan, includeOutage: true, outagesPerYear: Math.max(1, P.outagesPerYear), outageHours: 8 }],
    ];
    if (P.glazedFrac > 0 && P.econ) L.splice(5, 0, ['Closed greenhouse (no venting)', 'Keep vents shut to retain CO₂ and store solar surplus. Cooling becomes mechanical.', { econ: false }]);
    return L;
  }
  function bestDesign(q) {
    const melts = [...new Set([q.lo, q.lo + 1.5, (q.lo + q.hi) / 2, q.hi - 1.5, q.hi].map((x) => Math.round(x * 2) / 2))];
    const nonL = Math.min(...[0, 1].map((i) => PF.economics(q, STRATEGIES[i], PF.simulateYear(q, STRATEGIES[i])).lcc));
    let b = null;
    for (const m of melts) for (const kg of [4, 10, 20, 35]) for (const s of [STRATEGIES[2], STRATEGIES[3]]) {
      const r = { ...q, pcmMelt: m, pcmKg: kg };
      const l = PF.economics(r, s, PF.simulateYear(r, s)).lcc;
      if (!b || l < b.l) b = { l, m, kg, s };
    }
    return { ...b, sav: nonL - b.l, nonL };
  }
  async function runPaths() {
    const btn = $('#btnPaths'); btn.disabled = true;
    const L = leverList(), rows = [];
    const snap = JSON.parse(JSON.stringify({ ...P, _loads: null }));
    const label = `${CLIMATES[P.climate].name} · ${FACILITIES[P.facility].name} · ${CROPS[P.crop].name}`;
    for (let i = 0; i < L.length; i++) {
      const [name, desc, v] = L[i];
      const q = { ...P, ...v, _loads: null };
      rows.push({ name, desc, v, ...bestDesign(q) });
      $('#pathsStat').textContent = `Testing ${i + 1}/${L.length}…`;
      await new Promise((r) => setTimeout(r, 0));
    }
    const cur = rows[0];
    $('#pathsTable').innerHTML = `<thead><tr><th>Lever</th><th>Verdict</th><th>PCM savings</th><th>% of LCC</th><th>Change vs now</th><th>Best design</th><th></th></tr></thead><tbody>${rows.map((r, i) => `
      <tr><td><b>${r.name}</b><div class="muted small" style="white-space:normal;max-width:420px">${r.desc}</div></td>
      <td><span class="pill ${r.sav >= 0 ? 'good' : 'bad'}">${r.sav >= 0 ? 'PCM wins' : 'Insulation wins'}</span></td>
      <td class="${r.sav >= 0 ? 'pos' : 'neg'}">${r.sav >= 0 ? '+' : ''}${money(r.sav)}</td>
      <td>${(100 * r.sav / r.nonL).toFixed(1)}%</td>
      <td>${i === 0 ? '—' : (r.sav - cur.sav >= 0 ? '+' : '') + money(r.sav - cur.sav)}</td>
      <td>${r.kg} kg/m² @ ${r.m} °C<div class="muted small">${r.s.name}</div></td>
      <td><button class="btn ghost" type="button" data-i="${i}">Apply</button></td></tr>`).join('')}</tbody>`;
    $('#pathsTable').onclick = (e) => {
      const i = e.target.dataset.i; if (i == null) return; const r = rows[i];
      // start from the scenario the table was computed for, so levers never stack
      P = { ...JSON.parse(JSON.stringify(snap)), ...JSON.parse(JSON.stringify(r.v)), pcmMelt: r.m, pcmKg: r.kg };
      syncForm(); markPresets(); update();
      document.querySelectorAll('#pathsTable tbody tr').forEach((tr, j) => tr.classList.toggle('applied', j === +i));
      document.querySelectorAll('#pathsTable button[data-i]').forEach((bt) => (bt.textContent = +bt.dataset.i === +i ? 'Applied ✓' : 'Apply'));
      toast(`Applied "${r.name}" to ${label}. Savings ${money(R.verdict.savings)}`);
    };
    const wins = rows.filter((r) => r.sav >= 0).length;
    $('#pathsStat').innerHTML = `<b>${wins} of ${rows.length}</b> levers make PCM the cheapest option for <b>${label}</b>. Each <i>Apply</i> starts from this scenario, so levers don't stack. Re-run after changing inputs.`;
    btn.disabled = false;
  }

  // ---------- Scenario scan ----------
  async function runScan() {
    const btn = $('#btnScan'); btn.disabled = true;
    const rows = [];
    const combos = [];
    for (const fac of Object.keys(FACILITIES)) for (const cl of Object.keys(CLIMATES)) combos.push([fac, cl]);
    const melts = [16, 18, 20, 22, 24, 26];
    for (let n = 0; n < combos.length; n++) {
      const [fac, cl] = combos[n];
      const fv = facilityVals(fac); delete fv.name;
      const q0 = { ...P, ...fv, climate: cl, facility: fac, _loads: null };
      const base = PF.simulateYear(q0, STRATEGIES[0]), trad = PF.simulateYear(q0, STRATEGIES[1]);
      const eB = PF.economics(q0, STRATEGIES[0], base), eT = PF.economics(q0, STRATEGIES[1], trad);
      const nonL = Math.min(eB.lcc, eT.lcc);
      let best = null;
      for (const m of melts) {
        if (m < q0.lo - 3 || m > q0.hi + 3) continue;
        const q = { ...q0, pcmMelt: m };
        for (const s of [STRATEGIES[2], STRATEGIES[3]]) {
          const sim = PF.simulateYear(q, s), e = PF.economics(q, s, sim);
          if (!best || e.lcc < best.e.lcc) best = { q, s, sim, e, m };
        }
      }
      const a = PF.economics(best.q, best.s, best.sim, { pcmPrice: 0 }).lcc;
      const b = PF.economics(best.q, best.s, best.sim, { pcmPrice: 1 }).lcc - a;
      const be = b > 0 ? (nonL - a) / b : null;
      const nonE = eB.lcc <= eT.lcc ? eB : eT;
      rows.push({ fac, cl, sav: nonL - best.e.lcc, be, m: best.m, s: best.s, nonL, pcmL: best.e.lcc,
        dE: (nonE.elecKWh + nonE.gasKWh - best.e.elecKWh - best.e.gasKWh) / 1000, rt: best.sim.rideThrough, rtN: (eB.lcc <= eT.lcc ? base : trad).rideThrough });
      $('#scanStat').textContent = `Scanning… ${n + 1}/${combos.length}`;
      if (n % 2) await new Promise((r) => setTimeout(r, 0));
    }
    rows.sort((x, y) => (y.sav / y.nonL) - (x.sav / x.nonL));
    const maxBe = Math.max(...rows.map((r) => r.be || 0), P.pcmPrice);
    $('#scanTable').innerHTML = `<thead><tr><th>Scenario</th><th>Verdict</th><th>PCM savings</th><th>% of LCC</th><th>Break-even PCM price</th><th>Best melt</th><th>Energy saved</th><th>Ride-through</th></tr></thead><tbody>${
      rows.map((r) => `<tr class="click" data-fac="${r.fac}" data-cl="${r.cl}" data-m="${r.m}">
        <td><b>${CLIMATES[r.cl].name}</b> · ${FACILITIES[r.fac].name}</td>
        <td><span class="pill ${r.sav >= 0 ? 'good' : 'bad'}">${r.sav >= 0 ? 'PCM wins' : 'Insulation wins'}</span></td>
        <td class="${r.sav >= 0 ? 'pos' : 'neg'}">${r.sav >= 0 ? '+' : ''}${money(r.sav)}</td>
        <td>${(100 * r.sav / r.nonL).toFixed(1)}%</td>
        <td>${r.be == null ? '—' : r.be <= 0 ? 'never' : '$' + r.be.toFixed(2) + '/kg'}<span class="bar" style="width:${Math.max(0, (r.be || 0) / maxBe * 60)}px;background:${r.be >= P.pcmPrice ? css('--good') : css('--c-out')}"></span></td>
        <td>${r.m} °C</td><td>${num(r.dE, 1)} MWh/yr</td><td>${num(r.rtN, 1)} → ${num(r.rt, 1)} h</td></tr>`).join('')
    }</tbody>`;
    const wins = rows.filter((r) => r.sav >= 0).length;
    $('#scanStat').innerHTML = `<b>${wins} of ${rows.length}</b> scenarios favour PCM at $${P.pcmPrice}/kg. Click a row to load it.`;
    btn.disabled = false;
  }
  function initScan() {
    $('#btnScan').onclick = runScan;
    $('#scanTable').onclick = (e) => {
      const tr = e.target.closest('tr.click'); if (!tr) return;
      const fv = facilityVals(tr.dataset.fac); delete fv.name;
      Object.assign(P, fv, { facility: tr.dataset.fac, climate: tr.dataset.cl, pcmMelt: +tr.dataset.m });
      syncForm(); markPresets(); update(); window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // ---------- Method section (editable) & PCM materials ----------
  const METHOD_TITLES = { thermal: 'Thermal model', economics: 'Economics', limits: 'Limits' };
  const METHOD_DEFAULT = {
    thermal: `- **Building:** square footprint; envelope UA = glazed area × U_glazing + opaque area / (R + 0.17); infiltration 0.335 × volume × ACH (W/K).
- **Thermal mass:** air and contents, hydroponic nutrient water (L/m²) and structure.
- **PCM:** enthalpy method with a linear mushy zone; panels exchange heat with room air through a convective film (still air, or forced air with fans) plus half-panel conduction.
- **Weather:** a representative periodic day per month from climate normals (mean, diurnal range, solar irradiation, latitude-based day length). Each day is repeated until it reaches steady state.
- **HVAC:** an ideal thermostat holds the crop band. Heat-pump COP depends on outdoor temperature; greenhouses use ventilation (COP ≈ 15) when outside air is cooler.
- **Smart load-shift:** before the peak window, HVAC pre-charges the PCM (melts it in heating months, freezes it in cooling months) with limited power.
- **Outage ride-through:** HVAC and lights off, starting at dusk in the coldest month and late morning in the hottest; hours until the crop's critical limits are crossed.`,
    economics: `- **Energy (yr 1)** = on-peak kWh × on-peak price + off-peak kWh × off-peak price (+ gas kWh ÷ 29.31 × $/therm). kWh = Σ months of days × the simulated hourly HVAC (+ PCM fan) electricity.
- **Demand (yr 1)** = Σ over 12 months of (that month's highest hourly kW) × demand charge.
- **Other yearly** = carbon (t CO₂ × $/t) + PCM upkeep (maintenance % × PCM upfront) + outage risk + custom yearly items. These are *not* escalated.
- **Upfront** = PCM (kg × $/kg + panel m² × (install + fans) $/m²) + insulation ((R_up − R) × $/m²·RSI × opaque m² + glazed m² × $/m²) + HVAC ((heat kW + cool kW) × $/kW, if credited) + custom one-time items.
- **Life-cycle cost** = Upfront + Σ_{y=1..N} [(Energy + Demand) × (1+g)^(y−1) + Other + PCM replacement_y] ÷ (1+r)^y. Replacement = full PCM upfront at each multiple of its life before year N. No salvage value.
- **PCM savings** = min(LCC of non-PCM options) − min(LCC of PCM options). **Payback** = first year a strategy's cumulative LCC ≤ the baseline's.
- See *Show the exact cost calculation* under Strategy comparison for these formulas with your numbers.`,
    limits: `- Sensible heat only. Dehumidification and transpiration latent loads are left out; lighting electricity is the same in every strategy and excluded.
- Representative days miss multi-day cold snaps, so HVAC downsizing credit for PCM may be optimistic.
- Default prices are indicative 2024–25 figures. Replace them with quotes for real decisions, and validate against a COMSOL model.`,
  };
  let methodEdit = false;
  const methodText = (k) => { const m = CFG.method || {}; return m[k] != null ? m[k] : METHOD_DEFAULT[k]; };
  function renderMethod() {
    CFG.method = CFG.method || {};
    const extra = CFG.method.extra || [];
    const box = $('#methodBody');
    $('#btnEditMethod').textContent = methodEdit ? 'Done' : 'Edit';
    $('#btnEditMethod').className = methodEdit ? 'btn' : 'btn ghost';
    if (!methodEdit) {
      box.innerHTML = `<div class="grid2"><div><h3>${METHOD_TITLES.thermal}</h3>${md(methodText('thermal'))}</div>
        <div><h3>${METHOD_TITLES.economics}</h3>${md(methodText('economics'))}<h3>${METHOD_TITLES.limits}</h3>${md(methodText('limits'))}</div></div>` +
        (extra.length ? `<div class="grid2">${extra.map((x) => `<div><h3>${esc(x.title || 'Untitled')}</h3>${md(x.body)}</div>`).join('')}</div>` : '');
      return;
    }
    box.innerHTML = Object.keys(METHOD_TITLES).map((k) => `<div class="item" data-k="${k}">
        <div class="row-between"><b>${METHOD_TITLES[k]}</b>${CFG.method[k] != null ? '<button type="button" class="btn ghost reset">Reset to default</button>' : ''}</div>
        <textarea data-f="body" rows="8">${esc(methodText(k))}</textarea></div>`).join('') +
      extra.map((x, i) => `<div class="item" data-x="${i}"><label>Section title<input type="text" data-f="title" value="${esc(x.title)}"></label>
        <textarea data-f="body" rows="6">${esc(x.body)}</textarea><button type="button" class="btn ghost del">Delete section</button></div>`).join('') +
      `<div class="row"><button type="button" class="btn ghost" id="methodAdd">+ Add section</button><span class="muted small">Markdown: **bold**, *italic*, - lists, [links](https://…)</span></div>`;
  }
  function onMethodEdit(e) {
    const t = e.target, it = t.closest('.item');
    if (t.id === 'methodAdd') { (CFG.method.extra = CFG.method.extra || []).push({ title: 'New section', body: '- ' }); saveCfg(); renderMethod(); return; }
    if (!it) return;
    if (it.dataset.k) {
      const k = it.dataset.k;
      if (t.classList.contains('reset')) { delete CFG.method[k]; saveCfg(); renderMethod(); return; }
      if (t.dataset.f === 'body' && e.type === 'input') { CFG.method[k] = t.value; saveCfg(); }
    } else if (it.dataset.x != null) {
      const i = +it.dataset.x;
      if (t.classList.contains('del')) { CFG.method.extra.splice(i, 1); saveCfg(); renderMethod(); return; }
      if (t.dataset.f && e.type === 'input') { CFG.method.extra[i][t.dataset.f] = t.value; saveCfg(); }
    }
  }

  function usePcm(key) {
    const m = PCMS[key]; P.pcmType = key; P.pcmPrice = m.price;
    if (m.melt != null && isFinite(m.melt)) P.pcmMelt = +m.melt;
    if (m.range != null && isFinite(m.range)) P.pcmRange = +m.range;
  }
  const PCM_FIELDS = [
    ['name', 'Name / product', 'text', 'e.g. Vendor X PCM-22 panel', true],
    ['L', 'Latent heat (kJ/kg)', 'number', '180'], ['rho', 'Density (kg/m³)', 'number', '1400'],
    ['k', 'Conductivity (W/m·K)', 'number', '0.5'], ['cp', 'Specific heat (J/kg·K)', 'number', '2000'],
    ['melt', 'Melting point (°C, optional)', 'number', '22'], ['range', 'Melting range (°C, optional)', 'number', '2'],
    ['price', 'Price ($/kg, encapsulated)', 'number', '4'], ['life', 'Service life (years)', 'number', '20'],
    ['source', 'Source / datasheet URL', 'text', 'https://…', true], ['notes', 'Notes', 'text', 'Encapsulation, flammability, supplier…', true],
  ];
  let pcmEditKey = null;
  function openPcmForm(key) {
    pcmEditKey = key || null;
    const v = key ? PCMS[key] : { cp: 2000, life: 20 };
    const f = $('#pcmForm'); f.hidden = false;
    f.innerHTML = `<div class="item"><b>${key ? 'Edit PCM' : 'Add a PCM you found'}</b>
      <div class="pcm-form">${PCM_FIELDS.map(([k, l, t, ph, wide]) => `<label class="${wide ? 'wide' : ''}">${l}<input type="${t}" data-f="${k}" placeholder="${ph}" value="${esc(v[k] == null ? '' : v[k])}" ${t === 'number' ? 'step="any"' : ''}></label>`).join('')}</div>
      <label class="toggle"><input type="checkbox" id="pcmUseNow" checked> Use it in the calculator now</label>
      <div class="row" style="margin:0"><button type="button" class="btn" id="pcmSave">Save PCM</button><button type="button" class="btn ghost" id="pcmCancel">Cancel</button><span class="small" id="pcmMsg"></span></div></div>`;
    f.querySelector('input').focus();
    f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function savePcm() {
    const get = (k) => $('#pcmForm').querySelector(`[data-f="${k}"]`).value.trim();
    const o = {}; const bad = [];
    for (const [k, l, t] of PCM_FIELDS) {
      const v = get(k);
      if (t === 'number') { if (v === '') continue; const n = parseFloat(v); if (!isFinite(n)) { bad.push(l); continue; } o[k] = n; } else if (v) o[k] = v;
    }
    if (!o.name) bad.push('Name');
    for (const k of ['L', 'rho', 'k', 'cp', 'price', 'life']) if (!(o[k] > 0) && !(k === 'price' && o[k] === 0)) bad.push(PCM_FIELDS.find((x) => x[0] === k)[1]);
    if (bad.length) { const m = $('#pcmMsg'); m.className = 'small err'; m.textContent = 'Check: ' + [...new Set(bad)].join(', '); return; }
    let key = pcmEditKey;
    if (!key || PF.BUILTIN.pcms.includes(key) && !(CFG.library.pcms || {})[key]) {
      const slug = o.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'pcm';
      key = pcmEditKey && PF.BUILTIN.pcms.includes(pcmEditKey) ? pcmEditKey : slug;
      let i = 2; while (!pcmEditKey && PCMS[key]) key = `${slug}_${i++}`;
    }
    CFG.library.pcms = { ...(CFG.library.pcms || {}), [key]: o };
    const errs = PF.registerLibrary(CFG.library);
    const useNow = $('#pcmUseNow').checked;
    if (useNow && PCMS[key]) usePcm(key);
    saveCfg(); $('#pcmForm').hidden = true; refreshAfterConfig();
    toast(errs.length ? errs[0] : `Saved "${o.name}"${useNow ? ' and selected it' : ''}`);
  }
  function deletePcm(key) {
    if (!CFG.library.pcms || !CFG.library.pcms[key]) return;
    delete CFG.library.pcms[key];
    PF.registerLibrary(CFG.library); saveCfg(); refreshAfterConfig(); toast('PCM removed');
  }
  function renderRef() {
    const custom = CFG.library.pcms || {};
    const src = (s) => (!s ? 'No source given' : /^https?:\/\//.test(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40))}</a>` : esc(s));
    $('#refTable').innerHTML = `<thead><tr><th>Material</th><th>Latent heat</th><th>Density</th><th>k</th><th>c<sub>p</sub></th><th>Melt point</th><th>Price</th><th>Life</th><th></th></tr></thead><tbody>${
      Object.entries(PCMS).map(([key, p]) => `<tr>
        <td class="src"><b>${esc(p.name)}</b>${custom[key] ? '<span class="tag-custom">custom</span>' : ''}${P.pcmType === key ? ' <span class="pill good">in use</span>' : ''}<div class="muted small">${src(p.source)}${p.notes ? ' · ' + esc(p.notes) : ''}</div></td>
        <td>${p.L} kJ/kg</td><td>${p.rho} kg/m³</td><td>${p.k} W/m·K</td><td>${p.cp}</td>
        <td>${p.melt != null ? p.melt + ' °C' : '<span class="muted">set in sidebar</span>'}</td><td>$${p.price}/kg</td><td>${p.life} yr</td>
        <td><button type="button" class="btn ghost" data-use="${key}">Use</button> <button type="button" class="btn ghost" data-edit="${key}">Edit</button>${custom[key] ? ` <button type="button" class="btn ghost" data-del="${key}">${PF.BUILTIN.pcms.includes(key) ? 'Reset' : 'Delete'}</button>` : ''}</td></tr>`).join('')
    }</tbody>`;
  }
  function initMethod() {
    $('#btnEditMethod').onclick = () => { methodEdit = !methodEdit; renderMethod(); };
    $('#methodBody').addEventListener('input', onMethodEdit);
    $('#methodBody').addEventListener('click', onMethodEdit);
    $('#btnAddPcm').onclick = () => openPcmForm(null);
    $('#pcmForm').addEventListener('click', (e) => { if (e.target.id === 'pcmSave') savePcm(); if (e.target.id === 'pcmCancel') $('#pcmForm').hidden = true; });
    $('#refTable').onclick = (e) => {
      const d = e.target.dataset;
      if (d.use) { usePcm(d.use); syncForm(); update(); renderRef(); toast(`Using ${PCMS[d.use].name}`); }
      if (d.edit) openPcmForm(d.edit);
      if (d.del) deletePcm(d.del);
    };
  }

  // ---------- Glossary ----------
  const KINDS = [['all', 'All'], ['input', 'Input'], ['preset', 'Input (preset)'], ['library', 'Data library'], ['calc', 'Calculated'], ['concept', 'Concept']];
  let glossKind = 'all';
  function renderGlossary() {
    const q = ($('#glossQ').value || '').trim().toLowerCase();
    const rows = GLOSS.map((e) => {
      const f = e.key ? FIELD[e.key] : null;
      return { ...e, term: f ? f.l : e.t, unit: (f ? f.u : e.u) || '' };
    }).filter((e) => (glossKind === 'all' || e.kind === glossKind) && (!q || [e.term, e.d, e.where, e.unit].join(' ').toLowerCase().includes(q)));
    const label = Object.fromEntries(KINDS);
    $('#glossKinds').innerHTML = KINDS.map(([k, n]) => `<button type="button" class="chip ${glossKind === k ? 'on' : ''}" data-k="${k}">${n} <span class="muted">${k === 'all' ? GLOSS.length : GLOSS.filter((e) => e.kind === k).length}</span></button>`).join('');
    $('#glossTable').innerHTML = `<thead><tr><th>Term</th><th>Type</th><th>Unit</th><th>Where</th><th>Meaning</th></tr></thead><tbody>${
      rows.map((e) => `<tr><td><b>${esc(e.term)}</b></td><td><span class="kind ${e.kind}">${label[e.kind]}</span></td><td>${esc(e.unit)}</td><td class="muted">${esc(e.where || '')}</td><td>${esc(e.d)}</td></tr>`).join('') ||
      '<tr><td colspan="5" class="muted">No matching terms.</td></tr>'
    }</tbody>`;
  }
  function initGlossary() {
    $('#glossQ').addEventListener('input', renderGlossary);
    $('#glossKinds').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; glossKind = b.dataset.k; renderGlossary(); };
    renderGlossary();
  }

  // ---------- Share / export / theme ----------
  function saveHash() {
    const d = defaults(), diff = {};
    for (const k in P) if (k[0] !== '_' && JSON.stringify(P[k]) !== JSON.stringify(d[k])) diff[k] = P[k];
    const h = Object.keys(diff).length ? '#s=' + btoa(unescape(encodeURIComponent(JSON.stringify(diff)))) : ' ';
    history.replaceState(null, '', h === ' ' ? location.pathname : h);
  }
  function loadHash() {
    const m = location.hash.match(/s=([^&]+)/); if (!m) return;
    try { const diff = JSON.parse(decodeURIComponent(escape(atob(m[1])))); Object.assign(P, diff); } catch (e) { /* ignore bad hash */ }
  }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }
  function exportCsv() {
    const lines = [['PhaseFarm results', CLIMATES[P.climate].name, FACILITIES[P.facility].name, CROPS[P.crop].name], []];
    const keys = [['Life-cycle cost $', 'lcc'], ['Capex $', 'capex'], ['PCM capex $', 'pcmCapex'], ['Insulation capex $', 'insCapex'], ['HVAC capex $', 'hvacCapex'],
      ['Annual opex $', 'annualOpex'], ['Energy cost $/yr', 'energyCost'], ['Demand cost $/yr', 'demandCost'], ['Electricity kWh/yr', 'elecKWh'], ['Gas kWh/yr', 'gasKWh'], ['CO2 t/yr', 'co2t'], ['Energy cost $/kg crop', 'costPerKg']];
    lines.push(['Metric', ...STRATEGIES.map((s) => s.name)]);
    keys.forEach(([l, k]) => lines.push([l, ...STRATEGIES.map((s) => R[s.id].eco[k].toFixed(2))]));
    lines.push(['Outage ride-through h', ...STRATEGIES.map((s) => R[s.id].sim.rideThrough.toFixed(2))]);
    lines.push([], ['Year', ...STRATEGIES.map((s) => s.name + ' cumulative discounted $')]);
    R.base.eco.cum.forEach((_, y) => lines.push([y, ...STRATEGIES.map((s) => R[s.id].eco.cum[y].toFixed(0))]));
    lines.push([], ['Inputs']); Object.entries(P).forEach(([k, v]) => lines.push([k, v]));
    const csv = lines.map((r) => r.map((x) => (/[",]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : x)).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `phasefarm-${P.climate}-${P.facility}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  function initTheme() {
    let t = null; try { t = localStorage.getItem('pf-theme'); } catch (e) { /* storage blocked */ }
    if (t) document.documentElement.dataset.theme = t;
    $('#btnTheme').onclick = () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const n = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = n;
      try { localStorage.setItem('pf-theme', n); } catch (e) { /* ignore */ }
      update();
    };
  }

  // ---------- Config persistence (custom library, notes, scenarios, cost items) ----------
  const CFG_KEY = 'pf-config';
  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify({ ...CFG, extras: P.extras || [] })); } catch (e) { /* storage blocked */ }
  }
  function applyConfig(cfg, takeExtras) {
    CFG = { library: cfg.library || {}, notes: cfg.notes || [], scenarios: cfg.scenarios || [], method: cfg.method || {} };
    const errs = PF.registerLibrary(CFG.library);
    if (takeExtras && Array.isArray(cfg.extras)) P.extras = cfg.extras;
    return errs;
  }
  function loadLocalConfig() {
    let raw = null; try { raw = localStorage.getItem(CFG_KEY); } catch (e) { /* ignore */ }
    if (!raw) return false;
    try { const c = JSON.parse(raw); applyConfig(c, !location.hash.includes('s=')); return true; } catch (e) { return false; }
  }
  async function fetchSiteConfig() {
    let hasLocal = false; try { hasLocal = !!localStorage.getItem(CFG_KEY); } catch (e) { /* ignore */ }
    if (hasLocal) return;
    try {
      const r = await fetch('custom.json', { cache: 'no-store' });
      if (!r.ok) return;
      const c = await r.json();
      const errs = applyConfig(c, !location.hash.includes('s='));
      const scenarioApplied = c.defaults && !location.hash.includes('s=');
      if (scenarioApplied) applyScenario(c.defaults);
      refreshAfterConfig();
      if (!scenarioApplied) fetchWeatherProfile(true);
      if (errs.length) console.warn('custom.json:', errs);
    } catch (e) { /* no custom.json, or opened from file:// */ }
  }
  function sanitize() {
    if (!CLIMATES[P.climate]) P.climate = Object.keys(CLIMATES)[0];
    if (!FACILITIES[P.facility]) P.facility = Object.keys(FACILITIES)[0];
    if (!CROPS[P.crop]) P.crop = Object.keys(CROPS)[0];
    if (!PCMS[P.pcmType]) P.pcmType = Object.keys(PCMS)[0];
    if (!Array.isArray(P.extras)) P.extras = [];
  }
  function refreshAfterConfig() {
    sanitize(); buildForm(); buildPresets(); syncForm(); markPresets(); renderNotes(); renderMethod(); update();
    if (!$('#drawer').hidden) renderDrawer();
  }

  // ---------- Customize drawer ----------
  let tab = 'lib';
  function openDrawer() { $('#drawer').hidden = false; $('#drawerBg').hidden = false; renderDrawer(); }
  function closeDrawer() { $('#drawer').hidden = true; $('#drawerBg').hidden = true; }
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TABLE_OF = { climates: CLIMATES, facilities: FACILITIES, pcms: PCMS, crops: CROPS };

  function renderDrawer() {
    document.querySelectorAll('#tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.tabpane').forEach((p) => (p.hidden = p.dataset.pane !== tab));
    if (tab === 'lib') renderLib();
    if (tab === 'costs') renderExtras();
    if (tab === 'notesT') renderNotesEditor();
    if (tab === 'scen') renderScen();
  }
  function renderLib() {
    const cat = $('#libCat').value;
    $('#libTpl').innerHTML = Object.entries(TABLE_OF[cat]).map(([k, v]) => `<option value="${esc(k)}">${esc(v.name)}${PF.BUILTIN[cat].includes(k) ? '' : ' (custom)'}</option>`).join('');
    $('#libText').value = JSON.stringify(CFG.library[cat] || {}, null, 2);
    $('#libMsg').textContent = '';
  }
  function libCopy() {
    const cat = $('#libCat').value, key = $('#libTpl').value;
    let obj; try { obj = JSON.parse($('#libText').value || '{}'); } catch (e) { libMsg('Fix the JSON first: ' + e.message, true); return; }
    let nk = 'my_' + key, i = 2; while (obj[nk] || TABLE_OF[cat][nk]) nk = `my_${key}_${i++}`;
    const src = JSON.parse(JSON.stringify(TABLE_OF[cat][key])); src.name = src.name + ' (copy)';
    obj[nk] = src; $('#libText').value = JSON.stringify(obj, null, 2);
    libMsg(`Added "${nk}". Edit the values, then Apply.`);
  }
  function libMsg(t, bad) { const m = $('#libMsg'); m.textContent = t; m.className = 'small ' + (bad ? 'err' : 'ok'); }
  function libApply() {
    const cat = $('#libCat').value;
    let obj; try { obj = JSON.parse($('#libText').value || '{}'); } catch (e) { libMsg('Invalid JSON: ' + e.message, true); return; }
    if (typeof obj !== 'object' || Array.isArray(obj)) { libMsg('Expected an object of { key: { …fields } }', true); return; }
    CFG.library[cat] = obj;
    const errs = PF.registerLibrary(CFG.library);
    saveCfg(); refreshAfterConfig();
    libMsg(errs.length ? 'Some entries were skipped:\n' + errs.join('\n') : `Saved ${Object.keys(obj).length} custom ${cat}. They now appear in the sidebar menus.`, errs.length > 0);
  }

  const APPLIES = [['all', 'All strategies'], ['anyPcm', 'Strategies with PCM'], ['noPcm', 'Strategies without PCM'], ['anyUpgrade', 'Upgraded-insulation strategies'],
    ['base', 'Baseline only'], ['trad', 'Upgraded only'], ['pcm', 'Baseline + PCM only'], ['hybrid', 'Upgraded + PCM only']];
  function renderExtras() {
    const L = $('#extrasList');
    L.innerHTML = (P.extras || []).map((x, i) => `<div class="item" data-i="${i}">
      <label>Name<input type="text" data-f="name" value="${esc(x.name)}"></label>
      <div class="cols">
        <label>Type<select data-f="kind"><option value="capex" ${x.kind !== 'annual' ? 'selected' : ''}>One-time (upfront)</option><option value="annual" ${x.kind === 'annual' ? 'selected' : ''}>Annual (every year)</option></select></label>
        <label>Applies to<select data-f="applies">${APPLIES.map(([v, n]) => `<option value="${v}" ${x.applies === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Amount ($, negative = credit)<input type="number" data-f="amount" value="${esc(x.amount)}" step="any"></label>
        <label class="toggle" style="align-self:end"><input type="checkbox" data-f="perM2" ${x.perM2 ? 'checked' : ''}> per m² of floor</label>
      </div>
      <div class="row" style="margin:0;justify-content:space-between"><label class="toggle"><input type="checkbox" data-f="enabled" ${x.enabled !== false ? 'checked' : ''}> Enabled</label><button type="button" class="btn ghost del">Delete</button></div>
    </div>`).join('') || '<p class="empty">No custom cost items yet.</p>';
  }
  function onExtrasEdit(e) {
    const it = e.target.closest('.item'); if (!it) return;
    const i = +it.dataset.i, f = e.target.dataset.f;
    if (e.target.classList.contains('del')) { P.extras.splice(i, 1); renderExtras(); }
    else if (f) { const t = e.target; P.extras[i][f] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? parseFloat(t.value) || 0 : t.value; }
    else return;
    P.extras = [...P.extras]; saveCfg(); schedule();
  }

  function renderNotesEditor() {
    $('#notesList').innerHTML = (CFG.notes || []).map((n, i) => `<div class="item" data-i="${i}">
      <label>Title<input type="text" data-f="title" value="${esc(n.title)}"></label>
      <label>Content (Markdown)<textarea data-f="body" rows="6">${esc(n.body)}</textarea></label>
      <button type="button" class="btn ghost del">Delete</button></div>`).join('') || '<p class="empty">No sections yet.</p>';
  }
  function onNotesEdit(e) {
    const it = e.target.closest('.item'); if (!it) return;
    const i = +it.dataset.i, f = e.target.dataset.f;
    if (e.target.classList.contains('del')) { CFG.notes.splice(i, 1); renderNotesEditor(); }
    else if (f) CFG.notes[i][f] = e.target.value; else return;
    saveCfg(); renderNotes();
  }
  function md(src) {
    const safeUrl = (u) => (/^(https?:|\.?\/|[\w.-]+\/|#|[\w.-]+\.(png|jpe?g|gif|svg|webp|pdf|md|html?)$)/i.test(u) && !/^javascript:/i.test(u) ? u : '#');
    const inline = (t) => esc(t)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img alt="${a}" src="${safeUrl(u)}">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener">${a}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const out = []; let list = null;
    for (const line of String(src || '').split('\n')) {
      const l = line.trim();
      if (/^[-*] /.test(l)) { if (!list) { list = []; } list.push(`<li>${inline(l.slice(2))}</li>`); continue; }
      if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
      if (!l) continue;
      const h = l.match(/^(#{1,4}) (.*)/);
      out.push(h ? `<h4>${inline(h[2])}</h4>` : `<p>${inline(l)}</p>`);
    }
    if (list) out.push(`<ul>${list.join('')}</ul>`);
    return out.join('');
  }
  function renderNotes() {
    const n = CFG.notes || [];
    $('#notesBody').innerHTML = n.length
      ? n.map((x) => `<article class="note"><h3>${esc(x.title || 'Untitled')}</h3>${md(x.body)}</article>`).join('')
      : '<p class="empty">No notes yet. Open <b>Customize → Notes</b> to add research, data sources or pitch points.</p>';
  }

  function renderScen() {
    $('#scenList').innerHTML = (CFG.scenarios || []).map((x, i) => `<div class="item" data-i="${i}"><div class="row" style="margin:0;justify-content:space-between"><b>${esc(x.n)}</b><span><button type="button" class="btn ghost load">Load</button> <button type="button" class="btn ghost del">Delete</button></span></div><span class="muted small">${Object.keys(x.v).length} changed inputs</span></div>`).join('') || '<p class="empty">No saved scenarios yet.</p>';
  }
  function scenSave() {
    const name = $('#scenName').value.trim() || `${CLIMATES[P.climate].name} · ${FACILITIES[P.facility].name}`;
    const d = defaults(), v = {};
    for (const k in P) if (k[0] !== '_' && k !== 'extras' && k !== 'weatherProfile' && JSON.stringify(P[k]) !== JSON.stringify(d[k])) v[k] = P[k];
    CFG.scenarios.push({ n: name, v }); $('#scenName').value = '';
    saveCfg(); buildPresets(); markPresets(); renderScen(); toast(`Saved "${name}"`);
  }
  function onScenClick(e) {
    const it = e.target.closest('.item'); if (!it) return; const i = +it.dataset.i;
    if (e.target.classList.contains('del')) { CFG.scenarios.splice(i, 1); saveCfg(); buildPresets(); markPresets(); renderScen(); }
    if (e.target.classList.contains('load')) { applyScenario(CFG.scenarios[i].v); closeDrawer(); }
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function cfgExport() {
    const d = defaults(), v = {};
    for (const k in P) if (k[0] !== '_' && k !== 'extras' && k !== 'weatherProfile' && JSON.stringify(P[k]) !== JSON.stringify(d[k])) v[k] = P[k];
    const out = { version: 1, about: 'PhaseFarm customization. Place next to index.html to load for every visitor.', defaults: v, ...CFG, extras: P.extras || [] };
    download('custom.json', JSON.stringify(out, null, 2), 'application/json');
  }
  async function cfgImport(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const c = JSON.parse(await f.text());
      const errs = applyConfig(c, true);
      if (c.defaults) applyScenario(c.defaults);
      saveCfg(); refreshAfterConfig();
      if (!c.defaults) fetchWeatherProfile(true);
      $('#cfgMsg').className = 'small ' + (errs.length ? 'err' : 'ok');
      $('#cfgMsg').textContent = errs.length ? 'Imported with problems:\n' + errs.join('\n') : 'Imported.';
    } catch (err) { $('#cfgMsg').className = 'small err'; $('#cfgMsg').textContent = 'Could not read JSON: ' + err.message; }
    e.target.value = '';
  }
  function cfgReset() {
    try { localStorage.removeItem(CFG_KEY); } catch (e) { /* ignore */ }
    applyConfig({}, false); P.extras = []; refreshAfterConfig();
    fetchSiteConfig().then(() => fetchWeatherProfile(true));
    $('#cfgMsg').className = 'small ok'; $('#cfgMsg').textContent = 'Customizations cleared (site custom.json, if any, reloaded).';
  }

  function initCustomize() {
    $('#btnCustomize').onclick = openDrawer;
    $('#drawerClose').onclick = closeDrawer; $('#drawerBg').onclick = closeDrawer;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });
    $('#tabs').onclick = (e) => { if (e.target.dataset.tab) { tab = e.target.dataset.tab; renderDrawer(); } };
    $('#libCat').onchange = renderLib; $('#libCopy').onclick = libCopy; $('#libApply').onclick = libApply;
    $('#extraAdd').onclick = () => { P.extras = [...(P.extras || []), { name: 'New cost item', kind: 'capex', applies: 'anyPcm', amount: 0, perM2: false, enabled: true }]; renderExtras(); saveCfg(); };
    $('#extrasList').addEventListener('input', onExtrasEdit); $('#extrasList').addEventListener('change', onExtrasEdit); $('#extrasList').addEventListener('click', (e) => { if (e.target.classList.contains('del')) onExtrasEdit(e); });
    $('#noteAdd').onclick = () => { CFG.notes.push({ title: 'New section', body: '' }); saveCfg(); renderNotesEditor(); renderNotes(); };
    $('#notesList').addEventListener('input', onNotesEdit); $('#notesList').addEventListener('click', (e) => { if (e.target.classList.contains('del')) onNotesEdit(e); });
    $('#scenSave').onclick = scenSave; $('#scenList').onclick = onScenClick;
    $('#cfgExport').onclick = cfgExport; $('#cfgImport').onchange = cfgImport; $('#cfgReset').onclick = cfgReset;
  }

  // ---------- COMSOL tools ----------
  function comsolParams() {
    const tp = PF.thermalParams(P, { upgrade: false, pcm: true }), g = tp.g, pcm = PCMS[P.pcmType], clim = CLIMATES[P.climate];
    const amp = Array.isArray(clim.amp) ? clim.amp[month] : clim.amp;
    const kIns = 0.035;
    const rows = [
      ['T_melt', `${P.pcmMelt}[degC]`, 'PCM melting temperature'],
      ['dT_melt', `${P.pcmRange}[K]`, 'PCM melting range (transition width)'],
      ['L_pcm', `${pcm.L}[kJ/kg]`, `Latent heat: ${pcm.name}`],
      ['rho_pcm', `${pcm.rho}[kg/m^3]`, 'PCM density'],
      ['k_pcm', `${pcm.k}[W/(m*K)]`, 'PCM thermal conductivity'],
      ['cp_pcm', `${pcm.cp}[J/(kg*K)]`, 'PCM specific heat'],
      ['d_pcm', `${P.pcmThick}[mm]`, 'PCM panel thickness'],
      ['m_pcm_floor', `${P.pcmKg}[kg/m^2]`, 'PCM mass per m2 of floor'],
      ['A_pcm', `${tp.area.toFixed(1)}[m^2]`, 'Total PCM panel area'],
      ['h_in', `${P.hConv}[W/(m^2*K)]`, 'Indoor convective film coefficient'],
      ['h_out', '15[W/(m^2*K)]', 'Outdoor convective coefficient (assumed)'],
      ['k_ins', `${kIns}[W/(m*K)]`, 'Insulation conductivity (mineral wool / PIR)'],
      ['d_ins_base', `${(P.R * kIns * 1000).toFixed(0)}[mm]`, `Insulation thickness for baseline R=${P.R}`],
      ['d_ins_up', `${(P.Rup * kIns * 1000).toFixed(0)}[mm]`, `Insulation thickness for upgraded R=${P.Rup}`],
      ['U_glaz', `${P.Uglaz}[W/(m^2*K)]`, 'Glazing U-value (baseline)'],
      ['T_lo', `${P.lo}[degC]`, 'Crop band low setpoint'],
      ['T_hi', `${P.hi}[degC]`, 'Crop band high setpoint'],
      ['T_out_mean', `${(PF.climateMean(P, month) + P.tempOffset).toFixed(2)}[degC]`, `Mean outdoor temp, ${MONTHS[month]}, ${clim.name}`],
      ['T_out_amp', `${amp}[K]`, 'Built-in diurnal half-amplitude; use weather.csv for the hourly outdoor temperature profile'],
      ['G_day', `${clim.ghi[month]}[kW*h/m^2]`, 'Daily global horizontal irradiation'],
      ['day_len', `${PF.dayLength(clim.lat, month).toFixed(2)}[h]`, 'Day length'],
      ['tau_glaz', `${P.tau}`, 'Glazing solar transmittance'],
      ['A_floor', `${P.floorArea}[m^2]`, 'Floor area'],
      ['A_env', `${g.envA.toFixed(1)}[m^2]`, 'Envelope area (walls + roof)'],
      ['A_glazed', `${g.glazA.toFixed(1)}[m^2]`, 'Glazed envelope area'],
      ['A_opaque', `${g.opA.toFixed(1)}[m^2]`, 'Opaque envelope area'],
      ['V_room', `${g.vol.toFixed(1)}[m^3]`, 'Air volume'],
      ['ACH', `${P.ach}[1/h]`, 'Infiltration air changes per hour'],
      ['UA_total', `${tp.UAtot.toFixed(1)}[W/K]`, 'PhaseFarm envelope + infiltration conductance (baseline)'],
      ['C_room', `${(tp.Cin / 1e6).toFixed(2)}[MJ/K]`, 'PhaseFarm lumped indoor heat capacity'],
      ['q_lights', `${(P.lightW * 0.75).toFixed(1)}[W/m^2]`, 'Sensible grow-light gain per m2 floor'],
    ];
    const source = P.weatherProfile && P.weatherProfile.climate === P.climate
      ? `Open-Meteo archive (${P.weatherProfile.year})`
      : 'built-in climate normals';
    const head = `# PhaseFarm → COMSOL parameters (${CLIMATES[P.climate].name}, ${FACILITIES[P.facility].name}, ${MONTHS[month]})\n# Outdoor temperature source: ${source}\n# Global Definitions > Parameters > Load from File. Columns: name, expression, description\n`;
    download(`phasefarm_parameters_${P.climate}_${MONTHS[month]}.txt`, head + rows.map((r) => `${r[0]}\t${r[1]}\t"${r[2]}"`).join('\n') + '\n');
  }
  function weatherRows(m, days) {
    const clim = CLIMATES[P.climate], D = PF.dayLength(clim.lat, m), G = clim.ghi[m];
    const rows = [];
    for (let i = 0; i <= days * 24 * 4; i++) {
      const t = i / 4, h = t % 24;
      const T = PF.climateTempAt(P, m, t) + P.tempOffset;
      const sr = 12 - D / 2, ss = 12 + D / 2;
      const I = h > sr && h < ss ? G * 1000 * Math.PI / (2 * D) * Math.sin(Math.PI * (h - sr) / D) : 0;
      rows.push([t * 3600, T, I]);
    }
    return rows;
  }
  function comsolWeather(year) {
    const source = P.weatherProfile && P.weatherProfile.climate === P.climate
      ? `Open-Meteo archive (${P.weatherProfile.year})`
      : 'built-in climate normals';
    let csv = `% PhaseFarm weather (${source}). Columns: time [s], T_out [degC], GHI [W/m^2]. Import as Interpolation function (3 columns, 2 functions).\n`;
    if (!year) csv += weatherRows(month, 3).map((r) => r.map((x) => x.toFixed(3)).join(',')).join('\n');
    else {
      let t0 = 0; const out = [];
      for (let m = 0; m < 12; m++) {
        const rows = weatherRows(m, PF.DAYS_IN_MONTH[m]);
        rows.slice(m === 0 ? 0 : 1).forEach((r) => out.push([r[0] + t0, r[1], r[2]].map((x) => x.toFixed(2)).join(',')));
        t0 += PF.DAYS_IN_MONTH[m] * 86400;
      }
      csv += out.filter((_, i) => i % 4 === 0).join('\n');
    }
    download(year ? `phasefarm_weather_year_${P.climate}.csv` : `phasefarm_weather_${P.climate}_${MONTHS[month]}.csv`, csv + '\n', 'text/csv');
  }
  function calibrate() {
    if (!comsol) { toast('Import a COMSOL temperature CSV first'); return; }
    const [, b] = $('#pairSel').value.split('|');
    const s = STRATEGIES.find((x) => x.id === b);
    const rmse = (hr) => Math.sqrt(comsol.reduce((acc, [t, T]) => { const i = Math.floor(t), f = t - i, a = hr.Tin[i % 24], c = hr.Tin[(i + 1) % 24]; return acc + Math.pow(a + (c - a) * f - T, 2); }, 0) / comsol.length);
    const ff = $('#ffMode').checked;
    const run = (h, mm) => { const q = { ...P, hConv: h, massMult: mm, _loads: null }; return rmse(PF.simulateDay(q, PF.thermalParams(q, s), month, { freeFloat: ff }).hr); };
    let best = null;
    for (const h of [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 30]) for (const mm of [0.3, 0.5, 0.7, 0.85, 1, 1.15, 1.3, 1.5, 2, 2.5, 3.5]) {
      const e = run(h, mm); if (!best || e < best.e) best = { e, h, mm };
    }
    // local refinement (coordinate search)
    let step = { h: best.h * 0.25, mm: best.mm * 0.1 };
    for (let it = 0; it < 30; it++) {
      let moved = false;
      for (const [dh, dm] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const h = Math.max(0.2, best.h + dh * step.h), mm = Math.max(0.1, best.mm + dm * step.mm), e = run(h, mm);
        if (e < best.e - 1e-6) { best = { e, h, mm }; moved = true; }
      }
      if (!moved) { step.h /= 2; step.mm /= 2; }
    }
    best.h = Math.round(best.h * 10) / 10; best.mm = Math.round(best.mm * 100) / 100;
    const before = run(P.hConv, P.massMult);
    P.hConv = best.h; P.massMult = best.mm; syncForm(); update();
    $('#comsolStat').textContent = `Calibrated (${ff ? 'free-floating' : 'with HVAC'}) against "${s.name}" in ${MONTHS[month]}: h = ${best.h} W/m²K, mass × ${best.mm}. RMSE ${before.toFixed(2)} → ${best.e.toFixed(2)} °C.`;
    toast('Model calibrated to COMSOL');
  }
  function parseLoads(text) {
    const ids = { base: 'base', baseline: 'base', trad: 'trad', upgraded: 'trad', insulation: 'trad', pcm: 'pcm', hybrid: 'hybrid' };
    const out = {}; let n = 0;
    for (const line of text.split(/\r?\n/)) {
      const l = line.trim(); if (!l || /^[%#]/.test(l)) continue;
      const c = l.split(/[,;\t]/).map((x) => x.trim());
      const id = ids[c[0].toLowerCase()] || ids[c[0].toLowerCase().split(/[\s_+-]/)[0]];
      let m = parseInt(c[1], 10) - 1; if (!isFinite(m)) m = MONTHS.findIndex((x) => c[1].toLowerCase().startsWith(x.toLowerCase()));
      const heat = parseFloat(c[2]), cool = parseFloat(c[3]);
      if (!id || m < 0 || m > 11 || (!isFinite(heat) && !isFinite(cool))) continue;
      (out[id] = out[id] || {})[m] = { heat: isFinite(heat) ? heat : null, cool: isFinite(cool) ? cool : null }; n++;
    }
    return n ? { data: out, n } : null;
  }
  function initComsolTools() {
    $('#btnParams').onclick = comsolParams;
    $('#btnWeather').onclick = () => comsolWeather(false);
    $('#btnWeatherYear').onclick = () => comsolWeather(true);
    $('#btnCalib').onclick = calibrate;
    $('#loadsFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = parseLoads(await f.text());
      if (!r) { $('#loadsStat').textContent = 'No valid rows. Expected: strategy, month, heat_kWh_per_day, cool_kWh_per_day'; return; }
      LOADS = r.data; $('#useLoads').disabled = false; $('#useLoads').checked = true;
      $('#loadsStat').textContent = `${r.n} rows loaded for ${Object.keys(r.data).join(', ')}. Months or strategies left out use the built-in model.`;
      update(); toast('Economics now use COMSOL loads');
    };
    $('#useLoads').onchange = update;
    $('#ffMode').onchange = renderDay;
  }

  // ---------- Boot ----------
  function boot() {
    if (typeof Chart === 'undefined') { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:12px;background:#fee2e2">Chart library failed to load. Check your connection.</p>'); return; }
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    loadHash();
    loadLocalConfig();
    buildForm(); buildPresets();
    $('#form').addEventListener('input', onInput);
    $('#form').addEventListener('change', onInput);
    initCustomize(); initComsolTools(); renderNotes(); initMethod(); renderMethod(); initGlossary(); initCalc(); buildMonthChips(); initComsol(); initScan(); initTheme(); renderRef();
    const means = Array.from({ length: 12 }, (_, m) => PF.climateMean(P, m));
    month = means.indexOf(Math.min(...means));
    syncForm(); markPresets(); update();
    $('#btnOpt').onclick = runOptimizer;
    $('#btnPaths').onclick = runPaths;
    $('#btnReset').onclick = () => { P = defaults(); syncForm(); markPresets(); update(); fetchWeatherProfile(true); };
    $('#btnShare').onclick = async () => { saveHash(); try { await navigator.clipboard.writeText(location.href); toast('Link copied to clipboard'); } catch (e) { toast('Copy the URL from the address bar'); } };
    $('#btnCsv').onclick = exportCsv;
    fetchSiteConfig().then(() => fetchWeatherProfile(false));
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { renderPriceMap(); renderDesignMap(null); }, 150); });
  }
  boot();
})();
