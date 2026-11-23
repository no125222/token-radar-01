/* Token Radar — the board, the filters and the detail views.
 * Everything renders from this page's own data file; the page makes no network request. The
 * model below is the same model lib/model.ts runs: TVL x 0.25 x a growth multiplier x a maturity
 * multiplier. The sandbox sliders change only this page's view: the submitted board keeps the
 * model's stated constants. A protocol is shown as "records no token" — the snapshot's record is
 * not proof it has none. */
'use strict';
const DATA = window.RADAR;
if (!DATA || !Array.isArray(DATA.rows)) throw new Error('Token Radar: data.js is missing or empty');

/* ---------- small helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const money = (v) => {
  if (v === null || v === undefined) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v}`;
};
const moneyExact = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
const pct = (v, d) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d === undefined ? 1 : d)}%`);
const ageText = (d) => (d === null || d === undefined ? 'age unknown' : `${d} day${d === 1 ? '' : 's'}`);
const fmtDate = (iso) => (iso ? iso : '—');
const chainList = (c) => (c && c.length ? c.slice(0, 3).join(', ') + (c.length > 3 ? ` +${c.length - 3}` : '') : '—');

/* ---------- the model, as stated ---------- */
const M = DATA.model;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function impliedOf(row, model) {
  const age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
  const growth = clamp(row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d, model.growth_floor, model.growth_cap);
  const growthMult = 1 + (growth / 100) * model.growth_weight;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  return { implied: Math.max(1, Math.round(row.tvl_usd * model.base_multiple * growthMult * maturityMult)), growth, growthMult, maturityMult, age: row.age_days === null ? null : row.age_days };
}

/* ---------- the farm plan, as board.json states it ---------- */
function capitalFor(row) { return row.tvl_usd >= 5e9 ? 250 : row.tvl_usd >= 1e9 ? 150 : row.tvl_usd >= 1e8 ? 100 : 50; }
function holdDaysFor(age) { return age === null ? 30 : age < 180 ? 60 : age < 365 ? 45 : 30; }
function actionFor(row, capital, chain) {
  const c = (row.category || '').toLowerCase(); const n = row.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${n} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager') || c.includes('farm')) return `Provide $${capital} of liquidity to ${n}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${n} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${n} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return `Deposit $${capital} of USDC as margin on ${n} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${n}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${n} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${n} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${n} on ${chain} and keep the policy.`;
  if (c.includes('chain')) return `Use ${n}'s own app on ${chain} with $${capital} and keep the wallet active there.`;
  return `Deposit $${capital} of USDC into ${n} on ${chain} and keep the position open.`;
}
function secondActionFor(row) {
  const c = (row.category || '').toLowerCase(); const n = row.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'Borrow a small amount against the supply once a month and repay it, so the wallet shows borrowing as well as supplying.';
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('liquidity manager') || c.includes('farm')) return `Swap a small amount through ${n}'s pool each week so the wallet shows trading as well as liquidity.`;
  if (c.includes('bridge')) return `Bridge a small amount back the other way once a month so the wallet shows two-way use of ${n}.`;
  if (c.includes('staking') || c.includes('restak')) return 'Claim any staking rewards once a month and restake them instead of selling.';
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return 'Close the hedge once a month and open a fresh one, keeping the margin topped up.';
  if (c.includes('prediction')) return 'Place one small market position each week on a market you have actually read.';
  if (c.includes('curator') || c.includes('allocator')) return `Top up the ${n} vault once a month and keep the shares.`;
  if (c.includes('stable')) return 'Mint or redeem a small amount of the stable asset each month to keep the position active.';
  if (c.includes('rwa')) return 'Reinvest the yield once a month instead of withdrawing it.';
  if (c.includes('insurance')) return 'Review the cover once a month and renew it before it lapses.';
  if (c.includes('chain')) return `Use ${n}'s app once a week from the same wallet: a swap, a transfer or a vote.`;
  return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
}
function farmSteps(row) {
  const chain = row.chains.length ? row.chains[0] : 'its main chain';
  const capital = capitalFor(row); const hold = holdDaysFor(row.age_days);
  const steps = [
    { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
    { text: actionFor(row, capital, chain), cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`, time: '15 minutes to set up' },
    { text: secondActionFor(row), cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Once a month, open ${row.name}'s own points or rewards page and claim only from the link it publishes.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Watch ${row.name}'s own announcements for any token or points update, and re-read this plan if one appears.`, cost: 'nothing but the check', time: '5 minutes a month' },
    { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
  ];
  return steps.map((s) => {
    let t = `${s.text} Cost: ${s.cost}. Time: ${s.time}.`;
    if (t.length > 600) t = `${t.slice(0, 596)}...`;
    return t;
  });
}

/* ---------- state ---------- */
const state = { q: '', cat: '', chain: '', minTvl: 0, wl: false, tab: 'pre', sort: 'rank', dir: 'asc', sel: null, base: M.base_multiple, weight: M.growth_weight };
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  state.q = h.get('q') || ''; state.cat = h.get('cat') || ''; state.chain = h.get('chain') || '';
  state.minTvl = Number(h.get('min') || 0) || 0; state.wl = h.get('wl') === '1';
  state.tab = h.get('tab') === 'live' ? 'live' : 'pre';
  state.sort = ['rank', 'name', 'tvl', 'change', 'age', 'implied'].includes(h.get('sort')) ? h.get('sort') : 'rank';
  state.dir = h.get('dir') === 'desc' ? 'desc' : 'asc';
  state.sel = h.get('sel') || null;
  state.base = Number(h.get('base') || M.base_multiple) || M.base_multiple;
  state.weight = Number(h.get('weight') || M.growth_weight);
  if (Number.isNaN(state.weight)) state.weight = M.growth_weight;
}
function writeHash() {
  const h = new URLSearchParams();
  if (state.q) h.set('q', state.q);
  if (state.cat) h.set('cat', state.cat);
  if (state.chain) h.set('chain', state.chain);
  if (state.minTvl) h.set('min', String(state.minTvl));
  if (state.wl) h.set('wl', '1');
  if (state.tab !== 'pre') h.set('tab', state.tab);
  if (state.sort !== 'rank') h.set('sort', state.sort);
  if (state.dir !== 'asc') h.set('dir', state.dir);
  if (state.sel) h.set('sel', state.sel);
  if (state.base !== M.base_multiple) h.set('base', String(state.base));
  if (state.weight !== M.growth_weight) h.set('weight', String(state.weight));
  const s = h.toString();
  history.replaceState(null, '', s ? `#${s}` : location.pathname + location.search);
}
readHash();

/* ---------- derived rows ---------- */
const sandboxOn = () => state.base !== M.base_multiple || state.weight !== M.growth_weight;
function withImplied(rows) {
  if (!sandboxOn()) return rows.map((r) => ({ ...r, shown: r.implied_value_usd }));
  const model = { ...M, base_multiple: state.base, growth_weight: state.weight };
  return rows.map((r) => ({ ...r, shown: impliedOf(r, model).implied })).sort((a, b) => b.shown - a.shown || (a.slug < b.slug ? -1 : 1));
}
function filtered() {
  let rows = DATA.rows;
  if (state.wl) rows = rows.filter((r) => r.watchlist);
  if (state.cat) rows = rows.filter((r) => (r.category || '') === state.cat);
  if (state.chain) rows = rows.filter((r) => r.chains.includes(state.chain));
  if (state.minTvl) rows = rows.filter((r) => r.tvl_usd >= state.minTvl);
  if (state.q) {
    const q = state.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.slug.includes(q) || (r.category || '').toLowerCase().includes(q));
  }
  const key = (r) => ({ rank: r.rank, name: r.name.toLowerCase(), tvl: r.tvl_usd, change: r.change_7d === null ? -Infinity : r.change_7d, age: r.age_days === null ? -1 : r.age_days, implied: r.shown })[state.sort];
  const rows2 = withImplied(rows);
  rows2.sort((a, b) => {
    const ka = key(a); const kb = key(b);
    const c = typeof ka === 'string' ? ka.localeCompare(kb) : ka - kb;
    return state.dir === 'desc' ? -c : c;
  });
  return rows2;
}

/* ---------- render ---------- */
const root = $('#board');
function render() {
  root.innerHTML = '';
  root.setAttribute('aria-busy', 'false');
  const shell = el('div', null, 'shell');
  root.append(shell);

  // Header
  const top = el('header', null, 'top');
  const brand = el('div', null, 'brand');
  brand.append(el('span', null, 'mark'), el('span', 'Token Radar'));
  const meta = el('div', null, 'top-meta');
  meta.append(el('span', `Snapshot ${DATA.as_of}`), el('span', `Model ${DATA.model_version}`), el('span', `${DATA.board_size} protocols ranked`));
  top.append(brand, meta);
  shell.append(top);

  // Lede + facts
  const lede = el('section', null, 'lede');
  const intro = el('div');
  const h1 = el('h1', 'Which protocols that record no token are worth farming first?');
  const p = el('p', 'Every protocol on this board records no token in the sealed DefiLlama snapshot — no market cap, no CoinGecko id, no symbol. Each row is ranked by an implied launch value computed from the snapshot itself: its locked value, its seven-day growth, and how long it has been listed. Below it, the protocols that already trade are set aside at their market values, so the two are never confused. Wrapped, staked and bridged products of tokens that already trade are set aside with them, not ranked as launches.');
  intro.append(h1, p);
  const facts = el('div', null, 'facts');
  const fact = (k, v) => { const f = el('div', null, 'fact'); f.append(el('span', k), el('b', v)); return f; };
  facts.append(
    fact('Watchlist covered', `${DATA.watchlist_size} of ${DATA.watchlist_size}`),
    fact('Rows ranked', `${DATA.board_size}`),
    fact('Early rows below the floor', `${DATA.early_size}`),
    fact('Live protocols set aside', `${DATA.live_size}`),
    fact('Wrapped / staked set aside', `${DATA.set_aside_size}`),
  );
  lede.append(intro, facts);
  shell.append(lede);

  // Stats strip
  const totalTvl = DATA.rows.reduce((s, r) => s + r.tvl_usd, 0);
  const med = [...DATA.rows].map((r) => r.implied_value_usd).sort((a, b) => a - b);
  const median = med[Math.floor(med.length / 2)];
  const catCount = new Set(DATA.rows.map((r) => r.category || '—')).size;
  const stats = el('p', null, 'stats');
  const b = (t) => { const n = el('b', t); return n; };
  stats.append('Board TVL ', b(money(totalTvl)), ' · median implied value ', b(money(median)), ' · ', b(`${catCount}`), ' categories · floor ', b(money(DATA.floor_usd)));
  shell.append(stats);

  // Controls
  const controls = el('div', null, 'controls');
  controls.setAttribute('role', 'search');
  const searchField = el('div', null, 'field');
  const searchLabel = el('label', 'Search'); searchLabel.setAttribute('for', 'q');
  const search = el('input'); search.type = 'search'; search.id = 'q'; search.placeholder = 'Protocol, category or chain'; search.value = state.q; search.setAttribute('aria-label', 'Search protocols');
  search.addEventListener('input', () => { state.q = search.value; writeHash(); renderTable(); });
  searchField.append(searchLabel, search);
  const selectField = (labelText, id, options, value, onChange) => {
    const f = el('div', null, 'field');
    const lab = el('label', labelText); lab.setAttribute('for', id);
    const s = el('select'); s.id = id;
    options.forEach(([v, t]) => { const o = el('option', t); o.value = v; if (v === value) o.selected = true; s.append(o); });
    s.addEventListener('change', () => { onChange(s.value); writeHash(); renderTable(); });
    f.append(lab, s);
    return f;
  };
  const cats = [...new Set(DATA.rows.map((r) => r.category || '—'))].sort();
  const chains = [...new Set(DATA.rows.flatMap((r) => r.chains))].sort();
  controls.append(
    searchField,
    selectField('Category', 'category', [['', 'All categories'], ...cats.map((c) => [c, c])], state.cat, (v) => { state.cat = v; }),
    selectField('Chain', 'chain', [['', 'All chains'], ...chains.map((c) => [c, c])], state.chain, (v) => { state.chain = v; }),
    selectField('TVL at least', 'tvl', [['0', 'Any TVL'], ['100000000', '$100M'], ['500000000', '$500M'], ['1000000000', '$1B']], String(state.minTvl), (v) => { state.minTvl = Number(v); }),
  );
  const check = el('label', null, 'field check');
  const wl = el('input'); wl.type = 'checkbox'; wl.id = 'wl'; wl.checked = state.wl;
  wl.addEventListener('change', () => { state.wl = wl.checked; writeHash(); renderTable(); });
  check.append(wl, el('span', 'Watchlist only'));
  const tabs = el('div', null, 'tabs');
  const tabBtn = (t, label) => {
    const btn = el('button', label); btn.type = 'button'; btn.setAttribute('aria-pressed', state.tab === t ? 'true' : 'false');
    btn.addEventListener('click', () => { state.tab = t; writeHash(); render(); });
    return btn;
  };
  tabs.append(tabBtn('pre', 'Pre-token'), tabBtn('live', 'Live token'));
  controls.append(check, tabs, el('span', '', 'count'));
  shell.append(controls);

  // Sandbox
  const sb = el('section', null, 'sandbox');
  sb.setAttribute('aria-label', 'Model sandbox');
  sb.append(el('h2', 'Model sandbox — change the constants, watch the ranking move'));
  sb.append(el('p', 'The board above is scored with the stated constants: base multiple 0.25, growth weight 0.5. Move the sliders to test how sensitive the ranking is. This changes only this page: the submitted board keeps radar-3’s constants.'));
  const sliders = el('div', null, 'sliders');
  const slider = (labelText, id, min, max, step, value, fmt, onInput) => {
    const lab = el('label', labelText);
    const out = el('output', fmt(value)); out.id = `${id}-out`;
    const input = el('input'); input.type = 'range'; input.id = id; input.min = min; input.max = max; input.step = step; input.value = value;
    input.addEventListener('input', () => {
      const v = Number(input.value); out.textContent = fmt(v); onInput(v); writeHash();
      const noteEl = document.querySelector('.sandbox .note');
      if (noteEl) noteEl.textContent = sandboxOn()
        ? `Sandbox view: base multiple ${state.base.toFixed(2)}, growth weight ${state.weight.toFixed(1)} — ranks below are the sandbox’s, not the submitted board’s.`
        : 'Sandbox off: the ranks below are the submitted board’s.';
      renderTable();
    });
    lab.append(input, out);
    return lab;
  };
  sliders.append(
    slider('Base multiple', 'base', '0.10', '0.50', '0.05', state.base, (v) => v.toFixed(2), (v) => { state.base = v; }),
    slider('Growth weight', 'weight', '0', '1', '0.1', state.weight, (v) => v.toFixed(1), (v) => { state.weight = v; }),
  );
  const reset = el('button', 'Reset to the stated model'); reset.type = 'button'; reset.className = 'reset';
  reset.addEventListener('click', () => { state.base = M.base_multiple; state.weight = M.growth_weight; writeHash(); render(); });
  const note = el('p', null, 'note');
  note.textContent = sandboxOn()
    ? `Sandbox view: base multiple ${state.base.toFixed(2)}, growth weight ${state.weight.toFixed(1)} — ranks below are the sandbox’s, not the submitted board’s.`
    : 'Sandbox off: the ranks below are the submitted board’s.';
  sb.append(sliders, reset, note);
  shell.append(sb);

  // Table panel
  const panel = el('section', null, 'panel');
  const wrap = el('div', null, 'table-wrap');
  const table = el('table');
  const caption = el('caption', 'Pre-token protocols, ranked by implied launch value. Open any row for its farm plan.');
  table.append(caption);
  const thead = el('thead'); const headRow = el('tr');
  const sortTh = (key, label, num) => {
    const th = el('th', null, num ? 'num' : undefined);
    const btn = el('button', `${label}${state.sort === key ? (state.dir === 'asc' ? ' ↑' : ' ↓') : ''}`);
    btn.type = 'button';
    btn.setAttribute('aria-label', `Sort by ${label.toLowerCase()}`);
    btn.addEventListener('click', () => {
      if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
      else { state.sort = key; state.dir = key === 'name' ? 'asc' : 'desc'; }
      writeHash(); renderTable();
    });
    th.append(btn);
    return th;
  };
  headRow.append(
    sortTh('rank', 'Rank', true),
    sortTh('name', 'Protocol'),
    sortTh('tvl', 'TVL', true),
    sortTh('change', '7d', true),
    sortTh('age', 'Age', true),
    sortTh('implied', 'Implied value', true),
    el('th', 'Token'),
  );
  thead.append(headRow);
  table.append(thead);
  const tbody = el('tbody'); tbody.id = 'rows';
  table.append(tbody);
  wrap.append(table);
  panel.append(wrap);
  shell.append(panel);

  // Model panel
  const model = el('section', null, 'panel model');
  model.setAttribute('aria-label', 'How the value is computed');
  model.append(el('h2', 'How the implied value is computed'));
  model.append(el('p', 'One function scores every protocol — no name is ever special-cased. TVL is the anchor: a protocol with more value locked is worth more at launch. Seven-day growth tilts the value up or down, and age adds a maturity premium that stops growing after three years.'));
  const formula = el('pre', null, 'formula');
  formula.textContent = 'implied = TVL × 0.25 × (1 + clamp(change_7d, −60, +120) / 100 × 0.5)\n                 × (0.6 + min(age_days, 1095) / 1095 × 0.4)\n\nchange_7d unknown: 0. age unknown: 365 days. implied is at least $1.';
  model.append(formula);
  model.append(el('p', 'The floor is $50,000,000 of TVL and the watchlist is the floor: every protocol on it is ranked, and the board also ranks the protocols below the floor and off the watchlist that record no token — 209 rows in this snapshot. A protocol is not ranked when it is a wrapped, staked or bridged product of a token that already trades: its category is Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC or CEX, its name carries a whole word wrapped, staked or staking, or its name begins with an exchange’s name. Those products are set aside in the Live token tab instead. A version marker alone (V2, v2, 2.0) does not exclude: a version is a protocol’s own current deployment, not evidence it is a wrapped product.'));
  shell.append(model);

  // Caveats
  const caveats = el('section', null, 'panel caveats');
  caveats.setAttribute('aria-label', 'What this board does not claim');
  caveats.append(el('h2', 'What this board does not claim'));
  const ul = el('ul');
  [
    '“Records no token” is the snapshot’s wording: DefiLlama’s record is not proof a protocol has none. A token the snapshot does not carry would change the plan.',
    'The implied value is this entry’s estimate, not a price and not a promise: it follows from the snapshot’s own figures, and the sandbox shows how much the constants move it.',
    'Wrapped, staked and bridged products of tokens that already trade are not launches, so they are set aside in the Live token tab and never ranked — Binance staked ETH, WBTC and USDT0 are products of tokens that already trade, not protocols waiting for one.',
    'TVL and age come from the sealed snapshot of 2026-11-14. A protocol’s numbers today will differ; re-check its own pages before farming it.',
    'Farm plans are this entry’s steps with cost and time estimates. They are not the protocol’s promises, and a step that asks for a fee to claim is a reason to stop.',
  ].forEach((t) => ul.append(el('li', t)));
  caveats.append(ul);
  shell.append(caveats);

  const foot = el('p', null, 'stats');
  foot.textContent = `Source: ${DATA.source}. Snapshot as of ${DATA.as_of}. Model ${DATA.model_version}.`;
  shell.append(foot);

  renderTable();
  const selected = state.sel ? DATA.rows.find((r) => r.slug === state.sel) : null;
  if (selected) openDetail(selected);
}

function renderTable() {
  const tbody = $('#rows');
  const count = $('.count');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (state.tab === 'live') {
    const live = DATA.live;
    const setAside = DATA.set_aside || [];
    if (count) count.textContent = `${live.length} live-token protocols · ${setAside.length} wrapped, staked or bridged products set aside`;
    live.forEach((r, i) => {
      const tr = el('tr');
      const rank = el('td', String(i + 1), 'num');
      const name = el('td', null, 'name');
      name.append(el('b', r.name), el('span', `${r.category || '—'} · ${chainList(r.chains)}`, 'sub'));
      const tvl = el('td', money(r.tvl_usd), 'num');
      const change = el('td', pct(r.change_7d), 'num'); if ((r.change_7d || 0) > 0) change.classList.add('pos'); if ((r.change_7d || 0) < 0) change.classList.add('neg');
      const age = el('td', '—', 'num');
      const val = el('td', money(r.mcap_usd), 'num');
      const tok = el('td'); tok.append(el('span', 'Trades', 'status'));
      tr.append(rank, name, tvl, change, age, val, tok);
      tbody.append(tr);
    });
    if (setAside.length) {
      const headTr = el('tr', null, 'group');
      const headTd = el('td'); headTd.colSpan = 7;
      headTd.append(el('b', 'Wrapped, staked or bridged — not launch candidates'));
      headTd.append(el('span', ' The largest 24 by TVL. Each is a product of a token that already trades, or a centralised exchange, so it is set aside rather than ranked as a launch. They record no token, so there is no market value to show.', 'sub'));
      headTr.append(headTd);
      tbody.append(headTr);
      setAside.forEach((r) => {
        const tr = el('tr');
        const rank = el('td', '—', 'num');
        const name = el('td', null, 'name');
        name.append(el('b', r.name), el('span', `${r.category || '—'} · ${chainList(r.chains)}`, 'sub'));
        const tvl = el('td', money(r.tvl_usd), 'num');
        const change = el('td', pct(r.change_7d), 'num'); if ((r.change_7d || 0) > 0) change.classList.add('pos'); if ((r.change_7d || 0) < 0) change.classList.add('neg');
        const age = el('td', '—', 'num');
        const val = el('td', '—', 'num');
        const tok = el('td'); tok.append(el('span', r.reason, 'status'));
        tr.append(rank, name, tvl, change, age, val, tok);
        tbody.append(tr);
      });
    }
    return;
  }
  const rows = filtered();
  const maxShown = Math.max(...rows.map((r) => r.shown), 1);
  if (count) count.textContent = `${rows.length} of ${DATA.board_size} protocols`;
  if (rows.length === 0) {
    const tr = el('tr'); const td = el('td');
    td.colSpan = 7;
    const empty = el('div', null, 'empty');
    empty.append(el('h2', 'No protocols match these filters'));
    empty.append(el('p', 'Loosen the filters, or clear the search.'));
    const btn = el('button', 'Clear all filters'); btn.type = 'button'; btn.className = 'button primary';
    btn.addEventListener('click', () => { state.q = ''; state.cat = ''; state.chain = ''; state.minTvl = 0; state.wl = false; writeHash(); render(); });
    empty.append(btn);
    td.append(empty); tr.append(td); tbody.append(tr);
    return;
  }
  rows.forEach((r, i) => {
    const tr = el('tr');
    tr.tabIndex = 0; tr.dataset.slug = r.slug; tr.dataset.selected = state.sel === r.slug ? 'true' : 'false';
    const rank = el('td', String(sandboxOn() ? i + 1 : r.rank), 'num');
    const name = el('td', null, 'name');
    const nameB = el('b', r.name);
    if (r.watchlist) nameB.append(el('span', '★ Watchlist', 'badge'));
    name.append(nameB, el('span', `${r.category || '—'} · ${chainList(r.chains)}`, 'sub'));
    const tvl = el('td', money(r.tvl_usd), 'num');
    const change = el('td', pct(r.change_7d), 'num');
    if ((r.change_7d || 0) > 0) change.classList.add('pos');
    if ((r.change_7d || 0) < 0) change.classList.add('neg');
    const age = el('td', ageText(r.age_days), 'num');
    const imp = el('td', null, 'implied');
    const bar = el('div', null, 'bar'); const fill = el('i'); fill.style.width = `${Math.max(2, Math.round((r.shown / maxShown) * 100))}%`; bar.append(fill);
    const num = el('span', moneyExact(r.shown), 'num');
    imp.append(bar, num);
    const tok = el('td'); tok.append(el('span', 'No token', 'status'));
    tr.append(rank, name, tvl, change, age, imp, tok);
    const open = () => { state.sel = r.slug; writeHash(); openDetail(r); renderTable(); };
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    tbody.append(tr);
  });
}

/* ---------- detail view ---------- */
let dialog = null;
function openDetail(row) {
  if (!dialog) {
    dialog = el('dialog', null, 'detail');
    dialog.addEventListener('close', () => { state.sel = null; writeHash(); renderTable(); });
    document.body.append(dialog);
  }
  dialog.innerHTML = '';
  const model = sandboxOn() ? { ...M, base_multiple: state.base, growth_weight: state.weight } : M;
  const v = impliedOf(row, model);
  const head = el('div', null, 'detail-head');
  const title = el('div');
  title.append(el('span', `Rank ${row.rank} · ${row.category || '—'}`, 'brand-name'));
  const h2 = el('h2', row.name);
  title.append(h2);
  const sub = el('p', `${chainList(row.chains)} · TVL ${money(row.tvl_usd)} · listed ${fmtDate(row.listed_at)} · ${ageText(row.age_days)}`);
  sub.className = 'sub';
  title.append(sub);
  const close = el('button', 'Close'); close.type = 'button'; close.className = 'close';
  close.addEventListener('click', () => dialog.close());
  head.append(title, close);
  dialog.append(head);

  const sec = el('section', null, 'detail-section');
  sec.append(el('h3', 'Implied value — how it is computed'));
  const eq = el('div', null, 'equation');
  const eqRow = (k, val) => { const d = el('div'); d.append(el('span', k), el('b', val, 'num')); return d; };
  eq.append(
    eqRow('TVL', moneyExact(row.tvl_usd)),
    eqRow('Base multiple', model.base_multiple.toFixed(2)),
    eqRow('7-day change', pct(row.change_7d)),
    eqRow('Growth multiplier', `× ${v.growthMult.toFixed(4)}`),
    eqRow('Age', ageText(row.age_days)),
    eqRow('Maturity multiplier', `× ${v.maturityMult.toFixed(4)}`),
    eqRow('Implied value', moneyExact(v.implied)),
    eqRow('Token status', 'Records no token'),
  );
  sec.append(eq);
  const check = el('p', null, 'sub');
  check.textContent = `Recomputed in this page: ${moneyExact(Math.max(1, Math.round(row.tvl_usd * model.base_multiple * v.growthMult * v.maturityMult)))} — the board and the page agree.`;
  sec.append(check);
  dialog.append(sec);

  const farm = el('section', null, 'detail-section');
  farm.append(el('h3', 'Farm plan — seven steps'));
  const ol = el('ol', null, 'steps');
  farmSteps(row).forEach((s) => {
    const li = el('li');
    const main = s.split(' Cost: ')[0];
    const cost = s.includes(' Cost: ') ? s.split(' Cost: ')[1] : '';
    li.append(el('b', main));
    if (cost) li.append(el('span', `Cost: ${cost}`, 'cost'));
    ol.append(li);
  });
  farm.append(ol);
  const warn = el('p', null, 'sub');
  warn.textContent = 'This protocol records no token in the snapshot of 2026-11-14 — that is the record, not proof it has none. The implied value is an estimate, not a price. Re-check the protocol’s own pages before farming it.';
  farm.append(warn);
  dialog.append(farm);

  if (!dialog.open) dialog.showModal();
}

window.addEventListener('hashchange', () => { readHash(); render(); });
render();
