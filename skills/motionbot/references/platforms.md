# 플랫폼별 삽입 방법

자체 호스팅이면 `assets/motionbot.js`(압축본 권장), `kb/<site>.kb.js`, `assets/pets/may-hero.webp`(→ `widgets/pets/`)를 사이트 정적 폴더의 `widgets/` 아래에 두고 주소를 `/widgets/...`로 쓴다. 펫까지 자체 호스팅하려면 `data-sprite="/widgets/pets/may-hero.webp" data-sprite-cell="120x130"`을 함께 넣는다(생략하면 펫 이미지만 design.aiclab.kr에서 불러온다).
중앙 호스팅이면 `https://design.aiclab.kr/widgets/...`를 쓴다. 아래 예시는 `<SRC>`, `<KB>`로 표기.

## 목차
1. Next.js App Router (Vercel 등)
2. ChatGPT Sites / vinext (소스 직접 수정 금지)
3. Next.js Pages Router
4. Vite / React SPA
5. 정적 HTML
6. 워드프레스
7. 티스토리
8. 아임웹 · 윅스 · 카페24 등 빌더
9. 노션 · 네이버 블로그 (불가)
10. CSP가 있는 사이트
11. Vue · Nuxt · SvelteKit · Astro · Remix
12. Webflow · Framer · Shopify · 그 밖의 빌더
13. 구글 사이트 · 링크트리 류 (불가 → 대체)

## 1. Next.js App Router
자체 호스팅: 파일을 `public/widgets/`에 둔다. `app/layout.tsx`의 `<body>` 끝에:
```tsx
import Script from "next/script";
// ...
<Script id="motionbot" src="/widgets/motionbot.js" strategy="afterInteractive"
  data-kb="/widgets/kb/site.kb.js" data-name="○○ 안내봇" data-accent="#hex" data-roam="on" data-bottom="24" />
```
`next/script`는 `data-` 속성을 그대로 스크립트 태그에 넘긴다. 위젯은 `document.currentScript`가 없어도 `script[src*="motionbot.js"]`로 자기 태그를 찾는다.

## 2. ChatGPT Sites / vinext
판별: README에 vinext·"Sites Lifecycle", 커밋이 전부 "Update Site source", Cloudflare 서버 + `X-Vinext-*` Vary 헤더.
배포를 ChatGPT가 담당하므로 **레포에 직접 푸시하지 않는다**(다음 게시 때 덮어써짐). 중앙 호스팅을 쓰고, 사용자가 그 사이트의 ChatGPT 대화에 붙여 넣을 지시문을 만들어 준다:
```
app/layout.tsx 의 <body> 안 맨 끝(</body> 바로 위)에 아래 스크립트를 추가하고 게시해줘. 다른 코드는 건드리지 마.

import Script from "next/script";
<Script id="motionbot" src="<SRC>" strategy="afterInteractive"
  data-kb="<KB>" data-name="○○ 안내봇" data-accent="#hex" data-roam="on" data-bottom="24" />

만약 next/script 가 동작하지 않으면 같은 속성으로 일반 <script src="..." defer> 태그를 써줘.
```
게시 후 실주소에서 확인한다.

## 3. Next.js Pages Router
`pages/_app.tsx`에서 `next/script`를 1번과 같이 쓰거나 `pages/_document.tsx`의 `<body>` 끝에 일반 `<script defer>`.

## 4. Vite / React SPA
`index.html`의 `</body>` 직전에 일반 `<script src="/widgets/motionbot.js" ... defer>`. 파일은 `public/widgets/`.
React 컴포넌트 안에서 넣지 말 것 — 라우트 전환마다 다시 마운트될 수 있다(위젯은 중복 실행을 막지만 굳이 그럴 이유가 없다).

### Lovable · Bolt · v0 로 만든 Vite 프로젝트
4번과 같다. 다만 빌더 연동이 살아 있으면 빌더가 `index.html`을 재생성하며 스크립트 줄을 지울 수 있다. 빌더 편집기에서도 "index.html 의 </body> 직전에 이 스크립트를 유지해줘"라고 지시해 두거나, 배포 후 확인한다.

## 5. 정적 HTML
모든 페이지(또는 공통 템플릿)의 `</body>` 직전에 공통 형태 그대로. 여러 페이지면 kb의 `url`은 절대 경로로.

## 6. 워드프레스
- 블록 테마: 외모 → 편집기 → 푸터 템플릿에 "사용자 정의 HTML" 블록으로 스크립트 삽입.
- 클래식 테마: `functions.php`에 `wp_footer` 훅 또는 "Insert Headers and Footers" 류 플러그인의 Footer 칸.
- 보안 플러그인이 외부 스크립트를 막으면 중앙 호스트를 허용 목록에 추가.

## 7. 티스토리
블로그 관리 → 꾸미기 → 스킨 편집 → HTML 편집 → `</body>` 바로 위에 붙여 넣고 적용. 모바일 웹 스킨을 따로 쓰면 그쪽에도.

## 8. 아임웹 · 윅스 · 카페24 등 빌더
- 아임웹: 환경설정 → SEO/고급 → "body 코드"(또는 바디 종료 직전 코드).
- 윅스: 설정 → 사용자 정의 코드 → Body - end, 모든 페이지.
- 카페24: 디자인 관리 → HTML 편집 → 공통 레이아웃 `</body>` 앞.
빌더는 소스를 못 고치므로 중앙 호스팅을 쓴다. 유료 플랜에서만 커스텀 코드가 되는 빌더가 있으니 먼저 확인.

## 9. 노션 · 네이버 블로그
사용자 스크립트를 실행할 수 없다. 대안: 챗봇만 있는 작은 페이지를 만들어(정적 HTML) 링크로 연결하거나, 노션은 임베드 블록으로 그 페이지를 넣는다(임베드 안에서만 동작).

## 10. CSP가 있는 사이트
응답 헤더 또는 `<meta http-equiv="Content-Security-Policy">`를 확인한다.
- 중앙 호스팅: `script-src`에 `https://design.aiclab.kr` 추가. kb도 같은 호스트라 추가 불필요.
- 자체 호스팅: `'self'`면 충분.
- 위젯은 인라인 `style` 속성과 `<style>`(Shadow DOM 안)을 쓰므로 `style-src`에 `'unsafe-inline'`이 없으면 모양이 깨진다. 이 경우 사용자에게 알리고 허용 여부를 묻는다.

## 11. Vue · Nuxt · SvelteKit · Astro · Remix
공통 원칙: **앱 컴포넌트 안이 아니라 HTML 셸의 `</body>` 직전**에 한 번만 넣는다(라우트 전환에도 위젯이 유지됨). 파일은 정적 폴더(`public/` 또는 `static/`)의 `widgets/`.
- Vue(Vite): `index.html` — 4번과 같다.
- Nuxt 3: `nuxt.config.ts` → `app: { head: { script: [{ src: '/widgets/motionbot.js', defer: true, tagPosition: 'bodyClose', 'data-kb': '/widgets/kb/site.kb.js', 'data-name': '○○ 안내봇' }] } }`
- SvelteKit: `src/app.html`의 `%sveltekit.body%` 뒤. 파일은 `static/widgets/`.
- Astro: 공통 레이아웃(`src/layouts/*.astro`)의 `</body>` 직전에 `<script is:inline src="/widgets/motionbot.js" data-kb="..." defer></script>` (`is:inline` 없으면 Astro가 번들링해 `data-` 속성이 사라진다).
- Remix / React Router: `app/root.tsx`의 `<Scripts />` 뒤에 일반 `<script>` 태그.

## 12. Webflow · Framer · Shopify · 그 밖의 빌더
소스를 못 고치므로 중앙 호스팅.
- Webflow: Site settings → Custom code → **Footer code** (유료 사이트 플랜 필요) → Publish.
- Framer: Site Settings → General → Custom Code → **End of <body> tag** → Publish.
- Shopify: 온라인 스토어 → 테마 → 코드 편집 → `layout/theme.liquid`의 `</body>` 직전.
- 그 밖의 빌더: "body 끝 코드 / footer code / 사용자 정의 HTML(전체 페이지)" 칸을 찾는다. 페이지 단위 HTML 블록만 있으면 그 블록에 넣어도 동작한다(위젯은 `position:fixed`로 화면에 붙음).

## 13. 구글 사이트 · 링크트리 류
스크립트가 iframe 안에 갇혀서 화면을 돌아다닐 수 없다. 9번처럼 챗봇만 있는 작은 정적 페이지를 만들어 링크하거나, 임베드 칸 안에서만 쓰는 것으로 안내한다.

## 플랫폼 공통 점검
- 위젯은 Shadow DOM이라 사이트 CSS와 충돌하지 않는다. `z-index`는 2147483000 — 사이트 모달보다 위에 뜨는 게 싫으면 `data-roam="compact"`로 움직임 범위를 줄인다.
- 끌기(`data-drag`)는 펫 위에서 `touch-action:none` — 펫을 잡고 스크롤하려는 사용자가 많다면(아래쪽 고정 바가 있는 모바일 쇼핑몰 등) `data-drag="off"`.
- 페이지 이동형(MPA) 사이트는 페이지마다 위젯이 새로 뜬다. 산책 끔 설정·인사 여부는 `localStorage`(도메인별)에 저장된다.
