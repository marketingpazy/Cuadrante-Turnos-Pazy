/* global html2canvas */

const STORAGE_KEY = "turnosPazy.localState.v4";
const MAX_GENERATION_HISTORY = 50;
const DEFAULT_PEOPLE = ["Georgi Valeriev", "Antonella Sipan", "Iñigo Puyol", "Luz Romero", "Patricia Lopez", "Jorge Romera", "Irene Peñalosa", "Maria Jose Rubio", "Alessandra Solis", "Adrian Garces", "Ignacio Rivas", "Alonso Garcia", "Rodrigo Fernandez", "Lara Carrasco"];
const DAYS = [{ key: "JUE", label: "Jueves" }, { key: "VIE", label: "Viernes" }, { key: "SAB", label: "Sábado" }, { key: "DOM", label: "Domingo" }, { key: "LUN", label: "Lunes" }, { key: "MAR", label: "Martes" }, { key: "MIE", label: "Miércoles" }];
const FRANJAS = [{ key: "MANANA", label: "Mañana" }, { key: "TARDE", label: "Tarde" }, { key: "NOCHE", label: "Noche" }];
const TIPOS = [{ key: "FIJO", label: "Fijo" }, { key: "BACKUP", label: "Back-up" }];

const qs = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id}`);
  return el;
};
const clamp = (s) => String(s ?? "").trim();
const norm = (s) => clamp(s).replace(/\s+/g, " ");
const uniq = (arr) => Array.from(new Set(arr));
const sortNames = (arr) => [...arr].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const status = (text, kind = "muted") => {
  const el = qs("status");
  el.className = `status ${kind}`;
  el.textContent = text;
};
const NAME_FIX = {
  "Irene Penalosa": "Irene Peñalosa",
  "Inigo Puyol": "Iñigo Puyol",
};
/** Claves normalizadas de personas retiradas del cuadrante (no aparecen ni en datos guardados). */
const EXCLUDED_PERSON_KEYS = new Set(["magui cerda"]);
const DEFAULT_VAC_SHEET_URL = "https://docs.google.com/spreadsheets/d/1eAFz2aAyk57GBtax1GEOEVTZMRVUFUI0WjECzz3PmnM/edit?pli=1&gid=1549907077#gid=1549907077";
/** Rango amplio para leer filas de vacaciones desde el export de la hoja (no solo la semana en pantalla). */
const VAC_AUTO_FETCH_FROM_ISO = "2025-01-01";
const VAC_AUTO_FETCH_TO_ISO = "2032-12-31";
const MONTH_MAP = {
  ene: 0, enero: 0,
  feb: 1, febrero: 1,
  mar: 2, marzo: 2,
  abr: 3, abril: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5,
  jul: 6, julio: 6,
  ago: 7, agosto: 7,
  sep: 8, set: 8, septiembre: 8, setiembre: 8,
  oct: 9, octubre: 9,
  nov: 10, noviembre: 10,
  dic: 11, diciembre: 11,
};
const FIXED_HOLIDAYS = [
  { iso: "2026-05-01", name: "Fiesta del Trabajo", type: "Nacional" },
  { iso: "2026-05-02", name: "Fiesta de la Comunidad de Madrid", type: "Autonomico" },
  { iso: "2026-05-15", name: "San Isidro Labrador", type: "Local Madrid capital" },
  { iso: "2026-08-15", name: "Asuncion de la Virgen", type: "Nacional" },
  { iso: "2026-10-12", name: "Fiesta Nacional de Espana", type: "Nacional" },
  { iso: "2026-11-02", name: "Traslado de Todos los Santos", type: "Nacional / traslado" },
  { iso: "2026-11-09", name: "Nuestra Senora de la Almudena", type: "Local Madrid capital" },
  { iso: "2026-12-07", name: "Traslado del Dia de la Constitucion", type: "Nacional / traslado" },
  { iso: "2026-12-08", name: "Inmaculada Concepcion", type: "Nacional" },
  { iso: "2026-12-25", name: "Navidad", type: "Nacional" },
  { iso: "2027-01-01", name: "Ano Nuevo", type: "Nacional" },
  { iso: "2027-01-06", name: "Reyes", type: "Nacional" },
  { iso: "2027-03-25", name: "Jueves Santo", type: "Autonomico / laboral en Madrid" },
  { iso: "2027-03-26", name: "Viernes Santo", type: "Nacional" },
  { iso: "2027-05-01", name: "Fiesta del Trabajo", type: "Nacional" },
  { iso: "2027-05-03", name: "Traslado del Dia de la Comunidad de Madrid", type: "Autonomico" },
  { iso: "2027-05-15", name: "San Isidro Labrador", type: "Local Madrid capital" },
  { iso: "2027-07-26", name: "Traslado de Santiago Apostol", type: "Autonomico / sustituible" },
  { iso: "2027-08-16", name: "Traslado de la Asuncion de la Virgen", type: "Nacional / traslado" },
  { iso: "2027-10-12", name: "Fiesta Nacional de Espana", type: "Nacional" },
  { iso: "2027-11-01", name: "Todos los Santos", type: "Nacional" },
  { iso: "2027-11-09", name: "Nuestra Senora de la Almudena", type: "Local Madrid capital" },
  { iso: "2027-12-06", name: "Dia de la Constitucion Espanola", type: "Nacional" },
  { iso: "2027-12-08", name: "Inmaculada Concepcion", type: "Nacional" },
  { iso: "2027-12-25", name: "Navidad", type: "Nacional" },
];
const HOLIDAY_BY_ISO = Object.fromEntries(FIXED_HOLIDAYS.map((h) => [h.iso, h]));

function fixName(s) {
  const n = norm(s);
  return NAME_FIX[n] || n;
}

function normalizeKey(s) {
  return norm(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isExcludedPerson(name) {
  const raw = norm(name || "");
  if (!raw) return false;
  const key = normalizeKey(fixName(raw));
  if (EXCLUDED_PERSON_KEYS.has(key)) return true;
  const ascii = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
  return ascii === "magui cerda";
}

/** Limpia listas y cuadrantes guardados para que no queden excluid@s. */
function sanitizeLocalState(state) {
  state.teamRosterPinned = true;
  state.teamRemovedPersonKeys = uniq(
    (Array.isArray(state.teamRemovedPersonKeys) ? state.teamRemovedPersonKeys : [])
      .map((k) => normalizeKey(String(k)))
      .filter(Boolean),
  ).slice(0, 200);
  const removedSet = new Set(state.teamRemovedPersonKeys);

  const keepPerson = (p) => {
    const n = fixName(p);
    if (!n || isExcludedPerson(n)) return false;
    return !removedSet.has(normalizeKey(n));
  };

  /** Lista activa a partir del JSON guardado (puede estar vacía a propósito). */
  let fromSaved = uniq((Array.isArray(state.people) ? state.people : []).map(fixName).filter(Boolean).filter(keepPerson));
  if (!fromSaved.length && (!Array.isArray(state.people) || state.people === null || state.people === undefined)) {
    /** Primera vez / sin campo `people`: plantilla inicial. */
    fromSaved = uniq(DEFAULT_PEOPLE.map(fixName).filter(Boolean).filter(keepPerson));
  }
  /** Si falta equipo o sólo hay bajas manuales, rellena con plantilla menos esas bajas (nunca reincorporamos a quien se quitó a mano). */
  state.people = sortNames(fromSaved.length ? fromSaved : uniq(DEFAULT_PEOPLE.map(fixName).filter(Boolean).filter(keepPerson)));

  state.vacationRanges = Array.isArray(state.vacationRanges)
    ? state.vacationRanges.filter((r) => !isExcludedPerson(r.person) && !removedSet.has(normalizeKey(fixName(r.person))))
    : [];

  const schedules = state.schedulesByWeek || {};
  for (const ws of Object.keys(schedules)) {
    const sch = schedules[ws];
    if (!sch?.slots) continue;
    for (const id of Object.keys(sch.slots)) {
      const slot = sch.slots[id];
      if (!slot) continue;
      const a = norm(slot.asignadoA || "");
      if (!a) continue;
      if (!isExcludedPerson(a) && !removedSet.has(normalizeKey(fixName(a)))) continue;
      sch.slots[id] = { ...slot, asignadoA: "" };
    }
  }

  state.generationHistory = Array.isArray(state.generationHistory) ? state.generationHistory : [];
  for (const h of state.generationHistory) {
    if (h && h.savedAtMs == null && h.savedAt) h.savedAtMs = new Date(h.savedAt).getTime();
  }
  state.generationHistory = state.generationHistory
    .filter((h) => h && h.id && typeof h.weekStart === "string" && h.savedAt && h.slots && typeof h.slots === "object")
    .sort((a, b) => (Number(b.savedAtMs) || 0) - (Number(a.savedAtMs) || 0))
    .slice(0, MAX_GENERATION_HISTORY);

  return state;
}

/** Lista activa de comerciales (única fuente para desplegables y generación). */
function allVentasForDropdown(state) {
  const list = Array.isArray(state.people) ? state.people : [];
  return sortNames(uniq(list.map(fixName).filter(Boolean).filter((p) => !isExcludedPerson(p))));
}

function purgePersonFromState(state, personDisplayName) {
  const k = normalizeKey(fixName(personDisplayName));
  if (!k) return;
  state.vacationRanges = (state.vacationRanges || []).filter((r) => normalizeKey(fixName(r.person)) !== k);
  const weeks = state.schedulesByWeek || {};
  for (const ws of Object.keys(weeks)) {
    const sch = weeks[ws];
    if (!sch?.slots) continue;
    for (const id of Object.keys(sch.slots)) {
      const sl = sch.slots[id];
      if (!sl?.asignadoA) continue;
      if (normalizeKey(fixName(sl.asignadoA)) !== k) continue;
      sch.slots[id] = { ...sl, asignadoA: "" };
    }
  }
}

function renderTeamPanel(state) {
  const sel = document.getElementById("teamRemovePerson");
  if (!sel) return;
  const list = allVentasForDropdown(state);
  sel.innerHTML = "";
  sel.appendChild(new Option("— Elige comercial —", ""));
  for (const p of list) sel.appendChild(new Option(p, p));
}

function parseSheetRef(url) {
  const m = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const sheetId = m[1];
  const gidMatch = String(url).match(/[?&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return { sheetId, gid };
}

function csvUrlFromSheetUrl(url) {
  const ref = parseSheetRef(url);
  if (!ref) return null;
  return `https://docs.google.com/spreadsheets/d/${ref.sheetId}/gviz/tq?tqx=out:tsv&gid=${ref.gid}`;
}

function parseCsv(text) {
  if (String(text || "").includes("\t")) {
    return String(text)
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.split("\t"));
  }
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === "," && !inQ) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQ) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  rows.push(row);
  return rows;
}

function normalizeCellForVac(s) {
  return normalizeKey(s).replace(/\./g, "");
}

function countMonthTokens(row) {
  return row.reduce((acc, cell) => (MONTH_MAP[normalizeCellForVac(cell)] != null ? acc + 1 : acc), 0);
}

function countDayTokens(row) {
  return row.reduce((acc, cell) => {
    const n = Number(String(cell || "").replace(/[^\d]/g, ""));
    return Number.isInteger(n) && n >= 1 && n <= 31 ? acc + 1 : acc;
  }, 0);
}

function countWeekdayTokens(row) {
  return row.reduce((acc, cell) => {
    const x = normalizeCellForVac(cell);
    return ["l", "m", "x", "j", "v", "s", "d"].includes(x) ? acc + 1 : acc;
  }, 0);
}

function detectDateRows(grid) {
  let dayRowIdx = -1;
  let bestDayScore = 0;
  for (let r = 1; r < grid.length; r++) {
    const dayScore = countDayTokens(grid[r] || []);
    const weekScore = countWeekdayTokens(grid[r - 1] || []);
    if (dayScore >= 8 && weekScore >= 5 && dayScore > bestDayScore) {
      bestDayScore = dayScore;
      dayRowIdx = r;
    }
  }
  if (dayRowIdx < 0) return null;
  const monthRowIdx = Math.max(0, dayRowIdx - 2);
  if (countMonthTokens(grid[monthRowIdx] || []) < 1) return null;
  return { monthRowIdx, dayRowIdx };
}

function buildDateColumns(grid, baseYear) {
  const rows = detectDateRows(grid);
  if (!rows) return { columns: [], dayRowIdx: -1 };
  const monthRow = grid[rows.monthRowIdx] || [];
  const dayRow = grid[rows.dayRowIdx] || [];
  const out = [];
  let lastMonth = -1;
  let currentMonth = -1;
  let year = baseYear;
  for (let c = 0; c < Math.max(monthRow.length, dayRow.length); c++) {
    const rawMonth = normalizeCellForVac(monthRow[c] || "");
    if (MONTH_MAP[rawMonth] != null) currentMonth = MONTH_MAP[rawMonth];
    const dayNum = Number(String(dayRow[c] || "").replace(/[^\d]/g, ""));
    if (currentMonth < 0 || !Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) continue;
    const monthIdx = currentMonth;
    if (monthIdx == null) continue;
    if (lastMonth !== -1 && monthIdx < lastMonth) year += 1;
    lastMonth = monthIdx;
    out.push({ c, iso: `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` });
  }
  return { columns: out, dayRowIdx: rows.dayRowIdx };
}

function detectNameColumn(grid, dayRowIdx, people) {
  const allowed = new Set(people.map((p) => normalizeKey(p)));
  let bestCol = 2;
  let bestScore = -1;
  const maxCols = Math.max(...grid.map((r) => r.length), 0);
  for (let c = 0; c < maxCols; c++) {
    let score = 0;
    for (let r = Math.max(0, dayRowIdx + 1); r < grid.length; r++) {
      const cell = normalizeKey(fixName(grid[r]?.[c] || ""));
      if (allowed.has(cell)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return { nameCol: bestCol, nameHits: bestScore };
}

function compactRanges(sortedIsos) {
  if (!sortedIsos.length) return [];
  const out = [];
  let from = sortedIsos[0];
  let prev = sortedIsos[0];
  for (let i = 1; i < sortedIsos.length; i++) {
    const cur = sortedIsos[i];
    const expected = toISO(addDays(parseISO(prev), 1));
    if (cur !== expected) {
      out.push({ from, to: prev });
      from = cur;
    }
    prev = cur;
  }
  out.push({ from, to: prev });
  return out;
}

function applyAdjacentWeekendRule(isoSet) {
  const extra = new Set();
  for (const iso of isoSet) {
    const dt = parseISO(iso);
    if (!dt) continue;
    const day = dt.getDay();
    if (day === 5) {
      extra.add(toISO(addDays(dt, 1)));
      extra.add(toISO(addDays(dt, 2)));
    }
    if (day === 1) {
      extra.add(toISO(addDays(dt, -1)));
      extra.add(toISO(addDays(dt, -2)));
    }
  }
  for (const iso of extra) isoSet.add(iso);
}

/**
 * Regla puente con festivo:
 * - Si hay festivo en viernes y la persona tiene vacaciones el jueves anterior,
 *   se bloquea tambien viernes (festivo) + sabado + domingo.
 * - Si hay festivo en lunes y la persona tiene vacaciones el martes siguiente,
 *   se bloquea tambien lunes (festivo) + sabado + domingo previos.
 */
function applyHolidayBridgeRule(isoSet) {
  const extra = new Set();
  for (const h of FIXED_HOLIDAYS) {
    const dt = parseISO(h.iso);
    if (!dt) continue;
    const dow = dt.getDay();
    if (dow === 5) {
      const thursdayIso = toISO(addDays(dt, -1));
      if (isoSet.has(thursdayIso)) {
        extra.add(h.iso);
        extra.add(toISO(addDays(dt, 1)));
        extra.add(toISO(addDays(dt, 2)));
      }
    }
    if (dow === 1) {
      const tuesdayIso = toISO(addDays(dt, 1));
      if (isoSet.has(tuesdayIso)) {
        extra.add(h.iso);
        extra.add(toISO(addDays(dt, -1)));
        extra.add(toISO(addDays(dt, -2)));
      }
    }
  }
  for (const iso of extra) isoSet.add(iso);
}

function buildDateColumnsFixedLayout(grid, fallbackYear) {
  const YEAR_ROW = 10; // fila 11
  const MONTH_ROW = 11; // fila 12
  const DAY_ROW = 13; // fila 14
  const yearRow = grid[YEAR_ROW] || [];
  const monthRow = grid[MONTH_ROW] || [];
  const dayRow = grid[DAY_ROW] || [];
  const maxCols = Math.max(yearRow.length, monthRow.length, dayRow.length);
  const out = [];
  let currentMonth = -1;
  let currentYear = Number(fallbackYear) || new Date().getFullYear();
  let lastMonth = -1;
  const monthFromAnyCell = (cell) => {
    const x = normalizeCellForVac(cell || "");
    if (!x) return null;
    for (const [k, v] of Object.entries(MONTH_MAP)) {
      if (x.includes(k)) return v;
    }
    return null;
  };
  for (let c = 0; c < maxCols; c++) {
    const yearCell = String(yearRow[c] || "");
    const yearMatch = yearCell.match(/\b(20\d{2})\b/);
    if (yearMatch) currentYear = Number(yearMatch[1]);
    const monthHit = monthFromAnyCell(monthRow[c] || "");
    if (monthHit != null) currentMonth = monthHit;
    const dayNum = Number(String(dayRow[c] || "").replace(/[^\d]/g, ""));
    if (currentMonth < 0 || !Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) continue;
    if (lastMonth !== -1 && currentMonth < lastMonth && !yearMatch) currentYear += 1;
    lastMonth = currentMonth;
    out.push({ c, iso: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` });
  }
  return out;
}

function inIsoRange(iso, fromIso, toIso) {
  if (!fromIso || !toIso) return true;
  return iso >= fromIso && iso <= toIso;
}

function parseIsoFlexible(value) {
  const raw = clamp(value);
  const ymd = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const gvizDate = raw.match(/Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)/i);
  if (gvizDate) {
    const y = Number(gvizDate[1]);
    const m = Number(gvizDate[2]) + 1;
    const d = Number(gvizDate[3]);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) return toISO(dt);
  return "";
}

function parseExportGrid(rawText) {
  const text = String(rawText || "");
  if (!text.includes("google.visualization.Query.setResponse(")) {
    return parseCsv(text);
  }
  const m = text.match(/setResponse\(([\s\S]+)\);?\s*$/);
  if (!m) return [];
  let payload;
  try {
    payload = JSON.parse(m[1]);
  } catch {
    return [];
  }
  const rows = payload?.table?.rows || [];
  const out = [["Nombre", "Fecha", "Tipo"]];
  for (const r of rows) {
    const c = r?.c || [];
    const name = c[0]?.v ?? "";
    const fecha = c[1]?.f ?? c[1]?.v ?? "";
    const tipo = c[2]?.v ?? "";
    out.push([String(name), String(fecha), String(tipo)]);
  }
  return out;
}

function extractAutoVacationRangesFromExportTable(rawText, people, fromIso, toIso) {
  const grid = parseExportGrid(rawText);
  if (!grid.length) return [];
  const allowedByKey = new Map(people.map((p) => [normalizeKey(p), p]));
  const personDays = new Map(people.map((p) => [p, new Set()]));
  for (let r = 1; r < grid.length; r++) {
    const nameRaw = fixName(grid[r]?.[0] || ""); // A: Nombre
    if (isExcludedPerson(nameRaw)) continue;
    const iso = parseIsoFlexible(grid[r]?.[1] || ""); // B: Fecha
    if (!iso || !inIsoRange(iso, fromIso, toIso)) continue;
    const canonical = allowedByKey.get(normalizeKey(nameRaw));
    if (!canonical) continue;
    personDays.get(canonical).add(iso);
  }
  const ranges = [];
  for (const [person, setDays] of personDays.entries()) {
    if (!setDays.size) continue;
    applyAdjacentWeekendRule(setDays);
    applyHolidayBridgeRule(setDays);
    const sorted = [...setDays].sort();
    for (const rg of compactRanges(sorted)) ranges.push({ person, from: rg.from, to: rg.to, source: "auto" });
  }
  return ranges;
}

function detectFirstPeopleRow(grid, people) {
  const allowed = new Set(people.map((p) => normalizeKey(p)));
  for (let r = 0; r < grid.length; r++) {
    const name = normalizeKey(fixName(grid[r]?.[2] || ""));
    if (allowed.has(name)) return r;
  }
  return 14; // fallback histórico (fila 15)
}

function extractAutoVacationRanges(csvText, people, baseYear, fromIso, toIso) {
  const grid = parseCsv(csvText);
  if (!grid.length) return [];
  let columns = buildDateColumnsFixedLayout(grid, baseYear);
  if (!columns.length) {
    const dyn = buildDateColumns(grid, baseYear);
    columns = dyn.columns || [];
  }
  if (!columns.length) return [];
  const nameCol = 2; // columna C
  const firstPersonRow = detectFirstPeopleRow(grid, people);
  const allowedByKey = new Map(people.map((p) => [normalizeKey(p), p]));
  const personDays = new Map(people.map((p) => [p, new Set()]));
  for (let r = firstPersonRow; r < grid.length; r++) {
    const nameCell = fixName(grid[r]?.[nameCol] || "");
    const name = allowedByKey.get(normalizeKey(nameCell));
    if (!name) continue;
    for (const col of columns) {
      if (!inIsoRange(col.iso, fromIso, toIso)) continue;
      const cellRaw = clamp(grid[r]?.[col.c] || "");
      if (cellRaw.toLowerCase() === "v") personDays.get(name).add(col.iso);
    }
  }
  const ranges = [];
  for (const [person, setDays] of personDays.entries()) {
    if (!setDays.size) continue;
    applyAdjacentWeekendRule(setDays);
    applyHolidayBridgeRule(setDays);
    const sorted = [...setDays].sort();
    for (const rg of compactRanges(sorted)) {
      ranges.push({ person, from: rg.from, to: rg.to, source: "auto" });
    }
  }
  return ranges;
}

function parseOcrWord(text) {
  return normalizeKey(text || "").replace(/[^a-z0-9]/g, "");
}

function monthFromTextLoose(text) {
  const x = normalizeCellForVac(text || "");
  if (!x) return null;
  for (const [k, v] of Object.entries(MONTH_MAP)) {
    if (x.includes(k)) return v;
  }
  return null;
}

async function extractAutoVacationRangesFromImage(file, people, baseYear) {
  const ensureTesseractLoaded = () => new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-ocr="tesseract"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar OCR")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.async = true;
    s.defer = true;
    s.dataset.ocr = "tesseract";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar OCR"));
    document.head.appendChild(s);
  });
  await ensureTesseractLoaded();
  if (!window.Tesseract) throw new Error("OCR no disponible");
  const allowed = new Map(people.map((p) => [normalizeKey(p), p]));
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = imageUrl;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.max(2, 2200 / Math.max(1, img.width));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = Math.round((d[i] * 0.299) + (d[i + 1] * 0.587) + (d[i + 2] * 0.114));
      const bw = gray > 160 ? 255 : 0;
      d[i] = bw;
      d[i + 1] = bw;
      d[i + 2] = bw;
    }
    ctx.putImageData(id, 0, 0);
    const res = await window.Tesseract.recognize(canvas, "spa+eng", {
      tessedit_pageseg_mode: "11",
      preserve_interword_spaces: "1",
    });
    const words = (res?.data?.words || []).map((w) => ({
      text: String(w.text || ""),
      norm: parseOcrWord(w.text),
      x: w.bbox?.x0 ?? 0,
      y: w.bbox?.y0 ?? 0,
      w: (w.bbox?.x1 ?? 0) - (w.bbox?.x0 ?? 0),
      h: (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0),
    })).filter((w) => w.norm);
    if (!words.length) return [];

    const monthAnchors = words
      .map((w) => ({ ...w, month: monthFromTextLoose(w.text) }))
      .filter((w) => w.month != null)
      .sort((a, b) => a.x - b.x);
    const dayWords = words
      .map((w) => ({ ...w, day: Number(w.norm) }))
      .filter((w) => Number.isInteger(w.day) && w.day >= 1 && w.day <= 31 && monthAnchors.length)
      .filter((w) => {
        const nearestMonthY = monthAnchors.reduce((best, m) => Math.abs(m.x - w.x) < Math.abs(best.x - w.x) ? m : best, monthAnchors[0]).y;
        return w.y >= nearestMonthY && w.y <= nearestMonthY + 170;
      })
      .sort((a, b) => a.x - b.x);
    if (!dayWords.length) return [];

    let year = Number(baseYear) || new Date().getFullYear();
    const columns = dayWords.map((d) => {
      const monthAnchor = monthAnchors
        .filter((m) => m.x <= d.x + Math.max(2, d.w * 0.2))
        .sort((a, b) => b.x - a.x)[0] || monthAnchors[0];
      return { x: d.x + d.w / 2, iso: `${year}-${String(monthAnchor.month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` };
    });

    const leftBoundary = Math.min(...dayWords.map((d) => d.x)) - 30;
    const nameRows = [];
    for (const p of people) {
      const tokens = normalizeKey(p).split(" ").filter(Boolean);
      if (!tokens.length) continue;
      const first = tokens[0];
      const cands = words.filter((w) => w.x < leftBoundary && w.norm === first);
      if (!cands.length) continue;
      const pick = cands[0];
      nameRows.push({ person: allowed.get(normalizeKey(p)) || p, y: pick.y + pick.h / 2 });
    }
    if (!nameRows.length) return [];

    const personDays = new Map(people.map((p) => [p, new Set()]));
    const vWords = words.filter((w) => w.norm === "v" && w.x >= leftBoundary);
    for (const vw of vWords) {
      const row = nameRows.reduce((best, r) => Math.abs(r.y - vw.y) < Math.abs(best.y - vw.y) ? r : best, nameRows[0]);
      if (Math.abs(row.y - vw.y) > 28) continue;
      const col = columns.reduce((best, c) => Math.abs(c.x - vw.x) < Math.abs(best.x - vw.x) ? c : best, columns[0]);
      personDays.get(row.person)?.add(col.iso);
    }

    const ranges = [];
    for (const [person, setDays] of personDays.entries()) {
      if (!setDays.size) continue;
      applyAdjacentWeekendRule(setDays);
      applyHolidayBridgeRule(setDays);
      const sorted = [...setDays].sort();
      for (const rg of compactRanges(sorted)) ranges.push({ person, from: rg.from, to: rg.to, source: "auto" });
    }
    return ranges;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function computeThursday(isoDate) {
  const d = isoDate ? parseISO(isoDate) : new Date();
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diff = (x.getDay() - 4 + 7) % 7;
  x.setDate(x.getDate() - diff);
  return toISO(x);
}

function getHolidayInfo(iso) {
  return HOLIDAY_BY_ISO[iso] || null;
}

function isNonWorkingDate(dateOrIso) {
  const iso = typeof dateOrIso === "string" ? dateOrIso : toISO(dateOrIso);
  const date = typeof dateOrIso === "string" ? parseISO(dateOrIso) : dateOrIso;
  const day = date?.getDay?.() ?? -1;
  return day === 0 || day === 6 || Boolean(getHolidayInfo(iso));
}

function weekFrom(startISO) {
  const base = parseISO(startISO);
  return DAYS.map((day, i) => {
    const dt = addDays(base, i);
    return { ...day, iso: toISO(dt), date: dt };
  });
}

/** Fecha en español: 9 de abril de 2026 (día número, mes escrito, año). */
function formatDayLineSpanish(date) {
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function slotId(iso, franja, tipo) {
  return `${iso}__${franja}__${tipo}`;
}

function emptySchedule(weekStart) {
  const out = { weekStart, slots: {} };
  for (const d of weekFrom(weekStart)) {
    for (const f of FRANJAS) {
      for (const t of TIPOS) {
        const id = slotId(d.iso, f.key, t.key);
        const forceTodosMorning = f.key === "MANANA" && !isNonWorkingDate(d.date) && [1, 2, 3, 4, 5].includes(d.date.getDay());
        out.slots[id] = {
          id,
          fecha: d.iso,
          franja: f.key,
          tipo: t.key,
          modo: forceTodosMorning ? "TODOS" : "NORMAL",
          asignadoA: "",
        };
      }
    }
  }
  return out;
}

function pushGenerationHistory(state, schedule) {
  if (!schedule?.slots || !schedule.weekStart) return;
  const hist = Array.isArray(state.generationHistory) ? state.generationHistory : [];
  const nowMs = Date.now();
  const entry = {
    id: `${nowMs}_${Math.random().toString(36).slice(2, 10)}`,
    savedAt: new Date(nowMs).toISOString(),
    savedAtMs: nowMs,
    weekStart: schedule.weekStart,
    tiradaNum: Number(state.generationCounter || 0),
    slots: JSON.parse(JSON.stringify(schedule.slots)),
  };
  state.generationHistory = [entry, ...hist].slice(0, MAX_GENERATION_HISTORY);
}

function getFilteredGenerationHistory(state, filterDayIso) {
  const raw = Array.isArray(state.generationHistory) ? [...state.generationHistory] : [];
  raw.sort((a, b) => (Number(b.savedAtMs) || 0) - (Number(a.savedAtMs) || 0));
  const fd = clamp(filterDayIso || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fd)) return raw;
  return raw.filter((e) => {
    const ms = Number(e.savedAtMs) || new Date(e.savedAt).getTime();
    return toISO(new Date(ms)) === fd;
  });
}

function formatWeekHistoryRange(weekStartIso) {
  try {
    const w = weekFrom(computeThursday(weekStartIso));
    const a = w[0].date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const b = w[6].date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    return `${a} → ${b}`;
  } catch {
    return String(weekStartIso || "");
  }
}

function historyEntrySelectLabel(e) {
  const ms = Number(e.savedAtMs) || new Date(e.savedAt).getTime();
  const d = new Date(ms);
  const dayPart = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const wr = formatWeekHistoryRange(e.weekStart);
  return `${dayPart} ${timePart} · ${wr} · #${e.tiradaNum}`;
}

function findGenerationHistoryEntry(state, id) {
  if (!id) return null;
  return (state.generationHistory || []).find((x) => x.id === id) || null;
}

function updateGenerationHistoryDetail(state, detailEl, entryId) {
  detailEl.replaceChildren();
  const e = findGenerationHistoryEntry(state, entryId);
  if (!e) return;
  const ms = Number(e.savedAtMs) || new Date(e.savedAt).getTime();
  const d = new Date(ms);
  const longFmt = d.toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const cap = longFmt.charAt(0).toUpperCase() + longFmt.slice(1);
  const wr = formatWeekHistoryRange(e.weekStart);
  const ws = computeThursday(e.weekStart);
  const p1 = document.createElement("div");
  p1.className = "histDetailPrimary";
  p1.textContent = cap;
  const p2 = document.createElement("div");
  p2.className = "muted histDetailSub";
  p2.textContent = `Semana jueves ${ws} (${wr}) · Tirada n.º ${e.tiradaNum}`;
  detailEl.append(p1, p2);
}

function renderGenerationHistoryPanel(state) {
  const sel = document.getElementById("histGenerationPick");
  const filterEl = document.getElementById("histFilterDate");
  const detail = document.getElementById("histGenerationDetail");
  if (!sel || !detail) return;
  const filterDay = filterEl ? clamp(filterEl.value) : "";
  const list = getFilteredGenerationHistory(state, filterDay);
  const prev = sel.value;
  sel.replaceChildren();
  sel.appendChild(new Option("— Elige una copia guardada —", ""));
  for (const e of list) sel.appendChild(new Option(historyEntrySelectLabel(e), e.id));
  if (prev && list.some((x) => x.id === prev)) sel.value = prev;
  else sel.value = "";
  updateGenerationHistoryDetail(state, detail, sel.value);
}

function applyHistoryEntryToSchedule(state, entry, assignSchedule) {
  const ws = computeThursday(entry.weekStart);
  const base = emptySchedule(ws);
  const saved = entry.slots || {};
  for (const sid of Object.keys(base.slots)) {
    const snap = saved[sid];
    if (!snap || typeof snap !== "object") continue;
    base.slots[sid] = {
      ...base.slots[sid],
      modo: snap.modo === "TODOS" ? "TODOS" : "NORMAL",
      asignadoA: norm(snap.asignadoA || ""),
    };
  }
  state.schedulesByWeek[ws] = base;
  state.weekStart = ws;
  qs("weekStart").value = ws;
  assignSchedule(base);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const parsedRemoval = uniq(
      (Array.isArray(parsed.teamRemovedPersonKeys) ? parsed.teamRemovedPersonKeys : [])
        .map((k) => normalizeKey(String(k)))
        .filter(Boolean),
    );
    const pinned = parsed.teamRosterPinned === true;
    let peopleSeed;
    if (Array.isArray(parsed.people) && parsed.people.length > 0) {
      peopleSeed = [...parsed.people];
    } else if (!Array.isArray(parsed.people)) {
      peopleSeed = [...DEFAULT_PEOPLE];
    } else if (!pinned) {
      /** Migración: antes la lista podía ser solo “extras”; una vez unimos con la plantilla. */
      peopleSeed = sortNames(uniq([...DEFAULT_PEOPLE, ...(parsed.people || [])].map(fixName).filter(Boolean)));
    } else {
      /** Equipo guardado pero vacío; no mezclamos la plantilla hasta sanitize. */
      peopleSeed = [];
    }
    return sanitizeLocalState({
      teamRosterPinned: true,
      teamRemovedPersonKeys: parsedRemoval,
      weekStart: computeThursday(parsed.weekStart),
      monthOffset: Number(parsed.monthOffset || 0),
      generationCounter: Number(parsed.generationCounter || 0),
      people: sortNames(uniq(peopleSeed.map(fixName).filter(Boolean))),
      vacAutoUrl: clamp(parsed.vacAutoUrl || DEFAULT_VAC_SHEET_URL),
      vacationRanges: Array.isArray(parsed.vacationRanges)
        ? parsed.vacationRanges.map((r) => ({ ...r, person: fixName(r.person), source: r.source || "manual" }))
        : [],
      schedulesByWeek: parsed.schedulesByWeek || {},
      generationHistory: Array.isArray(parsed.generationHistory) ? parsed.generationHistory : [],
    });
  } catch {
    return sanitizeLocalState({
      teamRosterPinned: true,
      teamRemovedPersonKeys: [],
      weekStart: computeThursday(),
      monthOffset: 0,
      generationCounter: 0,
      people: [...DEFAULT_PEOPLE],
      vacAutoUrl: DEFAULT_VAC_SHEET_URL,
      vacationRanges: [],
      schedulesByWeek: {},
      generationHistory: [],
    });
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function vacationsByISO(state) {
  const map = {};
  for (const r of state.vacationRanges) {
    const person = norm(r.person);
    if (isExcludedPerson(person)) continue;
    const from = parseISO(r.from);
    const to = parseISO(r.to);
    if (!person || !from || !to) continue;
    let cur = new Date(from);
    while (cur <= to) {
      const iso = toISO(cur);
      if (!map[iso]) map[iso] = [];
      map[iso].push(person);
      cur = addDays(cur, 1);
    }
  }
  for (const iso of Object.keys(map)) map[iso] = uniq(map[iso]).filter((p) => !isExcludedPerson(p)).sort((a, b) => a.localeCompare(b, "es"));
  return map;
}

function availableForDate(people, vacByIso, iso) {
  const blocked = new Set((vacByIso[iso] || []).map(norm));
  return people.filter((p) => !blocked.has(norm(p)));
}

function renderVacationControls(state) {
  const sel = qs("vacPerson");
  sel.innerHTML = "";
  for (const p of allVentasForDropdown(state)) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  }
}

function renderVacationsThisWeek(state) {
  const vacMap = vacationsByISO(state);
  const rows = weekFrom(state.weekStart).map((d) => ({ iso: d.iso, names: vacMap[d.iso] || [] })).filter((x) => x.names.length);
  const el = qs("vacationsThisWeek");
  if (!rows.length) {
    el.textContent = "—";
    return;
  }
  el.innerHTML = rows.map((x) => `<div><strong>${x.iso}</strong>: ${escapeHtml(x.names.join(", "))}</div>`).join("");
}

function renderCalendar(state) {
  const ws = parseISO(state.weekStart);
  const target = new Date(ws.getFullYear(), ws.getMonth() + state.monthOffset, 1);
  qs("monthLabel").textContent = target.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const inWeek = new Set(weekFrom(state.weekStart).map((d) => d.iso));
  const first = new Date(target.getFullYear(), target.getMonth(), 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ empty: true });
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(target.getFullYear(), target.getMonth(), d);
    const iso = toISO(dt);
    const holiday = getHolidayInfo(iso);
    const nonWorking = isNonWorkingDate(dt);
    cells.push({ d, iso, inWeek: inWeek.has(iso), isThu: iso === state.weekStart, nonWorking, holiday });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  const heads = ["L", "M", "X", "J", "V", "S", "D"];
  qs("miniCalendar").innerHTML = heads.map((h) => `<div class="calHead">${h}</div>`).join("") + cells.map((c) => {
    if (c.empty) return `<div class="calCell off"></div>`;
    const title = c.holiday ? `${c.holiday.name} (${c.holiday.type})` : (c.nonWorking ? "No laborable" : "");
    return `<div class="calCell${c.inWeek ? " inWeek" : ""}${c.isThu ? " isThu" : ""}${c.nonWorking ? " nonWorking" : ""}${c.holiday ? " holiday" : ""}"${title ? ` title="${escapeHtml(title)}"` : ""}>${c.d}${c.nonWorking ? '<span class="calMark">-</span>' : ""}</div>`;
  }).join("");
}

function renderMeta(schedule) {
  const week = weekFrom(schedule.weekStart);
  const fmt = (d) => d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const a = `${fmt(week[0].date).charAt(0).toUpperCase()}${fmt(week[0].date).slice(1)}`;
  const b = `${fmt(week[6].date).charAt(0).toUpperCase()}${fmt(week[6].date).slice(1)}`;
  qs("metaWeek").innerHTML = `<span class="metaWeekLine">${escapeHtml(a)}</span><span class="metaWeekMid">hasta</span><span class="metaWeekLine">${escapeHtml(b)}</span>`;
}

function renderPeople(people) {
  const wrap = document.getElementById("peopleList");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const p of people) {
    const chip = document.createElement("div");
    chip.className = "personChip";
    chip.textContent = p;
    wrap.appendChild(chip);
  }
}

function renderSummary(schedule) {
  const counters = new Map();
  for (const s of Object.values(schedule.slots)) {
    if (s.modo === "TODOS") continue;
    const name = norm(s.asignadoA);
    if (!name || isExcludedPerson(name)) continue;
    const cur = counters.get(name) || { fijo: 0, backup: 0 };
    if (s.tipo === "FIJO") cur.fijo += 1;
    else cur.backup += 1;
    counters.set(name, cur);
  }
  const body = qs("summaryBody");
  body.innerHTML = "";
  const rows = Array.from(counters.entries()).map(([name, c]) => ({ name, ...c, total: c.fijo + c.backup })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));
  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(r.name)}</td><td class="num">${r.fijo}</td><td class="num">${r.backup}</td><td class="num">${r.total}</td>`;
    body.appendChild(tr);
  }
}

function renderTable(schedule, state, onChange) {
  const ventas = allVentasForDropdown(state);
  const allowedKeys = new Set(ventas.map((p) => normalizeKey(p)));
  const tbody = qs("scheduleBody");
  tbody.innerHTML = "";
  for (const day of weekFrom(schedule.weekStart)) {
    for (const tipo of TIPOS) {
      const tr = document.createElement("tr");
      if (tipo.key === "FIJO") {
        const td = document.createElement("td");
        td.className = "dayCell";
        td.rowSpan = 2;
        td.innerHTML = `${day.label}<span class="daySub">${escapeHtml(formatDayLineSpanish(day.date))}</span>`;
        tr.appendChild(td);
      }
      const tdTipo = document.createElement("td");
      tdTipo.innerHTML = `<span class="typePill ${tipo.key === "FIJO" ? "fijo" : "backup"}">${tipo.label}</span>`;
      tr.appendChild(tdTipo);
      for (const franja of FRANJAS) {
        const id = slotId(day.iso, franja.key, tipo.key);
        let cur = schedule.slots[id];
        if (cur && isExcludedPerson(cur.asignadoA)) {
          cur = { ...cur, asignadoA: "" };
          schedule.slots[id] = cur;
        }
        if (
          cur
          && cur.modo !== "TODOS"
          && norm(cur.asignadoA)
          && !allowedKeys.has(normalizeKey(fixName(cur.asignadoA)))
        ) {
          cur = { ...cur, asignadoA: "" };
          schedule.slots[id] = cur;
        }
        const sel = document.createElement("select");
        sel.className = "slotSelect";
        sel.appendChild(new Option("—", ""));
        sel.appendChild(new Option("TODOS", "__TODOS__"));
        for (const p of ventas) {
          if (isExcludedPerson(p)) continue;
          sel.appendChild(new Option(p, p));
        }
        sel.value = cur.modo === "TODOS" ? "__TODOS__" : (cur.asignadoA || "");
        sel.addEventListener("change", () => {
          if (sel.value === "__TODOS__") schedule.slots[id] = { ...cur, modo: "TODOS", asignadoA: "" };
          else schedule.slots[id] = { ...cur, modo: "NORMAL", asignadoA: sel.value };
          onChange();
        });
        sel.addEventListener("dblclick", (ev) => {
          ev.preventDefault();
          const now = schedule.slots[id];
          if (now.modo === "TODOS") schedule.slots[id] = { ...now, modo: "NORMAL", asignadoA: "" };
          else schedule.slots[id] = { ...now, modo: "TODOS", asignadoA: "" };
          onChange();
        });
        const td = document.createElement("td");
        td.className = `slotCell${tipo.key === "FIJO" ? " fijo" : ""}${cur.modo === "TODOS" ? " todos" : ""}`;
        td.appendChild(sel);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(schedule, state) {
  const vacMap = vacationsByISO(state);
  const roster = state.people.filter((p) => !isExcludedPerson(p));
  state.generationCounter = Number(state.generationCounter || 0) + 1;
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9) ^ (state.generationCounter * 2654435761)) >>> 0;
  const rng = mulberry32(seed);
  const stats = new Map(roster.map((p) => [p, { total: 0, byFranja: { MANANA: 0, TARDE: 0, NOCHE: 0 }, fijo: 0, backup: 0 }]));
  if (!roster.length) return;
  for (const day of weekFrom(schedule.weekStart)) {
    const isWorkdayMorningByDefault = [1, 2, 3, 4, 5].includes(day.date.getDay()) && !isNonWorkingDate(day.date);
    for (const tipo of TIPOS) {
      const id = slotId(day.iso, "MANANA", tipo.key);
      const cur = schedule.slots[id];
      if (!cur) continue;
      if (isWorkdayMorningByDefault) schedule.slots[id] = { ...cur, modo: "TODOS", asignadoA: "" };
      else schedule.slots[id] = { ...cur, modo: "NORMAL", asignadoA: "" };
    }
  }
  for (const s of Object.values(schedule.slots)) if (s.modo !== "TODOS") s.asignadoA = "";
  for (const day of weekFrom(schedule.weekStart)) {
    const usedToday = new Set();
    for (const franja of FRANJAS) {
      for (const tipo of TIPOS) {
        const id = slotId(day.iso, franja.key, tipo.key);
        const cur = schedule.slots[id];
        if (cur.modo === "TODOS") continue;
        let cands = availableForDate(roster, vacMap, day.iso).filter((n) => !usedToday.has(n));
        if (!cands.length) cands = availableForDate(roster, vacMap, day.iso);
        if (!cands.length) {
          cur.asignadoA = "";
          continue;
        }
        const scored = cands.map((n, idx) => {
          const s = stats.get(n);
          return {
            n,
            score: s.total * 10 + s.byFranja[franja.key] * 8 + (tipo.key === "FIJO" ? s.fijo : s.backup) * 6 + rng() + (idx * 0.001),
          };
        }).sort((a, b) => a.score - b.score);
        const best = scored[0].score;
        const top = scored.filter((x) => x.score <= best + 0.8).map((x) => x.n);
        const chosen = top[Math.floor(rng() * top.length)];
        cur.asignadoA = chosen;
        usedToday.add(chosen);
        const st = stats.get(chosen);
        st.total += 1;
        st.byFranja[franja.key] += 1;
        if (tipo.key === "FIJO") st.fijo += 1;
        else st.backup += 1;
      }
    }
  }
}

async function saveImage(schedule) {
  const target = qs("scheduleCapture");
  target.classList.add("export-clean");
  try {
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
      useCORS: true,
    });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `Turnos_${schedule.weekStart}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    target.classList.remove("export-clean");
  }
}

function init() {
  const state = loadState();
  state.weekStart = computeThursday(state.weekStart);
  state.monthOffset = Number(state.monthOffset || 0);
  state.teamRosterPinned = true;
  state.vacAutoUrl = clamp(state.vacAutoUrl || DEFAULT_VAC_SHEET_URL);
  state.vacationRanges = Array.isArray(state.vacationRanges)
    ? state.vacationRanges.map((r) => ({ ...r, person: fixName(r.person), source: r.source || "manual" }))
    : [];
  state.schedulesByWeek = state.schedulesByWeek || {};
  sanitizeLocalState(state);

  qs("weekStart").value = state.weekStart;
  qs("vacAutoUrl").value = state.vacAutoUrl;
  let schedule = state.schedulesByWeek[state.weekStart] || emptySchedule(state.weekStart);

  const persist = (reason) => {
    state.weekStart = schedule.weekStart;
    state.schedulesByWeek[schedule.weekStart] = schedule;
    saveState(state);
    status(`Guardado local (${reason})`, "ok");
  };

  const rerender = () => {
    renderTeamPanel(state);
    renderVacationControls(state);
    renderVacationsThisWeek(state);
    renderCalendar(state);
    renderMeta(schedule);
    renderPeople(state.people);
    renderTable(schedule, state, () => {
      renderSummary(schedule);
      persist("manual");
    });
    renderSummary(schedule);
    renderGenerationHistoryPanel(state);
  };

  qs("btnGenerate").addEventListener("click", () => {
    generate(schedule, state);
    pushGenerationHistory(state, schedule);
    rerender();
    persist("generar");
    status(`Turnos generados (tirada #${state.generationCounter}).`, "ok");
  });

  qs("btnSaveImage").addEventListener("click", async () => {
    try {
      await saveImage(schedule);
      status("Imagen descargada.", "ok");
    } catch (e) {
      status(`No se pudo guardar imagen: ${e.message}`, "bad");
    }
  });

  qs("weekStart").addEventListener("change", async () => {
    const iso = computeThursday(qs("weekStart").value);
    qs("weekStart").value = iso;
    state.weekStart = iso;
    schedule = state.schedulesByWeek[iso] || emptySchedule(iso);
    rerender();
    persist("semana");
    await runAutoVacationSync({ silent: true });
  });

  qs("btnMonthPrev").addEventListener("click", () => {
    state.monthOffset -= 1;
    renderCalendar(state);
    saveState(state);
  });
  qs("btnMonthNext").addEventListener("click", () => {
    state.monthOffset += 1;
    renderCalendar(state);
    saveState(state);
  });

  qs("btnAddVacation").addEventListener("click", () => {
    const person = norm(qs("vacPerson").value);
    const from = clamp(qs("vacFrom").value);
    const to = clamp(qs("vacTo").value) || from;
    if (!person || !from || !to) {
      status("Selecciona comercial y rango de fechas.", "warn");
      return;
    }
    state.vacationRanges.push({ person: fixName(person), from, to, source: "manual" });
    rerender();
    persist("vacaciones");
  });

  qs("vacAutoUrl").addEventListener("change", () => {
    state.vacAutoUrl = clamp(qs("vacAutoUrl").value) || DEFAULT_VAC_SHEET_URL;
    qs("vacAutoUrl").value = state.vacAutoUrl;
    saveState(state);
  });

  const runAutoVacationSync = async ({ silent = false } = {}) => {
    try {
      qs("btnSyncVacations").disabled = true;
      const rawUrl = clamp(qs("vacAutoUrl").value) || state.vacAutoUrl || DEFAULT_VAC_SHEET_URL;
      const csvUrl = csvUrlFromSheetUrl(rawUrl);
      if (!csvUrl) {
        if (!silent) status("URL de Google Sheets no válida.", "warn");
        return { ok: false, error: "url" };
      }
      if (!silent) status("Leyendo vacaciones automáticas...", "warn");
      const res = await fetch(csvUrl, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csvText = await res.text();
      const autoRanges = extractAutoVacationRangesFromExportTable(
        csvText,
        state.people,
        VAC_AUTO_FETCH_FROM_ISO,
        VAC_AUTO_FETCH_TO_ISO,
      );
      state.vacAutoUrl = rawUrl;
      qs("vacAutoUrl").value = rawUrl;
      const manualRanges = state.vacationRanges.filter((r) => (r.source || "manual") !== "auto");
      state.vacationRanges = [...manualRanges, ...autoRanges];
      rerender();
      persist("vacaciones auto");
      if (!silent)
        status(`Vacaciones desde la hoja actualizadas (${autoRanges.length} rangos para el equipo visible).`, "ok");
      return { ok: true, count: autoRanges.length };
    } catch (e) {
      const msg = `No se pudo actualizar vacaciones automáticas: ${e.message}`;
      if (!silent) status(msg, "bad");
      return { ok: false, error: e.message };
    } finally {
      qs("btnSyncVacations").disabled = false;
    }
  };

  qs("btnSyncVacations").addEventListener("click", async () => {
    await runAutoVacationSync({ silent: false });
  });

  qs("btnRemoveVacation").addEventListener("click", () => {
    const person = norm(qs("vacPerson").value);
    const from = clamp(qs("vacFrom").value);
    const to = clamp(qs("vacTo").value) || from;
    state.vacationRanges = state.vacationRanges.filter((x) => !(x.person === person && x.from === from && x.to === to));
    rerender();
    persist("vacaciones");
  });

  qs("btnTeamAdd").addEventListener("click", async () => {
    const raw = qs("teamNewPerson").value;
    const name = fixName(raw);
    if (!name) {
      status("Escribe un nombre.", "warn");
      return;
    }
    if (isExcludedPerson(name)) {
      status("Ese nombre no se puede usar en el equipo.", "warn");
      return;
    }
    const nk = normalizeKey(name);
    if (state.people.some((p) => normalizeKey(fixName(p)) === nk)) {
      status("Ya está en el equipo.", "warn");
      return;
    }
    state.teamRemovedPersonKeys = uniq(
      (state.teamRemovedPersonKeys || []).map((k) => normalizeKey(String(k))).filter(Boolean).filter((k) => k !== nk),
    ).slice(0, 200);
    state.people = sortNames(uniq([...state.people, name].map(fixName).filter(Boolean)));
    qs("teamNewPerson").value = "";
    rerender();
    persist("equipo añadir");
    const syn = await runAutoVacationSync({ silent: true });
    if (!syn.ok) {
      status(
        `${name} añadido al equipo; no ha sido posible leer la hoja de vacaciones ahora. Comprueba la URL y pulsa «Actualizar vacaciones de forma automática».`,
        "warn",
      );
      return;
    }
    status(
      `${name} añadido. Se ha buscado en la hoja y actualizado todo el equipo: ${syn.count ?? 0} rangos vacaciones «automáticos» cargados.`,
      "ok",
    );
  });

  qs("btnTeamRemove").addEventListener("click", () => {
    const pick = clamp(qs("teamRemovePerson").value);
    if (!pick) {
      status("Elige alguien en el desplegable.", "warn");
      return;
    }
    const pickK = normalizeKey(fixName(pick));
    state.teamRemovedPersonKeys = uniq(
      [...(state.teamRemovedPersonKeys || []).map((k) => normalizeKey(String(k))).filter(Boolean), pickK].filter(Boolean),
    ).slice(0, 200);
    const prevCount = state.people.length;
    purgePersonFromState(state, pick);
    state.people = sortNames(state.people.filter((p) => normalizeKey(fixName(p)) !== pickK));
    if (!state.people.length) {
      const rk = new Set(state.teamRemovedPersonKeys);
      state.people = sortNames(
        uniq(DEFAULT_PEOPLE.map(fixName).filter(Boolean).filter((q) => !isExcludedPerson(q) && !rk.has(normalizeKey(q)))),
      );
    }
    if (!state.people.length) {
      status("No queda nadie activo: toda la plantilla está marcada como quitada a mano. Añade comerciales con «Nuevo comercial».", "warn");
    } else if (prevCount <= 1) {
      status(`${pick} quitado. Se ha vuelto a cargar la plantilla salvo quienes quitaste a mano; no volverán hasta que los añadas otra vez.`, "ok");
    } else {
      status(`${pick} quitado del equipo. No se tendrá en cuenta ni en turnos ni en vacaciones automáticas hasta que lo añadas manualmente.`, "ok");
    }
    qs("teamRemovePerson").value = "";
    rerender();
    persist("equipo quitar");
  });

  document.getElementById("teamNewPerson")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      qs("btnTeamAdd").click();
    }
  });

  document.getElementById("histFilterDate")?.addEventListener("change", () => {
    renderGenerationHistoryPanel(state);
  });
  document.getElementById("histFilterClear")?.addEventListener("click", () => {
    const f = document.getElementById("histFilterDate");
    if (f) f.value = "";
    renderGenerationHistoryPanel(state);
  });
  document.getElementById("histGenerationPick")?.addEventListener("change", () => {
    const detail = document.getElementById("histGenerationDetail");
    const sel = document.getElementById("histGenerationPick");
    if (detail && sel) updateGenerationHistoryDetail(state, detail, sel.value);
  });
  document.getElementById("btnHistRestore")?.addEventListener("click", () => {
    const sel = document.getElementById("histGenerationPick");
    if (!sel?.value) {
      status("Elige una copia del historial.", "warn");
      return;
    }
    const entry = findGenerationHistoryEntry(state, sel.value);
    if (!entry) {
      status("Entrada del historial no encontrada.", "warn");
      return;
    }
    applyHistoryEntryToSchedule(state, entry, (base) => {
      schedule = base;
    });
    rerender();
    persist("restaurar historial");
    status("Cuadrante restaurado desde el historial.", "ok");
  });

  rerender();
  persist("inicio");
  runAutoVacationSync({ silent: true });
}

document.addEventListener("DOMContentLoaded", init);
