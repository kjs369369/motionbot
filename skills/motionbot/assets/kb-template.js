/*!
 * ○○ 안내봇 지식 파일 — <사이트 이름> (<사이트 주소>)
 * 내용 출처: <수집한 페이지 URL> (<YYYY-MM-DD> 기준). 사이트 내용이 바뀌면 갱신.
 * © AICLab 김진수 — mbot widget
 */
(function () {
  var S = 'https://example.com';
  window.AICLAB_MBOT_KB = {
    hello: '안녕하세요! ○○ 안내봇이에요. 무엇이든 안내해 드려요',
    greeting: '안녕하세요! <b>○○ 안내봇</b>이에요. <b>사이트 이름</b>의 소개, ○○, ○○를 안내해 드릴게요.',
    placeholder: '예: 소개, 일정, 문의 방법',
    quick: ['소개', '서비스', '일정', '자료', '문의 방법'],
    tips: ['궁금한 건 저한테 물어보세요', '산책이 싫으면 제 창에서 끌 수 있어요'],
    fallback: '딱 맞는 내용을 찾지 못했어요. 짧은 단어로 다시 물어봐 주세요. 자세한 문의는 <b>연락처</b>로 해 주세요.',
    faq: [
      { q: ['소개', '어떤 곳'], a: '사이트에 적힌 소개 문장', title: '소개 보기', url: S + '/#about', showItems: false },
      { q: ['문의', '연락', '상담'], a: '공개된 연락처만', title: '문의하기', url: S + '/#contact', showItems: false },
    ],
    items: [
      { kind: '페이지', title: '소개', desc: '한 줄 설명', url: S + '/#about', tags: '소개 about' },
    ],
  };
})();
