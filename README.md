# aiclab-mbot — May Hero 펫 안내 챗봇

웹사이트 어디에든 **움직이는 캐릭터 안내 챗봇**을 붙이는 Claude Code 플러그인입니다.
기본 캐릭터는 케이프를 두른 **May Hero**([may-hero-codex-pet](https://github.com/kjs369369/may-hero-codex-pet))입니다.

## 무엇을 하나요
- **움직이는 캐릭터**: 화면을 달리고, 포물선으로 점프하고, 카드·제목 위에 올라앉고, 끌어서 던질 수 있고, 스크롤에 반응합니다. 모바일에서는 본문을 가리지 않게 아래쪽 가장자리만 순찰합니다.
- **사이트 안내**: 사이트 내용을 분석해 전용 지식 파일(kb)을 만들고, 키워드로 답하며 해당 위치로 이동시켜 줍니다. AI 서버가 필요 없습니다.
- **모든 플랫폼**: Next.js · ChatGPT Sites · Vite/React · Vue/Nuxt · SvelteKit · Astro · 정적 HTML · 워드프레스 · 티스토리 · 아임웹/윅스/카페24 · Webflow · Framer · Shopify 삽입 방법을 안내합니다.
- **캐릭터 교체**: 다른 Codex pet 스프라이트, 3D 마우스봇 로봇, 말풍선 이미지 캐릭터로 바꿀 수 있습니다.

## 설치

### Claude Code
```
/plugin marketplace add kjs369369/aiclab-mbot
/plugin install aiclab-mbot@aiclab
```
설치 후 "이 사이트에 안내 챗봇 붙여줘 https://..."처럼 말하면 `mbot-embed` 스킬이 동작합니다.

### Codex · 다른 에이전트
`skills/mbot-embed` 폴더를 에이전트의 스킬 폴더(예: `~/.codex/skills/mbot-embed`)에 복사합니다. SKILL.md 형식이라 그대로 읽힙니다.

### 사람이 직접 붙일 때 (에이전트 없이)
```html
<script src="https://design.aiclab.kr/widgets/mbot.js"
        data-kb="/widgets/kb/site.kb.js" data-name="○○ 안내봇" defer></script>
```
`kb` 작성법은 `skills/mbot-embed/references/kb-guide.md`, 플랫폼별 위치는 `references/platforms.md`를 보세요.

## 구성
```
skills/mbot-embed/
  SKILL.md                 워크플로 (분석 → kb → 주입 검증 → 플랫폼 삽입 → 배포 확인)
  assets/mbot.js           위젯 본체 (Shadow DOM, 의존성 없음)
  assets/pets/may-hero.webp  May Hero 스프라이트 (120x130 칸, 9행)
  assets/kb-template.js    지식 파일 틀
  references/              kb 작성법 · 플랫폼별 삽입 · 테스트
  scripts/pet-to-sprite.py Codex pet → 위젯용 스프라이트 변환
  scripts/minify.mjs       배포용 압축
```

## 관리 (작성자용)
스킬 원본은 `C:\project\skills\dev-workflow\mbot-embed`입니다. 원본을 고친 뒤 `./sync.sh`로 이 저장소에 복사하고, `plugin.json`·`marketplace.json`의 버전을 함께 올려 커밋합니다.

## 라이선스
© 2025-2026 AICLab 김진수. All rights reserved. 무단 복제·재배포를 금지합니다. 자세한 내용은 [LICENSE](LICENSE)를 보세요.
