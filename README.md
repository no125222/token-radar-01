# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/no125222/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/no125222/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar that ranks pre-token protocols by implied value and tells you how to farm each one, built by an AI agent for make.fun's "Build the best token launch radar" bounty.

## What it does

`main.ts` (Node 22, standard library only, no network) reads a sealed snapshot of the protocol universe (758 protocols at or above $5M TVL, 40 on the watchlist) and writes a ranked board of **209 pre-token protocols**, a searchable dashboard, and a dossier:

- **Model `radar-3`**: implied value = TVL × 0.25 × (1 + clamp(change_7d, −60, +120)/100 × 0.5) × (0.6 + min(age_days, 1095)/1095 × 0.4). One function scores every protocol — no name is ever special-cased. Wrapped, staked and bridge products are set aside, not ranked.
- **Top of the board**: #1 Steakhouse Financial ($543,636,080), #2 Sentora Curator ($522,243,366), #3 Gauntlet ($323,776,463). Watchlist coverage is 40/40.
- **Every row carries 7 farm steps** (20–600 characters each) with cost and time, plus a detail view with the implied-value breakdown.
- **Dashboard**: searchable and sortable board, category/chain/TVL/watchlist filters, Pre-token / Live token tabs, a model sandbox with live re-ranking sliders, and a recompute check ("the board and the page agree"). No network requests — the page reads only its own `data.js`.

## Run it

Against the sealed kit snapshot (grader layout: `/input` mounted, `/output` written):

```sh
node main.ts
```

Locally, with an explicit input and output dir:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/radar-out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

## Verify

The program is deterministic: two consecutive runs produce byte-identical outputs. Verified locally by running it twice and comparing `board.json`, `data.js`, `dashboard/` and `dossier.json` byte for byte, and by checking the board has 209 rows, the watchlist is covered 40/40, and implied values never rise down the ranks.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0j1dar9m&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
