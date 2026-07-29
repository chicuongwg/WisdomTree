/**
 * Layout checker for .drawio diagrams: flag any edge label (badge) that sits on
 * top of a box or a frame title.
 * Re-implements architecture-diagram skill's badge_overlap_audit.py in Node.js.
 */
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const diagramsDir = join(__dirname, '../docs/diagrams');

const TITLE_BAND = 26; // px height of a frame's title strip
const CHAR_W = 6.6;    // px per label character (heuristic)
const LABEL_PAD = 16;  // px padding + border on a badge
const LABEL_H = 22;    // px badge height

function styleGet(style, key) {
  const m = new RegExp(`(?:^|;)${key}=([^;]*)`).exec(style || '');
  return m ? m[1] : null;
}

function stripTags(v) {
  if (!v) return '';
  const unescaped = v
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  return unescaped.replace(/<[^>]+>/g, '').replace(/&[#a-zA-Z0-9]+;/g, ' ').trim();
}

function rectsIntersect(a, b) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
}

function rectContains(outer, inner) {
  const [ox, oy, ow, oh] = outer;
  const [ix, iy, iw, ih] = inner;
  return ox <= ix && oy <= iy && ox + ow >= ix + iw && oy + oh >= iy + ih;
}

function analyzeFile(filepath) {
  const content = readFileSync(filepath, 'utf8');
  const verts = {};
  const edges = [];

  // Parse vertices
  const cellRegex = /<mxCell id="([^"]+)" ([^>]*)>/g;
  let cm;
  const mxCells = [];
  while ((cm = cellRegex.exec(content)) !== null) {
    const id = cm[1];
    const attrsStr = cm[2];
    const fullMatch = content.slice(cm.index, content.indexOf('</mxCell>', cm.index) + 9);
    mxCells.push({ id, attrsStr, xml: fullMatch });
  }

  for (const cell of mxCells) {
    const vertexMatch = /vertex="1"/.test(cell.attrsStr);
    const edgeMatch = /edge="1"/.test(cell.attrsStr);
    const valueMatch = /value="([^"]*)"/.exec(cell.attrsStr);
    const value = valueMatch ? valueMatch[1] : '';
    const styleMatch = /style="([^"]*)"/.exec(cell.attrsStr);
    const style = styleMatch ? styleMatch[1] : '';

    if (vertexMatch) {
      const geoMatch = /<mxGeometry x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/.exec(cell.xml);
      if (geoMatch) {
        verts[cell.id] = [
          parseFloat(geoMatch[1]), parseFloat(geoMatch[2]),
          parseFloat(geoMatch[3]), parseFloat(geoMatch[4]),
          style, value
        ];
      }
    } else if (edgeMatch) {
      const srcMatch = /source="([^"]*)"/.exec(cell.attrsStr);
      const tgtMatch = /target="([^"]*)"/.exec(cell.attrsStr);
      const pts = [];
      const ptRegex = /<mxPoint x="([^"]+)" y="([^"]+)"/g;
      let pm;
      while ((pm = ptRegex.exec(cell.xml)) !== null) {
        pts.push([parseFloat(pm[1]), parseFloat(pm[2])]);
      }
      edges.push({
        id: cell.id,
        src: srcMatch ? srcMatch[1] : null,
        tgt: tgtMatch ? tgtMatch[1] : null,
        style,
        value,
        pts
      });
    }
  }

  const boxes = {};
  for (const [vid, v] of Object.entries(verts)) {
    boxes[vid] = v.slice(0, 4);
  }
  const containerIds = new Set();
  for (const [vid, r] of Object.entries(boxes)) {
    for (const [wid, r2] of Object.entries(boxes)) {
      if (wid !== vid && rectContains(r, r2)) {
        containerIds.add(vid);
        break;
      }
    }
  }

  function anchor(vid, ex, ey, style) {
    if (!verts[vid]) return null;
    const [x, y, w, h] = verts[vid];
    const fx = styleGet(style, ex);
    const fy = styleGet(style, ey);
    if (fx !== null && fy !== null) {
      return [x + parseFloat(fx) * w, y + parseFloat(fy) * h];
    }
    return [x + w / 2, y + h / 2];
  }

  const findings = [];
  for (const { id: eid, src, tgt, style, value, pts } of edges) {
    const label = stripTags(value);
    if (!label) continue;
    const p0 = anchor(src, 'exitX', 'exitY', style);
    const p1 = anchor(tgt, 'entryX', 'entryY', style);
    if (!p0 || !p1) continue;
    const poly = [p0, ...pts, p1];
    const segs = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const dx = poly[i + 1][0] - poly[i][0];
      const dy = poly[i + 1][1] - poly[i][1];
      segs.push(Math.hypot(dx, dy));
    }
    const half = segs.reduce((a, b) => a + b, 0) / 2;
    let acc = 0;
    let lx = poly[0][0];
    let ly = poly[0][1];
    for (let i = 0; i < segs.length; i++) {
      const l = segs[i];
      if (acc + l >= half && l > 0) {
        const f = (half - acc) / l;
        lx = poly[i][0] + f * (poly[i + 1][0] - poly[i][0]);
        ly = poly[i][1] + f * (poly[i + 1][1] - poly[i][1]);
        break;
      }
      acc += l;
    }
    const lw = label.length * CHAR_W + LABEL_PAD;
    const lbox = [lx - lw / 2, ly - LABEL_H / 2, lw, LABEL_H];
    for (const [vid, [x, y, w, h, vstyle, vval]] of Object.entries(verts)) {
      if (vid === src || vid === tgt) continue;
      if (styleGet(vstyle, 'fillColor') === 'none') {
        if (stripTags(vval) && rectsIntersect(lbox, [x, y, w, TITLE_BAND])) {
          findings.push({ eid, label, lx: Math.round(lx), ly: Math.round(ly), kind: 'FRAME-TITLE', vid });
        }
      } else if (containerIds.has(vid)) {
        continue;
      } else if (styleGet(vstyle, 'fillColor') !== null && rectsIntersect(lbox, [x, y, w, h])) {
        findings.push({ eid, label, lx: Math.round(lx), ly: Math.round(ly), kind: 'BOX', vid });
      }
    }
  }
  return findings;
}

const files = readdirSync(diagramsDir).filter(f => f.endsWith('.drawio')).sort();
let total = 0;

for (const file of files) {
  const filepath = join(diagramsDir, file);
  const hits = analyzeFile(filepath);
  for (const hit of hits) {
    total++;
    console.log(`${file}: edge ${hit.eid} label '${hit.label.slice(0, 32)}' @(${hit.lx},${hit.ly}) overlaps ${hit.kind} ${hit.vid}`);
  }
}

if (total > 0) {
  console.error(`\n${total} badge/box overlap(s) across ${files.length} diagram(s) -- reroute the label into a clear gap, lane it, or drop it.`);
  process.exit(1);
} else {
  console.log(`OK -- no badge/box overlaps across ${files.length} diagram(s).`);
  process.exit(0);
}
