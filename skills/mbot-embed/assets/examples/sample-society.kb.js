/*!
 * 안내봇 지식 파일 예시 — 가상의 "생성형 AI 교육 연구회" (https://example.org)
 * 배포용 가상 예시. 사람·연락처는 모두 지어낸 값이다. 실제 kb 는 대상 사이트에 적힌 내용만 쓴다.
 * © AICLab 김진수 — mbot widget
 */
(function () {
  var S = 'https://example.org';
  // 같은 모양의 항목(임원·강사·제품 등)이 많으면 만드는 함수를 둔다
  var P = function (name, role, desc, tags) {
    return { kind: '임원진 · ' + role, title: name, badge: name, desc: desc, url: S + '/#people', tags: role + ' ' + (tags || '') };
  };
  window.AICLAB_MBOT_KB = {
    hello: '안녕하세요! 연구회 안내봇이에요. 소개·임원진·세미나를 안내해 드려요',
    greeting: '안녕하세요! <b>연구회 안내봇</b>이에요. <b>생성형 AI 교육 연구회</b>의 소개, 임원진, 세미나, 자료실, 문의 방법을 안내해 드릴게요.',
    placeholder: '예: 세미나 일정, 홍길동 회장, 문의 방법',
    quick: ['연구회 소개', '회장 인사말', '임원진', '세미나 일정', '자료실', '문의 방법'],
    tips: [
      '임원진 프로필은 이름으로 검색할 수 있어요',
      '다음 달 정기 세미나 소식이 있어요',
      '자료실에서 활용 자료를 볼 수 있어요',
      '궁금한 건 저한테 물어보세요',
      '저를 끌어서 던져 보세요',
    ],
    endTip: '끝까지 보셨네요! 가입·문의는 저한테 물어보세요',
    dropTips: ['휴, 재밌었어요!', '여기서도 안내해 드릴게요', '또 던져 주세요!'],
    fallback: '딱 맞는 내용을 찾지 못했어요. "세미나", "자료실", "문의", 임원 이름처럼 짧게 물어봐 주세요.',
    faq: [
      // 넓은 키워드와 좁은 키워드를 함께 두면 더 긴 키워드가 맞은 쪽이 이긴다
      { q: ['연구회 소개', '어떤 연구회', '뭐하는', '소개해'], a: '<b>생성형 AI 교육 연구회</b>는 교육 현장의 AI 활용 사례를 연구하고 나누는 모임입니다.', title: '연구회 소개 보기', url: S + '/#about', showItems: false },
      { q: ['회장', '인사말', '회장님'], a: '연구회 회장은 <b>홍길동</b> 회장입니다.', title: '회장 인사말', url: S + '/#greeting', showItems: false },
      { q: ['임원', '이사진', '이사'], a: '회장·부회장·이사진을 소개하는 임원진 섹션이 있어요. 이름으로 물어보면 프로필을 찾아 드려요.', title: '임원진 전체 보기', url: S + '/#people' },
      { q: ['임원 가입', '가입', '회원'], a: '가입은 임원 전용 페이지에서 신청합니다. 승인 후 이용할 수 있어요.', title: '가입·로그인', url: S + '/member', showItems: false },
      { q: ['세미나', '일정', '행사'], a: '정기 세미나 일정은 공지사항에서 확인 후 안내합니다.', title: '공지사항', url: S + '/board?category=notice' },
      { q: ['문의', '상담', '연락', '이메일', '제휴'], a: '상담·협업 문의는 페이지 맨 아래 문의 양식이나 <b>contact@example.org</b>로 해 주세요.', title: '문의하기', url: S + '/#contact', showItems: false },
    ],
    items: [
      { kind: '연구회', title: '연구회 소개', desc: '교육 현장의 AI 활용 연구', url: S + '/#about', tags: '소개 about 연구 교육' },
      { kind: '게시판', title: '공지사항', desc: '운영 안내와 세미나 일정', url: S + '/board?category=notice', tags: '공지 안내 세미나 일정' },
      { kind: '게시판', title: '자료실', desc: 'AI 활용 자료', url: S + '/board?category=resources', tags: '자료 자료실 다운로드' },
      { kind: '안내', title: '상담·문의', desc: 'contact@example.org', url: S + '/#contact', tags: '문의 상담 협업 제휴 연락 이메일' },
      P('홍길동', '회장', 'OO대학교 교육대학원 겸임교수', '교수 저자'),
      P('김하늘', '부회장', 'AI 교육 콘텐츠 연구소 소장', 'AI 교육 콘텐츠'),
      P('이바다', '이사', '디지털 리터러시 강사', '리터러시 윤리'),
    ],
  };
})();
