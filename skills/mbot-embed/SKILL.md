---
name: mbot-embed
description: AICLab의 안내 챗봇 위젯(mbot — 기본 캐릭터는 케이프를 두른 May Hero 펫. 화면을 달리고 점프하고, 카드·제목 위에 올라앉고, 끌어서 던질 수 있고, 스크롤에 반응하며 팁을 준다. 모바일에서는 아래쪽 가장자리를 순찰. 다른 Codex pet 캐릭터·3D 마우스봇 로봇·말풍선 이미지로도 바꿀 수 있음)을 어떤 웹사이트에든 붙이는 워크플로. 대상 사이트를 분석해 그 사이트 전용 지식 파일(kb)을 만들고, 사이트 톤에 맞는 강조색·위치를 정하고, 실제 페이지에 주입해 검증한 뒤, 플랫폼(Next.js·ChatGPT Sites/vinext·Vite/React·Vue/Nuxt·SvelteKit·Astro·정적 HTML·워드프레스·티스토리·아임웹/윅스/카페24·Webflow·Framer·Shopify 등)에 맞는 방식으로 삽입한다. 사용자가 "챗봇 붙여줘", "안내봇 넣어줘", "그 로봇 챗봇을 ○○ 사이트에도", "mbot", "마우스봇", "May Hero", "메이 히어로", "캐릭터가 돌아다니게", "펫을 사이트에", "Codex pet을 웹에", "GPT 안내봇처럼", "사이트에 안내 챗봇 위젯", "돌아다니는 챗봇", "FAQ 봇 달아줘"라고 하거나 사이트 URL을 주며 챗봇·안내 위젯·움직이는 캐릭터를 원하면 반드시 이 스킬을 쓴다. AI 서버가 필요한 진짜 대화형 챗봇(LLM API 연동) 구축이나 카카오·슬랙 같은 메신저 봇은 대상이 아니다.
---

# mbot-embed — May Hero 펫 안내 챗봇 삽입 (위젯 v2)

기본 캐릭터는 **May Hero 펫**이다(스프라이트 `assets/pets/may-hero.webp`, 중앙 사본 `https://design.aiclab.kr/widgets/pets/may-hero.webp`). 아무 설정 없이도 May Hero가 나오고, `data-character="robot"`이면 3D 로봇, `data-avatar`면 말풍선 캐릭터.

`assets/mbot.js` 하나가 위젯 전부다. Shadow DOM 안에 그려지므로 대상 사이트 CSS와 서로 간섭하지 않고,
사이트마다 달라지는 것은 **지식 파일(kb) 하나**와 **`data-` 속성 몇 개**뿐이다. 이 스킬의 일은 그 둘을 대상 사이트에 꼭 맞게 만드는 것이다.

위젯은 AI 서버 없이 키워드로 답한다(FAQ 매칭 + 항목 검색). 그래서 답의 품질은 전적으로 kb의 정확성에 달려 있다 — 사이트에 실제로 적힌 내용만 쓰고, 모르는 것은 지어내지 말 것.

## 워크플로

### 1. 대상 사이트 파악
- 페이지 내용 수집: Firecrawl `firecrawl_scrape`(markdown+links) 또는 WebFetch. 링크 목록에서 앵커(`#about`)와 하위 페이지(`/board?category=faq`)를 확보한다 — 봇 답변의 "열기" 목적지가 된다.
- 톤 수집: Playwright로 열어 주요 버튼 배경색·본문 배경·글꼴을 읽는다. 강조색은 위젯이 자동 감지하지만, 감지 결과(`--acc`)가 대표 CTA 색과 다르면 `data-accent`로 고정한다.
- 사용자가 캐릭터·얼굴 이미지를 주면 `data-avatar` 모드로 간다. 원본 파일은 건드리지 말고 얼굴 중심 정사각 크롭 → 256px WebP 로 만든 사본을 쓴다.
- 다크 모드 표시 방식 확인: `<html data-theme="dark">` / `html.dark` / 배경색 — 위젯은 셋 다 자동 감지하지만 확인해 두면 테스트가 빠르다.
- **펫 크기 고려**: May Hero는 폭 약 111px × 높이 120px(모바일 98px)이다. 겹침 계산은 이 크기로 한다.
- **겹침 확인**: 오른쪽 아래에 고정·절대 위치 요소(기존 채팅 버튼, 모바일 전화 버튼, "배경 효과 일시정지" 같은 버튼, 쿠키 배너)가 있으면 `data-bottom`/`data-right`로 피한다. 실측해서 `data-bottom = 기존 요소 위 끝 + 20px` 정도로 잡는다.
  - **이미 AI 챗봇 버튼이 있으면** 사용자에게 두 가지를 제시한다: 그대로 공존(로봇=사이트 안내, 기존=AI 대화) / 기존 챗봇을 빼고 로봇을 원래 위치로. 기존 챗봇 창을 열면 로봇과 겹칠 수 있다는 점도 알린다.
- **플랫폼과 수정 권한 확인** (가장 중요): 응답 헤더·README·커밋 패턴으로 무엇으로 만든 사이트인지 본다.
  - 커밋이 전부 자동 메시지("Update Site source")이거나 README에 vinext·Sites가 보이면 **ChatGPT Sites 관리 사이트** → 레포에 직접 푸시하면 다음 게시 때 덮어써진다. 사용자가 그 ChatGPT 대화에 붙여 넣을 지시문을 만들어 준다.
  - CSP 헤더가 있으면 위젯 호스트를 `script-src`에 추가해야 한다.
  - Lovable·Bolt·v0 등 AI 빌더로 시작한 프로젝트(`.lovable/` 폴더, og:image 파일명 등으로 판별)는 빌더가 `index.html`을 다시 만들면 삽입한 줄이 지워질 수 있다 → 보고에 "배포 후 확인"을 넣는다.

### 2. 호스팅 방식 결정
| 방식 | 언제 | 장점 |
|---|---|---|
| **자체 호스팅 (기본)** | 대상 사이트 소스를 직접 고칠 수 있을 때 | 외부 서버 의존 0. 위젯·kb를 사이트 `public/widgets/`에 복사 |
| **중앙 호스팅** | 빌더·Sites처럼 소스를 못 고치거나, 여러 사이트를 한곳에서 갱신하고 싶을 때 | 스크립트 한 줄. kb만 고쳐 재배포하면 5분 내 반영 |

중앙 호스팅 위치는 `https://design.aiclab.kr/widgets/` (프로젝트 `C:\project\landing\aiclab-design`, 원본 `src/widgets/`, `npm run build` → 커밋 → `vercel --prod`). 그 프로젝트의 CLAUDE.md를 먼저 읽는다.

### 3. 지식 파일(kb) 작성
`references/kb-guide.md`를 읽고 작성한다. 예시는 `assets/examples/sample-society.kb.js`(가상 연구회 — 임원·세미나·게시판·문의 구조, endTip·dropTips 포함). 실사이트 예시 `astra.kb.js`가 로컬에 있으면 함께 참고(실명·연락처가 있어 플러그인 배포본에서는 빠진다).
핵심만:
- 사이트에 실제로 있는 문장·숫자만 쓴다. 미확정 정보는 사이트 표현 그대로("확인 후 안내") 옮긴다.
- `faq`는 가장 긴 키워드가 맞은 항목이 이긴다 — 넓은 키워드("임원")와 좁은 키워드("임원 가입")를 함께 둬도 된다.
- `items`의 `url`은 앵커·하위 페이지·외부 링크 모두 가능. 같은 페이지 앵커는 부드럽게 스크롤, 외부는 새 탭.
- `tips`는 산책할 때 말풍선으로 뜬다. 짧게(20자 안팎).

### 4. 실제 페이지에서 먼저 검증 (삽입 전에)
`references/testing.md`의 Playwright `page.route` 주입 코드를 쓴다.
**공개 사이트에서 `http://localhost` 위젯은 크롬의 사설 네트워크 차단으로 조용히 실패한다** — 오류도 안 뜬다. 반드시 route로 가짜 https 주소를 로컬 파일에 연결해 주입할 것.
확인 항목: 마운트·kb 로드 / 첫 등장 말풍선 / 움직임(올라앉기·끌어 던지기·모바일 compact, `references/testing.md` 3절) / 빠른 질문 칩 전부 정답 / **칩에 없는 자유 질문 8개 이상**(사람이 실제로 칠 법한 문장 — 의도가 겹치는 질문 포함) / 다크 모드 전환 시 위젯도 전환 / 390px 모바일에서 가로 넘침 없음·겹침 없음.
칩만 테스트하면 kb가 칩에 맞춰져 있어 다 통과해 보인다. 오답은 자유 질문에서 나온다 — 오답이 나오면 kb 키워드를 고치고 다시 묻는다.

### 5. 삽입
`references/platforms.md`에서 대상 플랫폼 항목을 읽고 그대로 따른다. 공통 형태:
```html
<script src="<호스트>/widgets/mbot.js"
        data-kb="<호스트>/widgets/kb/<site>.kb.js"
        data-name="○○ 안내봇"
        data-bottom="24" data-right="20" defer></script>
<!-- May Hero 펫이 기본. 강조색은 자동 감지. 자체 호스팅이면 펫도 복사해 data-sprite="/widgets/pets/may-hero.webp" data-sprite-cell="120x130" 로 지정 -->
```
| 속성 | 기본값 | 설명 |
|---|---|---|
| `data-kb` | 없음 | 지식 파일 주소. 생략하면 `window.AICLAB_MBOT_KB`를 미리 정의해 둔 것을 쓴다 |
| `data-name` | 안내봇 | 창 제목·버튼 이름 |
| `data-accent` | 자동 감지 | 강조색(테두리·버튼). 생략하거나 `auto`면 사이트 포인트 컬러를 자동 감지(theme-color → CSS 변수 → 대표 버튼 배경, SPA 대비 재감지). 글자색은 밝기에 따라 자동 |
| `data-roam` | on | 움직임 모드. `on`(자동: 큰 화면+마우스=full, 모바일·터치=compact) / `full` / `compact` / `off`. 사용자가 창에서 끌 수 있고 저장됨. 동작 줄이기 설정이면 항상 멈춤 |
| `data-perch` | on | full 모드에서 화면에 보이는 카드·제목·이미지 윗변에 **올라앉기**(스크롤하면 따라 움직이고, 요소가 화면 밖으로 나가면 뛰어내려 집으로) |
| `data-drag` | on | 캐릭터를 **끌어서 던지기**(마우스·터치). 던진 속도로 날아가 착지 후 한마디. 끄면 펫 위에서 터치 스크롤이 막히지 않음 |
| `data-bottom` / `data-right` | 20 / 20 | 집(기본 위치) 여백 px. 모바일에서도 유지 |
| `data-avatar` | 없음 | 캐릭터 이미지 주소. 주면 3D 로봇 대신 **말풍선 모양**(포인트 컬러 테두리) 캐릭터로 바뀜. 정사각형 256px WebP 권장(얼굴 중심 크롭, 약 10KB). 눈 깜빡임 대신 얼굴 전체가 마우스 쪽으로 3D 회전 |
| `data-avatar-pos` | 50% 30% | 이미지 안에서 보일 위치(object-position) |
| `data-sprite` | 없음 | **Codex pet 스프라이트 시트** 주소(칸 격자, 행=상태). 주면 캐릭터가 화면을 직접 달린다: 산책=running-right/left, 말풍선=waving, 도착=jumping, 창 열림=waiting, 답 찾음=review, 못 찾음=failed |
| `data-sprite-cell` / `-frames` / `-height` | 192x208 / 6,8,8,4,5,8,6,6,6 / 120 | 칸 크기(축소했으면 축소 크기), 행별 프레임 수, 화면 표시 높이 |

**Codex pet 저장소를 받았을 때** (다른 캐릭터로 바꾸기): `python scripts/pet-to-sprite.py <pet 폴더> <출력.webp> --height 120` 한 번이면 된다. 투명 칸으로 행별 프레임 수를 계산하고(PIL `getbbox`), 표시 높이에 맞춰 축소한 WebP(약 230~270KB)를 만들고, 넣을 `data-sprite*` 속성을 출력한다. 원본 1.5MB를 그대로 쓰지 말 것. 예: May Hero (kjs369369/may-hero-codex-pet) → `design.aiclab.kr/widgets/pets/may-hero.webp`, `data-sprite-cell="120x130"`.

### 움직임 (v2)
| 상황 | full (데스크톱) | compact (모바일·터치·768px 미만) |
|---|---|---|
| 첫 등장 3초 후 | 화면 가운데로 점프해 나와 인사 | 아래쪽으로 몇 걸음 점프해 인사 |
| 산책 (9~16초마다) | 가장자리 빼꼼 20% · **요소 위 올라앉기** 35% · 아무 곳 33% · 집 12% | 아래쪽 가장자리만 오가기 65% · 제자리 동작 35% (본문을 가리지 않음) |
| 이동 | 스프링 물리 + 점프는 포물선(`jumping` 행), 달릴 땐 `running-left/right` | 같음 |
| 끌어서 던지기 | 놓는 속도로 날아가 착지 → 한마디, 그 자리에 머묾 | 같음, 4초 뒤 집으로 |
| 스크롤 | 올라앉은 요소를 따라 함께 이동 · 빠른 스크롤에 `running` · 페이지 끝에서 한마디(`kb.endTip`) | 빠른 스크롤 반응·끝 한마디 |
| 집에서 쉴 때 | 11초마다 가끔 손 흔들기·점프·살펴보기 | 같음 |
| 마우스 올림 | 멈춰서 손 흔들기 | — |
| 동작 줄이기 | 이동 전부 멈춤, 끌기만 가능(던지기 관성 없음) | 같음 |

kb에 선택 항목 `endTip`(페이지 끝 한마디), `dropTips`(던진 뒤 한마디 배열)를 넣을 수 있다.

### 호스트 사이트 API
위젯이 뜬 뒤 `window.aiclabMbot`으로 특정 순간에 캐릭터를 움직일 수 있다:
```js
aiclabMbot.say('신청 완료! 메일을 확인하세요', 4000);  // 말풍선
aiclabMbot.act('jumping');                           // 동작 한 번 (idle·waving·jumping·failed·waiting·running·review)
aiclabMbot.perch(document.querySelector('#pricing')); // 그 요소 위로 점프해 올라앉기 (인자 없으면 아무 요소)
aiclabMbot.home(); aiclabMbot.open();                // 집으로 / 안내 창 열기
```
예: 폼 제출 성공 시 `act('jumping')`+`say()`, 가격표로 스크롤 안내할 때 `perch()`.

`mbot.js`를 배포할 때는 terser로 압축하되 `/*!` 저작권 주석은 유지한다(`scripts/minify.mjs`).

### 6. 배포 후 확인
- 실제 주소에서 위젯이 뜨는지 확인한다. 위젯 호스트가 봇 차단(design.aiclab.kr처럼)을 하면 헤드리스 브라우저 요청이 403이 나므로, 테스트 때만 `page.route`로 일반 크롬 UA를 붙여 요청한다(`references/testing.md` 2절).
- 보고: 삽입 위치, 호스팅 방식, kb 항목 수, 확인한 질문과 답, 사용자가 직접 해야 할 일(Sites 게시, 빌더 저장 등).

## 운영
- 대상 사이트 내용이 바뀌면 kb만 갱신한다. 중앙 호스팅이면 재배포만으로 반영(캐시 5분).
- 위젯 본체를 고칠 때는 이 스킬의 `assets/mbot.js`와 중앙 호스트의 `src/widgets/mbot.js`를 함께 맞춘다.
- 진짜 대화형(LLM)으로 키우려면 서버 함수 하나를 두고 키는 서버에만 — 이 스킬 범위 밖이므로 사용자에게 별도 작업으로 제안만 한다.
