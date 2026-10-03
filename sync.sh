#!/usr/bin/env bash
# 스킬 원본(C:\project\skills\dev-workflow\motionbot)을 플러그인 skills/ 로 복사한다.
# 원본이 단일 기준(SSOT)이다. 플러그인 쪽 skills/motionbot 를 직접 고치지 말 것.
set -euo pipefail
cd "$(dirname "$0")"
SRC="${MBOT_SRC:-/c/project/skills/dev-workflow/motionbot}"
[ -f "$SRC/SKILL.md" ] || { echo "원본 스킬을 찾을 수 없음: $SRC"; exit 1; }
rm -rf skills/motionbot
mkdir -p skills
cp -r "$SRC" skills/motionbot
find skills -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
# 실사이트 예시(실명·연락처 포함)는 배포본에서 뺀다
rm -f skills/motionbot/assets/examples/astra.kb.js
if grep -rqE '01[016789]-?[0-9]{3,4}-?[0-9]{4}' skills; then
  echo "경고: 전화번호 형태가 남아 있음 — 커밋 전에 확인하세요"; grep -rnE '01[016789]-?[0-9]{3,4}-?[0-9]{4}' skills; exit 1
fi
VER=$(grep -o '"version": *"[^"]*"' .claude-plugin/plugin.json | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
echo "동기화 완료: $SRC → skills/motionbot (플러그인 v$VER)"
