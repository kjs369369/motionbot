# 실제 페이지 주입 테스트

## 1. 로컬 위젯을 공개 사이트에 주입 (삽입 전 검증)

공개 사이트(https)에서 `http://localhost:…` 스크립트를 넣으면 크롬의 **사설 네트워크 접근 차단**으로 아무 오류 없이 로드되지 않는다.
Playwright `page.route`로 가짜 https 주소를 로컬 파일에 연결한다 (`browser_run_code_unsafe`).
`require`는 쓸 수 없으니 `route.fulfill({ path })`로 파일을 그대로 돌려준다.

```js
async (page) => {
  const base = 'C:/path/to/widgets/';           // mbot.js 와 kb/ 가 있는 로컬 폴더
  await page.route('https://widget.test/**', async (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\//, '');
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', path: base + p });
  });
  await page.goto('https://대상사이트/');
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.src = 'https://widget.test/mbot.js';
    s.dataset.kb = 'https://widget.test/kb/site.kb.js';
    s.dataset.name = '○○ 안내봇'; s.dataset.accent = '#hex'; s.dataset.bottom = '24';
    document.body.appendChild(s);
  });
  await page.waitForTimeout(2500);
  return await page.evaluate(() => { const h = document.getElementById('aiclab-mbot');
    return { mounted: !!h, kb: !!window.AICLAB_MBOT_KB, quick: h ? h.shadowRoot.querySelectorAll('.quick button').length : 0 }; });
}
```

### 질문 일괄 확인
```js
async () => {
  const r = document.getElementById('aiclab-mbot').shadowRoot;
  r.querySelector('.btn').click(); await new Promise(x => setTimeout(x, 2500)); // 산책 중이면 집으로 돌아온 뒤 열림
  const ask = async q => { r.querySelector('.fm input').value = q; r.querySelector('.fm').dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise(x => setTimeout(x, 250)); return [...r.querySelectorAll('.msg.bot')].pop().textContent.slice(0, 60); };
  const out = {}; for (const q of ['질문1', '질문2']) out[q] = await ask(q); return out;
}
```

### 확인 항목
| 항목 | 방법 |
|---|---|
| 마운트·kb | 위 코드 결과 `mounted`, `kb` true, `quick` ≥ 5 |
| 첫 등장 | 6초 대기 후 `.tip` 문구가 kb.hello |
| 답변 정확도 | quick 전부 + 사람 이름 3개 + 핵심 의도(문의·가입·자료) |
| 다크 모드 | 사이트 다크 토글 클릭 → `shadowRoot.querySelector('.wrap').className` 에 `dark` |
| 겹침 | 스크린샷으로 오른쪽 아래 고정 요소와 로봇이 겹치지 않는지 |
| 모바일 | 390×844 에서 `document.documentElement.scrollWidth <= innerWidth`, 창 폭 = 화면폭-32 |

헤드리스 브라우저는 `requestAnimationFrame`이 초당 2회 정도로 느려 산책 애니메이션이 느리게 보인다. 위젯 물리는 프레임 독립이라 실제 브라우저에서는 정상 속도다 — 위치값이 목표로 수렴하는지만 본다.

## 2. 배포 후 실주소 확인
위젯 호스트가 봇 차단을 하면(design.aiclab.kr: 미들웨어가 HeadlessChrome 403) 헤드리스 테스트에서만 막힌다. 요청 헤더를 일반 크롬처럼 바꿔 확인한다.

```js
await page.route('https://design.aiclab.kr/**', async (route) => {
  await route.continue({ headers: { ...route.request().headers(),
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="141", "Google Chrome";v="141"', 'accept-language': 'ko-KR,ko;q=0.9' } });
});
```

curl 확인: `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' -A "Mozilla/5.0 ... Chrome/141" -H 'Accept-Language: ko' <호스트>/widgets/mbot.js` → `200 application/javascript`.

## 3. 움직임 확인 (v2)
헤드리스는 `requestAnimationFrame`이 느려서 이동이 몇 초씩 걸린다. 위치가 목표로 수렴하는지만 보고, 여유 있게 기다린다.
`window.aiclabMbot` API로 무작위 산책을 기다리지 않고 바로 시험한다.

```js
async (page) => {
  const pet = () => page.evaluate(() => { const r = document.getElementById('aiclab-mbot').shadowRoot;
    const b = r.querySelector('.btn').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, bottom: b.bottom,
      tip: r.querySelector('.tip.on') ? r.querySelector('.tip').textContent : '' }; });
  // ① 올라앉기: 펫 발(bottom)이 요소 윗변 근처(±16px)
  await page.evaluate(() => aiclabMbot.perch(document.querySelector('h2')));
  await page.waitForTimeout(3500);
  const perched = await pet(), top = await page.evaluate(() => document.querySelector('h2').getBoundingClientRect().top);
  // ② 스크롤 따라가기: 조금 내리면 같이 이동, 많이 내리면 뛰어내려 집으로
  await page.mouse.move(600, 300); await page.mouse.wheel(0, 120); await page.waitForTimeout(800);
  // ③ 끌어서 던지기
  const p0 = await pet(); await page.mouse.move(p0.x, p0.y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(p0.x - i * 40, p0.y - i * 30); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(2500);
  const thrown = await pet(); // tip 에 dropTips 중 하나, 창은 닫혀 있어야 함(끌기 뒤 클릭 무시)
  return { perched, top, thrown };
}
```
| 항목 | 기대 |
|---|---|
| 올라앉기 | `perched.bottom - top` 이 0~16 (스프라이트 발밑 여백) |
| 던지기 | 놓은 방향으로 이동, 착지 후 말풍선, 안내 창은 열리지 않음 |
| 집 밖에서 클릭 | 집으로 달려와서 창이 열림 |
| compact | 390×844 에서 펫 y 가 집 높이 근처(아래쪽 띠)에서만 움직임, `scrollWidth <= clientWidth` |
| 동작 줄이기 | `page.emulateMedia({ reducedMotion: 'reduce' })` 후 산책 없음 |

**스크린샷 경로는 절대 경로로** 지정한다(상대 경로면 작업 폴더에 떨어져 기존 파일과 섞인다).
