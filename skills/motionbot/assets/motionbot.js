/*!
 * 모션챗봇 Motionbot v2 — 화면을 움직이는 캐릭터 안내 챗봇 (어느 사이트에나 삽입)
 * © 2025-2026 AICLab 김진수. All rights reserved. 무단 복제·재배포 금지.
 * 모션챗봇(Motionbot)은 AICLab 김진수의 시그니처 프로그램입니다. https://motionbot.aiclab.kr
 *
 * 사용법
 *   <script src="https://design.aiclab.kr/widgets/motionbot.js"
 *           data-kb="https://design.aiclab.kr/widgets/kb/astra.kb.js"
 *           data-name="GPT 안내봇" data-accent="#dec18a"
 *           data-roam="on" data-bottom="24" data-right="20"
 *           data-avatar="/widgets/avatar.png" data-avatar-pos="50% 30%" defer></script>
 *   data-avatar 를 주면 3D 로봇 머리 대신 캐릭터 이미지가 말풍선 모양으로 들어간다(산책·기울기·시선 방향 회전은 유지).
 *   기본 캐릭터는 May Hero 펫(달리는 캐릭터). data-character="robot" → 3D 로봇, data-pet="may-hero" → 기본 펫 지정.
 *   data-sprite="/widgets/pets/x.webp" 를 주면 Codex pet 형식 스프라이트(칸 격자, 행=상태)로 캐릭터가 직접 달린다.
 *     data-sprite-cell="192x208" data-sprite-frames="6,8,8,4,5,8,6,6,6" data-sprite-height="120" (기본값은 Codex pet 표준)
 *   data-accent 를 생략하거나 "auto" 로 두면 사이트 포인트 컬러(theme-color → CSS 변수 → 대표 버튼 배경)를 자동 감지한다.
 *   움직임(v2): data-roam="on|full|compact|off" (on = 큰 화면+마우스는 full, 모바일·터치는 compact),
 *     data-perch="off" 요소 위 올라앉기 끄기, data-drag="off" 끌어서 던지기 끄기.
 *   API: window.motionbot.say(text, ms) / act(state) / perch(el) / home() / open()   (옛 이름 window.aiclabMbot 도 동작)
 *
 * 지식 파일(kb)은 window.AICLAB_MBOT_KB = { greeting, quick, tips, faq, items } 를 정의하는 스크립트.
 * 옛 주소 widgets/mbot.js 는 같은 파일의 사본으로 계속 제공한다(기존 삽입 사이트 호환).
 * 화면은 Shadow DOM 안에 그려서 호스트 사이트 스타일과 서로 간섭하지 않는다.
 */
(function () {
  'use strict';
  if (window.__AICLAB_MBOT__) return;
  window.__AICLAB_MBOT__ = true;

  var me = document.currentScript || document.querySelector('script[src*="motionbot.js"],script[src*="mbot.js"]');
  // 기본 제공 펫 (Codex pet 형식, 62.5% 축소본)
  var PETS = {
    'may-hero': { src: 'https://design.aiclab.kr/widgets/pets/may-hero.webp', cell: '120x130' },
  };
  var ds = (me && me.dataset) || {};
  var CFG = {
    name: ds.name || '안내봇',
    kb: ds.kb || '',
    accent: (ds.accent && ds.accent !== 'auto') ? ds.accent : '',   // 비우거나 auto 면 사이트 포인트 컬러 자동 감지
    roam: (ds.roam || 'on') !== 'off',
    roamMode: /^(full|compact)$/.test(ds.roam || '') ? ds.roam : 'auto',   // auto: 큰 화면+마우스=full, 그 외=compact
    perch: (ds.perch || 'on') !== 'off',                                  // 페이지 요소 위에 올라앉기
    drag: (ds.drag || 'on') !== 'off',                                    // 끌어서 던지기
    bottom: +(ds.bottom || 20),
    right: +(ds.right || 20),
    avatar: ds.avatar || '',                     // 캐릭터 이미지 주소 (있으면 3D 로봇 대신 사용)
    avatarPos: ds.avatarPos || '50% 30%',        // 원 안에서 보일 위치 (object-position)
    // 스프라이트 펫 (Codex pet 형식: 칸 격자, 행 = 상태) — 있으면 로봇·아바타 대신 캐릭터가 직접 달린다
    // 기본 캐릭터 = May Hero 펫. data-character="robot" 이면 3D 로봇, data-avatar 가 있으면 말풍선 캐릭터
    sprite: ds.sprite || ((ds.avatar || ds.character === 'robot') ? '' : (PETS[ds.pet || 'may-hero'] || PETS['may-hero']).src),
    spriteCell: (ds.spriteCell || (ds.sprite ? '192x208' : (PETS[ds.pet || 'may-hero'] || PETS['may-hero']).cell)).split('x').map(Number),
    spriteFrames: (ds.spriteFrames || '6,8,8,4,5,8,6,6,6').split(',').map(Number),
    spriteStates: (ds.spriteStates || 'idle,running-right,running-left,waving,jumping,failed,waiting,running,review').split(','),
    spriteHeight: +(ds.spriteHeight || 120),
    spriteFps: +(ds.spriteFps || 10),
    storeKey: 'aiclab-mbot:' + location.host,
  };

  // ── 유틸 ──
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lum(hex) {
    var m = String(hex).match(/[0-9a-f]{2}/gi); if (!m || m.length < 3) return .5;
    var v = m.slice(0, 3).map(function (h) { var c = parseInt(h, 16) / 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
    return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(CFG.storeKey + ':' + k); localStorage.setItem(CFG.storeKey + ':' + k, v); } catch (e) { return null; } }
  // 사이트 포인트 컬러 감지: theme-color → CSS 변수 → 가장 눈에 띄는 버튼 배경
  // 어떤 CSS 색 표기든 캔버스로 정규화 → #rrggbb (반투명·투명은 버림)
  var cctx = null;
  function toHex(c) {
    if (!c) return '';
    cctx = cctx || document.createElement('canvas').getContext('2d');
    cctx.fillStyle = '#000'; cctx.fillStyle = String(c).trim();
    var v = cctx.fillStyle;
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    var m = v.match(/rgba?(([^)]+))/); if (!m) return '';
    var p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat);
    if (p.length > 3 && p[3] < .5) return '';
    return '#' + p.slice(0, 3).map(function (x) { return ('0' + Math.round(x).toString(16)).slice(-2); }).join('');
  }
  function sat(hex) { var m = hex.match(/[0-9a-f]{2}/gi); if (!m) return 0; var v = m.slice(0, 3).map(function (h) { return parseInt(h, 16); }); return (Math.max.apply(0, v) - Math.min.apply(0, v)) / 255; }
  function detectAccent() {
    var meta = document.querySelector('meta[name="theme-color"]'), c = meta && toHex(meta.content);
    if (c && sat(c) > .2) return c;
    var cs = getComputedStyle(document.documentElement);
    var vars = ['--accent', '--primary', '--brand', '--color-primary', '--color-accent', '--wp--preset--color--primary'];
    for (var i = 0; i < vars.length; i++) { var v = cs.getPropertyValue(vars[i]).trim(); if (!v) continue; if (/^d/.test(v)) v = 'hsl(' + v.replace(/ /g, ',') + ')'; var h = toHex(v); if (h && sat(h) > .2) return h; }
    var best = '', bestScore = 0;
    Array.prototype.slice.call(document.querySelectorAll('a,button')).slice(0, 300).forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.width < 40 || r.height < 24) return;
      var st = getComputedStyle(el), h = toHex(st.backgroundColor);
      if (!h && /gradient/.test(st.backgroundImage)) { var g = st.backgroundImage.match(/rgba?([^)]+)|#[0-9a-f]{3,8}/i); h = g ? toHex(g[0]) : ''; }
      if (!h) return; var sc = sat(h) * Math.min(r.width * r.height / 4000, 3);
      if (sc > bestScore) { bestScore = sc; best = h; }
    });
    return bestScore > .15 ? best : '#00d4a4';
  }
  var AUTO_ACCENT = !CFG.accent;
  if (AUTO_ACCENT) CFG.accent = '#00d4a4';   // 임시값 — 마운트 후 사이트가 다 그려지면 다시 감지
  var onAccent = lum(CFG.accent) > .45 ? '#141414' : '#ffffff';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;

  // ── 스타일 (Shadow DOM 안) ──
  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.wrap{position:fixed;right:' + CFG.right + 'px;bottom:' + CFG.bottom + 'px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:12px;',
    'font-family:Pretendard,"Pretendard Variable","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;font-size:14px;line-height:1.5;letter-spacing:-.005em;',
    '--acc:' + CFG.accent + ';--on-acc:' + onAccent + ';--bg:#ffffff;--bg2:#fafafa;--bg3:#f5f5f5;--line:#e5e5e5;--ink:#0a0a0a;--body:#3a3a3c;--muted:#6e6e73;--me:#0a0a0a;--me-ink:#fff}',
    '.wrap.dark{--bg:#121214;--bg2:#0d0d0f;--bg3:#1a1a1d;--line:#2a2a2f;--ink:#f5f5f5;--body:#cfcfd4;--muted:#9a9aa1;--me:#f5f5f5;--me-ink:#0a0a0a}',
    '.walker{position:relative;display:flex;flex-direction:column;align-items:flex-end;will-change:transform}',
    '.tip{position:absolute;right:4px;bottom:calc(100% + 10px);width:max-content;max-width:min(280px,calc(100vw - 40px));white-space:normal;word-break:keep-all;font-size:13px;font-weight:600;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:14px 14px 4px 14px;padding:8px 12px;box-shadow:0 10px 24px -14px rgba(0,0,0,.45);opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s cubic-bezier(.2,.7,.2,1);pointer-events:none}',
    '.walker.left .tip{right:auto;left:4px;border-radius:14px 14px 14px 4px}',
    '.walker.below .tip{bottom:auto;top:calc(100% + 10px)}',
    '.tip.on{opacity:1;transform:none}',
    '.btn{width:76px;height:76px;border:0;background:none;cursor:pointer;position:relative;transition:transform .3s cubic-bezier(.2,.7,.2,1);-webkit-tap-highlight-color:transparent}',
    '.btn:hover{transform:translateY(-4px) scale(1.06)}.btn:active{transform:scale(.95)}',
    '.btn.dg{touch-action:none;-webkit-user-select:none;user-select:none}.walker.drag .btn{cursor:grabbing;transform:scale(1.08)}',
    '.btn:focus{outline:none}.btn:focus-visible{outline:2px solid var(--acc);outline-offset:3px;border-radius:50%}',
    '.bc{position:absolute;left:0;top:0;width:150px;height:150px;transform:scale(.5);transform-origin:0 0;perspective:700px}',
    '.bb{display:block;width:100%;height:100%;position:relative;transform-style:preserve-3d;border-radius:50%;animation:bob 3.2s ease-in-out infinite}',
    '@keyframes bob{50%{transform:translateY(-6px)}}',
    '.walker.moving .bb{animation:hop .42s ease-in-out infinite}@keyframes hop{50%{transform:translateY(-10px)}}',
    '.head{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,#fff,#f0f0f0,#e8e8e8);box-shadow:0 8px 25px rgba(0,0,0,.18),inset 3px 3px 15px rgba(255,255,255,.8),inset -3px -3px 15px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;transition:transform .1s ease-out}',
    '.ear{position:absolute;width:24px;height:24px;background:#e0e0e0;border-radius:50%;box-shadow:inset 1px 1px 2px rgba(255,255,255,.6),inset -1px -1px 2px rgba(0,0,0,.2);top:50%;transform:translateY(-50%) translateZ(-5px);z-index:-1;transition:transform .1s ease-out,opacity .1s ease-out}',
    '.ear.l{left:-8px}.ear.r{right:-8px}',
    '.hl{position:absolute;top:20%;left:25%;width:30%;height:15%;background:rgba(255,255,255,.7);border-radius:50%;transform:rotate(-30deg)}',
    '.blush{position:absolute;top:62%;left:16%;width:18px;height:9px;border-radius:50%;background:rgba(255,140,160,.35);filter:blur(2px)}.blush.r{left:auto;right:16%}',
    '.eyes{position:relative;width:60%;height:40px;display:flex;justify-content:space-between;align-items:center}',
    '.eye{width:32px;height:32px;background:#000;border-radius:50%;position:relative;overflow:hidden;transition:transform .12s ease-out}',
    '.pupil{position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:25%;left:25%;transition:transform .05s ease-out}',
    '.btn[aria-expanded="true"] .pupil{background:var(--acc)}',
    '.lid{position:absolute;inset:0;background:#f0f0f0;top:-100%;height:100%;border-radius:0 0 50% 50%;animation:blink 4s infinite ease-in-out;z-index:2}',
    '@keyframes blink{0%,96%,98%{transform:translateY(0)}97%,99%{transform:translateY(100%)}}',
    '.av{position:absolute;left:4px;right:4px;top:0;bottom:14px;border-radius:44%;background:#fff;border:4px solid var(--acc);box-shadow:0 12px 26px -6px rgba(0,0,0,.3);transform-style:preserve-3d;transition:transform .1s ease-out}',
    '.av::before{content:"";position:absolute;left:18%;bottom:-17px;width:26px;height:26px;background:#fff;border-right:4px solid var(--acc);border-bottom:4px solid var(--acc);border-bottom-right-radius:6px;transform:rotate(45deg) skew(8deg,8deg);z-index:0}',
    '.av .ph{position:absolute;inset:5px;border-radius:40%;overflow:hidden;z-index:1;background:#fff}',
    '.av img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;user-select:none}',
    '.av .ph::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.35),transparent 45%);pointer-events:none}',
    '.ava.img{background:#fff;overflow:hidden;padding:0;border:2px solid var(--acc);border-radius:44% 44% 44% 12%;box-shadow:none}.ava.img img{width:100%;height:100%;object-fit:cover}',
    '.pet{position:absolute;left:0;top:0;background-repeat:no-repeat;filter:drop-shadow(0 10px 8px rgba(0,0,0,.28));pointer-events:none}',
    '.btn.sp{border-radius:22px}.btn.sp:hover{transform:translateY(-4px) scale(1.04)}',
    '.ava.sp{background-color:#fff;background-repeat:no-repeat;border:2px solid var(--acc);border-radius:44% 44% 44% 12%;box-shadow:none}',
    '.shadow{position:absolute;bottom:-15px;left:15%;width:70%;height:10px;background:rgba(0,0,0,.15);border-radius:50%;filter:blur(5px)}',
    '.panel{width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 140px));display:flex;flex-direction:column;background:var(--bg);color:var(--body);border:1px solid var(--line);border-radius:16px;box-shadow:0 30px 60px -24px rgba(0,0,0,.4);overflow:hidden;animation:pop .35s cubic-bezier(.2,.7,.2,1)}',
    '.panel[hidden]{display:none}@keyframes pop{from{opacity:0;transform:translateY(12px) scale(.96)}}',
    '.hd{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid var(--line)}',
    '.ava{width:34px;height:34px;flex-shrink:0;border-radius:50%;background:linear-gradient(135deg,#fff,#e8e8e8);box-shadow:inset -2px -2px 5px rgba(0,0,0,.1),0 2px 6px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;gap:5px}',
    '.ava i{width:7px;height:7px;border-radius:50%;background:#0a0a0a;box-shadow:inset 1px 1px 0 1px rgba(255,255,255,.9)}',
    '.ttl{font-weight:700;font-size:15px;color:var(--ink);letter-spacing:-.02em}',
    '.st{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}',
    '.dot{position:relative;width:8px;height:8px}.dot i{position:absolute;inset:0;border-radius:50%;background:var(--acc);opacity:.6;animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite}.dot b{position:absolute;inset:0;border-radius:50%;background:var(--acc)}',
    '@keyframes ping{75%,100%{transform:scale(2.4);opacity:0}}',
    '.roam{margin-left:auto;font:inherit;font-size:11.5px;font-weight:600;color:var(--muted);background:none;border:1px solid var(--line);border-radius:999px;padding:4px 10px 4px 22px;position:relative;cursor:pointer}',
    '.roam::before{content:"";position:absolute;left:8px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--muted)}',
    '.roam[aria-checked="true"]{color:var(--ink);border-color:var(--acc)}.roam[aria-checked="true"]::before{background:var(--acc)}',
    '.x{width:32px;height:32px;border:0;border-radius:8px;background:none;font-size:22px;line-height:1;color:var(--muted);cursor:pointer}.x:hover{background:var(--bg3);color:var(--ink)}',
    '.log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--bg2)}',
    '.msg{max-width:88%;font-size:13.5px;line-height:1.6;padding:10px 13px;border-radius:14px;animation:pop .3s cubic-bezier(.2,.7,.2,1);word-break:keep-all;overflow-wrap:anywhere}',
    '.msg.bot{align-self:flex-start;background:var(--bg);border:1px solid var(--line);border-bottom-left-radius:4px}',
    '.msg.me{align-self:flex-end;background:var(--me);color:var(--me-ink);border-bottom-right-radius:4px}',
    '.msg b{color:var(--ink)}.msg a{color:inherit;text-decoration:underline;text-underline-offset:2px}',
    '.res{display:flex;flex-direction:column;gap:6px;margin-top:8px}',
    '.ri{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg3);transition:border-color .15s}',
    '.ri:hover{border-color:var(--acc)}',
    '.sw{width:22px;height:22px;flex-shrink:0;border-radius:50%;background:var(--acc);display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--on-acc)}',
    '.rt{flex:1;min-width:0}.rt strong{display:block;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rt small{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ri button{flex-shrink:0;font:inherit;font-size:11.5px;font-weight:600;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:4px 10px;cursor:pointer}',
    '.ri button:hover{background:var(--acc);border-color:var(--acc);color:var(--on-acc)}',
    '.quick{display:flex;gap:6px;overflow-x:auto;padding:10px 14px 0;scrollbar-width:none}.quick::-webkit-scrollbar{display:none}',
    '.quick button{flex-shrink:0;font:inherit;font-size:12px;font-weight:500;color:var(--body);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:6px 11px;cursor:pointer}',
    '.quick button:hover{border-color:var(--acc);color:var(--ink)}',
    '.fm{display:flex;gap:8px;padding:10px 14px 14px}',
    '.fm input{flex:1;min-width:0;height:40px;font:inherit;font-size:14px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:0 12px;outline:none}',
    '.fm input:focus{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 25%,transparent)}',
    '.fm button{width:40px;height:40px;flex-shrink:0;border:0;border-radius:10px;background:var(--acc);color:var(--on-acc);display:grid;place-items:center;cursor:pointer}',
    '.credit{padding:0 14px 10px;font-size:10.5px;color:var(--muted);text-align:right}.credit a{color:inherit}',
    '@media (max-width:560px){.wrap{right:12px}.btn{width:64px;height:64px}.bc{transform:scale(.42)}.panel{height:min(520px,calc(100vh - 120px))}.quick button{min-height:34px}}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}',
  ].join('\n');

  var HTML =
    '<div class="wrap" part="wrap">' +
    '<div class="panel" role="dialog" aria-modal="false" aria-label="' + esc(CFG.name) + '" hidden>' +
    '<div class="hd"><span class="ava" aria-hidden="true"><i></i><i></i></span><div><p class="ttl">' + esc(CFG.name) + '</p><span class="st"><span class="dot" aria-hidden="true"><i></i><b></b></span>사이트 안내</span></div>' +
    '<button type="button" class="roam" role="switch" aria-checked="true" title="화면을 돌아다니며 팁을 알려 줘요">산책 중</button>' +
    '<button type="button" class="x" aria-label="닫기">×</button></div>' +
    '<div class="log" aria-live="polite"></div><div class="quick"></div>' +
    '<form class="fm"><input type="text" aria-label="질문" placeholder="궁금한 것을 물어보세요" autocomplete="off">' +
    '<button type="submit" aria-label="보내기"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>' +
    '<p class="credit"><a href="https://motionbot.aiclab.kr" target="_blank" rel="noopener">모션챗봇</a> by AICLab</p>' +
    '</div>' +
    '<div class="walker"><span class="tip"></span>' +
    '<button type="button" class="btn" aria-label="' + esc(CFG.name) + ' 열기" aria-expanded="false">' +
    '<span class="bc"><span class="bb"><span class="head">' +
    '<span class="ear l"></span><span class="ear r"></span><span class="hl"></span><span class="blush"></span><span class="blush r"></span>' +
    '<span class="eyes"><span class="eye"><span class="pupil"></span><span class="lid"></span></span><span class="eye"><span class="pupil"></span><span class="lid"></span></span></span>' +
    '</span></span><span class="shadow"></span></span></button></div></div>';

  function mount() {
    var host = document.createElement('div');
    host.id = 'aiclab-mbot';   // 호환을 위해 id 유지 (모션챗봇)
    host.setAttribute('data-version', '2');
    document.body.appendChild(host);
    var root = host.attachShadow({ mode: 'open' });
    var st = document.createElement('style'); st.textContent = CSS; root.appendChild(st);
    var box = document.createElement('div'); box.innerHTML = HTML; root.appendChild(box.firstChild);
    var $ = function (s) { return root.querySelector(s); };
    var wrap = $('.wrap'), walker = $('.walker'), btn = $('.btn'), panel = $('.panel'), tip = $('.tip');
    var log = $('.log'), quick = $('.quick'), form = $('.fm'), input = $('.fm input'), roamSw = $('.roam');
    var head = $('.head'), ears = [$('.ear.l'), $('.ear.r')];
    var eyes = Array.prototype.slice.call(root.querySelectorAll('.eye'));
    var pupils = Array.prototype.slice.call(root.querySelectorAll('.pupil'));
    var lids = Array.prototype.slice.call(root.querySelectorAll('.lid'));
    var bb = $('.bb');
    function applyAccent(c) { if (!c) return; CFG.accent = c; wrap.style.setProperty('--acc', c); wrap.style.setProperty('--on-acc', lum(c) > .45 ? '#141414' : '#ffffff'); }
    if (AUTO_ACCENT) [0, 1200, 3500].forEach(function (t) { setTimeout(function () { applyAccent(detectAccent()); }, t); });

    // ── 캐릭터 이미지 모드 ──
    var avatarEl = null;
    if (CFG.avatar) {
      var headEl = $('.head');
      avatarEl = document.createElement('span'); avatarEl.className = 'av';
      var im = document.createElement('img'); im.alt = ''; im.src = CFG.avatar; im.style.objectPosition = CFG.avatarPos; im.decoding = 'async';
      var ph = document.createElement('span'); ph.className = 'ph'; ph.appendChild(im); avatarEl.appendChild(ph); headEl.parentNode.replaceChild(avatarEl, headEl);
      var mini = $('.ava'); mini.className = 'ava img'; mini.innerHTML = '';
      var im2 = document.createElement('img'); im2.alt = ''; im2.src = CFG.avatar; im2.style.objectPosition = CFG.avatarPos; mini.appendChild(im2);
    }

    // ── 스프라이트 펫 모드 ──
    var petEl = null, BW = 76, BH = 76, petState = 'idle', petOver = null, petFrame = 0;
    if (CFG.sprite) {
      var cw = CFG.spriteCell[0], ch = CFG.spriteCell[1], rows = CFG.spriteStates.length, cols = Math.max.apply(0, CFG.spriteFrames);
      var dh = innerWidth < 560 ? Math.round(CFG.spriteHeight * .82) : CFG.spriteHeight, sc = dh / ch;
      BW = Math.round(cw * sc); BH = dh;
      btn.classList.add('sp'); btn.style.width = BW + 'px'; btn.style.height = BH + 'px';
      petEl = document.createElement('span'); petEl.className = 'pet';
      petEl.style.width = BW + 'px'; petEl.style.height = BH + 'px';
      petEl.style.backgroundImage = 'url("' + CFG.sprite + '")';
      petEl.style.backgroundSize = (cols * cw * sc) + 'px ' + (rows * ch * sc) + 'px';
      var bcEl = $('.bc'); bcEl.parentNode.replaceChild(petEl, bcEl);
      // 창 머리 아바타: 첫 프레임의 얼굴 부분
      var mini = $('.ava'), ms = 34 / (cw * .5);
      mini.className = 'ava sp'; mini.innerHTML = '';
      mini.style.backgroundImage = 'url("' + CFG.sprite + '")';
      mini.style.backgroundSize = (cols * cw * ms) + 'px ' + (rows * ch * ms) + 'px';
      mini.style.backgroundPosition = (-(cw * ms * .25)) + 'px ' + (-(ch * ms * .02)) + 'px';
      var drawPet = function () {
        var name = petOver && Date.now() < petOver.until ? petOver.name : (petOver = null, petState);
        if (petState.indexOf('running') === 0) name = petState;   // 달리는 중엔 달리기 우선
        var row = CFG.spriteStates.indexOf(name); if (row < 0) row = 0;
        var n = CFG.spriteFrames[row] || 1;
        if (petOver && petOver.once && petFrame >= n - 1) { petFrame = n - 1; } else petFrame = (petFrame + 1) % n;
        petEl.style.backgroundPosition = (-(petFrame % n) * cw * sc) + 'px ' + (-row * ch * sc) + 'px';
      };
      setInterval(function () { if (!document.hidden) drawPet(); }, 1000 / CFG.spriteFps);
    }
    function act(name, ms, once) { if (!petEl) return; petOver = { name: name, until: Date.now() + (ms || 1500), once: !!once }; petFrame = -1; }

    // ── 호스트 사이트 라이트/다크 감지 ──
    function syncTheme() {
      var h = document.documentElement, b = document.body;
      var dark = h.getAttribute('data-theme') === 'dark' || h.classList.contains('dark') || b.classList.contains('dark');
      if (!dark && !h.getAttribute('data-theme')) {
        var m = getComputedStyle(b).backgroundColor.match(/\d+/g);
        if (m) dark = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 < .35;
      }
      wrap.classList.toggle('dark', dark);
    }
    syncTheme();
    new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

    // ── 시선: 마우스 방향 ──
    var mx = innerWidth / 2, my = innerHeight / 2, lastMouse = 0, gaze = null;
    function look() {
      if (petEl) return;
      var r = bb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var g = (Date.now() - lastMouse > 2500 && gaze) ? gaze : { x: mx, y: my };
      var dx = g.x - cx, dy = g.y - cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, k = Math.min(d / 220, 1);
      if (avatarEl) { avatarEl.style.transform = 'rotateY(' + (ux * k * 22).toFixed(2) + 'deg) rotateX(' + (-uy * k * 16).toFixed(2) + 'deg) translate(' + (ux * k * 4).toFixed(1) + 'px,' + (uy * k * 3).toFixed(1) + 'px)'; return; }
      eyes.forEach(function (e) { e.style.transform = 'translate(' + (ux * 9 * k).toFixed(2) + 'px,' + (uy * 9 * k).toFixed(2) + 'px)'; });
      pupils.forEach(function (p) { p.style.transform = 'translate(' + (ux * 6 * k).toFixed(2) + 'px,' + (uy * 6 * k).toFixed(2) + 'px)'; });
      var ax = ux * k * 20, ay = uy * k * 15;
      head.style.transform = 'rotateY(' + (ax * .9).toFixed(2) + 'deg) rotateX(' + (-ay * .7).toFixed(2) + 'deg)';
      ears[0].style.opacity = ax > 0 ? 1 : Math.max(.15, .5 + ax / 40);
      ears[1].style.opacity = ax > 0 ? Math.max(.15, .5 - ax / 40) : 1;
    }
    var lr = 0;
    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; lastMouse = Date.now(); if (!lr) lr = requestAnimationFrame(function () { lr = 0; look(); }); }, { passive: true });
    (function blink() { var d = Math.random() * 3 + 2; lids[0].style.animationDuration = d + 's'; lids[1].style.animationDuration = (d + .1) + 's'; lids[1].style.animationDelay = '.1s'; setTimeout(blink, d * 1000); })();
    look();

    // ── 움직임 엔진 v2 ──
    // 모드: full(큰 화면+마우스) = 화면 산책·요소 위에 올라앉기 / compact(모바일·터치) = 아래쪽 가장자리 순찰
    // 공통: 끌어서 던지기, 스크롤 반응, 집에서 잔동작. 동작 줄이기 설정이면 전부 멈춘다(끌기만 가능).
    var roamOn = CFG.roam && store('roam') !== 'off';
    function VW() { return document.documentElement.clientWidth || innerWidth; }
    function VH() { return document.documentElement.clientHeight || innerHeight; }
    function mode() { if (!roamOn || reduce) return 'off'; if (CFG.roamMode !== 'auto') return CFG.roamMode; return fine && innerWidth >= 768 ? 'full' : 'compact'; }
    var canRoam = function () { return mode() !== 'off'; };
    function syncSw() { roamSw.setAttribute('aria-checked', String(roamOn)); roamSw.textContent = roamOn ? '산책 중' : '산책 끔'; }
    syncSw();
    var pos = { x: 0, y: 0, vx: 0, vy: 0 }, tgt = { x: 0, y: 0 }, rot = 0, rotT = 0, running = false, timer = 0, hovering = false, pendingOpen = false, last = 0;
    var jump = null, perch = null, drag = null, noClick = 0, arc = 0;
    function homeC() { return { x: VW() - CFG.right - BW / 2, y: VH() - CFG.bottom - BH / 2 }; }
    function atHome() { return !tgt.x && !tgt.y && Math.abs(pos.x) < 4 && Math.abs(pos.y) < 4; }
    function clampC(cx, cy) { return { x: Math.max(BW / 2 + 8, Math.min(VW() - BW / 2 - 8, cx)), y: Math.max(BH / 2 + 8, Math.min(VH() - BH / 2 - 8, cy)) }; }
    function render() {
      walker.style.transform = 'translate3d(' + pos.x.toFixed(1) + 'px,' + (pos.y + arc).toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
      var hc = homeC();
      walker.classList.toggle('left', hc.x + pos.x < VW() / 2);
      walker.classList.toggle('below', hc.y + pos.y + arc < 180);
    }
    function frame(t) {
      if (!running) return;
      var dt = Math.min((t - (last || t)) / 1000, .5); last = t;
      if (drag && drag.on) { running = false; return; }
      var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (var i = 0; i < n; i++) { pos.vx += (-14 * (pos.x - tgt.x) - 7.2 * pos.vx) * h; pos.vy += (-14 * (pos.y - tgt.y) - 7.2 * pos.vy) * h; pos.x += pos.vx * h; pos.y += pos.vy * h; }
      var sp = Math.hypot(pos.vx, pos.vy), dist = Math.hypot(pos.x - tgt.x, pos.y - tgt.y); walker._travel = (walker._travel || 0) + sp * dt;
      // 점프: 남은 거리 비율로 포물선 높이를 준다
      if (jump) { var p = Math.max(jump.p, Math.min(1, 1 - dist / jump.d)); jump.p = p; arc = -Math.sin(p * Math.PI) * jump.h; if (p > .98) { jump = null; arc = 0; } } else arc *= .8;
      rotT = petEl ? Math.max(-10, Math.min(10, pos.vx * .012)) : (walker._peek != null ? walker._peek : Math.max(-16, Math.min(16, pos.vx * .045)));
      rot += (rotT - rot) * .15;
      if (petEl) petState = jump ? 'jumping' : sp > 40 ? (pos.vx >= 0 ? 'running-right' : 'running-left') : (panel.hidden ? 'idle' : 'waiting');
      walker.classList.toggle('moving', sp > 60);
      render(); look();
      if (sp < 2 && dist < 1 && Math.abs(arc) < .5) {
        running = false; walker.classList.remove('moving'); pos.x = tgt.x; pos.y = tgt.y; pos.vx = pos.vy = 0; arc = 0; rot = 0; render();
        if (petEl) { petState = panel.hidden ? 'idle' : 'waiting'; if (walker._travel > 120) act('jumping', 600, true); walker._travel = 0; }
        if (land) { var f = land; land = null; f(); }
        if (pendingOpen && !tgt.x && !tgt.y) { pendingOpen = false; open(true); }
        return;
      }
      requestAnimationFrame(frame);
    }
    var land = null;
    function run() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
    function moveTo(cx, cy, peek, hop) {
      var hc = homeC(); tgt.x = cx - hc.x; tgt.y = cy - hc.y; walker._peek = peek == null ? null : peek;
      var d = Math.hypot(pos.x - tgt.x, pos.y - tgt.y);
      jump = (hop && d > 40 && !reduce) ? { d: d, p: 0, h: Math.min(110, 40 + d * .18) } : null;
      gaze = { x: cx + (cx < VW() / 2 ? 300 : -300), y: cy - 80 }; run();
    }
    function goHome(hop) { perch = null; var hc = homeC(); moveTo(hc.x, hc.y, null, hop); }
    function say(text, ms) { act('waving', 1600); tip.textContent = text; tip.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(function () { tip.classList.remove('on'); }, ms || 3200); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function tipList() { return (KB.tips && KB.tips.length) ? KB.tips : ['궁금한 건 저한테 물어보세요']; }

    // 올라앉을 요소 찾기: 화면 안에 보이는 제목·이미지·카드·버튼 윗변
    var PERCH_SEL = 'h1,h2,h3,img,picture,video,button,[role="button"],.card,[class*="card"],[class*="Card"],article,figure,blockquote,pre,table';
    function findPerch() {
      var H = VH(), W = VW(), list = [];
      var els = document.querySelectorAll(PERCH_SEL);
      for (var i = 0; i < els.length && list.length < 40; i++) {
        var el = els[i]; if (el.closest && el.closest('[aria-hidden="true"],nav,header,footer,[role="dialog"]')) continue;
        var r = el.getBoundingClientRect();
        if (r.width < Math.max(120, BW + 30) || r.height < 24) continue;
        if (r.top < BH + 70 || r.top > H - 110 || r.left < 0 || r.right > W) continue;
        var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < .2 || cs.position === 'fixed') continue;
        list.push({ el: el, r: r });
      }
      if (!list.length) return null;
      var c = pick(list), r = c.r, span = Math.max(0, r.width - BW - 20);
      return { el: c.el, ox: 10 + BW / 2 + Math.random() * span, dy: 4 };
    }
    function perchC(p) { var r = p.el.getBoundingClientRect(); return { x: r.left + p.ox, y: r.top - BH / 2 + p.dy, r: r }; }
    function goPerch() {
      var p = findPerch(); if (!p) return false;
      var c = perchC(p); perch = p; moveTo(c.x, c.y, null, true);
      land = function () { if (perch === p) say(pick(tipList()), 3400); };
      return true;
    }

    function wander() {
      var m = mode();
      if (m === 'off' || !panel.hidden || hovering || drag || pendingOpen || document.hidden) { schedule(6000); return; }
      var W = VW(), H = VH(), r = Math.random(), hc = homeC();
      if (m === 'compact') {                      // 모바일: 아래쪽 가장자리만 오가며 내용을 가리지 않는다
        if (r < .65) {
          moveTo(BW / 2 + 16 + Math.random() * Math.max(0, W - BW - 32), hc.y, null, Math.random() < .35);
          land = function () { say(pick(tipList()), 3000); };
          setTimeout(function () { if (!hovering && !drag && panel.hidden) goHome(Math.random() < .5); }, 5600);
        } else act(pick(['waving', 'jumping', 'review']), 1400, true);
        schedule(15000 + Math.random() * 9000); return;
      }
      if (r < .2) { var left = Math.random() < .5, y = 200 + Math.random() * (H - 320); perch = null; moveTo(left ? 18 : W - 18, y, left ? 28 : -28); setTimeout(function () { say('여기 있어요! ' + pick(tipList()), 3000); }, 900); }
      else if (r < .55 && CFG.perch && goPerch()) { /* 요소 위에 올라앉기 */ }
      else if (r < .88) { perch = null; moveTo(90 + Math.random() * (W - 180), 170 + Math.random() * (H - 270), null, Math.random() < .3); setTimeout(function () { say(pick(tipList()), 3200); }, 1100); }
      else goHome(true);
      setTimeout(function () { if (!hovering && !drag && panel.hidden && !perch && Math.random() < .5) goHome(); }, 5200);
      schedule(9000 + Math.random() * 7000);
    }
    function schedule(ms) { clearTimeout(timer); timer = setTimeout(wander, ms); }
    roamSw.addEventListener('click', function () { roamOn = !roamOn; store('roam', roamOn ? 'on' : 'off'); syncSw(); if (!roamOn) goHome(); else schedule(4000); });
    walker.addEventListener('mouseenter', function () { if (drag) return; hovering = true; if (!perch) { tgt.x = pos.x; tgt.y = pos.y; jump = null; } walker._peek = null; act('waving', 1200); });
    walker.addEventListener('mouseleave', function () { hovering = false; });
    document.addEventListener('visibilitychange', function () { if (document.hidden) goHome(); });
    addEventListener('resize', function () { if (!tgt.x && !tgt.y) { pos.x = pos.y = 0; arc = 0; walker.style.transform = ''; } else if (!drag) goHome(); });

    // 스크롤 반응: 올라앉은 요소를 따라 함께 움직이고, 빠르게 내리면 달리고, 끝까지 내리면 한마디
    var sy = scrollY, st0 = 0, endSaid = false, sraf = 0;
    addEventListener('scroll', function () {
      if (sraf) return;
      sraf = requestAnimationFrame(function () {
        sraf = 0;
        var now = performance.now(), v = (scrollY - sy) / Math.max(16, now - st0) * 1000; sy = scrollY; st0 = now;
        if (perch && !drag) {
          var c = perchC(perch);
          if (!perch.el.isConnected || c.r.top < BH + 40 || c.r.top > VH() - 60) { perch = null; land = null; act('jumping', 700, true); goHome(true); }
          else { var hc = homeC(), nx = c.x - hc.x, ny = c.y - hc.y; pos.x += nx - tgt.x; pos.y += ny - tgt.y; tgt.x = nx; tgt.y = ny; render(); }
        } else if (petEl && atHome() && panel.hidden && Math.abs(v) > 2200 && !reduce) act('running', 500);
        if (!endSaid && panel.hidden && canRoam() && innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && scrollY > innerHeight) {
          endSaid = true; if (atHome()) act('jumping', 700, true); setTimeout(function () { say(KB.endTip || '끝까지 보셨네요! 궁금한 건 저를 눌러 물어보세요', 3600); }, 400);
        }
      });
    }, { passive: true });

    // 끌어서 던지기 (마우스·터치 공통)
    if (CFG.drag) {
      btn.classList.add('dg');
      btn.addEventListener('pointerdown', function (e) {
        if (e.button || !panel.hidden) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, on: false, h: [] };
      });
      addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.on) {
          if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
          drag.on = true; perch = null; jump = null; land = null; arc = 0; clearTimeout(timer); tip.classList.remove('on');
          walker.classList.add('drag'); act('jumping', 600000);
          try { btn.setPointerCapture(e.pointerId); } catch (x) {}
        }
        var hc = homeC(), c = clampC(e.clientX, e.clientY), px = pos.x;
        pos.x = tgt.x = c.x - hc.x; pos.y = tgt.y = c.y - hc.y; pos.vx = pos.vy = 0;
        rot += (Math.max(-22, Math.min(22, (pos.x - px) * 1.4)) - rot) * .35;
        drag.h.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (drag.h.length > 6) drag.h.shift();
        render(); e.preventDefault();
      }, { passive: false });
      var drop = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag; drag = null; if (!d.on) return;
        walker.classList.remove('drag'); petOver = null; noClick = Date.now() + 400;
        var a = d.h[0], b = d.h[d.h.length - 1], dt = a && b ? Math.max(16, b.t - a.t) / 1000 : 1;
        var vx = a ? (b.x - a.x) / dt : 0, vy = a ? (b.y - a.y) / dt : 0, sp = Math.hypot(vx, vy);
        if (sp > 2500) { vx *= 2500 / sp; vy *= 2500 / sp; }
        var hc = homeC(), cur = { x: hc.x + pos.x, y: hc.y + pos.y }, L = clampC(cur.x + vx * .22, cur.y + vy * .22);
        if (!reduce) { pos.vx = vx; pos.vy = vy; }
        tgt.x = L.x - hc.x; tgt.y = L.y - hc.y; walker._peek = null;
        land = function () {
          act('jumping', 600, true);
          setTimeout(function () { say(pick(KB.dropTips || ['휴, 재밌었어요!', '어지러워요~', '또 던져 주세요!', '여기도 좋네요']), 2600); }, 300);
          if (mode() !== 'full') setTimeout(function () { if (!drag && panel.hidden) goHome(true); }, 4200);
        };
        run(); schedule(mode() === 'full' ? 9000 : 15000);
      };
      addEventListener('pointerup', drop); addEventListener('pointercancel', drop);
      btn.addEventListener('click', function (e) { if (Date.now() < noClick) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    }

    // 호스트 사이트용 API: 특정 순간에 말풍선·동작을 일으킬 때 (예: 폼 제출 성공 → motionbot.act('jumping'))
    window.motionbot = window.aiclabMbot = {
      say: function (t, ms) { say(String(t), ms); },
      act: function (name, ms) { act(String(name), ms || 1500, true); },
      perch: function (el) {
        if (!el) return goPerch();
        var r = el.getBoundingClientRect(); if (r.top < BH + 20 || r.top > VH()) return false;
        perch = { el: el, ox: Math.max(BW / 2, Math.min(r.width - BW / 2, r.width / 2)), dy: 4 }; var c = perchC(perch); moveTo(c.x, c.y, null, true); return true;
      },
      home: function () { goHome(true); },
      open: function () { open(true); },
    };

    // 집에서 쉬는 동안 잔동작
    if (petEl && !reduce) setInterval(function () {
      if (document.hidden || !panel.hidden || drag || running || !atHome() || !roamOn || Math.random() < .4) return;
      act(pick(['waving', 'review', 'jumping', 'idle']), 1400, true);
    }, 11000);

    // ── 지식 · 검색 ──
    var KB = { greeting: '', quick: [], tips: [], faq: [], items: [] };
    function tokens(q) {
      var stop = ['알려줘', '알려', '찾아줘', '보여줘', '뭐야', '뭐', '어디', '누구', '좀', '해줘', '있어', '있나요', '궁금해요', '궁금해', '대해', '관련'];
      return q.toLowerCase().replace(/[?!.,~·]/g, ' ').split(/\s+/).map(function (w) { return w.replace(/(을|를|이|가|은|는|으로|로|의|에|에서|도|만|님|요)$/, ''); })
        .filter(function (w) { return w && w.length > 0 && stop.indexOf(w) < 0; });
    }
    function search(q) {
      var tk = tokens(q);
      return KB.items.map(function (d) {
        var name = (d.title || '').toLowerCase(), hay = (d.title + ' ' + (d.desc || '') + ' ' + (d.tags || '') + ' ' + (d.kind || '')).toLowerCase(), s = 0;
        tk.forEach(function (w) { if (name.indexOf(w) > -1) s += 5; else if (hay.indexOf(w) > -1) s += 1; });
        return s > 0 ? { d: d, s: s } : null;
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 5).map(function (x) { return x.d; });
    }
    function addMsg(html, who) { var m = document.createElement('div'); m.className = 'msg ' + (who || 'bot'); m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function go(url) {
      if (!url) return;
      var u; try { u = new URL(url, location.href); } catch (e) { return; }
      if (u.origin === location.origin && u.pathname === location.pathname && u.hash) {
        var t = document.getElementById(decodeURIComponent(u.hash.slice(1)));
        if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', u.hash); return; }
      }
      if (u.origin === location.origin) location.href = u.href; else window.open(u.href, '_blank', 'noopener');
    }
    function results(list) {
      var box = document.createElement('div'); box.className = 'res';
      list.forEach(function (d) {
        var row = document.createElement('div'); row.className = 'ri';
        row.innerHTML = '<span class="sw" aria-hidden="true">' + esc((d.badge || d.title || '·').slice(0, 1)) + '</span><span class="rt"><strong>' + esc(d.title) + '</strong><small>' + esc((d.kind ? d.kind + ' · ' : '') + (d.desc || '')) + '</small></span>';
        if (d.url) { var b = document.createElement('button'); b.type = 'button'; b.textContent = /^https?:/.test(d.url) && d.url.indexOf(location.origin) !== 0 ? '열기 ↗' : '열기'; b.onclick = function () { go(d.url); }; row.appendChild(b); }
        box.appendChild(row);
      });
      return box;
    }
    function answer(q) {
      addMsg(esc(q), 'me');
      var low = q.toLowerCase();
      var hit = null, best = 0;
      KB.faq.forEach(function (f) { (f.q || []).forEach(function (k) { k = String(k).toLowerCase(); if (low.indexOf(k) > -1 && k.length > best) { best = k.length; hit = f; } }); });
      var list = search(q);
      if (hit) {
        act('review', 1800);
        var m = addMsg(hit.a);
        if (hit.url) { var r = results([{ title: hit.title || '바로가기', desc: hit.linkDesc || '', url: hit.url }]); m.appendChild(r); }
        if (list.length && hit.showItems !== false) m.appendChild(results(list.slice(0, 3)));
        log.scrollTop = log.scrollHeight; return;
      }
      if (!list.length) { act('failed', 2200, true); addMsg(KB.fallback || '딱 맞는 내용을 찾지 못했어요. 짧은 단어로 다시 물어봐 주세요.'); return; }
      act('review', 1800); addMsg(list.length + '개를 찾았어요. <b>열기</b>를 누르면 해당 위치로 이동합니다.').appendChild(results(list));
      log.scrollTop = log.scrollHeight;
    }

    var greeted = false;
    function open(v) {
      panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (petEl) { petState = v ? 'waiting' : 'idle'; if (v) act('waving', 1200); } tip.classList.remove('on');
      if (v) {
        if (!greeted) { greeted = true; addMsg(KB.greeting || ('안녕하세요! <b>' + esc(CFG.name) + '</b>이에요. 궁금한 것을 물어보세요.')); }
        goHome(); setTimeout(function () { input.focus(); }, 60);
      } else btn.focus();
    }
    btn.addEventListener('click', function () {
      var home = Math.abs(pos.x) < 4 && Math.abs(pos.y) < 4 && !tgt.x && !tgt.y;
      if (!home && panel.hidden) { tip.classList.remove('on'); pendingOpen = true; goHome(); return; }
      open(panel.hidden);
    });
    $('.x').addEventListener('click', function () { open(false); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) open(false); });
    form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; answer(v); });

    function applyKB(kb) {
      KB = Object.assign(KB, kb || {});
      quick.innerHTML = '';
      (KB.quick || []).forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = function () { answer(q); }; quick.appendChild(b); });
      if (KB.placeholder) input.placeholder = KB.placeholder;
    }
    applyKB(window.AICLAB_MBOT_KB);
    if (CFG.kb && !window.AICLAB_MBOT_KB) {
      var s = document.createElement('script'); s.src = CFG.kb; s.async = true;
      s.onload = function () { applyKB(window.AICLAB_MBOT_KB); };
      document.head.appendChild(s);
    }

    // 첫 등장
    if (mode() === 'compact') {
      setTimeout(function () {
        if (!panel.hidden || drag || !atHome() || perch) { schedule(16000); return; }   // 이미 API·끌기로 움직였으면 인사 생략
        var hc = homeC(); moveTo(Math.max(BW / 2 + 16, hc.x - Math.min(160, VW() * .4)), hc.y, null, true);
        land = function () { say(KB.hello || ('안녕하세요! 저를 누르면 안내해 드려요'), 3600); };
        setTimeout(function () { if (!hovering && !drag && !perch && panel.hidden) goHome(); }, 5200);
        schedule(16000);
      }, 3000);
    } else if (canRoam()) {
      setTimeout(function () {
        if (!panel.hidden || drag || !atHome() || perch) { schedule(14000); return; }
        moveTo(VW() * .62, VH() * .58, null, true);
        setTimeout(function () { say(KB.hello || ('안녕하세요! 저를 누르면 안내해 드려요'), 3600); }, 900);
        setTimeout(function () { if (!hovering && !drag && !perch && panel.hidden) goHome(); }, 5200);
        schedule(14000);
      }, 3000);
    } else {
      setTimeout(function () { if (panel.hidden) { say(KB.hello || '궁금한 게 있으면 눌러 보세요', 4500); } }, 3500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
