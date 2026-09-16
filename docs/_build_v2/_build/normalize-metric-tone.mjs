import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const metricDir = path.resolve(buildDir, '..', '지표정의');
const files = fs.readdirSync(metricDir)
  .filter((name) => name.toLowerCase().endsWith('.md'))
  .map((name) => path.join(metricDir, name));

// 지표 정의 화면의 설명 문장을 간결한 음슴체로 통일함.
// SQL·코드 블록은 실행 가능한 원문을 보존하기 위해 변환하지 않음.
const replacements = new Map([
  ['마찬가지다', '마찬가지임'], ['드리프트다', '드리프트임'],
  ['불가능하다', '불가능함'], ['불과하다', '불과함'], ['중요하다', '중요함'],
  ['필요하다', '필요함'], ['유효하다', '유효함'], ['취약하다', '취약함'],
  ['가깝다', '가까움'], ['다르다', '다름'], ['높다', '높음'], ['많다', '많음'], ['작다', '작음'],
  ['같다', '같음'], ['맞다', '맞음'], ['아니다', '아님'], ['없다', '없음'], ['있다', '있음'],
  ['관리다', '관리임'], ['버그다', '버그임'], ['상태다', '상태임'],
  ['숫자다', '숫자임'], ['예외다', '예외임'], ['오류다', '오류임'],
  ['정의다', '정의임'], ['착시다', '착시임'], ['코드다', '코드임'], ['필수다', '필수임'],
  ['건수다', '건수임'], ['부터다', '부터임'], ['이후다', '이후임'],
  ['장치다', '장치임'], ['지표다', '지표임'], ['오분류다', '오분류임'],
  ['가져온다', '가져옴'], ['갈라낸다', '갈라냄'], ['나뉜다', '나뉨'],
  ['보여준다', '보여줌'], ['부푼다', '부풂'], ['바뀐다', '바뀜'],
  ['흘러든다', '흘러듦'], ['모아둔다', '모아둠'], ['거른다', '거름'], ['건다', '적용함'],
  ['쓴다', '씀'], ['본다', '봄'], ['센다', '셈'], ['뺀다', '뺌'],
  ['한다', '함'], ['된다', '됨'], ['인다', '임'], ['이다', '임'], ['하다', '함'],
  ['않는다', '않음'], ['는다', '음'], ['간다', '감'], ['온다', '옴'],
  ['낸다', '냄'], ['긴다', '김'], ['진다', '짐'], ['린다', '림'],
  ['힌다', '힘'], ['뀐다', '뀜'], ['눈다', '눔'], ['둔다', '둠'],
  ['준다', '줌'], ['난다', '남'], ['든다', '듦'], ['친다', '침'],
  ['이었던다', '이었음'], ['이었다', '이었음'], ['했다', '했음'],
  ['됐다', '됐음'], ['였다', '였음'], ['었다', '었음'], ['았다', '았음'],
  ['왔다', '왔음'], ['갔다', '갔음'], ['났다', '났음'], ['랐다', '랐음'],
  ['졌다', '졌음'], ['췄다', '췄음'], ['셌다', '셌음'],
]);

const alternatives = [...replacements.keys()]
  .sort((a, b) => b.length - a.length)
  .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const sentenceEnding = new RegExp(`(?:${alternatives})(?=$|[\\s.!?…,:;()\\[\\]}>*_|\\x60-])`, 'gu');

function normalizeLine(line) {
  let value = line.replace(sentenceEnding, (ending) => replacements.get(ending) || ending);
  // `**근접 추정치**다.` 처럼 강조 마크업이 어절을 끊어 놓으면 위 사전이 닿지 못한다.
  // 닫는 강조(** 또는 *) 바로 뒤에 붙은 서술격 조사만 명사형으로 바꾼다.
  // 코드 스팬(`...`)은 원문을 보존해야 하므로 대상에서 뺀다.
  value = value.replace(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)다(?=$|[\s.!?…,:;)\]}>])/gu, '$1임');
  return value;
}

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').split('\n');
  let inFence = false;
  const normalized = lines.map((line) => {
    if (/^```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    return inFence ? line : normalizeLine(line);
  }).join('\n');
  fs.writeFileSync(file, normalized, 'utf8');
  console.log(`normalized ${path.basename(file)}`);
}
