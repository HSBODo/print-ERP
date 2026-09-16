import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

/**
 * 코드를 훑을 레포 경로. 이 문서 폴더는 레포 밖에 있으므로 위치로 유추할 수 없다 —
 * config.json 에 적어 두고, 환경변수 DASHBOARD_REPO 가 있으면 그쪽을 먼저 쓴다.
 */
const HERE_DIR = url.fileURLToPath(new URL('.', import.meta.url))
const CONFIG = JSON.parse(fs.readFileSync(path.join(HERE_DIR, 'config.json'), 'utf8'))
const ROOT = (process.env.DASHBOARD_REPO ?? CONFIG.repoRoot).split(path.sep).join('/')
if (!fs.existsSync(path.join(ROOT, 'frontend/src/config/statsPages.ts'))) {
  console.error(`레포를 찾을 수 없다: ${ROOT}`)
  console.error('_build/config.json 의 repoRoot 를 고치거나 DASHBOARD_REPO 환경변수를 지정할 것.')
  process.exit(1)
}
const SRC = path.join(ROOT, 'frontend/src')
const read = (p) => fs.readFileSync(p, 'utf8')
const exists = (p) => fs.existsSync(p)
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

/* ---------- 1. statsPages ---------- */
const statsSrc = read(path.join(SRC, 'config/statsPages.ts'))
const pages = []
const re = /statsPage\(\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\s*\)/g
let m
while ((m = re.exec(statsSrc))) {
  pages.push({
    id: m[1], label: m[2], path: m[3], sectionId: m[4], sectionLabel: m[5],
    description: m[6], apiDraftPath: m[7],
  })
}

/* ---------- 2. navigation: 상태 / 숨김 / ADMIN ---------- */
const navSrc = read(path.join(SRC, 'config/navigation.ts'))
const sliceBlock = (marker, open, close) => {
  const i = navSrc.indexOf(marker)
  const s = navSrc.indexOf(open, i)
  const e = navSrc.indexOf(close, s)
  return navSrc.slice(s, e)
}
const status = {}
for (const mm of sliceBlock('const MENU_STATUS', '{', '\n}').matchAll(/'([^']+)':\s*'([^']+)'/g)) {
  status[mm[1]] = mm[2]
}
const idSet = (marker) =>
  new Set([...sliceBlock(marker, '[', ']').matchAll(/'([^']+)'/g)].map((x) => x[1]))
const adminOnly = idSet('const ADMIN_ONLY_PAGE_IDS')
const hidden = idSet('const HIDDEN_MENU_IDS')

/* ---------- 3. 사이드바 트리 (섹션 > 그룹 > 페이지) ---------- */
const treeSrc = navSrc.slice(navSrc.indexOf('const rawMenuItems'))
const tree = []
{
  const entryRe = /\{\s*\n?\s*id:\s*'([^']+)',\s*\n?\s*label:\s*'([^']+)',[\s\S]{0,400}?(?:kind:\s*'(section|group)')?[\s\S]{0,400}?children:\s*kids\(([\s\S]*?)\),?\s*\n\s*\}/g
  // 정규식 하나로 3단을 다 잡기 어렵다 — 라인 스캔으로 간다.
  const lines = treeSrc.split('\n')
  let cur = null, curGroup = null, pendingId = null, pendingLabel = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const idm = line.match(/id:\s*'([^']+)'/)
    if (idm) {
      pendingId = idm[1]
      const lm = line.match(/label:\s*'([^']*)'/) ?? (lines[i + 1] || '').match(/label:\s*'([^']*)'/)
      pendingLabel = lm ? lm[1] : pendingId
    }
    if (/kind:\s*'section'/.test(line)) {
      cur = { id: pendingId, label: pendingLabel, groups: [] }
      tree.push(cur)
      curGroup = null
    } else if (/kind:\s*'group'/.test(line)) {
      curGroup = { id: pendingId, label: pendingLabel, ids: [] }
      if (cur) cur.groups.push(curGroup)
    }
    const km = line.match(/(?:children:\s*|\.\.\.)kids\(([^)]*)\)?/)  // `children: kids(...)` 와 `...kids(...)` 스프레드 모두 잡는다
    if (km) {
      let text = km[1]
      if (!line.includes(')')) {
        for (let j = i + 1; j < lines.length; j++) {
          text += lines[j]
          if (lines[j].includes(')')) break
        }
      }
      const ids = [...text.matchAll(/'([^']+)'/g)].map((x) => x[1])
      const target = curGroup ?? (cur ? { id: cur.id, label: cur.label, ids: [], direct: true } : null)
      if (target) {
        target.ids.push(...ids)
        if (target.direct && !cur.groups.includes(target)) cur.groups.push(target)
      }
      curGroup = null
    }
    // 그룹이 아닌 단일 링크 (예: 객단가)
    const solo = line.match(/href:\s*findPage\('([^']+)'\)\.path/)
    if (solo && cur) cur.groups.push({ id: solo[1], label: '', ids: [solo[1]], solo: true })
  }
}

/* ---------- 4. 페이지 컴포넌트 파일 ---------- */
const routeFiles = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name === 'routes.ts') routeFiles.push(p)
  }
}
walk(path.join(SRC, 'pages'))

const componentOf = {}
for (const rf of routeFiles) {
  const s = read(rf)
  const imports = {}
  for (const mm of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
    for (const nm of mm[1].split(',').map((x) => x.trim())) imports[nm] = mm[2]
  }
  for (const mm of s.matchAll(/'([a-z0-9-]+)':\s*([A-Za-z0-9_]+)/g)) {
    const spec = imports[mm[2]]
    if (!spec) continue
    const base = path.resolve(path.dirname(rf), spec)
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
      if (exists(base + ext)) { componentOf[mm[1]] = rel(base + ext); break }
    }
  }
}

/* ---------- 5. 엔드포인트 BFS ---------- */
const resolveImport = (fromFile, spec) => {
  let base
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec)
  else return null
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) if (exists(base + ext)) return base + ext
  return null
}
const EP = /api\.(get|post|put|patch|delete)\s*(?:<[\s\S]*?>)?\s*\(\s*(?:withQuery\s*\(\s*)?[`'"]([^`'"$]+)/g
const normPath = (raw) => {
  let p = raw.split('?')[0]
  if (p.endsWith('/')) p = p.slice(0, -1) + '/{id}'
  return p
}
const endpointsOf = (entry) => {
  if (!entry) return { endpoints: [], files: [] }
  const seen = new Set()
  const out = new Set()
  const queue = [path.join(ROOT, entry)]
  while (queue.length) {
    const f = queue.shift()
    if (!f || seen.has(f) || !exists(f)) continue
    seen.add(f)
    if (/\.test\./.test(f)) continue
    const s = read(f)
    for (const mm of s.matchAll(EP)) out.add(`${mm[1].toUpperCase()} /api${normPath(mm[2])}`)
    // import 문마다 (모듈, 가져온 이름들) 을 본다 — 배럴(index.ts)은 이름별로 실제 모듈까지 내려간다.
    // 타입 전용 import 와 api/hooks 밖의 모듈은 따라가지 않는다 — 페이지 로컬 util 이
    // 상수 하나 때문에 남의 도메인 api 를 끌어와 엔드포인트 목록을 오염시킨다.
    for (const mm of s.matchAll(/import\s+(type\s+)?([\s\S]*?)\s*from\s*'([^']+)'/g)) {
      if (mm[1]) continue
      const names = [...mm[2].matchAll(/[A-Za-z_$][\w$]*/g)].map((x) => x[0])
      const r = resolveImport(f, mm[3])
      if (!r) continue
      const targets = /[/\\]index\.tsx?$/.test(r) && names.length ? barrelTargets(r, names) : [r]
      for (const t of targets) {
        const n = t.split(path.sep).join('/')
        const base = n.split('/').pop() ?? ''
        // api·hooks 는 무조건 따라간다. 화면 조각(대문자 시작 컴포넌트)도 따라가되
        // 소문자 util·상수 모듈은 끊는다 — 상수 하나 때문에 남의 도메인 api 가 딸려온다.
        const isComponent = /^[A-Z]/.test(base) || /^use[A-Z]/.test(base)
        if (n.includes('/src/api/') || n.includes('/src/hooks/') || isComponent) queue.push(t)
      }
    }
  }
  return { endpoints: [...out].sort(), files: [...seen].map(rel) }
}

/** 배럴 index.ts 에서 요청한 이름들이 실제로 어느 모듈에서 오는지 되짚는다. */
const barrelTargets = (indexFile, names) => {
  const s = read(indexFile)
  const targets = new Set()
  const stars = []
  for (const mm of s.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const exported = [...mm[1].matchAll(/[A-Za-z_$][\w$]*/g)].map((x) => x[0])
    if (exported.some((e) => names.includes(e))) {
      const r = resolveImport(indexFile, mm[2])
      if (r) targets.add(r)
    }
  }
  for (const mm of s.matchAll(/export\s*\*\s*from\s*'([^']+)'/g)) {
    const r = resolveImport(indexFile, mm[1])
    if (r) stars.push(r)
  }
  // 이름을 못 찾았으면 export * 대상만 훑는다 (그래도 못 찾으면 배럴 전체).
  if (targets.size === 0) {
    if (stars.length) return stars
    return [indexFile]
  }
  return [...targets]
}

/* ---------- 6. 백엔드 컨트롤러 + 마트 테이블 ---------- */
const javaFiles = []
const jwalk = (dir) => {
  if (!exists(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) jwalk(p)
    else if (e.name.endsWith('.java')) javaFiles.push(p)
  }
}
jwalk(path.join(ROOT, 'backend/src/main/java'))
const javaIdx = javaFiles.map((f) => ({ f, r: rel(f), s: read(f), name: path.basename(f, '.java') }))
const controllerIdx = javaIdx.filter((x) => x.name.endsWith('Controller'))
const byName = new Map(javaIdx.map((x) => [x.name, x]))

/** 컨트롤러가 선언한 경로 접두사 (@RequestMapping 클래스 레벨). */
const ctrlBase = new Map()
for (const c of controllerIdx) {
  const mm = c.s.match(/@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]+)"/)
  ctrlBase.set(c.r, mm ? mm[1].replace(/\/$/, '') : null)
}
/** 메서드 레벨 매핑까지 합친 전체 경로 후보. */
const ctrlRoutes = new Map()
for (const c of controllerIdx) {
  const base = ctrlBase.get(c.r) ?? ''
  const routes = new Set()
  if (base) routes.add(base)
  for (const mm of c.s.matchAll(/@(?:Get|Post|Put|Patch|Delete|Request)Mapping\(\s*(?:value\s*=\s*)?"([^"]*)"/g)) {
    const sub = mm[1].replace(/\/$/, '')
    if (sub.startsWith('/api')) routes.add(sub)
    else if (base) routes.add((base + (sub.startsWith('/') ? sub : '/' + sub)).replace(/\/$/, ''))
  }
  ctrlRoutes.set(c.r, [...routes].filter((r) => r.startsWith('/api')))
}

/** 엔드포인트마다 가장 긴 접두사를 선언한 컨트롤러 하나만 고른다. */
const controllersFor = (eps) => {
  const out = new Set()
  for (const ep of eps) {
    const p = ep.split(' ')[1]
    let best = null, bestLen = -1
    for (const [file, routes] of ctrlRoutes) {
      for (const r of routes) {
        if ((p === r || p.startsWith(r + '/')) && r.length > bestLen) { best = file; bestLen = r.length }
      }
    }
    if (best) out.add(best)
  }
  return [...out].sort()
}

/** 컨트롤러 → 참조 클래스(같은 레포) → SqlLoader 로 읽는 .sql 리소스 경로. */
const sqlRefsOf = (controllers) => {
  const seen = new Set()
  const sqls = new Set()
  const visit = (name, depth) => {
    if (depth > 4 || seen.has(name)) return
    seen.add(name)
    const node = byName.get(name)
    if (!node) return
    for (const mm of node.s.matchAll(/"(sql\/[A-Za-z0-9_\-/]+\.sql)"/g)) sqls.add(mm[1])
    // 주입된 협력자만 따라간다 (final 필드 타입). 본문에 스쳐 나온 클래스명까지 좇으면
    // 남의 도메인 SQL 이 통째로 딸려 들어온다.
    for (const mm of node.s.matchAll(/(?:private|protected|public)\s+final\s+([A-Za-z0-9_.<>,\s]+?)\s+[a-z][A-Za-z0-9_]*\s*[;=]/g)) {
      for (const t of mm[1].matchAll(/[A-Z][A-Za-z0-9]*/g)) {
        if (byName.has(t[0])) visit(t[0], depth + 1)
      }
    }
    // 구현체가 인터페이스 뒤에 있는 경우(XxxReader ← 구현 클래스) 보정.
    // 이름 조합(`${stem}MartQueryService`)으로 추측하면 규칙을 벗어난 클래스를 놓친다 —
    // 예: ReservationOverallStatsReader 의 구현은 ReservationOverallMartQueryService(Stats 없음).
    // 그래서 implements 절을 실제로 뒤져 구현체를 찾는다.
    if (/Reader$/.test(name)) {
      const impl = new RegExp(`implements[^{]*\\b${name}\\b`)
      for (const c of javaIdx) {
        if (impl.test(c.s)) visit(c.name, depth + 1)
      }
    }
  }
  for (const c of controllers) visit(path.basename(c, '.java'), 0)
  return [...sqls].sort()
}

/** .sql 파일에서 FROM/JOIN 테이블을 뽑는다. CTE 이름은 뺀다. */
const TABLE_RE = /\b(?:FROM|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)/gi
const SQL_KEYWORDS = new Set(['SELECT', 'WHERE', 'AS', 'ON', 'AND', 'OR', 'NOT', 'LATERAL', 'VALUES', 'UNNEST', 'DUAL', 'GENERATE_SERIES', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS'])
const tablesFromSql = (sqlPaths) => {
  const tables = new Set()
  for (const sp of sqlPaths) {
    const f = path.join(ROOT, 'backend/src/main/resources', sp)
    if (!exists(f)) continue
    // EXTRACT(YEAR FROM reg_date) 의 FROM 은 테이블 절이 아니다 — 먼저 지우고 훑는다.
    // 이걸 안 지우면 reg_date · e.exam_date 같은 컬럼이 테이블 목록에 섞인다.
    const s = read(f).replace(/EXTRACT\s*\([^)]*\)/gi, ' ')
    const ctes = new Set([...s.matchAll(/(?:WITH|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*\(/gi)].map((x) => x[1].toLowerCase()))
    for (const mm of s.matchAll(TABLE_RE)) {
      const t = mm[1]
      if (SQL_KEYWORDS.has(t.toUpperCase())) continue
      if (ctes.has(t.toLowerCase())) continue
      // e.exam_date 처럼 별칭이 붙은 컬럼 참조는 테이블이 아니다 — 점 앞이 1~2글자면 별칭으로 본다.
      // 점은 반드시 리터럴이어야 한다. \. 를 . 로 두면 list_exam 같은 소문자 테이블이 통째로 걸러진다.
      if (/^[a-z]{1,2}\.[a-z_]/.test(t)) continue
      tables.add(t)
    }
  }
  return [...tables].sort()
}

/* ---------- 조립 ---------- */
const out = pages.map((p) => {
  const comp = componentOf[p.id] ?? null
  const { endpoints, files } = endpointsOf(comp)
  const controllers = controllersFor(endpoints)
  const sqlRefs = sqlRefsOf(controllers)
  const tables = tablesFromSql(sqlRefs)
  // 마트(Postgres)는 전부 소문자 스네이크, CRM(MSSQL) 원천은 대문자가 섞인다.
  const martTables = tables.filter((t) => /^[a-z0-9_.]+$/.test(t))
  const crmTables = tables.filter((t) => !/^[a-z0-9_.]+$/.test(t))
  return {
    ...p,
    status: status[p.id] ?? 'pending',
    adminOnly: adminOnly.has(p.id),
    hidden: hidden.has(p.id),
    component: comp,
    reachedFiles: files.length,
    endpoints,
    controllers,
    sqlRefs,
    tables,
    martTables,
    crmTables,
    source:
      tables.length === 0 ? 'unknown'
      : crmTables.length === 0 ? 'mart'
      : martTables.length === 0 ? 'crm'
      : 'mixed',
  }
})

const outDir = process.argv[2] ?? url.fileURLToPath(new URL('.', import.meta.url))
fs.writeFileSync(path.join(outDir, 'spec-data.json'), JSON.stringify({ pages: out, tree }, null, 2), 'utf8')

console.log('pages:', out.length)
console.log('status counts:', JSON.stringify(out.reduce((a, x) => ((a[x.status] = (a[x.status] ?? 0) + 1), a), {})))
console.log('no component:', out.filter((x) => !x.component).map((x) => x.id).join(', ') || '(없음)')
console.log('no endpoints:', out.filter((x) => x.component && !x.endpoints.length).map((x) => x.id).join(', ') || '(없음)')
console.log('no controller:', out.filter((x) => x.endpoints.length && !x.controllers.length).map((x) => x.id).join(', ') || '(없음)')
console.log('--- tree ---')
for (const t of tree) console.log(t.label, '::', t.groups.map((g) => `${g.label || g.id}[${g.ids.join(',')}]`).join(' | '))
