/* PhaseFarm thermal + economic model.
 * Lumped-capacitance (RC) building model with an enthalpy-method PCM node,
 * ideal thermostat HVAC, time-of-use tariffs and life-cycle costing.
 * Works in the browser (window.PF) and in Node (module.exports).
 */
(function (global) {
  'use strict';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const MID_DOY = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];

  // Approximate climate normals: monthly mean air temp (°C), mean daily half-range (°C),
  // global horizontal irradiation (kWh/m²/day). Sources: NOAA/NASA POWER-style normals, rounded.
  const CLIMATES = {
    boston:      { name: 'Boston, USA',       lat: 42.4, lon: -71.1,  amp: 4.5, mean: [-1.5, -0.5, 3.5, 9, 14.5, 20, 23, 22.5, 18.5, 12, 7, 1.5],      ghi: [1.9, 2.8, 3.9, 4.9, 5.8, 6.3, 6.3, 5.6, 4.5, 3.2, 2.0, 1.6] },
    minneapolis: { name: 'Minneapolis, USA',  lat: 45.0, lon: -93.3,  amp: 5.5, mean: [-9.5, -6.5, 0, 8, 15, 20.5, 23, 21.5, 16.5, 9, 0.5, -7],       ghi: [2.0, 3.0, 4.1, 5.0, 5.9, 6.4, 6.5, 5.6, 4.4, 3.0, 1.9, 1.6] },
    toronto:     { name: 'Toronto, Canada',   lat: 43.7, lon: -79.4,  amp: 4.5, mean: [-5.5, -4.5, 0, 7, 13, 18.5, 21.5, 20.5, 16, 9.5, 3.5, -2],      ghi: [1.7, 2.7, 3.8, 4.8, 5.8, 6.3, 6.4, 5.5, 4.2, 2.8, 1.7, 1.4] },
    denver:      { name: 'Denver, USA',       lat: 39.7, lon: -105.0, amp: 8.0, mean: [0, 1, 5, 9, 14.5, 20, 23.5, 22.5, 17.5, 10.5, 4, -0.5],         ghi: [2.5, 3.4, 4.6, 5.7, 6.3, 7.0, 6.9, 6.1, 5.2, 3.9, 2.7, 2.2] },
    phoenix:     { name: 'Phoenix, USA',      lat: 33.4, lon: -112.1, amp: 7.5, mean: [13, 15, 18, 22, 27, 32.5, 35, 34.5, 31.5, 24.5, 17.5, 12.5],    ghi: [3.3, 4.3, 5.6, 7.0, 7.9, 8.3, 7.6, 7.0, 6.2, 5.0, 3.7, 3.1] },
    miami:       { name: 'Miami, USA',        lat: 25.8, lon: -80.2,  amp: 4.0, mean: [20, 21, 22.5, 24.5, 27, 28, 29, 29, 28, 26.5, 23.5, 21.5],      ghi: [3.6, 4.4, 5.4, 6.2, 6.2, 5.8, 6.0, 5.6, 5.0, 4.5, 3.8, 3.4] },
    seattle:     { name: 'Seattle, USA',      lat: 47.6, lon: -122.3, amp: 4.0, mean: [5.5, 6, 8, 10, 13.5, 16, 19, 19.5, 16.5, 11.5, 7.5, 5],         ghi: [0.9, 1.6, 2.8, 4.1, 5.2, 5.8, 6.3, 5.3, 3.8, 2.1, 1.1, 0.7] },
    oslo:        { name: 'Oslo, Norway',      lat: 59.9, lon: 10.8,   amp: 3.5, mean: [-4, -4, 0, 5, 11, 15, 17, 16, 11.5, 6, 1, -3],                  ghi: [0.2, 0.8, 2.0, 3.4, 4.9, 5.5, 5.2, 4.0, 2.4, 1.1, 0.3, 0.1] },
    dubai:       { name: 'Dubai, UAE',         lat: 25.2, lon: 55.3,  amp: 5.0, mean: [19.5, 20.5, 23.5, 27.5, 31.5, 33.5, 35.5, 35.5, 33, 29.5, 25, 21], ghi: [4.1, 5.0, 5.9, 6.8, 7.6, 7.7, 7.2, 6.8, 6.3, 5.4, 4.4, 3.9] },
    singapore:   { name: 'Singapore',         lat: 1.3,   lon: 103.8, amp: 3.5, mean: [26.5, 27, 27.5, 28, 28.5, 28.5, 28, 28, 27.5, 27.5, 27, 26.5], ghi: [4.4, 5.2, 5.0, 4.7, 4.4, 4.4, 4.4, 4.5, 4.6, 4.4, 3.9, 3.9] },
    nairobi:     { name: 'Nairobi, Kenya',    lat: -1.3, lon: 36.8,   amp: 6.0, mean: [19.5, 20, 20.5, 20, 19, 17.5, 16.5, 17, 18.5, 19.5, 19, 19],     ghi: [6.2, 6.6, 6.3, 5.4, 4.8, 4.5, 4.0, 4.3, 5.3, 5.8, 5.4, 5.8] },
  };

  const FACILITIES = {
    greenhouse: {
      name: 'Hydroponic greenhouse', floorArea: 1000, height: 4.5, glazedFrac: 0.8,
      Uglaz: 4.0, UglazUp: 2.6, glazUpCost: 28, R: 1.0, Rup: 3.5, ach: 0.8,
      waterL: 25, structKJ: 30, tau: 0.7, solarSens: 0.45, lightW: 0, lightH: 0, lightStart: 6,
      econ: true, tiers: 1,
    },
    vertical: {
      name: 'Indoor vertical farm', floorArea: 1000, height: 6, glazedFrac: 0,
      Uglaz: 3, UglazUp: 3, glazUpCost: 0, R: 2.0, Rup: 5.0, ach: 0.25,
      waterL: 60, structKJ: 60, tau: 0, solarSens: 0, lightW: 180, lightH: 16, lightStart: 21,
      econ: false, tiers: 5,
    },
    container: {
      name: 'Container farm', floorArea: 28, height: 2.6, glazedFrac: 0,
      Uglaz: 3, UglazUp: 3, glazUpCost: 0, R: 2.5, Rup: 5.0, ach: 0.3,
      waterL: 40, structKJ: 80, tau: 0, solarSens: 0, lightW: 250, lightH: 18, lightStart: 22,
      econ: false, tiers: 4,
    },
  };

  const PCMS = {
    paraffin: { name: 'Paraffin (macro-encapsulated)', L: 200, rho: 800, k: 0.2, cp: 2000, price: 5.0, life: 25, source: 'Typical macro-encapsulated paraffin (organic, chemically stable). Indicative price.' },
    salt:     { name: 'Salt hydrate (CaCl₂·6H₂O blend)', L: 180, rho: 1500, k: 0.6, cp: 2200, price: 2.5, life: 12, source: 'Inorganic, low cost, high density. Phase segregation and supercooling shorten life.' },
    bio:      { name: 'Bio-based (fatty-acid ester)', L: 190, rho: 880, k: 0.2, cp: 2000, price: 7.0, life: 30, source: 'Plant-derived fatty-acid esters. Biodegradable, low flammability, higher price.' },
  };

  const CROPS = {
    lettuce:    { name: 'Lettuce / leafy greens', lo: 18, hi: 24, critLo: 4, critHi: 30, yieldKg: 40, price: 6, cycle: 35 },
    basil:      { name: 'Basil / herbs',          lo: 18, hi: 24, critLo: 10, critHi: 35, yieldKg: 25, price: 18, cycle: 35 },
    tomato:     { name: 'Tomato',                 lo: 18, hi: 24, critLo: 8, critHi: 35, yieldKg: 50, price: 4, cycle: 90 },
    strawberry: { name: 'Strawberry',             lo: 18, hi: 24, critLo: 2, critHi: 32, yieldKg: 15, price: 10, cycle: 120 },
  };

  const STRATEGIES = [
    { id: 'base',   name: 'Baseline insulation',       upgrade: false, pcm: false },
    { id: 'trad',   name: 'Upgraded insulation',       upgrade: true,  pcm: false },
    { id: 'pcm',    name: 'Baseline + PCM',            upgrade: false, pcm: true },
    { id: 'hybrid', name: 'Upgraded insulation + PCM', upgrade: true,  pcm: true },
  ];

  const GAS_CO2 = 0.181; // kg CO2 per kWh of natural gas
  const KWH_PER_THERM = 29.31;

  function dayLength(lat, month) {
    const decl = 23.44 * Math.sin(2 * Math.PI * (284 + MID_DOY[month]) / 365) * Math.PI / 180;
    let x = -Math.tan(lat * Math.PI / 180) * Math.tan(decl);
    x = Math.max(-1, Math.min(1, x));
    return 2 * Math.acos(x) * 180 / Math.PI / 15;
  }

  function solarAt(t, D, G) {
    if (D <= 0) return 0;
    const sr = 12 - D / 2, ss = 12 + D / 2;
    if (t <= sr || t >= ss) return 0;
    const peak = G * 1000 * Math.PI / (2 * D);
    return peak * Math.sin(Math.PI * (t - sr) / D);
  }

  const ampOf = (clim, m) => (Array.isArray(clim.amp) ? clim.amp[m] : clim.amp);
  const toutAt = (t, mean, amp) => mean + amp * Math.cos(2 * Math.PI * (t - 15) / 24);
  function climateMean(p, month) {
    const profile = p && p.weatherProfile;
    if (profile && profile.climate === p.climate && Array.isArray(profile.mean) &&
      profile.mean.length === 12 && Number.isFinite(profile.mean[month])) return profile.mean[month];
    return CLIMATES[p.climate].mean[month];
  }
  function climateTempAt(p, month, hour) {
    const profile = p && p.weatherProfile;
    const hourly = profile && profile.climate === p.climate && profile.hourly;
    if (Array.isArray(hourly) && hourly.length === 12 && Array.isArray(hourly[month]) &&
      hourly[month].length === 24) {
      const h = ((hour % 24) + 24) % 24;
      const value = hourly[month][Math.floor(h)];
      if (Number.isFinite(value)) return value;
    }
    const clim = CLIMATES[p.climate];
    return toutAt(hour, clim.mean[month], ampOf(clim, month));
  }
  // Heat-pump / chiller efficiency vs outdoor temperature (rated at 7 °C heating, 27 °C cooling); editable via p.*
  const copHeat = (To, p) => { p = p || {}; const r = p.copH ?? 3.0; return Math.max(Math.min(1.6, r), Math.min(5 * r / 3, r + (p.copHSlope ?? 0.07) * (To - 7))); };
  const copCool = (To, p) => { p = p || {}; const r = p.copC ?? 4.2; return Math.max(Math.min(2.0, r), Math.min(6.5 * r / 4.2, r - (p.copCSlope ?? 0.08) * (To - 27))); };
  const inWindow = (h, start, end) => (start <= end ? h >= start && h < end : h >= start || h < end);
  const lightsOn = (h, start, dur) => dur > 0 && ((h - start + 24) % 24) < dur;

  // Enthalpy (J/kg) relative to start of melting.
  function makeEnthalpy(pcm, Tm, dTm) {
    const Ts = Tm - dTm / 2, L = pcm.L * 1000, cp = pcm.cp;
    const cMush = cp + L / dTm;
    const Hl = cMush * dTm;
    return {
      H: (T) => (T <= Ts ? cp * (T - Ts) : T < Ts + dTm ? cMush * (T - Ts) : Hl + cp * (T - Ts - dTm)),
      T: (H) => (H <= 0 ? Ts + H / cp : H < Hl ? Ts + H / cMush : Ts + dTm + (H - Hl) / cp),
      liquid: (H) => Math.max(0, Math.min(1, H / Hl)),
    };
  }

  function geometry(p) {
    const L = Math.sqrt(p.floorArea);
    const wallA = 4 * L * p.height, roofA = p.floorArea, envA = wallA + roofA;
    const glazA = envA * p.glazedFrac, opA = envA - glazA;
    return { wallA, roofA, envA, glazA, opA, vol: p.floorArea * p.height };
  }

  function thermalParams(p, s) {
    const g = geometry(p);
    const R = s.upgrade ? p.Rup : p.R;
    const Ug = s.upgrade ? p.UglazUp : p.Uglaz;
    const UAenv = g.glazA * Ug + g.opA / (R + (p.filmR ?? 0.17));
    const UAinf = 0.335 * g.vol * p.ach;
    const Cin = (g.vol * 1.2 * 1005 * 2 + p.floorArea * (p.waterL * 4186 + p.structKJ * 1000)) * (p.massMult || 1);
    const pcm = PCMS[p.pcmType];
    const m = s.pcm ? p.pcmKg * p.floorArea : 0;
    const thick = p.pcmThick / 1000;
    const area = m > 0 ? m / (pcm.rho * thick) : 0;
    const hAir = p.pcmFan ? p.fanH : p.hConv;
    const hEff = 1 / (1 / hAir + thick / (2 * pcm.k));
    return { g, UAtot: UAenv + UAinf, UAenv, UAinf, Cin, m, area, UApcm: area * hEff, pcm };
  }

  /* Simulate a representative (periodic steady-state) day for a month. */
  function simulateDay(p, tp, month, opts) {
    opts = opts || {};
    const clim = CLIMATES[p.climate];
    const mean = climateMean(p, month) + (p.tempOffset || 0), amp = ampOf(clim, month), G = clim.ghi[month];
    const D = dayLength(clim.lat, month);
    const solarFac = p.floorArea * p.tau * p.solarSens * (p.glazedFrac > 0 ? 1 : 0);
    const lightGain = p.lightW * p.floorArea * (p.lightSens ?? 0.75);
    const fanW = p.pcmFan && tp.m > 0 ? (p.fanW || 0) * tp.area : 0; // forced air over PCM panels, runs 24 h
    const enth = makeEnthalpy(tp.pcm, p.pcmMelt, p.pcmRange);
    const hasPCM = tp.m > 0;
    const Cpcm = tp.m * tp.pcm.cp;
    const tauMin = Math.min(tp.Cin / (tp.UAtot + tp.UApcm), hasPCM ? Cpcm / tp.UApcm : Infinity);
    const nPerHour = Math.max(10, Math.ceil(3600 / (0.3 * tauMin)));
    const dt = 3600 / nPerHour;

    const mid = (p.lo + p.hi) / 2;
    const meanGain = solarFac * G * 1000 / 24 + lightGain * p.lightH / 24;
    const coolingMode = tp.UAtot * (mean - mid) + meanGain > 0;
    const smart = !!p.smart && hasPCM;
    const preStart = (p.peakStart - p.preHours + 24) % 24;
    const preCap = (p.prePower || 0) * p.floorArea;

    let Tin = Math.max(p.lo, Math.min(p.hi, mean));
    let H = enth.H(p.pcmMelt);
    let Tp = enth.T(H);
    const DAYS = hasPCM ? 6 : 3;
    const hr = {
      Tout: new Array(24).fill(0), Tin: new Array(24).fill(0), Tpcm: new Array(24).fill(0),
      liq: new Array(24).fill(0), heatW: new Array(24).fill(0), coolW: new Array(24).fill(0),
      elecKWh: new Array(24).fill(0), heatElec: new Array(24).fill(0), coolElec: new Array(24).fill(0), gasKWh: new Array(24).fill(0), fanKWh: new Array(24).fill(0), solarW: new Array(24).fill(0),
      state: new Array(24),
    };
    const outage = opts.outage; // {startHour, hours, critLo, critHi}

    for (let d = 0; d < DAYS; d++) {
      const rec = d === DAYS - 1;
      for (let h = 0; h < 24; h++) {
        if (rec) hr.state[h] = { Tin, H };
        const lightsHour = lightsOn(h, p.lightStart, p.lightH);
        let lo = p.lo, hi = p.hi;
        const ff = opts.freeFloat;
        if (smart && inWindow(h, preStart, p.peakStart)) {
          if (coolingMode) hi = Math.max(p.lo + 0.5, Math.min(p.hi, p.pcmMelt - p.pcmRange / 2 - 1));
          else lo = Math.min(p.hi - 0.5, Math.max(p.lo, p.pcmMelt + p.pcmRange / 2 + 1));
        }
        for (let k = 0; k < nPerHour; k++) {
          const t = h + (k + 0.5) / nPerHour;
          const To = climateTempAt(p, month, t) + (p.tempOffset || 0);
          const Qsol = solarFac * solarAt(t, D, G);
          const Qint = (lightsHour ? lightGain : 0) + fanW;
          const Qpcm = hasPCM ? tp.UApcm * (Tin - Tp) : 0;
          const Tfree = Tin + dt * (tp.UAtot * (To - Tin) + Qsol + Qint - Qpcm) / tp.Cin;
          let Q = 0;
          if (ff) Q = 0;
          else if (Tfree < p.lo) Q = (p.lo - Tfree) * tp.Cin / dt;
          else if (Tfree > p.hi) Q = -(Tfree - p.hi) * tp.Cin / dt;
          else if (Tfree < lo) Q = Math.min((lo - Tfree) * tp.Cin / dt, preCap);   // capped pre-charge heating
          else if (Tfree > hi) Q = -Math.min((Tfree - hi) * tp.Cin / dt, preCap);  // capped pre-charge cooling
          Tin = Tfree + Q * dt / tp.Cin;
          if (hasPCM) { H += Qpcm * dt / tp.m; Tp = enth.T(H); }
          if (rec) {
            const f = 1 / nPerHour;
            hr.Tout[h] += To * f; hr.Tin[h] += Tin * f; hr.Tpcm[h] += (hasPCM ? Tp : NaN) * f;
            hr.liq[h] += (hasPCM ? enth.liquid(H) : 0) * f; hr.solarW[h] += Qsol * f;
            const heat = Math.max(Q, 0), cool = Math.max(-Q, 0);
            hr.heatW[h] += heat * f; hr.coolW[h] += cool * f;
            const kwh = dt / 3.6e6;
            if (fanW) { hr.elecKWh[h] += fanW * kwh; hr.fanKWh[h] += fanW * kwh; }
            if (heat > 0) {
              if (p.heating === 'hp') { const e = heat / copHeat(To, p) * kwh; hr.elecKWh[h] += e; hr.heatElec[h] += e; }
              else hr.gasKWh[h] += heat / p.boilerEff * kwh;
            }
            if (cool > 0) {
              const cop = p.econ && To < Tin - 3 ? (p.econCOP ?? 15) : copCool(To, p);
              hr.elecKWh[h] += cool / cop * kwh; hr.coolElec[h] += cool / cop * kwh;
            }
          }
        }
      }
    }
    return { hr, coolingMode, D, mean };
  }

  /* HVAC-off, lights-off free float from a recorded hourly state; returns hours until a crop limit is breached. */
  function rideThrough(p, tp, month, startHour, state) {
    const clim = CLIMATES[p.climate];
    const mean = climateMean(p, month) + (p.tempOffset || 0), amp = ampOf(clim, month), G = clim.ghi[month];
    const D = dayLength(clim.lat, month);
    const solarFac = p.floorArea * p.tau * p.solarSens * (p.glazedFrac > 0 ? 1 : 0);
    const enth = makeEnthalpy(tp.pcm, p.pcmMelt, p.pcmRange);
    const hasPCM = tp.m > 0;
    let Tin = state.Tin, H = state.H, Tp = enth.T(H);
    const dt = 120, maxH = 72;
    for (let s = 0; s < maxH * 3600 / dt; s++) {
      const t = (startHour + s * dt / 3600) % 24;
      const To = climateTempAt(p, month, t) + (p.tempOffset || 0);
      // passive vents assumed to open in a greenhouse outage only if cooler outside
      const UA = tp.UAtot + (p.econ && Tin > p.hi && To < Tin ? 0.335 * tp.g.vol * (p.ventACH ?? 20) : 0); // passive roof vents
      const Qpcm = hasPCM ? tp.UApcm * (Tin - Tp) : 0;
      Tin += dt * (UA * (To - Tin) + solarFac * solarAt(t, D, G) - Qpcm) / tp.Cin;
      if (hasPCM) { H += Qpcm * dt / tp.m; Tp = enth.T(H); }
      if (Tin < p.critLo || Tin > p.critHi) return s * dt / 3600;
    }
    return maxH;
  }

  function simulateYear(p, s) {
    const tp = thermalParams(p, s);
    const months = [];
    let peakHeat = 0, peakCool = 0;
    for (let m = 0; m < 12; m++) {
      const r = simulateDay(p, tp, m);
      const ov = p._loads && p._loads[s.id] && p._loads[s.id][m];
      if (ov) applyLoadOverride(r.hr, ov, p);
      const peakElecKW = Math.max(...r.hr.elecKWh);
      const mh = Math.max(...r.hr.heatW) / 1000, mc = Math.max(...r.hr.coolW) / 1000;
      peakHeat = Math.max(peakHeat, mh); peakCool = Math.max(peakCool, mc);
      months.push({ ...r, peakElecKW, heatKWh: sum(r.hr.heatW) / 1000, coolKWh: sum(r.hr.coolW) / 1000 });
    }
    // Outage ride-through: coldest month starting at dusk, hottest month starting late morning.
    const clim = CLIMATES[p.climate];
    const means = Array.from({ length: 12 }, (_, m) => climateMean(p, m));
    const coldM = argMin(means), hotM = argMax(means);
    const coldStart = Math.round(12 + months[coldM].D / 2);
    const rtCold = rideThrough(p, tp, coldM, coldStart, months[coldM].hr.state[coldStart % 24]);
    const rtHot = rideThrough(p, tp, hotM, 11, months[hotM].hr.state[11]);
    return { tp, months, peakHeat, peakCool, rtCold, rtHot, rideThrough: Math.min(rtCold, rtHot), coldM, hotM };
  }

  /* Rescale an hourly profile so daily heating/cooling (kWh thermal) match external (e.g. COMSOL) results. */
  function applyLoadOverride(hr, ov, p) {
    const heat0 = sum(hr.heatW) / 1000, cool0 = sum(hr.coolW) / 1000;
    const scale = (key, elecKey, target, base, gas) => {
      if (target == null || !isFinite(target)) return;
      if (base > 1e-9) {
        const k = target / base;
        for (let h = 0; h < 24; h++) {
          hr[key][h] *= k;
          const de = hr[elecKey][h] * (k - 1); hr[elecKey][h] += de; hr.elecKWh[h] += de;
          if (gas) hr.gasKWh[h] *= k;
        }
      } else { // no modeled load to shape: spread evenly at nominal efficiency
        for (let h = 0; h < 24; h++) {
          const w = target * 1000 / 24; hr[key][h] = w;
          if (gas && p.heating === 'gas') hr.gasKWh[h] = w / 1000 / p.boilerEff;
          else { const e = w / 1000 / 3; hr[elecKey][h] = e; hr.elecKWh[h] += e; }
        }
      }
    };
    scale('heatW', 'heatElec', ov.heat, heat0, true);
    scale('coolW', 'coolElec', ov.cool, cool0, false);
    hr.overridden = true;
  }

  function sum(a) { let s = 0; for (const v of a) s += v; return s; }
  function argMin(a) { return a.indexOf(Math.min(...a)); }
  function argMax(a) { return a.indexOf(Math.max(...a)); }

  /* Economics. mult: {energy, pcmPrice} overrides for sensitivity maps. */
  function economics(p, s, sim, mult) {
    mult = mult || {};
    const eMult = mult.energy == null ? 1 : mult.energy;
    const electricityMult = mult.electricity == null ? 1 : mult.electricity;
    const pcmPrice = mult.pcmPrice == null ? p.pcmPrice : mult.pcmPrice;
    let elecKWh = 0, gasKWh = 0, elecCost = 0, peakKWh = 0, demandCost = 0;
    sim.months.forEach((mo, m) => {
      const n = DAYS_IN_MONTH[m];
      for (let h = 0; h < 24; h++) {
        const onPeak = inWindow(h, p.peakStart, p.peakEnd);
        const e = mo.hr.elecKWh[h] * n;
        elecKWh += e; if (onPeak) peakKWh += e;
        const hourlyRate = p._tariffProfile && p._tariffProfile.currency === 'USD' &&
          p._tariffProfile.hourly && p._tariffProfile.hourly[m] &&
          Number.isFinite(p._tariffProfile.hourly[m][h])
          ? p._tariffProfile.hourly[m][h] : (onPeak ? p.pricePeak : p.priceOff);
        elecCost += e * hourlyRate;
        gasKWh += mo.hr.gasKWh[h] * n;
      }
      demandCost += mo.peakElecKW * p.demandCharge;
    });
    const gasCost = gasKWh * p.gasPrice / KWH_PER_THERM;
    const energyCost = (elecCost * electricityMult + gasCost) * eMult;
    demandCost *= eMult;
    const co2t = (elecKWh * p.gridCO2 + gasKWh * (p.gasCO2 ?? GAS_CO2)) / 1000;
    const carbonCost = co2t * p.carbonPrice;

    const tp = sim.tp;
    const pcmCapex = s.pcm ? tp.m * pcmPrice + tp.area * (p.pcmInstall + (p.pcmFan ? p.fanCapex || 0 : 0)) : 0;
    const insCapex = s.upgrade
      ? Math.max(0, p.Rup - p.R) * p.insCost * tp.g.opA + (p.Uglaz > p.UglazUp ? tp.g.glazA * p.glazUpCost : 0)
      : 0;
    const capHeat = sim.peakHeat * p.sizing, capCool = sim.peakCool * p.sizing;
    const hvacCapex = p.creditHVAC ? (capHeat + capCool) * p.hvacCost : 0;
    let extraCapex = 0, extraAnnual = 0;
    for (const x of p.extras || []) {
      if (!x || x.enabled === false) continue;
      const applies = x.applies === 'all' || x.applies === s.id || (x.applies === 'anyPcm' && s.pcm) || (x.applies === 'noPcm' && !s.pcm) || (x.applies === 'anyUpgrade' && s.upgrade);
      if (!applies) continue;
      const amt = +x.amount * (x.perM2 ? p.floorArea : 1) || 0;
      if (x.kind === 'annual') extraAnnual += amt; else extraCapex += amt;
    }
    const capex = pcmCapex + insCapex + hvacCapex + extraCapex;
    const maint = pcmCapex * (p.maintPct ?? 0.5) / 100;

    const crop = { yieldKg: p.yieldKg, price: p.cropPrice, cycle: p.cycle };
    const annualYieldKg = p.floorArea * p.tiers * crop.yieldKg;
    const standingCrop = annualYieldKg * crop.price * crop.cycle / 365;
    const survives = sim.rideThrough >= p.outageHours;
    const outageRisk = p.includeOutage ? p.outagesPerYear * (survives ? 0 : standingCrop) : 0;

    const r = p.discount / 100, esc = p.escalation / 100, N = p.horizon;
    const life = PCMS[p.pcmType].life;
    const cum = [capex]; const cumNom = [capex];
    let lcc = capex, nom = capex;
    for (let y = 1; y <= N; y++) {
      let cf = (energyCost + demandCost) * Math.pow(1 + esc, y - 1) + carbonCost + maint + outageRisk + extraAnnual;
      if (s.pcm && y % life === 0 && y < N) cf += pcmCapex;
      lcc += cf / Math.pow(1 + r, y); nom += cf;
      cum.push(lcc); cumNom.push(nom);
    }
    const annualOpex = energyCost + demandCost + carbonCost + maint + outageRisk + extraAnnual;
    return {
      elecKWh, gasKWh, peakKWh, elecCost: elecCost * electricityMult * eMult, gasCost: gasCost * eMult, energyCost, demandCost,
      carbonCost, co2t, maint, outageRisk, survives, standingCrop, annualYieldKg,
      pcmCapex, insCapex, hvacCapex, extraCapex, extraAnnual, capex, capHeat, capCool, annualOpex, lcc, cum, cumNom,
      costPerKg: (energyCost + demandCost) / annualYieldKg,
    };
  }

  function runAll(p) {
    const out = {};
    for (const s of STRATEGIES) {
      const sim = simulateYear(p, s);
      out[s.id] = { s, sim, eco: economics(p, s, sim) };
    }
    out.verdict = verdict(out);
    return out;
  }

  function verdict(out) {
    const ids = ['base', 'trad', 'pcm', 'hybrid'];
    const best = ids.reduce((a, b) => (out[a].eco.lcc <= out[b].eco.lcc ? a : b));
    const bestNon = out.base.eco.lcc <= out.trad.eco.lcc ? 'base' : 'trad';
    const bestPcm = out.pcm.eco.lcc <= out.hybrid.eco.lcc ? 'pcm' : 'hybrid';
    return { best, bestNon, bestPcm, savings: out[bestNon].eco.lcc - out[bestPcm].eco.lcc };
  }

  function paybackYear(cumA, cumB) { // first year where A (investment) <= B (reference)
    for (let y = 0; y < cumA.length; y++) if (cumA[y] <= cumB[y]) return y;
    return null;
  }

  const BUILTIN = {
    climates: Object.keys(CLIMATES), facilities: Object.keys(FACILITIES), pcms: Object.keys(PCMS), crops: Object.keys(CROPS),
  };
  const TABLES = { climates: CLIMATES, facilities: FACILITIES, pcms: PCMS, crops: CROPS };
  const ORIGINAL = JSON.parse(JSON.stringify(TABLES));
  /* Merge user-defined library entries (from the Customize panel or custom.json). Returns a list of problems. */
  function registerLibrary(lib) {
    const errs = [];
    const need = {
      climates: ['name', 'lat', 'amp', 'mean', 'ghi'],
      facilities: ['name', 'floorArea', 'height', 'glazedFrac', 'Uglaz', 'UglazUp', 'R', 'Rup', 'ach', 'waterL', 'structKJ', 'tau', 'solarSens', 'lightW', 'lightH', 'lightStart', 'tiers'],
      pcms: ['name', 'L', 'rho', 'k', 'cp', 'price', 'life'],
      crops: ['name', 'lo', 'hi', 'critLo', 'critHi', 'yieldKg', 'price', 'cycle'],
    };
    // remove previously registered custom entries
    for (const t in TABLES) for (const k of Object.keys(TABLES[t])) if (!BUILTIN[t].includes(k)) delete TABLES[t][k];
    for (const t in TABLES) for (const k of BUILTIN[t]) TABLES[t][k] = JSON.parse(JSON.stringify(ORIGINAL[t][k])); // undo overrides
    for (const t in lib || {}) {
      if (!TABLES[t]) { errs.push(`Unknown category "${t}"`); continue; }
      for (const [k, v] of Object.entries(lib[t] || {})) {
        const miss = need[t].filter((f) => v[f] == null);
        if (t === 'climates' && v.mean && (v.mean.length !== 12 || (v.ghi || []).length !== 12)) miss.push('12 monthly values for mean & ghi');
        if (miss.length) { errs.push(`${t}.${k}: missing ${miss.join(', ')}`); continue; }
        TABLES[t][k] = { econ: false, ...v };
      }
    }
    return errs;
  }

  const API = {
    MONTHS, DAYS_IN_MONTH, CLIMATES, FACILITIES, PCMS, CROPS, STRATEGIES,
    climateMean, climateTempAt,
    BUILTIN, registerLibrary, dayLength, thermalParams, simulateDay, simulateYear, economics, runAll, verdict, paybackYear, copHeat, copCool,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else global.PF = API;
})(typeof window !== 'undefined' ? window : globalThis);
