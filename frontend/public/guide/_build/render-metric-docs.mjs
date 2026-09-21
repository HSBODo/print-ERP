import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(buildDir, '..');
const METRIC_LABELS = new Map([
  ['README.md', '전체 개요'],
  ['1-예약.md', '1. 예약'],
  ['2-검사.md', '2. 검사'],
  ['3-전환율-중단율.md', '3. 전환율·중단율'],
  ['4-예약률.md', '4. 예약률'],
  ['5-수술.md', '5. 수술'],
  ['6-외래.md', '6. 외래'],
]);

/**
 * 렌더 대상 폴더. 기획서 본문에서 .md 를 그대로 걸면 브라우저가 원문 텍스트를 띄우고,
 * 탭바도 좌측 목록도 없는 화면으로 튕긴다. 참조 문서까지 같은 껍데기로 렌더해 두면
 * 어느 링크를 눌러도 문서 안에 머문다. 여기에 폴더를 추가하면 그 폴더도 함께 따라온다.
 */
const FOLDERS = [
  { dir: '지표정의', title: '지표 정의', labels: METRIC_LABELS, pager: true },
  /* 축약 전 전체판(검증 기록 포함). 발표용 문서를 줄이면서 덜어낸 내용이 여기 남는다.
     탭바·좌측 목록 어디에도 걸지 않음 — 각 축약본 맨 아래 한 줄로만 닿는다.
     원본을 고칠 일이 생기면 여기를 고치고, 발표에 필요한 것만 축약본으로 옮긴다. */
  { dir: '지표정의/_원본', title: '지표 정의 — 전체판' },
  { dir: 'db', title: 'DB 문서' },
  { dir: 'db/tables', title: '테이블 카탈로그' },
  { dir: '점검', title: '점검 기록' },
  { dir: 'databatch', title: '데이터 배치' },
];

const docsOf = (folder) => fs.readdirSync(path.join(rootDir, folder.dir))
  .filter((name) => name.toLowerCase().endsWith('.md'))
  .sort((a, b) => a.localeCompare(b, 'ko'))
  .map((name) => path.join(rootDir, folder.dir, name));

/* 폴더를 가로지르는 링크(db → 지표정의 등)도 .html 로 돌려야 하므로 전부 한 집합에 담는다. */
const ALL_DOCS = FOLDERS.flatMap((folder) => docsOf(folder).map((file) => ({ file, folder })));
const renderSet = new Set(ALL_DOCS.map(({ file }) => path.normalize(file).toLowerCase()));

/* 좌측 목록에 쓸 이름. 지표정의만 손으로 붙인 이름표가 있고, 나머지는 파일명이 곧 제목이다. */
const labelOf = (folder, fileName) => folder.labels?.get(fileName)
  ?? (fileName === 'README.md' ? '개요'
    : fileName === '_index.md' ? '전체 목록'
    : fileName.replace(/\.md$/i, ''));

/**
 * 지표별 한 줄 요약. prd.html 의 「지표 정의」 탭에 있던 카드 6장을 여기로 옮겼다 —
 * 탭 → 카드 → 상세로 세 겹을 지나야 본문이 나오던 것을 한 번으로 줄이려고,
 * 카드는 자기 상세 문서 맨 위에 한 장씩 얹는다. 전체 개요(index)에는 붙이지 않는다.
 */
const SUMMARY = new Map([
  ['1-예약.md', {
    desc: '검사를 받으러 오기로 등록된 예약을 집계함.',
    facts: [['단위', '예약 건'], ['날짜 기준', '등록일(InsertedDateTime)'], ['데이터', 'RESERVATION · M 구분']],
    alert: '방문 예정일이 아닌 등록일 기준이며, 취소 여부와 무관하게 셈.',
  }],
  ['2-검사.md', {
    desc: '예약이 아니라 실제 검사를 마친 사람을 집계함.',
    facts: [['단위', '사람'], ['날짜 기준', 'EXAM_DATE · 백내장 RESERVE_DATE'], ['데이터', 'EXAM · RESERVATION(H)']],
    alert: '2026-07-23 이후 사람 기준으로 통일됨. 이전 수치와 비교할 때 기준을 확인할 것.',
  }],
  ['3-전환율-중단율.md', {
    desc: '검사자 가운데 수술로 이어지거나 중단된 비율을 봄.',
    facts: [['단위', '비율(%)'], ['날짜 기준', '검사일(EXAM_DATE·RESERVE_DATE)'], ['데이터', 'EXAM + 수술 예약·실적']],
    alert: '분모인 검사자 정의가 바뀌면 전환율과 중단율도 함께 다시 확인해야 함.',
  }],
  ['5-수술.md', {
    desc: '예약이 아닌 실제 시행된 수술 실적을 집계함.',
    facts: [['단위', '시력교정 사람 · 백내장 눈 · 재수술 건'], ['날짜 기준', '수술일(OPERATION_DATE)'], ['데이터', 'OPERATIONDATA 외 2종']],
    alert: '단위가 다른 수술 수치를 하나의 합계로 더하지 않음.',
  }],
  ['6-외래.md', {
    desc: '수술 후 경과를 확인하기 위한 외래 방문을 집계함.',
    facts: [['단위', '예약 건'], ['날짜 기준', '외래 예약일(reserve_date)'], ['데이터', 'RESERVATION · F 구분']],
    alert: '진료 상태 I·H만 포함하고 Y·C는 제외함.',
  }],
  ['4-예약률.md', {
    desc: '검사자 가운데 수술 예약까지 이어진 비율을 봄.',
    facts: [['단위', '비율(%)'], ['날짜 기준', '검사일 → 수술 예약 여부'], ['데이터', 'EXAM + RESERVATION(H·O)']],
    alert: '2026년 6월 전후 정의가 달라 단순 추세로 이어 해석하지 않음.',
  }],
]);

/**
 * 상단 탭바. 기획서 55장이 파일로 나뉘어 있어도 윗줄은 같은 자리에 남아야
 * 링크를 눌렀을 때 문서가 바뀐 게 아니라 안에서 본문만 바뀐 것처럼 보인다.
 * 「지표 정의」 칸은 이 폴더가 곧 그 탭이라 첫 문서를 가리킨다.
 */
const TAB_ITEMS = [
  ['prd', '대쉬보드 요구사항'], ['metrics', '지표 정의'],
  ['flow', 'IA'], ['menus', '전메뉴 현황'],
  ['wireframe', '화면 조회 쿼리문'],
  ['goal', '26.09월 목표'], ['expansion', '26.10 이후 확장 전략'],
];
/* 폴더 깊이만큼 거슬러 올라간다 — db/tables 는 두 칸 위가 문서 뿌리다. */
const tabbar = (folder) => {
  const up = '../'.repeat(folder.dir.split('/').length);
  const inMetrics = folder.dir === '지표정의';
  const cells = TAB_ITEMS.map(([view, label]) => {
    const href = view === 'metrics'
      ? `${inMetrics ? '' : `${up}지표정의/`}1-예약.html`
      : `${up}prd.html#view-${view}`;
    return `      <a class="tab${view === 'metrics' && inMetrics ? ' active' : ''}" href="${href}">${label}</a>`;
  });
  return `  <div class="tabbar">
    <div class="tabs">
${cells.join('\n      <span class="sep">···</span>\n')}
    </div>
  </div>`;
};

function outputName(sourceFile) {
  const name = path.basename(sourceFile);
  return name === 'README.md' ? 'index.html' : name.replace(/\.md$/i, '.html');
}

function outputPath(sourceFile) {
  return path.join(path.dirname(sourceFile), outputName(sourceFile));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function stripInline(value) {
  return String(value)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[>*_~]/g, '')
    .trim();
}

function slugify(value, used) {
  const base = stripInline(value)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-') || 'section';
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}

function rewriteHref(rawHref, sourceFile) {
  const href = rawHref.trim();
  if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) return href;

  const hashIndex = href.indexOf('#');
  const target = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  if (!/\.md$/i.test(target)) return href;

  let decoded = target;
  try { decoded = decodeURI(target); } catch { /* keep original path */ }
  const absoluteTarget = path.resolve(path.dirname(sourceFile), decoded);
  if (!renderSet.has(path.normalize(absoluteTarget).toLowerCase())) return href;

  const relative = path.relative(path.dirname(sourceFile), outputPath(absoluteTarget)).split(path.sep).join('/');
  return `${relative}${hash}`;
}

function renderInline(input, sourceFile, allowLinks = true) {
  const tokens = [];
  const keep = (html) => `§§METRICTOKEN${tokens.push(html) - 1}§§`;
  let value = String(input);

  value = value.replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${escapeHtml(code)}</code>`));
  value = value.replace(/<br\s*\/?\s*>/gi, () => keep('<br>'));
  if (allowLinks) {
    value = value.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
      const rewritten = rewriteHref(href, sourceFile);
      // 레포 소스(.sql·.java 등)를 가리키는 상대경로는 이 폴더에서 닿지 않는다 —
      // 문서 폴더가 레포 밖에 있기 때문이다. 링크를 걸면 죽은 링크가 되므로
      // 경로만 코드 표기로 남긴다(어디를 보라는 정보는 그대로 살아 있다).
      if (/^\.{1,2}\//.test(rewritten) && !/\.html?(?:[#?].*)?$/i.test(rewritten)) {
        return keep(`<code>${escapeHtml(rewritten.replace(/^(?:\.\.\/)+/, ''))}</code>`);
      }
      const external = /^(?:https?:|mailto:)/i.test(rewritten) ? ' target="_blank" rel="noreferrer"' : '';
      return keep(`<a href="${escapeHtml(rewritten)}"${external}>${renderInline(label, sourceFile, false)}</a>`);
    });
  }

  value = escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  return value.replace(/§§METRICTOKEN(\d+)§§/g, (_, index) => tokens[Number(index)]);
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split('|').map((cell) => cell.trim());
}

function isTableStart(lines, index) {
  if (index + 1 >= lines.length || !lines[index].includes('|')) return false;
  const separators = splitTableRow(lines[index + 1]);
  return separators.length > 0 && separators.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isBlockStart(lines, index) {
  const line = lines[index] || '';
  return /^\s*$/.test(line)
    || /^```/.test(line)
    || /^#{1,6}\s+/.test(line)
    || /^\s*>/.test(line)
    || /^\s*(?:[-*+] |\d+\. )/.test(line)
    || /^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)
    || /^<details>\s*$/.test(line)
    || isTableStart(lines, index);
}

function renderMarkdown(markdown, sourceFile) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const usedSlugs = new Map();
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([^\s`]*)/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      html.push(`<pre><code${language}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      const level = heading[1].length;
      const id = slugify(heading[2], usedSlugs);
      html.push(`<h${level} id="${escapeHtml(id)}">${renderInline(heading[2], sourceFile)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (/^<details>\s*$/.test(line)) {
      const block = [];
      index += 1;
      while (index < lines.length && !/^<\/details>\s*$/.test(lines[index])) block.push(lines[index++]);
      if (index < lines.length) index += 1;
      let summary = '자세히 보기';
      if (block[0]?.match(/^<summary>(.*?)<\/summary>\s*$/)) {
        summary = block.shift().match(/^<summary>(.*?)<\/summary>\s*$/)[1];
      }
      html.push(`<details><summary>${renderInline(summary, sourceFile)}</summary>${renderMarkdown(block.join('\n'), sourceFile)}</details>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${renderMarkdown(quote.join('\n'), sourceFile)}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index]);
      const alignments = splitTableRow(lines[index + 1]).map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index++]));
      }
      const head = headers.map((cell, i) => `<th style="text-align:${alignments[i] || 'left'}">${renderInline(cell, sourceFile)}</th>`).join('');
      const body = rows.map((row) => `<tr>${headers.map((_, i) => `<td style="text-align:${alignments[i] || 'left'}">${renderInline(row[i] || '', sourceFile)}</td>`).join('')}</tr>`).join('');
      html.push(`<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }

    const list = line.match(/^\s*([-*+]|\d+\.)\s+(.+)/);
    if (list) {
      const ordered = /\d+\./.test(list[1]);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-*+]|\d+\.)\s+(.+)/);
        if (!item || /\d+\./.test(item[1]) !== ordered) break;
        let content = item[2];
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[index])) {
          content += ` ${lines[index].trim()}`;
          index += 1;
        }
        items.push(`<li>${renderInline(content, sourceFile)}</li>`);
      }
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(' '), sourceFile)}</p>`);
  }

  return html.join('\n');
}

/* 환자 흐름 도식과 공통 규칙. prd.html 「지표 정의」 탭 머리에 있던 두 상자다 —
   지표 하나에 매이지 않는 내용이라 카드처럼 나눠 붙일 수 없어 전체 개요로 모았다. */
const FLOW = [
  ['01', '예약', '방문 약속 등록'], ['02', '검사', '실제 검사 완료'],
  ['03', '전환·중단', '수술 진행 판단'], ['04', '수술', '실제 수술 시행'],
  ['05', '외래', '수술 후 경과 관찰'],
];
const RULES = [
  ['단위', '사람·눈·건을 혼용하지 않음'],
  ['날짜', '등록일·예약일·실행일을 구분'],
  ['기준 변경', '변경 시점 전후 수치를 분리 해석'],
  ['레거시', '2024–2025 일부 값은 확정값 유지'],
];

function introBlock(folder, fileName) {
  if (folder.dir !== '지표정의' || fileName !== 'README.md') return '';
  const steps = FLOW
    .map(([n, name, note]) => `          <div class="step"><div class="n">${n}</div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(note)}</span></div>`)
    .join('\n          <div class="arrow">→</div>\n');
  const rules = RULES
    .map(([term, value]) => `          <div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('\n');
  return `      <section class="metric-summary">
        <p class="desc">환자 흐름</p>
        <div class="flow" aria-label="예약부터 외래까지의 환자 흐름">
${steps}
        </div>
        <p class="alert">검사에서 수술로 넘어가는 구간은 <strong>예약률</strong>로 별도 관리함.</p>
        <p class="desc" style="margin-top:20px">먼저 확인할 규칙</p>
        <dl class="facts">
${rules}
        </dl>
      </section>`;
}

/* 자기 지표의 요약 카드 한 장. 상세 문서 맨 위에 얹어, 단위·날짜 기준·데이터 원천을
   본문을 읽기 전에 먼저 보이게 한다. 전체 개요에는 붙일 카드가 없어 빈 문자열을 준다. */
function summaryCard(folder, fileName) {
  const s = folder.dir === '지표정의' ? SUMMARY.get(fileName) : null;
  if (!s) return '';
  const facts = s.facts
    .map(([term, value]) => `          <div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('\n');
  return `      <section class="metric-summary">
        <p class="desc">${escapeHtml(s.desc)}</p>
        <dl class="facts">
${facts}
        </dl>
        <p class="alert">${escapeHtml(s.alert)}</p>
      </section>`;
}

function pageTemplate(sourceFile, markdown, folder) {
  const fileName = path.basename(sourceFile);
  const currentLabel = labelOf(folder, fileName);
  const title = stripInline(markdown.match(/^#\s+(.+)$/m)?.[1] || currentLabel);
  /* 좌측 목록은 같은 폴더의 문서다. 지표정의만 순서를 손으로 정해 뒀고,
     나머지는 파일 이름순 — 사람이 폴더를 열었을 때 보는 순서와 같다. */
  const order = folder.labels
    ? [...folder.labels.keys()]
    : docsOf(folder).map((file) => path.basename(file));
  const hrefOf = (name) => (name === 'README.md' ? 'index.html' : name.replace(/\.md$/i, '.html'));
  const nav = order.map((name) => (
    `<a class="${name === fileName ? 'active' : ''}" href="${escapeHtml(hrefOf(name))}">${escapeHtml(labelOf(folder, name))}</a>`
  )).join('\n');
  const currentIndex = order.indexOf(fileName);
  const previous = folder.pager && currentIndex > 0 ? order[currentIndex - 1] : null;
  const next = folder.pager && currentIndex >= 0 && currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
  const pagerLink = (name, direction) => {
    if (!name) return '<span></span>';
    const arrow = direction === 'prev' ? '←' : '→';
    return `<a href="${escapeHtml(hrefOf(name))}">${direction === 'prev' ? `${arrow} ` : ''}${escapeHtml(labelOf(folder, name))}${direction === 'next' ? ` ${arrow}` : ''}</a>`;
  };

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — 비앤빛 Analytics</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root{--bg:#f6f6f7;--card:#fff;--line:#e8e8eb;--ink:#1f2328;--muted:#68707b;--muted2:#9298a1;--accent:#7c5cff;--accent-soft:#efebff;--radius:16px}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.72;-webkit-font-smoothing:antialiased}
/* 상단 탭바 · 좌측 목록은 sms.html 과 pages/*.html 의 것과 같은 값이다 —
   문서가 바뀌어도 윗줄과 왼편이 같은 자리에 같은 모습으로 남아야 한다. */
html,body{height:100%}body{display:flex;flex-direction:column}
.tabbar{height:53px;flex-shrink:0;display:flex;align-items:center;gap:6px;padding:0 18px;background:#fff;border-bottom:1px solid var(--line);z-index:40;overflow-x:auto;overflow-y:hidden}
.tabbar .tabs{display:flex;align-items:center;gap:2px;flex:0 0 auto}
.tabbar .tab{border:1px solid transparent;background:none;text-decoration:none;font-family:inherit;font-size:14px;font-weight:600;line-height:1.35;color:var(--muted2);padding:6px 14px;border-radius:9px;display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.tabbar .tab:hover{color:var(--ink)}
.tabbar .tab.active{color:var(--ink);background:#fff;border-color:var(--line);box-shadow:0 1px 2px rgba(16,18,29,.06)}
.tabbar .beta{font-size:10px;font-weight:700;color:var(--accent);background:var(--accent-soft);padding:1px 6px;border-radius:6px}
.tabbar .sep{color:#d4d6db;font-size:13px;letter-spacing:1px;user-select:none}
.shell{flex:1;min-height:0;display:flex}
.sidenav{width:232px;flex-shrink:0;height:100%;overflow-y:auto;padding:26px 14px;border-right:1px solid var(--line);background:var(--bg)}
.nav-title{margin:0 12px 14px;color:var(--muted2);font-size:13px;font-weight:800;letter-spacing:.02em}
.sidenav nav{display:grid;gap:1px}.sidenav nav a{display:block;padding:8px 12px;border-radius:9px;color:var(--muted);font-size:13.5px;font-weight:500;text-decoration:none}.sidenav nav a:hover{background:#efeff1;color:var(--ink)}.sidenav nav a.active{background:var(--accent-soft);color:#5b3fd1;font-weight:700}
.main{flex:1;min-width:0;overflow-y:auto;padding:30px 34px 90px}
/* 지표 요약 카드 — 본문 위에 자기 지표의 단위·날짜 기준·데이터 원천을 먼저 보인다. */
.metric-summary{width:100%;max-width:1120px;margin:0 auto 16px;padding:20px 24px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 1px 2px rgba(16,18,29,.04)}
.metric-summary .desc{margin:0 0 14px;font-size:15px;font-weight:650;color:var(--ink)}
.metric-summary .facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:0}
.metric-summary .facts dt{font-size:11px;font-weight:700;color:var(--muted2);letter-spacing:.03em}
.metric-summary .facts dd{margin:2px 0 0;font-size:13.5px;color:#414852}
.metric-summary .flow{display:flex;align-items:stretch;gap:8px;overflow-x:auto;padding:4px 0 2px}
.metric-summary .step{min-width:122px;flex:1;padding:13px 14px;border:1px solid #e5e2f4;border-radius:11px;background:#faf9ff}
.metric-summary .step .n{color:var(--accent);font-size:11px;font-weight:800}
.metric-summary .step strong{display:block;margin-top:2px;font-size:14px}
.metric-summary .step span{display:block;margin-top:3px;color:var(--muted2);font-size:11.5px;white-space:nowrap}
.metric-summary .arrow{display:grid;place-items:center;flex:0 0 14px;color:#b8b2d7;font-size:15px}
.metric-summary .alert{margin:14px 0 0;padding:10px 14px;border-left:3px solid var(--accent);border-radius:0 9px 9px 0;background:#f8f7fe;font-size:13.5px;color:#514b69}.doc-card{width:100%;max-width:1120px;margin:0 auto;padding:42px 48px 50px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 1px 2px rgba(16,18,29,.04)}
.markdown h1{margin:0 0 24px;font-size:29px;line-height:1.3;letter-spacing:-.025em}.markdown h2{margin:50px 0 16px;padding-bottom:10px;border-bottom:1px solid var(--line);font-size:21px;line-height:1.4;letter-spacing:-.015em}.markdown h3{margin:32px 0 12px;font-size:17px;line-height:1.45}.markdown h4{margin:26px 0 10px;font-size:15px}.markdown p{margin:10px 0 16px;color:#414852;font-size:14.5px}.markdown strong{color:var(--ink)}
.markdown a{color:#6246d2;text-decoration:none;font-weight:650}.markdown a:hover{text-decoration:underline}.markdown code{padding:2px 5px;border-radius:5px;background:#f1eff9;color:#543bc0;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.88em;overflow-wrap:anywhere}
.markdown pre{margin:18px 0 22px;padding:18px 20px;overflow:auto;border-radius:11px;background:#20242d;color:#eef1f6;line-height:1.6}.markdown pre code{padding:0;background:none;color:inherit;font-size:12.5px;white-space:pre}
.markdown blockquote{margin:18px 0;padding:13px 16px;border-left:3px solid var(--accent);border-radius:0 9px 9px 0;background:#f8f7fe}.markdown blockquote>:first-child{margin-top:0}.markdown blockquote>:last-child{margin-bottom:0}.markdown blockquote p{color:#514b69}
.markdown ul,.markdown ol{margin:10px 0 18px;padding-left:24px;color:#414852;font-size:14.5px}.markdown li{margin:5px 0}.markdown hr{height:1px;margin:42px 0;border:0;background:var(--line)}
.table-scroll{max-width:100%;margin:16px 0 24px;overflow:auto;border:1px solid var(--line);border-radius:11px}.markdown table{width:100%;min-width:620px;border-collapse:collapse;font-size:13px;line-height:1.55}.markdown th{padding:10px 12px;background:#f7f7f9;color:#505762;font-weight:750;white-space:nowrap}.markdown td{padding:10px 12px;border-top:1px solid var(--line);color:#424954;vertical-align:top}.markdown tr:hover td{background:#fcfcfd}
.markdown details{margin:18px 0;padding:12px 15px;border:1px solid var(--line);border-radius:10px;background:#fcfcfd}.markdown summary{cursor:pointer;font-weight:750}.markdown details[open] summary{margin-bottom:14px}
.pager{display:flex;justify-content:space-between;gap:16px;max-width:1120px;margin:18px auto 0}.pager a{color:#5b3fd1;font-size:13px;font-weight:700;text-decoration:none}.pager a:hover{text-decoration:underline}
@media print{html,body{height:auto;display:block}.tabbar,.sidenav,.pager{display:none}.shell{display:block}.main{display:block;overflow:visible;padding:0}.doc-card,.metric-summary{max-width:none;border:0;border-radius:0;box-shadow:none;padding:0}.markdown h2,.markdown h3{break-after:avoid}.table-scroll{break-inside:avoid}}
@media(max-width:820px){.shell{display:block}.sidenav{width:auto;height:auto;padding:14px;border-right:0;border-bottom:1px solid var(--line)}.sidenav nav{display:flex;gap:5px;overflow:auto;padding-bottom:2px}.sidenav nav a{white-space:nowrap}.nav-title{display:none}.main{padding:18px 12px 60px}.doc-card{padding:28px 20px 36px;border-radius:13px}.markdown h1{font-size:24px}.markdown h2{font-size:19px}.docbar{padding:0 14px}.crumb{display:none}}
</style>
</head>
<body>
${tabbar(folder)}
  <div class="shell">
    <aside class="sidenav">
      <div class="nav-title">${escapeHtml(folder.title)}</div>
      <nav>${nav}</nav>
    </aside>
    <main class="main">
${introBlock(folder, fileName)}${summaryCard(folder, fileName)}
      <article class="doc-card">
        <div class="markdown">${renderMarkdown(markdown, sourceFile)}</div>
      </article>
      <nav class="pager" aria-label="이전 및 다음 문서">${pagerLink(previous, 'prev')}${pagerLink(next, 'next')}</nav>
    </main>
  </div>
</body>
</html>`;
}

for (const { file, folder } of ALL_DOCS) {
  const markdown = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(outputPath(file), pageTemplate(file, markdown, folder), 'utf8');
}
console.log(`문서 ${ALL_DOCS.length}장 렌더 — ${FOLDERS.map((f) => `${f.dir} ${docsOf(f).length}`).join(' · ')}`);
