/* ══════════════════════════════════════════════════════════════
   단면도 익스플로러 — 그림 모음 (그림03 · 2026-09-30)
   공용 그리기 도우미 links/fig.js 를 쓴다. index.html(그림으로 먼저 보기 · 단면도 종류 🖼️) · lesson.js 가 함께 부른다.

   한 칸의 모양
     키: { cap:'캡션 한 줄', spot:'points' | 'types', draw:function(){ … } }
       points — 맨 아래 「학습 포인트」 밑 「🖼️ 그림으로 먼저 보기」에 나온다(순서대로)
       types  — 자유 탐색의 「단면도 종류」 🖼️ 단추. 키 = VIEW_TYPES 의 id(full · half · partial · offset)
     정답 이름표(ans:true) — 슬라이드 퀴즈에 쓰는 그림은 FIG.svgOf(키,{labels:false}) 로 ? 로 가린다.

   cutIdea · full · half · partial · offset 은 「단면도 규칙 마스터」(danmyeon-master) figs.js 에서 복사했다
   (규칙 4 — 남의 저장소는 고치지 않고 가져다 쓴다). 고칠 때는 두 곳을 같이 본다.
   boreDir · hexDir · stepCut · wallCut 은 이 도구의 부품(PARTS)과 학습 포인트를 그림으로 옮긴 것 — 크기는 모양만 맞춘 예시.
   ══════════════════════════════════════════════════════════════ */
var FIGS = (function () {
  var F = window.FIG;
  if (!F) return {};
  var C = F.C;
  var t = F.t, line = F.line, arrow = F.arrow, callout = F.callout, poly = F.poly;

  /* ── 제도용 작은 도우미 ─────────────────────── */
  function r1(v) { return Math.round(v * 10) / 10; }

  /* 45° 해칭 — rings(도형 여러 개, 겹치면 짝홀로 빈 자리) 안에만 긋는다.
     dir 1 = ／ , -1 = ＼ . gap = 선 사이 거리(수직). 같은 dir·gap 이면 부품이 달라도 같은 선 위에 놓인다. */
  function hatch(rings, o) {
    o = o || {};
    var s = o.dir === -1 ? -1 : 1, step = (o.gap || 9) * Math.SQRT2, out = '';
    var lo = Infinity, hi = -Infinity;
    rings.forEach(function (r) { r.forEach(function (p) { var f = p[0] + s * p[1]; if (f < lo) lo = f; if (f > hi) hi = f; }); });
    for (var c = Math.ceil(lo / step) * step + (o.phase || 0); c < hi; c += step) {
      var xs = [];
      rings.forEach(function (r) {
        for (var i = 0; i < r.length; i++) {
          var p = r[i], q = r[(i + 1) % r.length], fp = p[0] + s * p[1], fq = q[0] + s * q[1];
          if ((fp <= c && fq > c) || (fq <= c && fp > c)) {
            var k = (c - fp) / (fq - fp);
            xs.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
          }
        }
      });
      xs.sort(function (a, b) { return a[0] - b[0]; });
      for (var j = 0; j + 1 < xs.length; j += 2)
        out += line(xs[j][0], xs[j][1], xs[j + 1][0], xs[j + 1][1], { c: o.c || C.ink, w: o.w || 1 });
    }
    return out;
  }
  function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  function circ(cx, cy, r, n) {
    n = n || 40; var p = [];
    for (var i = 0; i < n; i++) { var a = Math.PI * 2 * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function edge(pts, o) { o = o || {}; o.close = 1; return poly(pts, o); }            /* 외형선 2.2 */
  function thin(x1, y1, x2, y2, o) { o = o || {}; o.w = o.w || 1; return line(x1, y1, x2, y2, o); }
  function cl(x1, y1, x2, y2) { return line(x1, y1, x2, y2, { w: 1, dash: 'center', c: C.ink }); }   /* 중심선 */
  function hid(x1, y1, x2, y2) { return line(x1, y1, x2, y2, { w: 1.4, dash: 'hidden', c: C.ink }); } /* 숨은선 */
  function ring(cx, cy, r, o) { o = o || {}; return F.circle(cx, cy, r, { fill: o.fill || 'none', w: o.w || 2.2, c: o.c }); }
  /* 파단선 — 불규칙한 파형의 가는 실선. (x1,y1)→(x2,y2) 를 따라 물결 */
  function wave(pts) {
    var d = 'M' + r1(pts[0][0]) + ',' + r1(pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.sqrt(nx * nx + ny * ny) || 1, k = (i % 2 ? 7 : -7) / L;
      d += ' Q' + r1(mx + nx * k) + ',' + r1(my + ny * k) + ' ' + r1(b[0]) + ',' + r1(b[1]);
    }
    return F.path(d, { w: 1.2 });
  }
  /* 절단선 — 가는 1점 쇄선, 끝부분(과 꺾이는 곳)만 굵게. pts = 꺾이는 점들 */
  function cutLine(pts, o) {
    o = o || {};
    var s = poly(pts, { w: 1, dash: 'center', c: o.c || C.ink }), E = o.end || 16;
    function seg(a, b, len) {
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy);
      return line(a[0], a[1], a[0] + dx / L * len, a[1] + dy / L * len, { w: 3.4, c: o.c || C.ink, dash: false });
    }
    s += seg(pts[0], pts[1], E) + seg(pts[pts.length - 1], pts[pts.length - 2], E);
    for (var i = 1; i < pts.length - 1; i++) s += seg(pts[i], pts[i - 1], 9) + seg(pts[i], pts[i + 1], 9);
    return s;
  }
  /* 절단선 끝의 화살표 — 절단선에 **직각**, 보는 사람 쪽에서 절단선 끝을 향해 보는 방향을 가리킨다
     (교과서 105쪽 절단선 표시). (x,y) 절단선 끝 · (ux,uy) 보는 방향 · 문자는 화살표 꼬리 너머에 */
  function viewArrow(x, y, ux, uy, letter, o) {
    o = o || {};
    var L = o.len || 28, s = arrow(x - ux * L, y - uy * L, x, y, { w: 1.4, head: 10, c: o.c || C.ink });
    if (letter) s += t(x - ux * (L + 13) + (o.lx || 0), y - uy * (L + 13) + (o.ly || 0), letter, { a: 'm', b: 1, size: 16, c: o.c || C.ink });
    return s;
  }
  /* ⭕ · ❌ 표시 — 그림 글꼴에 없을 수 있어 도형으로 그린다 */
  function ok(x, y, s) {
    return '<circle cx="' + x + '" cy="' + y + '" r="9" fill="none" stroke="' + C.green + '" stroke-width="3"/>' +
      (s ? t(x + 16, y, s, { b: 1, c: C.green, size: 15 }) : '');
  }
  function no(x, y, s) {
    return line(x - 7, y - 7, x + 7, y + 7, { c: C.red, w: 3 }) + line(x + 7, y - 7, x - 7, y + 7, { c: C.red, w: 3 }) +
      (s ? t(x + 16, y, s, { b: 1, c: C.red, size: 15 }) : '');
  }
  function divider(x, y1, y2) { return line(x, y1, x, y2, { c: C.grayM, w: 1.4, dash: '6 5' }); }

  /* ── 이 도구의 기본 부품: 계단진 부시 (가운데 구멍 + 왼쪽 끝 자리파기) ──
     단위 좌표 — 길이 0~170, 큰 쪽 반지름 50(0~80), 작은 쪽 32(80~170), 구멍 14, 자리파기 24(깊이 30).
     BU(k, ox, cy) → 화면 좌표로 바꾸는 함수 */
  var UP = [[0, -50], [80, -50], [80, -32], [170, -32], [170, -14], [30, -14], [30, -24], [0, -24]];
  var SIL = [[0, -50], [80, -50], [80, -32], [170, -32], [170, 32], [80, 32], [80, 50], [0, 50]];
  function BU(k, ox, cy) {
    return function (pts) { return pts.map(function (p) { return [ox + p[0] * k, cy + p[1] * k]; }); };
  }
  function flip(pts) { return pts.map(function (p) { return [p[0], -p[1]]; }); }
  /* 온단면 — 위아래 벽 해칭 + 자리파기 바닥선 */
  function bushFull(k, ox, cy, o) {
    o = o || {};
    var P = BU(k, ox, cy), up = P(UP), lo = P(flip(UP)), a = P([[30, -14], [30, 14]]);
    return hatch([up], { dir: o.dirU || 1, gap: o.gap || 8 }) + hatch([lo], { dir: o.dirL || 1, gap: o.gap || 8 }) +
      edge(up) + edge(lo) + line(a[0][0], a[0][1], a[1][0], a[1][1]) +
      cl(ox - 14, cy, ox + 170 * k + 14, cy);
  }
  /* 겉모양 — 외형 + (hidden 이면 숨은선) */
  function bushOut(k, ox, cy, hidden) {
    var P = BU(k, ox, cy), s = edge(P(SIL)), st = P([[80, -32], [80, 32]]);
    s += line(st[0][0], st[0][1], st[1][0], st[1][1]);
    if (hidden) {
      [[[30, -14], [170, -14]], [[30, 14], [170, 14]], [[0, -24], [30, -24]], [[0, 24], [30, 24]], [[30, -24], [30, 24]]]
        .forEach(function (sg) { var q = P(sg); s += hid(q[0][0], q[0][1], q[1][0], q[1][1]); });
    }
    return s + cl(ox - 14, cy, ox + 170 * k + 14, cy);
  }

  return {

  cutIdea: { spot: 'points',
    cap: '단면도 — 절단면을 놓고, 앞부분을 떼어 냈다고 가정하고, 보이는 대로 그린다',
    draw: function () {
      var s = '', W = 96, H = 66, dx = 30, dy = -22;   /* 가로 · 높이 · 깊이 방향(사투상) */
      function blk(x0, y0, half) {                        /* 구멍이 위아래로 뚫린 블록 */
        var ddx = half ? dx / 2 : dx, ddy = half ? dy / 2 : dy, fx = x0 + (half ? dx / 2 : 0), fy = y0 + (half ? dy / 2 : 0);
        var o = '';
        o += poly([[fx, fy], [fx + W, fy], [fx + W + ddx, fy + ddy], [fx + ddx, fy + ddy]], { close: 1, fill: '#fff', w: 1.8 });
        o += poly([[fx + W, fy], [fx + W + ddx, fy + ddy], [fx + W + ddx, fy + H + ddy], [fx + W, fy + H]], { close: 1, fill: C.grayL, w: 1.8 });
        return { s: o, fx: fx, fy: fy };
      }
      function holeTop(x0, y0, fromT) {                  /* 윗면의 구멍(원이 비스듬히 보인다) */
        var cx = x0 + W / 2 + dx / 2, cy = y0 + dy / 2, pts = [], r = 13;
        for (var i = 0; i <= 40; i++) {
          var a = Math.PI * 2 * i / 40; if (fromT != null && (a < fromT || a > fromT + Math.PI)) continue;
          pts.push([cx + r * Math.cos(a) + r * Math.sin(a) * (dx / 70), cy + r * Math.sin(a) * (dy / 70) * 1.9]);
        }
        return pts;
      }
      /* ① 절단면을 놓는다 */
      var x1 = 26, y1 = 118;
      s += t(84, 28, '① 절단면을 놓는다', { a: 'm', b: 1, size: 15 });
      s += poly([[x1 - 10 + dx / 2, y1 - 20 + dy / 2], [x1 + W + 12 + dx / 2, y1 - 20 + dy / 2],
        [x1 + W + 12 + dx / 2, y1 + H + 14 + dy / 2], [x1 - 10 + dx / 2, y1 + H + 14 + dy / 2]],
        { close: 1, fill: C.blueL, c: C.blue, w: 1.4 });
      var b1 = blk(x1, y1);
      s += b1.s + poly([[x1, y1], [x1 + W, y1], [x1 + W, y1 + H], [x1, y1 + H]], { close: 1, fill: '#fff', w: 1.8 });
      s += poly(holeTop(x1, y1), { close: 1, fill: C.grayL, w: 1.6 });
      var hx = x1 + W / 2 + dx / 2;
      s += hid(hx - 13, y1 + dy / 2 + 4, hx - 13, y1 + H + dy / 2) + hid(hx + 13, y1 + dy / 2 + 4, hx + 13, y1 + H + dy / 2);
      s += line(x1 + dx / 2, y1 + dy / 2, x1 + W + dx / 2, y1 + dy / 2, { c: C.blue, w: 1.6 }) +
        line(x1 + W + dx / 2, y1 + dy / 2, x1 + W + dx / 2, y1 + H + dy / 2, { c: C.blue, w: 1.6 });
      s += t(84, 222, '속은 숨은선(파선)뿐', { a: 'm', size: 14, c: C.sub });
      s += t(x1 - 6, y1 - 34, '절단면', { c: C.blue, b: 1, size: 14 });
      /* ② 앞부분을 떼어 낸다 */
      var x2 = 184, y2 = 118;
      s += divider(163, 44, 236) + t(244, 28, '② 앞부분을 떼어 낸다', { a: 'm', b: 1, size: 15 });
      /* 떼어 낸 앞 조각 자리 — 점선 */
      s += poly([[x2 - 14, y2 + 14], [x2 + W - 14, y2 + 14], [x2 + W - 14, y2 + H + 14], [x2 - 14, y2 + H + 14]],
        { close: 1, w: 1.2, dash: '5 4', c: C.sub, fill: '#fff' });
      s += arrow(x2 + 6, y2 + 4, x2 - 10, y2 + 18, { c: C.sub, w: 1.6, head: 8 });
      var b2 = blk(x2, y2, true);
      s += b2.s;
      var cf = rect(b2.fx, b2.fy, W, H), gx = b2.fx + W / 2;
      s += '<rect x="' + b2.fx + '" y="' + b2.fy + '" width="' + W + '" height="' + H + '" fill="#fff"/>';
      s += hatch([rect(b2.fx, b2.fy, W / 2 - 13, H), rect(gx + 13, b2.fy, W / 2 - 13, H)], { gap: 7 });
      s += edge(rect(b2.fx, b2.fy, W / 2 - 13, H)) + edge(rect(gx + 13, b2.fy, W / 2 - 13, H));
      s += poly(holeTop(x2, y2, 0), { fill: C.grayL, w: 1.6 });
      s += t(244, 222, '잘린 면 = 해칭', { a: 'm', size: 14, c: C.sub });
      /* ③ 보이는 대로 그린다 */
      var x3 = 364, y3 = 110;
      s += divider(333, 44, 236) + t(404, 28, '③ 그린다 = 단면도', { a: 'm', b: 1, size: 15, c: C.blue });
      s += hatch([rect(x3, y3, W / 2 - 13, H), rect(x3 + W / 2 + 13, y3, W / 2 - 13, H)], { gap: 7 });
      s += edge(rect(x3, y3, W / 2 - 13, H)) + edge(rect(x3 + W / 2 + 13, y3, W / 2 - 13, H));
      s += cl(x3 + W / 2, y3 - 12, x3 + W / 2, y3 + H + 12);
      s += t(404, 222, '속이 외형선으로!', { a: 'm', size: 14, c: C.green, b: 1 });
      return F.svg(480, 244, s);
    } },
  full: { spot: 'types',
    cap: '온단면도(전 단면도) — 기본 중심선에서 전체를 둘로 잘라 그린다',
    draw: function () {
      var s = bushFull(1.45, 36, 128);
      s += callout(120, 70, 330, 44, '잘린 면 — 해칭', { a: 's' });
      s += callout(200, 128, 330, 128, '기본 중심선', { a: 's' });
      s += callout(220, 108, 330, 90, '구멍 — 외형선으로', { a: 's' });
      s += t(240, 226, '전체가 단면 — 속 모양을 가장 확실히 보여 준다', { a: 'm', size: 14, c: C.sub });
      return F.svg(480, 246, s);
    } },
  half: { spot: 'types',
    cap: '한쪽 단면도(반단면도) — 대칭인 물체의 1/4 을 잘라 내 반은 단면, 반은 외형',
    draw: function () {
      var k = 1.45, ox = 36, cy = 128, P = BU(k, ox, cy), up = P(UP), s = '';
      s += hatch([up], { gap: 8 }) + edge(up);
      var a = P([[30, -14], [30, 0]]); s += line(a[0][0], a[0][1], a[1][0], a[1][1]);
      /* 아래 절반 — 겉모양, 숨은선 없음 */
      var lo = P([[0, 0], [0, 50], [80, 50], [80, 32], [170, 32], [170, 14]]);
      s += poly(lo) + line(P([[170, 0]])[0][0], cy, P([[170, 14]])[0][0], P([[170, 14]])[0][1]);
      var st = P([[80, 0], [80, 32]]); s += line(st[0][0], st[0][1], st[1][0], st[1][1]);
      s += cl(ox - 14, cy, ox + 170 * k + 14, cy);
      s += callout(120, 76, 330, 56, '단면(1/4 을 잘라 냄)', { a: 's' });
      s += callout(150, 182, 330, 188, '외형 — 숨은선 없음', { a: 's' });
      s += callout(290, 128, 330, 122, '대칭 중심선', { a: 's' });
      return F.svg(480, 246, s);
    } },
  partial: { spot: 'types',
    cap: '부분단면도 — 필요한 곳만 잘라 보이고, 경계는 파단선(불규칙한 가는 실선)',
    draw: function () {
      /* 속이 꽉 찬 축의 끝에 뚫은 구멍만 보여 준다 */
      var cy = 116, s = '', R = 40, x0 = 36, x1 = 404, c = 4;
      var wv = [[318, cy - R], [312, cy - 20], [320, cy], [312, cy + 20], [318, cy + R]];
      var reg = [[318, cy - R]].concat(wv.slice(1)).concat([[x1 - c, cy + R], [x1, cy + R - c], [x1, cy - R + c], [x1 - c, cy - R]]);
      var hole = [[x1, cy - 14], [346, cy - 14], [338, cy], [346, cy + 14], [x1, cy + 14]];
      s += hatch([reg, hole], { gap: 8 });
      s += poly([[x0 + c, cy - R], [x1 - c, cy - R], [x1, cy - R + c], [x1, cy + R - c], [x1 - c, cy + R], [x0 + c, cy + R],
        [x0, cy + R - c], [x0, cy - R + c]], { close: 1 });
      s += line(x0 + c, cy - R, x0 + c, cy + R, { w: 1.4 }) + line(x1 - c, cy - R, x1 - c, cy + R, { w: 1.4 });
      s += poly(hole) + line(346, cy - 14, 346, cy + 14) + wave(wv);
      s += cl(x0 - 14, cy, x1 + 14, cy);
      s += callout(315, cy - 30, 250, 36, '파단선(가는 실선)', { a: 'e' });
      s += callout(380, cy + 28, 380, 196, '필요한 곳만 단면', { a: 'm' });
      s += callout(150, cy + 20, 150, 196, '나머지는 겉모양 그대로', { a: 'm' });
      return F.svg(480, 222, s);
    } },
  offset: { spot: 'types',
    cap: '계단 단면도 — 한 평면에 있지 않은 구멍들을 절단선을 계단처럼 꺾어 한 번에 자른다',
    draw: function () {
      var s = '', x0 = 90, x1 = 350, y0 = 40, y1 = 136, ha = [150, 72, 17], hb = [290, 106, 13];
      /* 평면도 */
      s += edge(rect(x0, y0, x1 - x0, y1 - y0));
      s += ring(ha[0], ha[1], ha[2]) + ring(hb[0], hb[1], hb[2]);
      s += cl(ha[0], ha[1] - 26, ha[0], ha[1] + 26) + cl(hb[0], hb[1] - 22, hb[0], hb[1] + 22);
      s += cutLine([[56, ha[1]], [220, ha[1]], [220, hb[1]], [384, hb[1]]]);
      s += viewArrow(62, ha[1], 0, -1, 'A') + viewArrow(378, hb[1], 0, -1, 'A');
      /* 단면 A-A (앞에서 본 모습 — 아래에 놓는다) */
      var sy = 196, th = 46;
      s += t(220, 176, '단면 A-A', { a: 'm', b: 1, size: 16 });
      var a1 = rect(x0, sy, ha[0] - ha[2] - x0, th), a2 = rect(ha[0] + ha[2], sy, hb[0] - hb[2] - ha[0] - ha[2], th),
        a3 = rect(hb[0] + hb[2], sy, x1 - hb[0] - hb[2], th);
      s += hatch([a1, a2, a3], { gap: 8 }) + edge(a1) + edge(a2) + edge(a3);
      s += cl(ha[0], sy - 10, ha[0], sy + th + 10) + cl(hb[0], sy - 10, hb[0], sy + th + 10);
      s += callout(220, sy + th - 6, 220, 272, '꺾인 자리에는 선을 긋지 않는다 — 한 단면으로 본다', { a: 'm', size: 14 });
      s += callout(221, ha[1] + 6, 236, 22, '꺾인 곳도 굵게', { a: 's', size: 14 });
      return F.svg(480, 290, s);
    } },

  /* ─────────── 학습 포인트 — 이 도구의 부품 ─────────── */
  boreDir: { spot: 'points',
    cap: '구멍 뚫린 블록 — 구멍과 나란히 자르면 긴 빈 자리(슬롯), 수직으로 자르면 동그란 구멍',
    draw: function () {
      var s = '', K = 0.42, W = 116, H = 70, D = 96, r = 17, ox = 30, oy = 196;
      function O(x, y, z) { return [ox + x + z * K, oy - y - z * K]; }
      s += poly([O(0, H, 0), O(W, H, 0), O(W, H, D), O(0, H, D)], { close: 1, fill: '#fff', w: 1.8 });
      s += poly([O(W, 0, 0), O(W, H, 0), O(W, H, D), O(W, 0, D)], { close: 1, fill: C.grayL, w: 1.8 });
      s += poly([O(0, 0, 0), O(W, 0, 0), O(W, H, 0), O(0, H, 0)], { close: 1, fill: '#fff', w: 1.8 });
      var c = O(W / 2, H / 2, 0);
      s += F.circle(c[0], c[1], r, { fill: C.grayM, w: 1.8 });
      var a = O(W / 2, H / 2, -14), b = O(W / 2, H / 2, D + 14); s += cl(a[0], a[1], b[0], b[1]);
      /* ① 구멍 축을 품은 평면(세로) · ② 구멍 축에 수직인 평면 — 윗면·옆면에 남는 자국 */
      var p1 = O(W / 2, H, 0), p2 = O(W / 2, H, D);
      s += line(p1[0], p1[1], p2[0], p2[1], { c: C.orange, w: 2.4 });
      var q1 = O(0, H, D / 2), q2 = O(W, H, D / 2), q3 = O(W, 0, D / 2);
      s += poly([q1, q2, q3], { c: C.blue, w: 2.4 });
      s += F.num(p1[0] - 2, p1[1] - 18, '1', { c: C.orange, r: 11, size: 13 }) + F.num(q3[0] + 16, q3[1] - 6, '2', { c: C.blue, r: 11, size: 13 });
      s += t(ox, 34, '구멍이 앞뒤로 뚫린 블록', { size: 15, b: 1 });
      /* 단면 ① — 깊이 × 높이, 가운데 띠가 빈다 */
      var sx = 300, k = 0.78, dw = D * k, hh = H * k, rr = r * k, y1 = 58;
      s += t(sx - 10, y1 - 18, '① 나란히 자르면', { size: 15, b: 1, c: C.orange });
      var u = rect(sx, y1, dw, hh / 2 - rr), l = rect(sx, y1 + hh / 2 + rr, dw, hh / 2 - rr);
      s += hatch([u, l], { gap: 7 }) + edge(u) + edge(l) + cl(sx - 8, y1 + hh / 2, sx + dw + 8, y1 + hh / 2);
      s += t(sx + dw + 14, y1 + hh / 2, '슬롯', { size: 15, b: 1, ans: true });
      /* 단면 ② — 가로 × 높이, 동그란 구멍 */
      var y2 = 158, ww = W * k;
      s += t(sx - 10, y2 - 18, '② 수직으로 자르면', { size: 15, b: 1, c: C.blue });
      var body = rect(sx, y2, ww, hh), hole = circ(sx + ww / 2, y2 + hh / 2, rr);
      s += hatch([body, hole], { gap: 7 }) + edge(body) + ring(sx + ww / 2, y2 + hh / 2, rr);
      s += cl(sx + ww / 2, y2 - 6, sx + ww / 2, y2 + hh + 6) + cl(sx - 6, y2 + hh / 2, sx + ww + 6, y2 + hh / 2);
      s += t(sx + ww + 14, y2 + hh / 2, '원', { size: 15, b: 1, ans: true });
      return F.svg(480, 236, s);
    } },

  hexDir: { spot: 'points',
    cap: '육각 볼트 머리 — 축에 직각으로 자르면 정육각형, 축을 따라 길게 자르면 직사각형',
    draw: function () {
      var s = '', K = 0.42, R = 42, L = 120, cx = 78, cy = 176, rx = L * K, ry = -L * K, v = [], i;
      for (i = 0; i < 6; i++) { var a = Math.PI / 3 * i; v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      function seen(j) { var m = Math.PI / 3 * j + Math.PI / 6; return Math.cos(m) - Math.sin(m) > 0; }
      /* 보이는 옆면만 — 바깥 법선이 뒤로 물러나는 방향(오른쪽 위)과 같은 쪽 */
      for (i = 0; i < 6; i++) if (seen(i)) {
        var p = v[i], q = v[(i + 1) % 6];
        s += poly([p, q, [q[0] + rx, q[1] + ry], [p[0] + rx, p[1] + ry]], { close: 1, fill: i % 2 ? C.grayL : '#fff', w: 1.8 });
      }
      s += poly(v, { close: 1, fill: '#fff', w: 1.8 });
      /* ① 직각 절단 — 가운데 둘레에 파란 자국 · ② 축을 품은 평면 — 앞면 가운데와 모서리를 따라 주황 */
      for (i = 0; i < 6; i++) if (seen(i)) {
        var a1 = v[i], b1 = v[(i + 1) % 6];
        s += line(a1[0] + rx / 2, a1[1] + ry / 2, b1[0] + rx / 2, b1[1] + ry / 2, { c: C.blue, w: 2.4 });
      }
      s += line(v[3][0], v[3][1], v[0][0], v[0][1], { c: C.orange, w: 2.4 }) + line(v[0][0], v[0][1], v[0][0] + rx, v[0][1] + ry, { c: C.orange, w: 2.4 });
      s += F.num(v[5][0] + rx / 2 + 2, v[5][1] + ry / 2 - 18, '1', { c: C.blue, r: 11, size: 13 }) +
        F.num(v[0][0] + rx + 16, v[0][1] + ry + 4, '2', { c: C.orange, r: 11, size: 13 });
      s += t(20, 30, '육각 볼트 머리(육각 기둥)', { size: 15, b: 1 });
      /* 단면 ① — 정육각형 */
      var sx = 330, hy = 84, hr = 32, hx = [];
      for (i = 0; i < 6; i++) { var aa = Math.PI / 3 * i; hx.push([sx + hr * Math.cos(aa), hy + hr * Math.sin(aa)]); }
      s += t(sx - 60, 34, '① 직각으로 자르면', { size: 15, b: 1, c: C.blue });
      s += hatch([hx], { gap: 7 }) + poly(hx, { close: 1 }) + t(sx + hr + 12, hy, '정육각형', { size: 15, b: 1, ans: true });
      /* 단면 ② — 직사각형(길이 × 맞모금) */
      var ry2 = 168, rw = 150, rh = 2 * hr;
      s += t(sx - 60, ry2 - 18, '② 축을 따라 자르면', { size: 15, b: 1, c: C.orange });
      var rr2 = rect(sx - 58, ry2, rw, rh);
      s += hatch([rr2], { gap: 7 }) + edge(rr2) + cl(sx - 66, ry2 + rh / 2, sx - 58 + rw + 8, ry2 + rh / 2);
      s += t(sx + 17, ry2 + rh + 18, '직사각형', { a: 'm', size: 15, b: 1, ans: true });
      return F.svg(480, 262, s);
    } },

  stepCut: { spot: 'points',
    cap: '계단형 블록 — 어느 토막을 자르느냐에 따라 단면 네모의 크기가 달라진다',
    draw: function () {
      var s = '', K = 0.42, ox = 44, oy = 118, NUM = ['①', '②', '③'];
      var seg = [[0, 110, 72, 60], [110, 210, 46, 38], [210, 300, 24, 20]];   /* x 시작·끝, 높이, 깊이 */
      function O(x, y, z) { return [ox + x + z * K, oy - y - z * K]; }
      seg.forEach(function (g) {
        var x0 = g[0], x1 = g[1], h = g[2], d = g[3], y0 = -h / 2, y1 = h / 2, z0 = -d / 2, z1 = d / 2;
        s += poly([O(x0, y1, z0), O(x1, y1, z0), O(x1, y1, z1), O(x0, y1, z1)], { close: 1, fill: '#fff', w: 1.8 });
        s += poly([O(x1, y0, z0), O(x1, y1, z0), O(x1, y1, z1), O(x1, y0, z1)], { close: 1, fill: C.grayL, w: 1.8 });
        s += poly([O(x0, y0, z0), O(x1, y0, z0), O(x1, y1, z0), O(x0, y1, z0)], { close: 1, fill: '#fff', w: 1.8 });
      });
      /* 자르는 자리 ①②③ 과 그 단면(같은 척도) */
      var sy = 226;
      seg.forEach(function (g, i) {
        var xm = (g[0] + g[1]) / 2, h = g[2], d = g[3];
        var a = O(xm, -h / 2, -d / 2), b = O(xm, h / 2, -d / 2), c = O(xm, h / 2, d / 2);
        s += poly([a, b, c], { c: C.orange, w: 2.4 });
        s += F.num(c[0] + 4, c[1] - 14, String(i + 1), { c: C.orange, r: 11, size: 13 });
        var cx = ox + xm, r0 = rect(cx - d / 2, sy - h / 2, d, h);
        s += hatch([r0], { gap: 6 }) + edge(r0) + t(cx, sy + 54, '단면 ' + NUM[i], { a: 'm', size: 14, b: 1 });
      });
      s += t(24, 26, '계단형 블록 — 세 토막', { size: 15, b: 1 });
      return F.svg(480, 300, s);
    } },

  wallCut: { spot: 'points',
    cap: 'L자 브라켓은 ㄴ자, 속 빈 사각 파이프는 네모 도넛 — 벽의 두께가 단면에서 처음 보인다',
    draw: function () {
      var s = '', K = 0.42, L = 70, sx = L * K, sy = -L * K;
      /* 앞면(pts, 화면 좌표 시계 방향)을 뒤로 밀어 낸 입체 — 보이는 옆면만 */
      function ext(pts) {
        var o = '', n = pts.length;
        for (var i = 0; i < n; i++) {
          var p = pts[i], q = pts[(i + 1) % n], nx = q[1] - p[1], ny = -(q[0] - p[0]);
          if (nx - ny > 0.01)
            o += poly([p, q, [q[0] + sx, q[1] + sy], [p[0] + sx, p[1] + sy]], { close: 1, fill: nx > 0 ? C.grayL : '#fff', w: 1.8 });
        }
        return o;
      }
      function pg(pts) { return '<polygon points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="#fff"/>'; }
      /* L자 브라켓 */
      var bx = 56, by = 196, T = 18;
      var Lp = [[bx, by - 96], [bx + T, by - 96], [bx + T, by - T], [bx + 100, by - T], [bx + 100, by], [bx, by]];
      s += ext(Lp) + pg(Lp) + hatch([Lp], { gap: 7 }) + edge(Lp);
      s += t(40, 30, 'L자 브라켓', { size: 15, b: 1 }) + t(bx + 50, by + 24, 'ㄴ자', { a: 'm', size: 16, b: 1, c: C.blue, ans: true });
      /* 사각 파이프 — 안쪽 바닥·왼벽이 구멍 너머로 보인다 */
      var px = 290, py = 196, A = 96, wt = 18, a0 = px + wt, a1 = px + A - wt, b0 = py - A + wt, b1 = py - wt;
      var Op = [[px, py - A], [px + A, py - A], [px + A, py], [px, py]], inner = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
      s += ext(Op);
      s += '<path d="M' + px + ',' + (py - A) + ' h' + A + ' v' + A + ' h' + (-A) + ' Z M' + a0 + ',' + b0 + ' v' + (b1 - b0) +
        ' h' + (a1 - a0) + ' v' + (b0 - b1) + ' Z" fill="#fff" fill-rule="evenodd"/>';
      s += poly([[a0, b1], [a1, b1], [a1, b1 + sy], [a0 + sx, b1 + sy]], { close: 1, fill: C.grayL, w: 1.4 });
      s += poly([[a0, b0], [a0, b1], [a0 + sx, b1 + sy], [a0 + sx, b0]], { close: 1, fill: C.grayM, w: 1.4 });
      s += hatch([Op, inner], { gap: 7 }) + edge(Op) + edge(inner);
      s += t(270, 30, '속 빈 사각 파이프', { size: 15, b: 1 }) + t(px + A / 2, py + 24, '네모 도넛', { a: 'm', size: 16, b: 1, c: C.blue, ans: true });
      s += callout(px + A - wt / 2, py - A / 2 + 20, px + A + 14, py - 6, '벽 두께', { a: 's', size: 14, c: C.orange, tc: C.orange, b: 1 });
      return F.svg(480, 236, s);
    } },

  };
})();
