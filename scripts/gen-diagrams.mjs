import { writeFileSync } from 'fs';

const OUT = new URL('../docs/diagrams/', import.meta.url).pathname;
const ESC = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const BADGE = label => `<span style="background-color: #ffffff; padding: 2px 6px; border: 1px solid #d3d3d3; border-radius: 4px; box-shadow: 1px 1px 3px rgba(0,0,0,0.1);">${label}</span>`;

// Repo theme (existing WisdomTree diagram colour language — kept per skill precedence)
const C = {
  app: { fill: '#FAF5FF', stroke: '#A855F7' }, // platform / app modules
  data: { fill: '#FEF3C7', stroke: '#D97706' }, // datastores
  work: { fill: '#ECFDF5', stroke: '#10B981' }, // worker / async processing
  actor: { fill: '#EFF6FF', stroke: '#3B82F6' }, // people
  ext: { fill: '#F8FAFC', stroke: '#64748B' }, // external systems / neutral
  state: { fill: '#F8FAFC', stroke: '#475569' },
  term: { fill: '#F1F5F9', stroke: '#94A3B8' },
};

const EDGE_BASE = 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;fontColor=#000000;labelBackgroundColor=#ffffff;jumpStyle=arc;jumpSize=6;endArrow=blockThin;endFill=1;strokeWidth=1.2;';
const box = (c, extra = '') => `rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=${c.fill};strokeColor=${c.stroke};strokeWidth=2;fontColor=#000000;fontSize=11;align=center;${extra}`;
const STATE = box(C.state, 'arcSize=50;fontStyle=1;fontSize=12;');
const TERMINAL = box(C.term, 'arcSize=50;fontStyle=1;fontSize=12;');
const DOT = 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1E293B;strokeColor=none;fontColor=#000000;';
const SECTION = 'text;html=1;align=left;verticalAlign=middle;fontStyle=1;fontSize=14;fontColor=#000000;';
const TITLE = 'text;html=1;align=left;verticalAlign=middle;fontSize=16;fontColor=#000000;';
const GUIDE = 'text;html=1;align=left;fontSize=10;fontColor=#666666;';
const LEGEND = 'text;html=1;align=left;verticalAlign=middle;fontSize=10;fontColor=#000000;';
const MSGBAR = 'rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#404040;fontColor=#000000;fontSize=11;arcSize=8;align=left;spacing=8;';
const FOOTNOTE = 'rounded=1;whiteSpace=wrap;html=1;fillColor=#F2F2F2;strokeColor=#969696;fontColor=#555555;fontSize=10;dashed=1;arcSize=8;align=left;spacing=6;';
const GHOST = 'rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#969696;dashed=1;verticalAlign=top;align=left;spacing=8;fontSize=10;fontStyle=1;fontColor=#969696;arcSize=4;';
const ENTITY = 'rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=8;fillColor=#ffffff;fontColor=#000000;fontSize=10;arcSize=8;';
const LIFELINE = 'endArrow=none;dashed=1;html=1;strokeColor=#CBD5E1;strokeWidth=1;fontColor=#000000;';

class D {
  constructor(w = 1600, h = 1200) {
    this.cells = [];
    this.n = 1;
    this.w = w;
    this.h = h;
    this.geo = {};
    this.fan = {};
  }
  id() {
    return 'c' + ++this.n;
  }
  v(value, style, x, y, w, h) {
    const id = this.id();
    const match = /strokeColor=([^;]+)/.exec(style);
    this.geo[id] = { x, y, w, h, strokeColor: match ? match[1] : '#999999' };
    this.cells.push(`        <mxCell id="${id}" value="${ESC(value)}" style="${style}" vertex="1" parent="1">\n          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />\n        </mxCell>`);
    return id;
  }
  // auto-pin edge endpoints from relative geometry; spread fan-in along the border
  pins(src, tgt) {
    const a = this.geo[src],
      b = this.geo[tgt];
    if (!a || !b) return '';
    const acx = a.x + a.w / 2,
      acy = a.y + a.h / 2,
      bcx = b.x + b.w / 2,
      bcy = b.y + b.h / 2;
    const dx = bcx - acx,
      dy = bcy - acy;
    const spread = key => {
      const seq = [0.5, 0.3, 0.7, 0.15, 0.85];
      this.fan[key] = (this.fan[key] ?? -1) + 1;
      return seq[this.fan[key] % seq.length];
    };
    if (Math.abs(dx) >= Math.abs(dy)) {
      const exY = spread('x' + src + (dx > 0 ? 'r' : 'l'));
      const enY = spread('e' + tgt + (dx > 0 ? 'l' : 'r'));
      return dx > 0 ? `exitX=1;exitY=${exY};entryX=0;entryY=${enY};` : `exitX=0;exitY=${exY};entryX=1;entryY=${enY};`;
    }
    const exX = spread('x' + src + (dy > 0 ? 'b' : 't'));
    const enX = spread('e' + tgt + (dy > 0 ? 't' : 'b'));
    return dy > 0 ? `exitX=${exX};exitY=1;entryX=${enX};entryY=0;` : `exitX=${exX};exitY=0;entryX=${enX};entryY=1;`;
  }
  e(src, tgt, label = '', { dashed = false, color = null, width = 1.2, pin = true, pinStr = null, points = null, lift = false } = {}) {
    const id = this.id();
    const stroke = color || this.geo[src]?.strokeColor || '#999999';
    const style = EDGE_BASE + `strokeColor=${stroke};strokeWidth=${width};` + (dashed ? 'dashed=1;' : '') + (lift ? 'verticalAlign=bottom;spacingBottom=6;' : '') + (pinStr ?? (pin ? this.pins(src, tgt) : ''));
    const val = label ? BADGE(label) : '';
    const pts = points ? `<Array as="points">${points.map(p => `<mxPoint x="${p[0]}" y="${p[1]}" />`).join('')}</Array>` : '';
    this.cells.push(`        <mxCell id="${id}" value="${ESC(val)}" style="${style}" edge="1" parent="1" source="${src}" target="${tgt}">\n          <mxGeometry relative="1" as="geometry">${pts}</mxGeometry>\n        </mxCell>`);
  }
  line(x1, y1, x2, y2, style = LIFELINE) {
    const id = this.id();
    this.cells.push(`        <mxCell id="${id}" value="" style="${style}" edge="1" parent="1">\n          <mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y1}" as="sourcePoint" /><mxPoint x="${x2}" y="${y2}" as="targetPoint" /></mxGeometry>\n        </mxCell>`);
  }
  msg(x1, x2, y, label, { dashed = false, color = '#999999' } = {}) {
    const id = this.id();
    const style = EDGE_BASE + `strokeColor=${color};` + (dashed ? 'dashed=1;' : '') + 'verticalAlign=bottom;spacingBottom=4;';
    this.cells.push(`        <mxCell id="${id}" value="${ESC(BADGE(label))}" style="${style}" edge="1" parent="1">\n          <mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y}" as="sourcePoint" /><mxPoint x="${x2}" y="${y}" as="targetPoint" /></mxGeometry>\n        </mxCell>`);
  }
  title(text, date = new Date().toISOString().slice(0, 10)) {
    this.v(`<b>WISDOMTREE</b> — ${text} (${date})`, TITLE, 40, 10, this.w - 80, 30);
  }
  guide(text) {
    this.v(`<i><b>How to read:</b> ${text}</i>`, GUIDE, 40, 44, this.w - 80, 20);
  }
  section(text, x, y, w = 420) {
    return this.v(text, SECTION, x, y, w, 26);
  }
  state(label, x, y, w = 110, h = 40, style = STATE) {
    return this.v(label, style, x, y, w, h);
  }
  dot(x, y) {
    return this.v('', DOT, x, y, 18, 18);
  }
  note(text, x, y, w, h = 40) {
    return this.v(`<i>${text}</i>`, FOOTNOTE, x, y, w, h);
  }
  message(text, y) {
    this.v(`<b>Message:</b> ${text}`, MSGBAR, 40, y, this.w - 80, 34);
  }
  legend(text, y) {
    this.v(text, LEGEND, 40, y, this.w - 80, 24);
  }
  ghost(titleText, x, y, w, h) {
    return this.v(titleText, GHOST, x, y, w, h);
  }
  out(file, pageName) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<mxfile host="Electron" modified="2026-07-20T00:00:00.000Z" agent="Mozilla/5.0" version="21.6.8" type="device">\n  <diagram id="diagram_id" name="${ESC(pageName)}">\n    <mxGraphModel dx="1400" dy="1000" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${this.w}" pageHeight="${this.h}" background="#ffffff" math="0" shadow="0">\n      <root>\n        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n${this.cells.join('\n')}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n`;
    writeFileSync(OUT + file, xml);
    console.log('wrote', file, this.cells.length, 'cells');
  }
}

/* ============ 1. state-machines.drawio ============ */
{
  const d = new D(1850, 1430);
  d.title('STATE MACHINES — three-layer source model, catalog, loans, nodes, reviews, conflicts · synced with docs/flows/state-machines.md');
  d.guide('nine independent machines, top-left to bottom-right; &#9679; = entry; rounded gray = active state, pale gray = terminal; dashed edge = audited exception path.');

  // 1 Source Storage
  d.section('1 · Source Storage Lifecycle (per source version)', 50, 80);
  let s0 = d.dot(50, 132);
  let up = d.state('uploaded', 120, 120);
  let st = d.state('stored', 320, 120);
  let ar = d.state('archived', 540, 120, 110, 40, TERMINAL);
  d.e(s0, up);
  d.e(up, st, 'file persisted', { lift: true });
  d.e(st, ar, 'retire', { lift: true });
  d.note('stored = findable and downloadable in Library by space members; extraction and curation never remove availability.', 700, 108, 280, 62);

  // 2 Extraction
  d.section('2 · Extraction Status (parallel — never gates storage)', 50, 220);
  let e0 = d.dot(50, 272);
  let pe = d.state('pending', 120, 260);
  let pr = d.state('processed', 320, 260);
  let un = d.state('unprocessable', 320, 335, 125, 40, TERMINAL);
  d.e(e0, pe);
  d.e(pe, pr, 'parser / OCR ok', { lift: true });
  d.e(pe, un, 'failed');
  d.note('unprocessable is a visible end state; the stored file stays in Library.', 700, 258, 280, 44);

  // 3 Curation
  d.section('3 · Curation Lifecycle (optional overlay)', 50, 420);
  let c0 = d.dot(50, 472);
  let uc = d.state('under_correction', 120, 460, 135, 40);
  let rr = d.state('ready_for_review', 345, 460, 135, 40);
  let pm = d.state('promoted', 660, 435, 110, 40, TERMINAL);
  let rj = d.state('rejected', 660, 505, 110, 40, TERMINAL);
  d.e(c0, uc, 'nominate + assign', { lift: true });
  d.e(uc, rr, 'text + draft ready', { lift: true });
  d.e(rr, pm, 'published', { lift: true });
  d.e(rr, rj, 'not suitable');
  d.note('rejected closes curation only — the item stays stored in its space.', 120, 565, 480, 30);

  // 4 Branch-gap
  d.section('4 · Branch-gap Request Lifecycle', 50, 630);
  let g0 = d.dot(50, 682);
  let sb = d.state('submitted', 120, 670);
  let tr = d.state('triaged', 320, 670);
  let cv = d.state('converted_to_branch', 520, 625, 160, 40);
  let gr = d.state('rejected', 520, 695, 110, 40);
  let ga = d.state('archived', 780, 670, 110, 40, TERMINAL);
  d.e(g0, sb);
  d.e(sb, tr, 'Admin/Op triage', { lift: true });
  d.e(tr, cv);
  d.e(tr, gr);
  d.e(tr, ga, 'direct archive', {
    points: [
      [440, 765],
      [835, 765],
    ],
  });
  d.e(cv, ga);
  d.e(gr, ga);

  // 5 Review
  d.section('5 · Review Lifecycle', 50, 800);
  let r0 = d.dot(50, 852);
  let qd = d.state('queued', 120, 840, 95, 40);
  let ag = d.state('assigned', 290, 840, 95, 40);
  let ir = d.state('in_review', 460, 840, 95, 40);
  let cr = d.state('changes_requested', 260, 930, 155, 40);
  let ap = d.state('approved', 660, 815, 100, 40, TERMINAL);
  let rr2 = d.state('rejected', 660, 885, 100, 40, TERMINAL);
  d.e(r0, qd);
  d.e(qd, ag);
  d.e(ag, ir);
  d.e(ir, ap);
  d.e(ir, rr2);
  d.e(ir, cr, 'needs work', {
    pinStr: 'exitX=0.5;exitY=1;entryX=1;entryY=0.5;',
    points: [[507, 950]],
  });
  d.e(cr, ag, 'rework', { pinStr: 'exitX=0.3;exitY=0;entryX=0.3;entryY=1;' });

  // 6 Conflict
  d.section('6 · Conflict Lifecycle (optimistic-lock escalation)', 50, 1030);
  let f0 = d.dot(50, 1082);
  let de = d.state('detected', 120, 1070, 95, 40);
  let lk = d.state('locked', 290, 1070, 90, 40);
  let rs = d.state('resolving', 455, 1070, 95, 40);
  let rv = d.state('resolved', 660, 1045, 100, 40, TERMINAL);
  let ac2 = d.state('archived_conflict', 660, 1115, 135, 40, TERMINAL);
  d.e(f0, de, 'stale save rejected', { lift: true });
  d.e(de, lk);
  d.e(lk, rs, 'Admin/Op', { lift: true });
  d.e(rs, rv);
  d.e(rs, ac2);
  d.note('Both competing versions are preserved until Admin/Op resolves; no auto-merge in V1.', 120, 1180, 480, 30);

  // Right column
  const X = 1080;
  // 7 Catalog Item
  d.section('7 · Catalog Item Lifecycle (physical copy)', X, 80);
  let k0 = d.dot(X, 132);
  let av = d.state('available', X + 70, 120);
  let bw = d.state('borrowed', X + 310, 120);
  let rp = d.state('repair', X + 70, 240, 110, 40);
  let ls = d.state('lost', X + 310, 240, 110, 40, TERMINAL);
  d.e(k0, av);
  d.e(av, bw, 'loan borrows', { lift: true });
  d.e(bw, av, 'loan returns', {
    pinStr: 'exitX=0.5;exitY=1;entryX=0.5;entryY=1;',
    points: [
      [X + 365, 205],
      [X + 125, 205],
    ],
  });
  d.e(av, rp, 'withdraw', { pinStr: 'exitX=0.3;exitY=1;entryX=0.3;entryY=0;' });
  d.e(rp, av, 'repaired', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0;entryY=0.5;',
    points: [
      [X + 40, 260],
      [X + 40, 140],
    ],
  });
  d.e(av, ls);
  d.e(bw, ls, 'not returned');
  d.note('available &#8596; borrowed is driven by the loan lifecycle; other transitions are librarian actions.', X + 480, 125, 250, 70);

  // 8 Loan Ticket
  d.section('8 · Loan Ticket Lifecycle', X, 340);
  let l0 = d.dot(X, 392);
  let rq = d.state('requested', X + 70, 380);
  let apv = d.state('approved', X + 260, 380);
  let dc = d.state('declined', X + 260, 465, 110, 40, TERMINAL);
  let bo = d.state('borrowed', X + 450, 380);
  let ov = d.state('overdue', X + 450, 465, 110, 40);
  let rt = d.state('returned', X + 640, 380, 105, 40, TERMINAL);
  d.e(l0, rq, 'member asks', { lift: true });
  d.e(rq, apv, 'librarian', { lift: true });
  d.e(rq, dc);
  d.e(apv, bo, 'handover', { lift: true });
  d.e(bo, rt);
  d.e(bo, ov, 'past due_at');
  d.e(ov, rt);

  // 9 Node Verification
  d.section('9 · Node Verification Lifecycle', X, 560);
  let n0 = d.dot(X, 692);
  let ns = d.state('no_source', X + 160, 610);
  let uv = d.state('unverified', X + 160, 710);
  let vf = d.state('verified', X + 160, 810);
  let na = d.state('archived', X + 470, 710, 110, 40, TERMINAL);
  d.e(n0, ns, 'manual node');
  d.e(n0, uv, 'publish');
  d.e(n0, vf, 'publish verified');
  d.e(ns, uv, 'evidence linked');
  d.e(uv, vf, 'Admin/Op verify');
  d.e(vf, uv, 'downgrade (audited)', {
    dashed: true,
    pinStr: 'exitX=1;exitY=0.5;entryX=1;entryY=0.7;',
    points: [
      [X + 330, 830],
      [X + 330, 738],
    ],
  });
  d.e(ns, na);
  d.e(uv, na);
  d.e(vf, na);
  d.note('Source-driven publishes enter directly at unverified or verified per the Admin/Op publish decision; verified &#8594; unverified requires an auditable Admin/Op action.', X + 380, 800, 370, 56);

  d.message('Storage, extraction, and curation are three independent machines — a processing or review outcome can never take a stored item away from its space members.', 1290);
  d.legend('<b>Node grammar</b> (repo theme, fixed): rounded gray = active state · pale gray = terminal state · &#9679; = entry · dashed edge = audited exception / declared path · badge = transition trigger. Source of truth: docs/flows/state-machines.md.', 1340);
  d.out('state-machines.drawio', 'State Machines');
}

/* ============ 2. entity-relationship-diagram.drawio ============ */
{
  const d = new D(1990, 1700);
  d.title('ENTITY-RELATIONSHIP MAP — tables and key FKs by owning module · authoritative detail: docs/design/database-schema.md');
  d.guide('one ghost frame per owning module; white cards = tables (name + key columns); gray edges = FK, purple = provenance spine; italic dashed card = SQL view.');

  // wrap-aware card height: ~6.2px/char at fontSize 10, 15px per rendered line
  const lc = (t, w) => Math.max(1, Math.ceil((String(t).replace(/&[#a-zA-Z0-9]+;/g, 'x').length * 6.2) / (w - 20)));
  const cardH = (fields, w) => 42 + fields.reduce((a, f) => a + lc(f, w), 0) * 15;
  const colH = (defs, w, gap = 28) => defs.reduce((a, f) => a + cardH(f.f, w) + gap, 0);
  const ids = {};
  const stack = (x, w, y0, defs, gap = 28) => {
    let y = y0;
    for (const t of defs) {
      const h = cardH(t.f, w);
      ids[t.k] = d.v(`<b>${t.n}</b><hr>${t.f.join('<br>')}`, ENTITY + `strokeColor=${t.s ?? '#969696'};`, x, y, w, h);
      y += h + gap;
    }
    return y;
  };

  // ---- card definitions ----
  const AUTH = [
    {
      k: 'users',
      n: 'users',
      f: ['id PK', 'google_sub, email', 'role user|editor|admin_op', 'zalo_user_id?'],
    },
  ];
  const STO_A = [
    {
      k: 'spaces',
      n: 'spaces',
      f: ['id PK', 'name', 'type team|personal', 'owner_user_id? (personal)'],
    },
    { k: 'members', n: 'space_members', f: ['space_id PK FK', 'user_id PK FK', 'added_by FK'] },
    {
      k: 'gaps',
      n: 'branch_gap_requests',
      f: ['id PK', 'title, state', 'submitted_by FK', 'triaged_by? FK'],
    },
  ];
  const STO_B = [
    {
      k: 'sources',
      n: 'sources',
      f: ['id PK', 'space_id FK', 'title, trust_status', 'submitted_by FK, assigned_to? FK'],
    },
    {
      k: 'versions',
      n: 'source_versions',
      f: ['id PK', 'source_id FK, seq', 'original_object_key', 'storage_state uploaded | stored | quarantined | archived', 'extraction_status pending | processed | unprocessable', 'uploaded_by FK'],
      s: '#D97706',
    },
    {
      k: 'chunks',
      n: 'text_chunks · immutable',
      f: ['source_version_id FK', 'position, ref_type, ref_label', 'content, tsv', 'embedding? (pgvector 1.5)'],
      s: '#D97706',
    },
    {
      k: 'corrected',
      n: 'corrected_texts · append-only',
      f: ['source_version_id FK, seq', 'content', 'edited_by FK'],
    },
    {
      k: 'curations',
      n: 'curations',
      f: ['source_version_id FK UQ', 'state under_correction | ready_for_review | promoted | rejected', 'assigned_to? FK'],
    },
  ];
  const KN_A = [
    { k: 'branches', n: 'branches', f: ['id PK', 'name UQ', 'created_by FK'] },
    { k: 'links', n: 'node_links', f: ['from/to_node_id FK', 'link_type'] },
    { k: 'tags', n: 'tags · node_tags', f: ['tag: id, name UQ', 'node_tags(node_id, tag_id)'] },
    {
      k: 'drafts',
      n: 'markdown_drafts',
      f: ['source_version_id FK UQ', 'content_md', 'suggested_branch_id?'],
    },
    {
      k: 'promotions',
      n: 'promotions · provenance',
      f: ['source_version_id FK', 'node_version_id FK', 'approved_by FK', 'excerpt_chunk_ids[]'],
      s: '#A855F7',
    },
    { k: 'reviews', n: 'review_tasks', f: ['task_type, target_type/id', 'state, assigned_to? FK'] },
  ];
  const KN_B = [
    {
      k: 'nodes',
      n: 'tree_nodes',
      f: ['id PK', 'branch_id FK', 'title, slug UQ', 'content_md, tsv', 'verification no_source | unverified | verified | archived', 'publish bool (Quartz)', 'canonical_node_id? (merge)', 'created_by FK'],
      s: '#A855F7',
    },
    {
      k: 'nodeVers',
      n: 'tree_node_versions · append-only',
      f: ['node_id FK, seq', 'content_md, verification', 'created_by FK'],
      s: '#A855F7',
    },
    {
      k: 'conflicts',
      n: 'conflicts',
      f: ['target_type/id, state', 'base_version', 'attempted_payload, attempted_by FK'],
    },
  ];
  const NOTI = [
    {
      k: 'comments',
      n: 'comments · append-only',
      f: ['anchor_type source | tree_node | deadline', 'anchor_id, parent_comment_id?', 'author_id FK, mentions[]'],
    },
    { k: 'notifs', n: 'notifications', f: ['user_id FK', 'event_type, payload', 'read_at?'] },
    {
      k: 'delivs',
      n: 'notification_deliveries',
      f: ['notification_id FK', 'channel in_app | email | zalo', 'state, attempts'],
    },
    { k: 'prefs', n: 'notification_preferences', f: ['user_id + event_type PK', 'channels[]'] },
  ];
  const BRID = [
    {
      k: 'imports',
      n: 'bridge_imports',
      f: ['kind drive | sheet_catalog | sheet_metrics | forms', 'config, state, watermark?'],
    },
    {
      k: 'importItems',
      n: 'bridge_import_items',
      f: ['import_id + external_id PK', '&#8594; idempotent re-runs', 'target_type/id, status'],
    },
    { k: 'exports', n: 'export_jobs', f: ['scope, state', 'manifest, triggered_by FK'] },
  ];
  const CAT_A = [
    {
      k: 'items',
      n: 'catalog_items',
      f: ['id PK, item_code UQ (label)', 'title, author, location', 'status available | borrowed | lost | repair', 'space_id FK', 'linked_source_id? FK &#8594; sources (digitized copy)'],
    },
  ];
  const CAT_B = [
    {
      k: 'loans',
      n: 'loan_tickets',
      f: ['id PK, item_id FK', 'borrower_id FK', 'state requested | approved | declined | borrowed | overdue | returned', 'due_at, handled_by? FK', 'UQ: one active loan / item'],
    },
  ];
  const PM_A = [
    {
      k: 'deadlines',
      n: 'deadlines',
      f: ['id PK, space_id FK', 'type conference | funding | report | milestone', 'due_at, reminder_offsets[]'],
    },
    { k: 'drem', n: 'deadline_reminders', f: ['deadline_id + offset PK', 'sent_at'] },
    { k: 'dlinks', n: 'deadline_links', f: ['deadline_id FK', 'target_type, target_id'] },
  ];
  const PM_B = [
    {
      k: 'caltok',
      n: 'calendar_tokens',
      f: ['token PK (unguessable)', 'user_id FK, space_id?', 'revoked_at?'],
    },
    {
      k: 'tasks',
      n: 'tasks',
      f: ['id PK, title', 'state todo | doing | done | archived', 'assigned_to? FK, target_type/id?'],
    },
    {
      k: 'achiev',
      n: 'achievements',
      f: ['id PK, title, branch_id?', 'logged_by FK, achieved_at'],
    },
  ];
  const CROSS = [
    {
      k: 'audit',
      n: 'audit_events · append-only',
      f: ['actor_id FK, actor_role', 'accountability uploader | editor_updater | approver_publisher | operator', 'action, target_type/id, outcome'],
      s: '#D97706',
    },
    {
      k: 'outbox',
      n: 'outbox_events · append-only',
      f: ['id bigint (dispatch order)', 'event_type, payload', 'dispatched_at?'],
      s: '#D97706',
    },
    { k: 'jobs', n: 'jobs', f: ['job_type, payload', 'idempotency_key UQ', 'state, attempts'] },
  ];

  // ---- frames + stacks (heights computed first, frame drawn, then cards) ----
  const authH = colH(AUTH, 260) + 30;
  d.ghost('AUTH — identity and roles', 40, 90, 340, authH);
  stack(60, 260, 130, AUTH);

  const stoTop = 90 + authH + 50;
  const stoH = Math.max(colH(STO_A, 270) + 100, colH(STO_B, 330)) + 40;
  d.ghost('STORAGE — spaces, sources, three-layer model', 40, stoTop, 700, stoH);
  const stoABottom = stack(60, 270, stoTop + 40, STO_A);
  ids.view = d.v('<i><b>intake_items</b> — SQL VIEW over sources + branch_gap_requests (projection, not a table)</i>', FOOTNOTE, 60, stoABottom, 270, 64);
  stack(390, 330, stoTop + 40, STO_B);

  const catTop = stoTop + stoH + 50;
  const catH = Math.max(colH(CAT_A, 300), colH(CAT_B, 320)) + 40;
  d.ghost('CATALOG + CIRCULATION — physical library', 40, catTop, 700, catH);
  stack(60, 300, catTop + 40, CAT_A);
  stack(400, 320, catTop + 40, CAT_B);

  const knH = Math.max(colH(KN_A, 300), colH(KN_B, 340)) + 40;
  d.ghost('KNOWLEDGE — curated Markdown tree', 810, 90, 720, knH);
  stack(830, 300, 130, KN_A);
  stack(1170, 340, 130, KN_B);

  const pmTop = 90 + knH + 50;
  const pmH = Math.max(colH(PM_A, 300), colH(PM_B, 320)) + 40;
  d.ghost('PM — deadlines, tasks, calendar', 810, pmTop, 720, pmH);
  stack(830, 300, pmTop + 40, PM_A);
  stack(1170, 320, pmTop + 40, PM_B);

  const noH = colH(NOTI, 330) + 30;
  d.ghost('NOTIFY — comments and alerts', 1600, 90, 380, noH);
  stack(1620, 330, 130, NOTI);

  const brTop = 90 + noH + 50;
  const brH = colH(BRID, 330) + 30;
  d.ghost('BRIDGE-GOOGLE + EXPORT', 1600, brTop, 380, brH);
  stack(1620, 330, brTop + 40, BRID);

  const crTop = brTop + brH + 50;
  const crH = colH(CROSS, 330) + 30;
  d.ghost('CROSS-CUTTING — audit, outbox, jobs (append-only backbone)', 1600, crTop, 380, crH);
  stack(1620, 330, crTop + 40, CROSS);

  // ---- edges: adjacent FKs unlabeled; long relations ride the inter-frame corridors ----
  const midY = k => d.geo[ids[k]].y + d.geo[ids[k]].h / 2;
  d.e(ids.members, ids.spaces);
  d.e(ids.members, ids.users, '', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0;entryY=0.5;',
    points: [
      [26, midY('members')],
      [26, midY('users')],
    ],
  });
  d.e(ids.sources, ids.spaces);
  d.e(ids.versions, ids.sources);
  d.e(ids.chunks, ids.versions);
  d.e(ids.corrected, ids.versions);
  d.e(ids.curations, ids.versions);
  d.e(ids.loans, ids.items);
  d.e(ids.nodes, ids.branches);
  d.e(ids.nodeVers, ids.nodes);
  d.e(ids.links, ids.nodes);
  d.e(ids.tags, ids.nodes);
  d.e(ids.drafts, ids.versions, '', { pinStr: 'exitX=0;exitY=0.5;entryX=1;entryY=0.3;' });
  d.e(ids.promotions, ids.versions, 'evidence', {
    color: '#A855F7',
    width: 1.5,
    pinStr: 'exitX=0;exitY=0.5;entryX=1;entryY=0.7;',
  });
  d.e(ids.promotions, ids.nodeVers, '', {
    color: '#A855F7',
    width: 1.5,
    pinStr: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
  });
  d.e(ids.deadlines, ids.dlinks);
  d.e(ids.notifs, ids.delivs);
  d.e(ids.imports, ids.importItems);

  const bottom = Math.max(catTop + catH, pmTop + pmH, crTop + crH) + 50;
  d.message('Every entity in data-model-lifecycle, catalog-circulation, and notifications maps to exactly one table (or the intake_items view) — full column detail lives in docs/design/database-schema.md, which supersedes this map on any disagreement.', bottom);
  d.legend('<b>Colour roles</b> (repo theme, fixed): <font color="#A855F7">&#9632; provenance spine (tree + promotions)</font> · <font color="#D97706">&#9632; append-only / immutable backbone</font> · <font color="#969696">&#9632; regular table</font> · dashed card = SQL view · purple heavy edge = evidence linkage. Source of truth: docs/design/database-schema.md.', bottom + 50);
  d.h = bottom + 110;
  d.out('entity-relationship-diagram.drawio', 'ERD');
}

/* ============ 3. system-context.drawio ============ */
{
  const d = new D(1500, 1000);
  d.title('SYSTEM CONTEXT — actors and external systems around the platform');
  d.guide('centre = the app; solid edges move data (coloured by source role), dashed = auth/trigger signals; all Google and Zalo links are one-way in or outbound only.');

  const app = d.v('<b>WisdomTree App</b><br>modular monolith: storage &#183; catalog &#183; circulation &#183; knowledge<br>pm &#183; bridge-google &#183; notify &#183; search &#183; export &#183; auth &#183; audit', box(C.app, 'fontSize=12;'), 540, 340, 380, 90);

  const user = d.v('User / Editor / Admin-Op<br>(&#8804;10 members)', `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=${C.actor.fill};strokeColor=${C.actor.stroke};strokeWidth=2;fontColor=#000000;fontSize=12;fontStyle=1;`, 240, 210, 60, 70);
  const oidc = d.v('<b>Google OIDC</b><br>identity — no new accounts', box(C.ext), 560, 130, 220, 50);
  const s3 = d.v('<b>Object Storage (S3)</b><br>originals + artifacts', `shape=datastore;whiteSpace=wrap;html=1;fillColor=${C.data.fill};strokeColor=${C.data.stroke};strokeWidth=2;fontColor=#000000;fontSize=12;fontStyle=1;align=center;`, 1000, 190, 200, 60);
  const worker = d.v('<b>Worker Host</b><br>parser / OCR / pandoc render / imports / reindex<br>+ Ollama (local-only AI)', box(C.work), 1000, 340, 280, 70);
  const email = d.v('<b>Email Provider</b><br>outbound alerts', box(C.ext), 180, 480, 180, 50);
  const zalo = d.v('<b>Zalo Official Account</b><br>outbound alerts — chat stays on Zalo / Messenger', box(C.ext), 180, 570, 290, 60);
  const gsuite = d.v('<b>Google Drive / Sheets / Forms</b><br>read-only import via Op credential', box(C.ext), 560, 630, 300, 60);
  const gcal = d.v('<b>Google Calendar</b><br>subscribes /calendar/:token.ics', box(C.ext), 920, 630, 260, 60);
  const repo = d.v('<b>Content Repo (GitHub)</b><br>one-way export target', box(C.ext), 1260, 470, 210, 60);
  const ci = d.v('<b>GitHub Actions</b><br>validate + Quartz build<br>(selective publish:true pages)', box(C.ext), 1260, 570, 220, 70);

  d.e(user, app, 'browse, upload, borrow', { color: C.actor.stroke, width: 1.5 });
  d.e(user, oidc, 'sign in', { dashed: true, color: C.actor.stroke });
  d.e(oidc, app, 'identity claims', { color: '#404040' });
  d.e(app, s3, 'store / signed download', { color: C.app.stroke });
  d.e(app, worker, 'jobs', { dashed: true, color: C.app.stroke, lift: true });
  d.e(worker, s3, 'fetch originals', { color: C.work.stroke });
  d.e(app, email, 'notifications', { color: C.app.stroke });
  d.e(app, zalo, 'notifications', { color: C.app.stroke });
  d.e(worker, gsuite, 'import / poll (one-way in)', {
    color: C.work.stroke,
    pinStr: 'exitX=0;exitY=0.8;entryX=0.85;entryY=0;',
    points: [
      [955, 396],
      [955, 610],
      [815, 610],
    ],
  });
  d.e(app, gcal, 'ICS feed (outbound)', { color: C.app.stroke });
  d.e(app, repo, 'export commits (one-way)', {
    color: C.app.stroke,
    pinStr: 'exitX=1;exitY=0.9;entryX=0;entryY=0.3;',
    points: [
      [970, 421],
      [970, 440],
      [1230, 440],
      [1230, 488],
    ],
  });
  d.e(repo, ci, 'push triggers', { dashed: true, color: '#404040' });

  d.message('Every external link is one-way in or outbound-only — a Google, Zalo, or email outage degrades a single channel and can never block storage, catalog, or knowledge workflows.', 790);
  d.legend('<b>Colour roles</b> (repo theme, fixed): <font color="#A855F7">&#9632; app</font> · <font color="#10B981">&#9632; worker</font> · <font color="#D97706">&#9632; datastore</font> · <font color="#3B82F6">&#9632; people</font> · <font color="#64748B">&#9632; external system</font> · edge colour = source role · dashed = auth / trigger signal. Source of truth: docs/system/system-context.md.', 840);
  d.out('system-context.drawio', 'System Context');
}

/* ============ 4. two-repository-architecture.drawio ============ */
{
  const d = new D(1500, 900);
  d.title('TWO-REPOSITORY ARCHITECTURE — storage-first Source Repo + curated Knowledge Tree');
  d.guide('left frame = canonical evidence storage (the product core), right frame = curated knowledge; the purple promotion edge is the only path between them; export flows one-way out.');

  d.ghost('SOURCE REPO — the team storage home (canonical evidence)', 40, 80, 620, 560);
  const spacesB = d.v('<b>Spaces</b> (membership-scoped)<br>team / personal / library space', box(C.ext), 70, 120, 250, 55);
  const libB = d.v('<b>Library — store-first</b><br>items findable + downloadable at &quot;stored&quot;,<br>before any extraction or curation', box(C.app, 'strokeWidth=2;'), 70, 215, 250, 75);
  const extB = d.v('<b>Extraction</b> (parallel)<br>parser-first, OCR fallback &#8594; immutable<br>position-referenced text chunks', box(C.work), 70, 335, 250, 75);
  const curB = d.v('<b>Curation</b> (optional)<br>corrected text chain &#8594; Markdown draft<br>&#8594; Admin/Op review', box(C.ext), 70, 455, 250, 75);
  d.note('Storage lifecycle, extraction status, and curation are three separate layers; rejection or failure never removes a stored item from Library.', 360, 240, 280, 70);

  d.ghost('KNOWLEDGE TREE — curated Markdown (canonical in PostgreSQL)', 740, 80, 440, 380);
  const nodesB = d.v('<b>Tree nodes + branches</b><br>tags, typed links, graph', box(C.app), 780, 130, 230, 55);
  const verB = d.v('<b>Verification</b><br>no_source / unverified / verified', box(C.ext), 780, 225, 230, 55);
  const provB = d.v('<b>Promotions — provenance</b><br>source version &#8594; node version<br>+ approver + excerpt chunks', box(C.app), 780, 320, 230, 70);

  const exportB = d.v('<b>Export layer</b> (one-way)<br>tree &#8594; content Git repo<br>backup, validation, snapshots', box(C.ext), 740, 540, 240, 75);
  const quartzB = d.v('<b>Quartz static site</b> (Phase 1.5)<br>selective read-only publish of verified<br>nodes flagged publish:true', box(C.ext), 1050, 540, 260, 75);

  d.e(spacesB, libB);
  d.e(libB, extB, 'async', { dashed: true, color: C.work.stroke });
  d.e(extB, curB, 'nominate');
  d.e(curB, provB, 'publish (promotion)', {
    color: C.app.stroke,
    width: 1.5,
    pinStr: 'exitX=1;exitY=0.5;entryX=0;entryY=0.7;',
    points: [
      [695, 492],
      [695, 369],
    ],
  });
  d.e(nodesB, exportB, 'export commits', {
    color: C.app.stroke,
    pinStr: 'exitX=1;exitY=0.5;entryX=0.5;entryY=1;',
    points: [
      [1330, 157.5],
      [1330, 640],
      [860, 640],
    ],
  });
  d.e(exportB, quartzB, 'CI build', { dashed: true, color: '#404040', lift: true });

  d.message('The Source Repo is the product core, not a feeder pipeline: members live in Library at &quot;stored&quot;; promotion into the tree is optional and one-way, and the content repo is derived, never the source of truth.', 680);
  d.legend('<b>Colour roles</b> (repo theme, fixed): <font color="#A855F7">&#9632; canonical app surfaces</font> · <font color="#10B981">&#9632; async processing</font> · <font color="#64748B">&#9632; supporting stage</font> · purple heavy edge = the one promotion path · dashed = async / CI trigger. Source of truth: docs/system/two-repository-architecture.md.', 730);
  d.out('two-repository-architecture.drawio', 'Two-Repository Architecture');
}

/* ============ 5. data-model-lifecycle.drawio ============ */
{
  const d = new D(1560, 640);
  d.title('DATA LIFECYCLE — upload to published node, store-first · synced with docs/system/data-model-lifecycle.md');
  d.guide('left to right; the purple heavy edge ends the guaranteed path — everything right of &quot;Stored&quot; is optional curation.');

  const y = 150;
  const up = d.v('<b>Upload Source</b>', box(C.ext), 40, y, 130, 50);
  const stq = d.v('<b>Stored in<br>Space Library</b>', box(C.app, 'strokeWidth=2;'), 240, y, 140, 50);
  const ext = d.v('<b>Parse / OCR</b><br>async, parallel', box(C.work), 450, y, 140, 50);
  const cor = d.v('<b>Corrected Text</b><br>versioned chain', box(C.ext), 650, y, 150, 50);
  const dr = d.v('<b>Markdown Draft</b>', box(C.ext), 860, y, 140, 50);
  const rv = d.v('<b>Admin/Op Review</b>', box(C.ext), 1060, y, 150, 50);
  const pb = d.v('<b>Publish to Tree</b><br>+ promotion provenance', box(C.app), 1270, y, 180, 50);
  const nd = d.v('<b>Tree Node</b>', box(C.app), 1270, 320, 130, 50);
  const mg = d.v('<b>Merge / Archive</b><br>redirect, audited', box(C.ext), 1020, 320, 160, 50);

  d.e(up, stq, 'file persisted', { color: C.app.stroke, width: 1.5, lift: true });
  d.e(stq, ext, '', { dashed: true, color: C.work.stroke });
  d.e(ext, cor);
  d.e(cor, dr);
  d.e(dr, rv);
  d.e(rv, pb, 'approve', { lift: true });
  d.e(pb, nd);
  d.e(nd, mg);
  d.note('Members browse and download here directly (Happy Path 0) — extraction and curation never gate availability.', 240, 245, 340, 55);
  d.message('Store-first: the product guarantee ends at &quot;Stored in Space Library&quot; — the seven boxes to its right are an optional curation overlay that can fail or reject without touching storage.', 460);
  d.legend('<b>Colour roles</b> (repo theme, fixed): <font color="#A855F7">&#9632; guaranteed storage / canonical tree</font> · <font color="#10B981">&#9632; async worker step</font> · <font color="#64748B">&#9632; curation stage</font> · dashed = async hand-off. Source of truth: docs/system/data-model-lifecycle.md.', 510);
  d.out('data-model-lifecycle.drawio', 'Data Lifecycle');
}

/* ============ 6. deployment-topology.drawio ============ */
{
  const d = new D(1500, 900);
  d.title('DEPLOYMENT TOPOLOGY — current Compose deployable and target adapters');
  d.guide('solid boxes are current runtime components; dashed target adapters are not deployment dependencies today.');

  const client = d.v('<b>Browser / cron caller</b>', box(C.actor), 50, 130, 220, 55);
  const proxy = d.v('<b>Operator reverse proxy</b><br>TLS + trusted forwarding headers', box(C.ext), 340, 130, 260, 55);

  d.ghost('CURRENT DOCKER COMPOSE DEPLOY PROFILE', 660, 90, 760, 440);
  const migrate = d.v('<b>migrate</b><br>one-shot, forward-only SQL', box(C.work), 700, 140, 210, 65);
  const web = d.v('<b>Next.js standalone app</b><br>UI + API + modules + jobs + outbox', box(C.app, 'strokeWidth=2;'), 980, 140, 350, 65);
  const pg = d.v('<b>PostgreSQL 16</b><br>canonical state + full-text search', `shape=datastore;whiteSpace=wrap;html=1;fillColor=${C.data.fill};strokeColor=${C.data.stroke};strokeWidth=2;fontColor=#000000;fontSize=11;align=center;`, 700, 290, 240, 70);
  const appdata = d.v('<b>appdata volume</b><br>uploads + local content repo', `shape=datastore;whiteSpace=wrap;html=1;fillColor=${C.data.fill};strokeColor=${C.data.stroke};strokeWidth=2;fontColor=#000000;fontSize=11;align=center;`, 980, 290, 240, 70);
  const ollama = d.v('<b>Ollama</b><br>local model runtime', box(C.work), 1260, 290, 130, 70);

  d.ghost('TARGET ADAPTERS — NOT CURRENT DEPENDENCIES', 50, 590, 1370, 140);
  const target = d.v('<b>Redis queue · S3-compatible storage · separate Python worker · email/Zalo · remote content repo</b><br>replace local adapters through module contracts; canonical ownership stays unchanged', ENTITY + 'strokeColor=#64748B;dashed=1;', 100, 630, 1270, 60);

  d.e(client, proxy, 'HTTPS');
  d.e(proxy, web);
  d.e(migrate, pg, 'migrations');
  d.e(web, pg, 'queries + transactions');
  d.e(web, appdata, 'files + exports');
  d.e(web, ollama, 'local inference');
  d.e(web, target, 'future adapter swap', {
    dashed: true,
    color: C.ext.stroke,
    pinStr: 'exitX=0.5;exitY=1;entryX=0.7;entryY=0;',
    points: [[1155, 555]],
  });

  d.message('Back up PostgreSQL and appdata together. The app and Ollama ports bind to loopback; POST /api/cron/dispatch requires a bearer CRON_SECRET.', 760);
  d.legend('<b>Colour roles</b>: <font color="#A855F7">&#9632; app</font> · <font color="#10B981">&#9632; lifecycle / local AI</font> · <font color="#D97706">&#9632; persistent data</font> · <font color="#64748B">&#9632; operator or target adapter</font>. Source of truth: docs/system/deployment-topology.md and docker-compose.yml.', 810);
  d.out('deployment-topology.drawio', 'Deployment Topology');
}

/* ============ 7. app-user-data-flows.drawio ============ */
{
  const d = new D(1750, 1220);
  d.title('APP DATA FLOWS — store-first upload, then optional curation to publish');
  d.guide('sequence: lifelines top to bottom in time; solid = request / data, dashed = async fan-out; the store-first guarantee lands at step 4.');

  const lanes = [
    ['User', 90, C.actor],
    ['App', 330, C.app],
    ['Object Storage', 570, C.data],
    ['PostgreSQL', 790, C.data],
    ['Queue (Redis)', 990, C.data],
    ['Worker', 1180, C.work],
    ['Search', 1380, C.ext],
    ['Export / Git', 1570, C.ext],
  ];
  const XS = {};
  for (const [name, x, c] of lanes) {
    d.v(`<b>${name}</b>`, box(c), x - 80, 80, 160, 40);
    d.line(x, 120, x, 1090);
    XS[name.split(' ')[0]] = x;
  }
  const U = XS['User'],
    A = XS['App'],
    S = XS['Object'],
    P = XS['PostgreSQL'],
    Q = XS['Queue'],
    W = XS['Worker'],
    SE = XS['Search'],
    E = XS['Export'];

  let y = 170;
  d.msg(U, A, y, '1 &#183; POST /source/upload (space, file)', { color: C.actor.stroke });
  y += 60;
  d.msg(A, S, y, '2 &#183; put original object', { color: C.app.stroke });
  y += 60;
  d.msg(A, P, y, '3 &#183; TX: version stored + audit + outbox(source.stored)', {
    color: C.app.stroke,
  });
  y += 60;
  d.msg(A, U, y, '4 &#183; 201 — visible in Library NOW', { color: C.app.stroke });
  y += 60;
  d.msg(A, Q, y, '5 &#183; enqueue extraction (idempotency key)', {
    dashed: true,
    color: C.app.stroke,
  });
  y += 55;
  d.msg(Q, W, y, '6 &#183; dequeue', { dashed: true, color: '#404040' });
  y += 55;
  d.msg(W, S, y, '7 &#183; fetch original; parse, OCR fallback (Ollama)', { color: C.work.stroke });
  y += 60;
  d.msg(W, P, y, '8 &#183; TX: text_chunks + processed | unprocessable + outbox', {
    color: C.work.stroke,
  });
  y += 60;
  d.msg(P, SE, y, '9 &#183; outbox &#8594; reindex (full text &#8804; 5 min)', {
    dashed: true,
    color: C.data.stroke,
  });
  y += 75;

  d.v('<i>— optional curation on top of storage —</i>', GUIDE, A - 60, y - 32, 420, 20);
  d.msg(U, A, y + 8, '10 &#183; corrected text + md draft (owned / assigned)', {
    color: C.actor.stroke,
  });
  y += 68;
  d.msg(A, P, y, '11 &#183; TX: curation ready_for_review + review task + outbox', {
    color: C.app.stroke,
  });
  y += 60;
  d.msg(U, A, y, '12 &#183; Admin/Op publish (branch, verification, excerpts)', {
    color: C.actor.stroke,
  });
  y += 60;
  d.msg(A, P, y, '13 &#183; TX: node + version + promotion + audit + outbox', {
    color: C.app.stroke,
  });
  y += 60;
  d.msg(P, E, y, '14 &#183; export trigger &#8594; one-way commit', {
    dashed: true,
    color: C.data.stroke,
  });
  y += 55;
  d.msg(P, SE, y, '15 &#183; reindex publish (&#8804; 5 min)', {
    dashed: true,
    color: C.data.stroke,
  });

  d.message('One transaction per mutation (state + audit + outbox together): the user is safe at step 4, and everything after is asynchronous, idempotent, and unable to take the stored item away.', 1120);
  d.legend('<b>Colour roles</b> (repo theme, fixed): <font color="#3B82F6">&#9632; user request</font> · <font color="#A855F7">&#9632; app action</font> · <font color="#10B981">&#9632; worker</font> · <font color="#D97706">&#9632; data / event fan-out</font> · dashed = async. Source of truth: docs/design/sequence-diagrams.md.', 1170);
  d.out('app-user-data-flows.drawio', 'App Data Flows');
}

/* ============ 8. user-happy-path.drawio ============ */
{
  const d = new D(1700, 940);
  d.title('USER HAPPY PATHS — storage first, knowledge, contribution, and borrowing');
  d.guide('four independent journeys, each left to right; Path 0 is the daily core and the adoption lever.');

  const chain = (label, y, steps, hero = false) => {
    d.section(label, 40, y - 46, 700);
    let prev = null,
      x = 40;
    for (const s of steps) {
      const b = d.v(s, box(C.ext, hero ? 'strokeWidth=2;' : ''), x, y, 180, 55);
      if (prev) d.e(prev, b);
      prev = b;
      x += 240;
    }
  };

  chain('Path 0 — Store &amp; Retrieve (the daily core)', 140, ['<b>Open app</b><br>Google sign-in', '<b>Open Library</b><br>Kho t&#432; li&#7879;u', '<b>Search / browse</b><br>member space', '<b>Open stored item</b><br>preview + metadata', '<b>Download original</b>'], true);
  chain('Path 1 — Learn from the tree', 310, ['<b>Search the tree</b>', '<b>Open node</b><br>trust state visible', '<b>Follow links</b><br>mini-graph', '<b>Open branch hub</b>', '<b>Continue or contribute</b><br>new source item']);
  chain('Path 2 — Contribute', 480, ['<b>Open Source Intake</b>', '<b>Upload file</b><br>or gap request', '<b>Item stored</b><br>in space Library', '<b>Track</b><br>My Submissions', '<b>Notified on changes</b><br>Zalo / in-app']);
  chain('Path 3 — Borrow a book (Th&#432; vi&#7879;n)', 650, ['<b>Browse Catalog</b>', '<b>Request loan</b>', '<b>Notified: approved</b><br>Zalo', '<b>Pick up</b><br>librarian marks borrowed', '<b>Return</b><br>reminder if overdue']);

  d.message('Path 0 must work perfectly before curation features matter — it replaces Excel/Docs for a non-technical team and is the adoption lever; all paths run on the Vietnamese-default UI.', 780);
  d.legend('<b>Node grammar</b> (repo theme, fixed): heavier border = the hero journey · unlabeled solid edges = sequential steps. Sources of truth: docs/flows/user-flows.md, docs/ui/screen-inventory.md.', 830);
  d.out('user-happy-path.drawio', 'User Happy Paths');
}

/* ============ 9. database-schema-architecture.drawio ============ */
{
  const d = new D(1600, 1000);
  d.title('DATABASE SCHEMA ARCHITECTURE — 10 functional modules, provenance spine, and space scoping');
  d.guide('module groupings of PostgreSQL tables; solid lines indicate foreign keys along the provenance spine; dashed lines indicate space scoping and audit relationships.');

  // Core & Auth
  d.section('1 · Auth &amp; Spaces (auth, storage)', 50, 70);
  const auth = d.v('<b>users &amp; sessions</b><hr>id, role, name<br>session_cookie, expires_at', ENTITY + 'strokeColor=#3B82F6;', 50, 110, 260, 90);
  const sp = d.v('<b>spaces &amp; space_members</b><hr>id, name, kind (team|personal)<br>space_id, user_id, role', ENTITY + 'strokeColor=#3B82F6;', 50, 220, 260, 105);

  // Storage & Ingestion
  d.section('2 · Source Repo &amp; Ingestion (storage)', 360, 70);
  const src = d.v('<b>sources &amp; source_versions</b><hr>id, space_id, title, status<br>sha256, storage_path, extraction_status', ENTITY + 'strokeColor=#D97706;', 360, 110, 280, 105);
  const cur = d.v('<b>curations &amp; corrected_texts</b><hr>id, source_id, state<br>corrected_text, markdown_draft', ENTITY + 'strokeColor=#D97706;', 360, 235, 280, 105);
  const gap = d.v('<b>gap_requests</b><hr>id, space_id, requester_id, title', ENTITY + 'strokeColor=#D97706;', 360, 360, 280, 80);

  // Knowledge Tree
  d.section('3 · Knowledge Tree (knowledge)', 700, 70);
  const node = d.v('<b>tree_nodes &amp; tree_node_versions</b><hr>id, branch_id, title, verification<br>content, slug, updatedAt DESC', ENTITY + 'strokeColor=#A855F7;', 700, 110, 300, 105);
  const prom = d.v('<b>promotions</b><hr>id, tree_node_id, curation_id<br>provenance_spine_link', ENTITY + 'strokeColor=#A855F7;', 700, 235, 300, 90);
  const lk = d.v('<b>node_links &amp; node_tags</b><hr>source_node_id, target_node_id<br>tag_name, slug', ENTITY + 'strokeColor=#A855F7;', 700, 345, 300, 90);

  // Circulation & Catalog
  d.section('4 · Catalog &amp; Circulation (catalog, circulation)', 1060, 70);
  const cat = d.v('<b>catalog_items</b><hr>id, space_id, title, isbn, status', ENTITY + 'strokeColor=#10B981;', 1060, 110, 260, 90);
  const loan = d.v('<b>loan_tickets</b><hr>id, item_id, borrower_id, status<br>due_at, returned_at', ENTITY + 'strokeColor=#10B981;', 1060, 220, 260, 105);

  // Google Bridge & PM & Export (All 10 modules)
  d.section('6 · Google Bridge (bridge-google)', 50, 355, 260);
  const brd = d.v('<b>bridge_imports &amp; items</b><hr>id, kind (drive|sheet|forms), config<br>external_id, watermark, idempotent', ENTITY + 'strokeColor=#D97706;', 50, 395, 260, 95);
  d.section('7 · Project Management (pm)', 1060, 355, 260);
  const pm = d.v('<b>deadlines &amp; tasks (pm)</b><hr>id, space_id, title, due_at, type<br>tasks, achievements, calendar_tokens', ENTITY + 'strokeColor=#A855F7;', 1060, 395, 260, 95);
  d.section('8 · Export Jobs (export)', 1060, 500, 260);
  const exp = d.v('<b>export_jobs</b><hr>id, scope (full_tree|node), state<br>node_id, manifest, triggered_by', ENTITY + 'strokeColor=#A855F7;', 1060, 540, 260, 85);

  // Notifications & Outbox
  d.section('5 · Outbox, Audit &amp; Notify (notify, audit)', 360, 480);
  const obx = d.v('<b>outbox_events &amp; audit_events</b><hr>id, event_type, payload, dispatched_at<br>actor_id, action, resource_type', ENTITY + 'strokeColor=#64748B;', 360, 520, 320, 105);
  const notif = d.v('<b>notification_preferences &amp; comments</b><hr>user_id, event_type, channels<br>mentions[], anchor_type (append-only)', ENTITY + 'strokeColor=#64748B;', 730, 520, 320, 105);

  d.e(sp, src, 'space_id');
  d.e(src, cur, 'source_id');
  d.e(cur, prom, 'curation_id');
  d.e(prom, node, 'tree_node_id');
  d.e(sp, cat, 'space_id', {
    dashed: true,
    pinStr: 'exitX=0;exitY=0.5;entryX=0.5;entryY=0;',
    points: [
      [25, 272.5],
      [25, 46],
      [1190, 46],
    ],
  });
  d.e(sp, pm, 'space_id', {
    dashed: true,
    pinStr: 'exitX=0;exitY=0.3;entryX=0;entryY=0.5;',
    points: [
      [15, 251.5],
      [15, 36],
      [1030, 36],
      [1030, 442.5],
    ],
  });
  d.e(brd, src, 'imports into', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0.5;entryY=0;',
    points: [
      [25, 442.5],
      [25, 56],
      [500, 56],
    ],
  });
  d.e(node, exp, 'exports tree', {
    pinStr: 'exitX=1;exitY=0.8;entryX=1;entryY=0.5;',
    points: [
      [1030, 194],
      [1030, 505],
      [1380, 505],
      [1380, 582.5],
    ],
  });
  d.e(cat, loan, 'item_id');
  d.e(obx, notif, 'dispatches');

  d.message('All mutations execute within ACID database transactions, writing domain changes, audit_events, and outbox_events simultaneously.', 680);
  d.legend('<b>Colour roles</b>: <font color="#3B82F6">&#9632; Auth &amp; Spaces</font> · <font color="#D97706">&#9632; Storage</font> · <font color="#A855F7">&#9632; Knowledge Tree</font> · <font color="#10B981">&#9632; Circulation</font> · <font color="#64748B">&#9632; Outbox / Notify</font>. Authoritative schema: docs/design/database-schema.md.', 730);
  d.out('database-schema-architecture.drawio', 'Database Schema Architecture');
}

/* ============ 10. transactional-outbox-pattern.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('TRANSACTIONAL OUTBOX PATTERN — reliable notification dispatching on serverless / edge runtime');
  d.guide('flow diagram of how ACID database transactions and after() / cron workers prevent notification loss.');

  d.section('1 · Atomic Mutation Transaction (PostgreSQL)', 50, 100);
  const txBox = d.v('<b>ACID Transaction</b><hr>1. Domain Mutation (e.g. comment / node)<br>2. audit_events INSERT<br>3. outbox_events INSERT (dispatched_at IS NULL)', ENTITY + 'strokeColor=#D97706;', 50, 140, 380, 115);

  d.section('2 · Dispatch Triggers (Serverless Safe)', 510, 100);
  const afterTrigger = d.v('<b>Next.js 15 after() / kickDispatch()</b><hr>Executes background task without blocking<br>HTTP 201 response to caller', ENTITY + 'strokeColor=#A855F7;', 510, 140, 320, 100);
  const cronTrigger = d.v('<b>Safety Cron: POST /api/cron/dispatch</b><hr>Bearer-authenticated worker sweeping outbox_events<br>where dispatched_at IS NULL', ENTITY + 'strokeColor=#10B981;', 510, 270, 320, 100);

  d.section('3 · Dispatcher Processing', 900, 100);
  const disp = d.v('<b>dispatchOutbox()</b><hr>1. resolveRecipients (matrix / @mention)<br>2. channelsFor(user, eventType)<br>3. INSERT notifications + notification_deliveries<br>4. UPDATE outbox_events SET dispatched_at = NOW()', ENTITY + 'strokeColor=#3B82F6;', 900, 140, 360, 140);

  d.e(txBox, afterTrigger, 'immediate kick');
  d.e(txBox, cronTrigger, 'fallback drain', {
    pinStr: 'exitX=0.5;exitY=1;entryX=0;entryY=0.5;',
    points: [[240, 320]],
  });
  d.e(afterTrigger, disp, 'run');
  d.e(cronTrigger, disp, 'run');

  d.message('The zero-latency after() hook ensures lambda runtimes do not terminate early, while /api/cron/dispatch acts as a permanent fallback safety net.', 430);
  d.legend('<b>Colour roles</b>: <font color="#D97706">&#9632; database transaction</font> · <font color="#A855F7">&#9632; serverless trigger</font> · <font color="#10B981">&#9632; safety cron</font> · <font color="#3B82F6">&#9632; dispatcher</font> · <b>Pattern rules</b>: All mutations commit atomically. Source of truth: docs/design/sequence-diagrams.md.', 480);
  d.out('transactional-outbox-pattern.drawio', 'Transactional Outbox Pattern');
}

/* ============ 11. erd-1-provenance-spine.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('ERD 1: GLOBAL PROVENANCE SPINE & TWO-REPOSITORY CORE');
  d.guide('The core bridge between the Source Repo (evidence storage) and the Knowledge Tree (curated articles).');

  d.section('1 · Source Repository (Storage)', 50, 80);
  const u = d.v('<b>users</b><hr>id, role, display_name<br>locale, created_at', ENTITY + 'strokeColor=#3B82F6;', 50, 130, 260, 90);
  const sp = d.v('<b>spaces</b><hr>id, name, type (team|personal)<br>owner_user_id', ENTITY + 'strokeColor=#3B82F6;', 50, 260, 260, 90);
  const sm = d.v('<b>space_members</b><hr>space_id, user_id, role<br>created_at', ENTITY + 'strokeColor=#3B82F6;', 50, 390, 260, 90);

  const src = d.v('<b>sources</b><hr>id, space_id, title, trust_status<br>submitted_by, assigned_to', ENTITY + 'strokeColor=#D97706;', 370, 130, 260, 90);
  const sv = d.v('<b>source_versions</b><hr>id, source_id, sha256<br>storage_path, extraction_status', ENTITY + 'strokeColor=#D97706;', 370, 260, 260, 90);
  const cur = d.v('<b>curations</b><hr>id, source_version_id, state<br>corrected_text, markdown_draft', ENTITY + 'strokeColor=#D97706;', 370, 390, 260, 90);

  d.section('2 · Provenance Bridge', 710, 80);
  const prom = d.v('<b>promotions</b><hr>id, curation_id, tree_node_id<br>created_by, created_at', ENTITY + 'strokeColor=#A855F7;strokeWidth=3;', 710, 260, 280, 105);

  d.section('3 · Knowledge Tree', 1060, 80);
  const br = d.v('<b>branches</b><hr>id, space_id, name, kind<br>created_by', ENTITY + 'strokeColor=#A855F7;', 1060, 130, 260, 90);
  const node = d.v('<b>tree_nodes</b><hr>id, branch_id, title, slug<br>verification, updatedAt DESC', ENTITY + 'strokeColor=#A855F7;', 1060, 260, 260, 90);
  const nv = d.v('<b>tree_node_versions</b><hr>id, tree_node_id, content<br>versionId, commit_msg', ENTITY + 'strokeColor=#A855F7;', 1060, 390, 260, 90);

  d.e(u, sm, 'member of', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0;entryY=0.5;',
    points: [
      [-40, 175],
      [-40, 435],
    ],
  });
  d.e(sp, sm, 'grants access');
  d.e(sp, src, 'stores evidence');
  d.e(src, sv, 'versions');
  d.e(sv, cur, 'enters review');
  d.e(cur, prom, 'approved for publish');
  d.e(prom, node, 'promotes to tree');
  d.e(br, node, 'organizes notes');
  d.e(node, nv, 'maintains history');

  d.message('The promotions table is the immutable bridge between a verified curation in the Source Repo and a published note in the Knowledge Tree.', 540);
  d.legend('<b>Colour roles</b>: <font color="#3B82F6">&#9632; Auth &amp; Spaces</font> · <font color="#D97706">&#9632; Source Storage</font> · <font color="#A855F7">&#9632; Knowledge Tree &amp; Provenance</font>. Authoritative docs: docs/design/database-erds.md.', 590);
  d.out('erd-1-provenance-spine.drawio', 'ERD 1: Provenance Spine');
}

/* ============ 12. erd-2-storage-ingestion.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('ERD 2: STORAGE & INGESTION MODULE (storage, auth)');
  d.guide('Manages spaces, folders, uploaded source evidence, OCR text extraction, corrections, and gap requests.');

  d.section('1 · Space &amp; Members', 50, 80);
  const sp = d.v('<b>spaces</b><hr>id, name, type (team|personal)<br>owner_user_id', ENTITY + 'strokeColor=#3B82F6;', 50, 130, 260, 90);
  const sm = d.v('<b>space_members</b><hr>space_id, user_id, added_by<br>created_at (PK: space_id+user_id)', ENTITY + 'strokeColor=#3B82F6;', 50, 270, 260, 90);
  const gap = d.v('<b>branch_gap_requests</b><hr>id, space_id, requester_id<br>title, status, description', ENTITY + 'strokeColor=#D97706;', 50, 410, 260, 90);

  d.section('2 · Source &amp; Versions', 380, 80);
  const src = d.v('<b>sources</b><hr>id, space_id, title, trust_status<br>submitted_by, assigned_to', ENTITY + 'strokeColor=#D97706;', 380, 130, 280, 90);
  const sv = d.v('<b>source_versions</b><hr>id, source_id, sha256<br>storage_path, extraction_status', ENTITY + 'strokeColor=#D97706;', 380, 270, 280, 90);

  d.section('3 · Extraction &amp; Curation', 730, 80);
  const chunk = d.v('<b>text_chunks</b><hr>id, source_version_id, page_idx<br>content, ocr_engine', ENTITY + 'strokeColor=#10B981;', 730, 130, 280, 90);
  const cor = d.v('<b>corrected_texts</b><hr>id, source_version_id<br>corrected_text, editor_id', ENTITY + 'strokeColor=#10B981;', 730, 270, 280, 90);
  const drf = d.v('<b>markdown_drafts</b><hr>id, source_version_id<br>markdown_content, author_id', ENTITY + 'strokeColor=#10B981;', 730, 410, 280, 90);
  const cur = d.v('<b>curations</b><hr>id, source_version_id, state<br>reviewer_id, ready_at', ENTITY + 'strokeColor=#D97706;', 1080, 270, 280, 90);

  d.e(sp, sm, 'authorizes members');
  d.e(sp, gap, 'gap req', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0;entryY=0.5;',
    points: [
      [15, 175],
      [15, 455],
    ],
  });
  d.e(sp, src, 'space-scoped');
  d.e(src, sv, 'immutable uploads');
  d.e(sv, chunk, 'parsed chunks / OCR');
  d.e(sv, cor, 'human corrections');
  d.e(sv, drf, 'drafting area');
  d.e(sv, cur, 'curation status', {
    pinStr: 'exitX=1;exitY=0.25;entryX=0.5;entryY=0;',
    points: [
      [695, 292.5],
      [695, 68],
      [1220, 68],
    ],
  });

  d.message('Every upload creates an immutable SHA-256 source_version; extraction chunks, human corrections, and drafts are layered on top without overwriting.', 540);
  d.legend('<b>Colour roles</b>: <font color="#3B82F6">&#9632; Spaces / Hierarchy</font> · <font color="#D97706">&#9632; Sources &amp; Curation</font> · <font color="#10B981">&#9632; Extracted &amp; Corrected Text</font>. Authoritative docs: docs/design/database-erds.md.', 590);
  d.out('erd-2-storage-ingestion.drawio', 'ERD 2: Storage & Ingestion');
}

/* ============ 13. erd-3-knowledge-tree.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('ERD 3: KNOWLEDGE TREE & CURATION MODULE (knowledge)');
  d.guide('Manages canonical Markdown articles, branch organization, node version snapshots, Wiki-links graph, and tag taxonomies.');

  d.section('1 · Branches &amp; Nodes', 50, 80);
  const br = d.v('<b>branches</b><hr>id, space_id, name, kind<br>created_by, updatedAt DESC', ENTITY + 'strokeColor=#A855F7;', 50, 130, 280, 90);
  const node = d.v('<b>tree_nodes</b><hr>id, branch_id, title, slug<br>verification, updatedAt DESC', ENTITY + 'strokeColor=#A855F7;', 390, 130, 280, 90);
  const nv = d.v('<b>tree_node_versions</b><hr>id, tree_node_id, content<br>versionId, commit_msg, author_id', ENTITY + 'strokeColor=#A855F7;', 390, 280, 280, 90);
  const prom = d.v('<b>promotions</b><hr>id, tree_node_id, curation_id<br>created_at, created_by', ENTITY + 'strokeColor=#D97706;', 390, 430, 280, 90);

  d.section('2 · Graph &amp; Taxonomies', 740, 80);
  const link = d.v('<b>node_links</b><hr>id, source_node_id, target_node_id<br>context_snippet, link_type', ENTITY + 'strokeColor=#A855F7;', 740, 130, 280, 90);
  const ntag = d.v('<b>node_tags</b><hr>id, tree_node_id, tag_id<br>applied_by, applied_at', ENTITY + 'strokeColor=#A855F7;', 740, 280, 280, 90);
  const tag = d.v('<b>tags</b><hr>id, name, slug<br>created_at', ENTITY + 'strokeColor=#A855F7;', 1080, 280, 260, 90);

  d.e(br, node, 'contains articles');
  d.e(node, nv, 'immutable snapshots');
  d.e(node, prom, 'provenance', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0;entryY=0.5;',
    points: [
      [340, 175],
      [340, 475],
    ],
  });
  d.e(node, link, 'source link (from)');
  d.e(node, link, 'target link (to)');
  d.e(node, ntag, 'has tag');
  d.e(tag, ntag, 'applied to');

  d.message('Articles in tree_nodes sort by updatedAt DESC across sidebar and main view; node_links powers real-time Wiki-link backlink discovery.', 540);
  d.legend('<b>Colour roles</b>: <font color="#A855F7">&#9632; Knowledge Tree &amp; Graph</font> · <font color="#D97706">&#9632; Provenance Link</font>. Authoritative docs: docs/design/database-erds.md.', 590);
  d.out('erd-3-knowledge-tree.drawio', 'ERD 3: Knowledge Tree');
}

/* ============ 14. erd-4-catalog-circulation.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('ERD 4: CATALOG & CIRCULATION MODULE (catalog, circulation)');
  d.guide('Manages the physical library (Thư viện Sách), digitization links to the Source Repo, and borrow-return tickets.');

  d.section('1 · Space &amp; Source Repo Link', 50, 80);
  const sp = d.v('<b>spaces</b><hr>id, name, type (team|personal)<br>owner_user_id', ENTITY + 'strokeColor=#3B82F6;', 50, 140, 260, 90);
  const src = d.v('<b>sources</b><hr>id, space_id, title, trust_status<br>submitted_by (digitized PDF copy)', ENTITY + 'strokeColor=#D97706;', 50, 300, 260, 90);

  d.section('2 · Physical Catalog &amp; Circulation', 380, 80);
  const cat = d.v('<b>catalog_items</b><hr>id, space_id, source_id, title<br>isbn, status (available|borrowed|repair|lost)', ENTITY + 'strokeColor=#10B981;', 380, 140, 320, 105);
  const loan = d.v('<b>loan_tickets</b><hr>id, item_id, borrower_id, librarian_id<br>status (requested|approved|borrowed|returned|overdue)<br>due_at, returned_at', ENTITY + 'strokeColor=#10B981;', 780, 140, 340, 125);
  const u = d.v('<b>users</b><hr>id, display_name, role<br>email, locale', ENTITY + 'strokeColor=#3B82F6;', 780, 320, 340, 90);

  d.e(sp, cat, 'owns physical inventory');
  d.e(src, cat, 'digitized copy link');
  d.e(cat, loan, 'borrowed via');
  d.e(u, loan, 'borrower / librarian');

  d.message('Physical catalog items can optionally link to a digitized PDF in sources; loan_tickets tracks borrow/return state transitions.', 480);
  d.legend('<b>Colour roles</b>: <font color="#10B981">&#9632; Catalog &amp; Circulation</font> · <font color="#3B82F6">&#9632; Spaces &amp; Users</font> · <font color="#D97706">&#9632; Digitized PDF Link</font>. Authoritative docs: docs/design/database-erds.md.', 530);
  d.out('erd-4-catalog-circulation.drawio', 'ERD 4: Catalog & Circulation');
}

/* ============ 15. erd-5-notify-audit.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('ERD 5: NOTIFICATION, OUTBOX & AUDIT MODULE (notify, audit)');
  d.guide('Implements the Transactional Outbox Pattern and immutable audit trail for serverless-safe event dispatching.');

  d.section('1 · Actor &amp; ACID Outbox / Audit', 50, 80);
  const u = d.v('<b>users</b><hr>id, display_name, role<br>email, zalo_user_id', ENTITY + 'strokeColor=#3B82F6;', 50, 130, 260, 90);
  const obx = d.v('<b>outbox_events</b><hr>id, event_type, payload<br>dispatched_at IS NULL, created_at', ENTITY + 'strokeColor=#64748B;', 380, 130, 280, 90);
  const aud = d.v('<b>audit_events</b><hr>id, actor_id, action, target_type<br>target_id, ip_address, created_at', ENTITY + 'strokeColor=#64748B;', 380, 270, 280, 90);

  d.section('2 · Comments (Threaded)', 50, 390);
  const cmt = d.v('<b>comments (append-only)</b><hr>id, author_id, anchor_type, anchor_id<br>parent_comment_id, body, mentions[]', ENTITY + 'strokeColor=#3B82F6;', 50, 440, 280, 90);
  const cmtidx = d.v('<b>comments anchor scope</b><hr>anchor_type (source|tree_node|deadline)<br>index: (type, id, created_at)', ENTITY + 'strokeColor=#3B82F6;', 380, 440, 280, 90);

  d.section('3 · Notifications &amp; Delivery Channels', 730, 80);
  const notif = d.v('<b>notifications</b><hr>id, user_id, event_type, title<br>read_at, created_at', ENTITY + 'strokeColor=#64748B;', 730, 130, 280, 90);
  const deliv = d.v('<b>notification_deliveries</b><hr>id, notification_id, channel (in_app|zalo|email)<br>status, delivered_at', ENTITY + 'strokeColor=#64748B;', 730, 270, 280, 90);
  const pref = d.v('<b>notification_preferences</b><hr>user_id, event_type (PK)<br>channels (in_app|email|zalo)', ENTITY + 'strokeColor=#64748B;', 730, 440, 280, 90);

  d.e(u, obx, 'triggers event');
  d.e(u, aud, 'performs action');
  d.e(u, cmt, 'writes comment');
  d.e(cmt, cmtidx, 'anchored to');
  d.e(obx, notif, 'dispatches via outbox runner');
  d.e(notif, deliv, 'per channel delivery');
  d.e(u, pref, 'sets preferences', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0.5;entryY=1;',
    points: [
      [20, 175],
      [20, 560],
      [870, 560],
    ],
  });

  d.message('outbox_events is inserted in the same PostgreSQL transaction as domain mutations; after() and /api/cron/dispatch drain pending deliveries.', 600);
  d.legend('<b>Colour roles</b>: <font color="#64748B">&#9632; Outbox, Notify &amp; Audit</font> · <font color="#3B82F6">&#9632; Users &amp; Comments</font>. Authoritative docs: docs/design/database-erds.md.', 650);
  d.out('erd-5-notify-audit.drawio', 'ERD 5: Notify & Audit');
}

/* ============ 16. erd-6-project-management.drawio ============ */
{
  const d = new D(1600, 900);
  d.title('ERD 6: PROJECT MANAGEMENT & COLLABORATION MODULE (pm)');
  d.guide('Manages team deadlines, review tasks, board tasks, and achievement milestones.');

  d.section('1 · Space &amp; Users', 50, 80);
  const sp = d.v('<b>spaces</b><hr>id, name, type<br>owner_user_id', ENTITY + 'strokeColor=#3B82F6;', 50, 130, 260, 90);
  const u = d.v('<b>users</b><hr>id, display_name, role<br>email, locale', ENTITY + 'strokeColor=#3B82F6;', 50, 255, 260, 90);
  const caltok = d.v('<b>calendar_tokens</b><hr>token PK (unguessable), user_id<br>space_id, revoked_at', ENTITY + 'strokeColor=#3B82F6;', 50, 380, 260, 90);

  d.section('2 · Deadlines &amp; Reminders', 380, 80);
  const dln = d.v('<b>deadlines</b><hr>id, space_id, title, due_at<br>status, created_by', ENTITY + 'strokeColor=#A855F7;', 380, 130, 280, 90);
  const lnk = d.v('<b>deadline_links</b><hr>id, deadline_id, target_type<br>target_id (source|tree_node)', ENTITY + 'strokeColor=#A855F7;', 730, 130, 280, 90);
  const rem = d.v('<b>deadline_reminders</b><hr>id, deadline_id, remind_at<br>sent_at, channel', ENTITY + 'strokeColor=#A855F7;', 730, 255, 280, 90);

  d.section('3 · Tasks &amp; Achievements', 380, 390);
  const tasks = d.v('<b>tasks</b><hr>id, title, state (todo|doing|done|archived)<br>assigned_to, target_type, target_id', ENTITY + 'strokeColor=#10B981;', 380, 440, 280, 90);
  const achiev = d.v('<b>achievements</b><hr>id, user_id, milestone_code<br>earned_at, metadata', ENTITY + 'strokeColor=#10B981;', 730, 440, 280, 90);

  d.e(sp, dln, 'scoped deadline');
  d.e(dln, lnk, 'attached evidence / node');
  d.e(dln, rem, 'sent alerts', {
    pinStr: 'exitX=0.5;exitY=1;entryX=0;entryY=0.5;',
    points: [[520, 300]],
  });
  d.e(u, tasks, 'assigned task', {
    pinStr: 'exitX=1;exitY=0;entryX=0.5;entryY=0;',
    points: [
      [345, 255],
      [345, 238],
      [520, 238],
    ],
  });
  d.e(u, achiev, 'logged milestone', {
    pinStr: 'exitX=0;exitY=0.5;entryX=0.5;entryY=1;',
    points: [
      [20, 300],
      [20, 550],
      [870, 550],
    ],
  });
  d.e(u, caltok, 'subscribed user');

  d.message('Deadlines can link directly to evidence in sources or notes in tree_nodes; tasks and achievements track team collaboration milestones.', 600);
  d.legend('<b>Colour roles</b>: <font color="#A855F7">&#9632; Deadlines</font> · <font color="#10B981">&#9632; Tasks &amp; Achievements</font> · <font color="#3B82F6">&#9632; Spaces &amp; Users</font>. Authoritative docs: docs/design/database-erds.md.', 650);
  d.out('erd-6-project-management.drawio', 'ERD 6: Project Management');
}
console.log('done');

/* ============ 17. authorization-pipeline.drawio ============ */
{
  const d = new D(1750, 550);
  d.title('AUTHORIZATION ENFORCEMENT PIPELINE — request authentication, route guard, authorize() check, query scoping, and audit');
  d.guide('left to right; green edges = happy path, red/gray edges = denial / exception path; checks are performed in the service layer before any DB action.');

  // Pipeline Nodes
  const start = d.dot(50, 150);
  const session = d.v('<b>1 · Session Middleware</b><hr>Resolves cookie / token<br>Retrieves actor userId &amp; role<br>Caches member spaceIds', ENTITY + 'strokeColor=#3B82F6;', 120, 115, 240, 90);
  const guard = d.v('<b>2 · Route Guard</b><hr>Identifies target capability<br>Extracts resource identifiers<br>Calls authorize() helper', ENTITY + 'strokeColor=#3B82F6;', 410, 115, 220, 90);
  const authz = d.v('<b>3 · authorize() Helper</b><hr>Validates role capability<br>Checks scope qualifier:<br>space | owned-or-assigned | self | global', ENTITY + 'strokeColor=#3B82F6;', 680, 115, 260, 90);
  const scope = d.v('<b>4 · Query Scoping</b><hr>List queries call scopedToSpaces()<br>Appends membership filters<br>(No-op for Admin/Op role)', ENTITY + 'strokeColor=#3B82F6;', 990, 115, 240, 90);
  const db = d.v('<b>5 · DB Transaction</b><hr>Applies mutation + writes audit_events<br>+ inserts outbox_events<br>(committed atomically)', ENTITY + 'strokeColor=#D97706;', 1280, 115, 250, 90);
  const ok = d.state('HTTP 200/201', 1580, 140, 110, 40, TERMINAL);

  // Denial / Exception Nodes
  const err401 = d.state('HTTP 401', 185, 280, 110, 40, STATE);
  const err404 = d.state('HTTP 404', 700, 280, 110, 40, STATE);
  const err403 = d.state('HTTP 403', 880, 280, 110, 40, STATE);
  const auditDeny = d.v('<b>audit_events</b><hr>actor_id, action, resource_type<br>outcome = denied', ENTITY + 'strokeColor=#C00000;', 850, 360, 220, 75);

  // Connections
  d.e(start, session, '', { color: '#10B981', width: 1.5 });
  d.e(session, guard, 'authenticated', { color: '#10B981', width: 1.5 });
  d.e(guard, authz, 'checks guard', { color: '#10B981', width: 1.5 });
  d.e(authz, scope, 'allowed', { color: '#10B981', width: 1.5 });
  d.e(scope, db, 'scoped', { color: '#10B981', width: 1.5 });
  d.e(db, ok, 'success', { color: '#10B981', width: 1.5 });

  // Denials
  d.e(session, err401, 'invalid session', { dashed: true, color: '#C00000' });
  d.e(authz, err404, 'read forbidden\n(hide existence)', { dashed: true, color: '#C00000' });
  d.e(authz, err403, 'write forbidden', {
    dashed: true,
    color: '#C00000',
    pinStr: 'exitX=0.7;exitY=1;entryX=0.5;entryY=0;',
  });
  d.e(err403, auditDeny, 'records denial');

  d.message('Read denials return 404 (Not Found) instead of 403 (Forbidden) to prevent leaking resource existence across space boundaries.', 470);
  d.legend('<b>Colour roles</b>: <font color="#3B82F6">&#9632; authentication / check middleware</font> · <font color="#D97706">&#9632; database operations</font> · <font color="#C00000">&#9632; audit denial / error paths</font>. Source of truth: docs/design/authorization-design.md.', 510);
  d.out('authorization-pipeline.drawio', 'Authorization Pipeline');
}

/* ============ 18. user-roles-authorization.drawio ============ */
{
  const d = new D(1500, 750);
  d.title('USER ROLES & AUTHORIZATION SCOPE — Role separation, capability boundaries, and resource access qualifiers');
  d.guide('top-down within columns; Editor inherits User capabilities; Admin/Op has global privilege; role colors match the repo theme.');

  // Ghost Frames representing Roles
  const userFrame = d.ghost('ROLE: USER (Baseline Authenticated User)', 40, 100, 440, 460);
  const editorFrame = d.ghost('ROLE: EDITOR (Content Curators & Editors)', 530, 100, 440, 460);
  const adminFrame = d.ghost('ROLE: ADMIN/OP (Librarians & System Operators)', 1020, 100, 440, 460);

  // User capabilities
  d.v('<b>Read tree nodes &amp; Search tree</b><br>Qualifier: global (visible to all logged-in users)', ENTITY + 'strokeColor=#3B82F6;', 60, 140, 400, 50);
  d.v('<b>Browse Library &amp; Search source repo</b><br>Qualifier: space (restricted to member spaces)', ENTITY + 'strokeColor=#3B82F6;', 60, 210, 400, 50);
  d.v('<b>Upload source file &amp; Download original</b><br>Qualifier: space (membership in target space)', ENTITY + 'strokeColor=#3B82F6;', 60, 280, 400, 50);
  d.v('<b>Create branch-gap request &amp; Request loan</b><br>Qualifier: self / space (own records &amp; member catalog)', ENTITY + 'strokeColor=#3B82F6;', 60, 350, 400, 50);
  d.v('<b>View own submissions &amp; Comment on objects</b><br>Qualifier: self / space (membership of commented object)', ENTITY + 'strokeColor=#3B82F6;', 60, 420, 400, 50);

  // Editor capabilities
  d.v('<b>Create manual node &amp; Create branch</b><br>Qualifier: global (inherits all baseline User permissions)', ENTITY + 'strokeColor=#10B981;', 550, 140, 400, 50);
  d.v('<b>Edit branch metadata</b><br>Qualifier: owned-or-assigned (creator or active assignment)', ENTITY + 'strokeColor=#10B981;', 550, 210, 400, 50);
  d.v('<b>Edit corrected text &amp; Edit Markdown draft</b><br>Qualifier: owned-or-assigned (creator or active assignment)', ENTITY + 'strokeColor=#10B981;', 550, 280, 400, 50);
  d.v('<b>Edit manual node &amp; View node audit</b><br>Qualifier: owned-or-assigned (creator or active assignment)', ENTITY + 'strokeColor=#10B981;', 550, 350, 400, 50);
  d.v('<b>Suggest tags &amp; Board task updates</b><br>Qualifier: owned-or-assigned suggestion and task updates', ENTITY + 'strokeColor=#10B981;', 550, 420, 400, 50);

  // Admin/Op capabilities
  d.v('<b>Approve corrected text &amp; Approve MD draft</b><br>Qualifier: global (unrestricted global access)', ENTITY + 'strokeColor=#A855F7;', 1040, 140, 400, 50);
  d.v('<b>Publish to tree &amp; Merge duplicate nodes</b><br>Qualifier: global (unrestricted global access)', ENTITY + 'strokeColor=#A855F7;', 1040, 210, 400, 50);
  d.v('<b>Archive node or source &amp; Change trust status</b><br>Qualifier: global (unrestricted global access)', ENTITY + 'strokeColor=#A855F7;', 1040, 280, 400, 50);
  d.v('<b>Manage spaces &amp; membership &amp; Catalog items</b><br>Qualifier: global (unrestricted global access)', ENTITY + 'strokeColor=#A855F7;', 1040, 350, 400, 50);
  d.v('<b>Approve/decline loans &amp; System health &amp; Export</b><br>Qualifier: global (unrestricted global access)', ENTITY + 'strokeColor=#A855F7;', 1040, 420, 400, 50);

  // Role inheritance arrows (going from frame to frame)
  d.e(userFrame, editorFrame, 'inherits', {
    dashed: true,
    color: '#3B82F6',
    width: 1.5,
    pinStr: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
  });
  d.e(editorFrame, adminFrame, 'extends', {
    dashed: true,
    color: '#10B981',
    width: 1.5,
    pinStr: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
  });

  d.message('Editor inherits all User baseline permissions; Admin/Op acts as a superuser with global scope qualifier across all modules.', 590);
  d.legend('<b>Colour roles</b>: <font color="#3B82F6">&#9632; User role (blue)</font> · <font color="#10B981">&#9632; Editor role (green)</font> · <font color="#A855F7">&#9632; Admin/Op role (purple)</font>. Authoritative matrix: docs/requirements/permissions-matrix.md.', 640);
  d.out('user-roles-authorization.drawio', 'User Roles Authorization');
}

/* ============ 19. content-lifecycle-by-role.drawio ============ */
{
  const d = new D(1500, 800);
  d.title('CONTENT LIFECYCLE & ROLE SEPARATION — swimlanes showing User, Editor, and Admin/Op actions in the curation workflow');
  d.guide('top down within columns; dashed arrows indicate handoffs between roles; this lifecycle spans from raw source ingestion to curated publication.');

  // Lanes (ghost frames)
  const userLane = d.ghost('ROLE: USER (Contributor)', 40, 100, 440, 560);
  const editorLane = d.ghost('ROLE: EDITOR (Curation / Drafting)', 530, 100, 440, 560);
  const adminLane = d.ghost('ROLE: ADMIN/OP (Approver / Publisher)', 1020, 100, 440, 560);

  // User Actions
  const uUpload = d.v('<b>Upload Source File</b><br>Intake of original PDF/Docx<br>Status: stored', ENTITY + 'strokeColor=#3B82F6;', 60, 140, 400, 55);
  const uSubmissions = d.v('<b>View Own Submissions</b><br>Track intake processing &amp;<br>curation state progress', ENTITY + 'strokeColor=#3B82F6;', 60, 230, 400, 55);
  const uRead = d.v('<b>Explore Tree &amp; Read Node</b><br>View verified knowledge &amp;<br>contextual provenance spine', ENTITY + 'strokeColor=#3B82F6;', 60, 570, 400, 55);

  // Editor Actions
  const eReceive = d.v('<b>Receive Assigned Curation Task</b><br>Work allocation by Admin/Op<br>Status: under_correction', ENTITY + 'strokeColor=#10B981;', 550, 230, 400, 55);
  const eEdit = d.v('<b>Edit Corrected Text</b><br>Align OCR extracted text with<br>original source file content', ENTITY + 'strokeColor=#10B981;', 550, 320, 400, 55);
  const eDraft = d.v('<b>Refine Markdown Draft</b><br>Write canonical markdown content<br>ready for the public tree', ENTITY + 'strokeColor=#10B981;', 550, 410, 400, 55);
  const eSubmit = d.v('<b>Submit for Review</b><br>Mark curation ready for review<br>Status: ready_for_review', ENTITY + 'strokeColor=#10B981;', 550, 500, 400, 55);

  // Admin/Op Actions
  const aTriage = d.v('<b>Triage Source &amp; Assign Editor</b><br>Assess document trust status<br>Allocate review task', ENTITY + 'strokeColor=#A855F7;', 1040, 140, 400, 55);
  const aReview = d.v('<b>Review &amp; Approve Curation</b><br>Verify corrected text &amp;<br>markdown draft quality', ENTITY + 'strokeColor=#A855F7;', 1040, 500, 400, 55);
  const aPublish = d.v('<b>Publish to Tree</b><br>Commit version snapshot &amp;<br>create Promotion provenance', ENTITY + 'strokeColor=#A855F7;', 1040, 570, 400, 55);

  // Edge Flows
  d.e(uUpload, aTriage, '1 · submits file', {
    color: '#3B82F6',
    width: 1.5,
    pinStr: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
  });
  d.e(aTriage, eReceive, '2 · assigns curation', {
    dashed: true,
    color: '#A855F7',
    width: 1.2,
    pinStr: 'exitX=0.5;exitY=1;entryX=0.5;entryY=0;',
    points: [
      [1240, 210],
      [750, 210],
    ],
  });
  d.e(eReceive, eEdit, '3 · prepare text');
  d.e(eEdit, eDraft, '4 · write draft');
  d.e(eDraft, eSubmit, '5 · request review');
  d.e(eSubmit, aReview, '6 · review draft', {
    color: '#10B981',
    width: 1.2,
    pinStr: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
  });
  d.e(aReview, aPublish, '7 · approves');
  d.e(aPublish, uRead, '8 · makes available', {
    color: '#A855F7',
    width: 1.5,
    pinStr: 'exitX=0.5;exitY=1;entryX=0.5;entryY=1;',
    points: [
      [1240, 650],
      [260, 650],
    ],
  });

  // Self loop
  d.e(uUpload, uSubmissions, 'track');

  d.message('Users upload raw evidence; Editors structure and transcribe content; Admin/Ops govern verification and publish to preserve trust.', 680);
  d.legend('<b>Colour roles</b>: <font color="#3B82F6">&#9632; User task (blue)</font> · <font color="#10B981">&#9632; Editor task (green)</font> · <font color="#A855F7">&#9632; Admin/Op task (purple)</font>. Source of truth: docs/system/data-model-lifecycle.md.', 730);
  d.out('content-lifecycle-by-role.drawio', 'Content Lifecycle by Role');
}

/* ============ 20. code-and-test-architecture.drawio ============ */
{
  const d = new D(1600, 980);
  d.title('CODE & TEST ARCHITECTURE — current modular-monolith slices and release gate');
  d.guide('top row follows runtime dependency direction; bottom row follows the test:all gate from cheap checks to browser validation.');

  d.section('Runtime code', 50, 80);
  const delivery = d.v('<b>Delivery</b><hr>src/app pages, routes, components<br>no database or schema imports', ENTITY + 'strokeColor=#3B82F6;', 50, 130, 300, 100);
  const facades = d.v('<b>Stable facades</b><hr>knowledge/service.ts · storage/curation.ts<br>knowledge-map.tsx · lib/vi.ts', ENTITY + 'strokeColor=#A855F7;', 430, 130, 330, 100);
  const slices = d.v('<b>Cohesive implementation slices</b><hr>core · queries · mutations/workflows<br>model · media · copy · states', ENTITY + 'strokeColor=#A855F7;', 840, 130, 330, 100);
  const data = d.v('<b>Data ownership</b><hr>src/db + module schema.ts<br>PostgreSQL + migrations', ENTITY + 'strokeColor=#D97706;', 1250, 130, 280, 100);
  d.e(delivery, facades, 'calls');
  d.e(facades, slices, 're-exports');
  d.e(slices, data, 'owned queries');

  d.note('The facade split preserves existing imports; it does not create services or change module ownership.', 430, 270, 740, 48);

  d.section('npm run test:all', 50, 360);
  const fast = d.v('<b>Fast gate</b><hr>lint + typecheck<br>6 unit files', ENTITY + 'strokeColor=#3B82F6;', 50, 420, 240, 100);
  const modules = d.v('<b>Structure + policy</b><hr>206 delivery files<br>172 auth assertions / 42 rows', ENTITY + 'strokeColor=#A855F7;', 340, 420, 270, 100);
  const contracts = d.v('<b>Contracts + UI audits</b><hr>tokens · 4 timezones<br>contrast · 19 diagrams', ENTITY + 'strokeColor=#64748B;', 660, 420, 270, 100);
  const integration = d.v('<b>PostgreSQL integration</b><hr>6 files<br>migrated + seeded test DB', ENTITY + 'strokeColor=#D97706;', 980, 420, 260, 100);
  const build = d.v('<b>Production build</b><hr>Next.js standalone output', ENTITY + 'strokeColor=#10B981;', 1290, 420, 240, 100);
  const e2e = d.v('<b>Playwright E2E</b><hr>3 smoke paths<br>scripts/start-e2e.mjs', ENTITY + 'strokeColor=#10B981;', 650, 650, 300, 100);

  d.e(fast, modules, 'then');
  d.e(modules, contracts, 'then');
  d.e(contracts, integration, 'then');
  d.e(integration, build, 'then');
  d.e(build, e2e, 'serve + browse', {
    pinStr: 'exitX=0.5;exitY=1;entryX=1;entryY=0.5;',
    points: [[1410, 700]],
  });

  d.message('CI uses the same layers on Node 22 with PostgreSQL 16 and an installed Playwright Chromium browser.', 820);
  d.legend('<b>Source of truth:</b> docs/platform/module-map.md · tests/README.md · package.json · .github/workflows/ci.yml.', 870);
  d.out('code-and-test-architecture.drawio', 'Code and Test Architecture');
}
