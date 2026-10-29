# 사용자 파일 보존과 Vanilla 업데이트

[update-policy.json](../../.gitblog/update-policy.json)의 `preserve`는 콘텐츠·static·테마·확장·README·개인 지침·authoring/setup·공개 설정·CMS 설정을 보호합니다. `mergeOnly`는 HTML 페이지, 코어 JavaScript, scripts/tests, package/lockfile, 브라우저 진입점, workflows, AGENTS와 정책 파일을 병합 대상으로 둡니다.

개인 문체는 `.gitblog/user-instructions.md`, 공식 운영 절차는 `docs/gitblog/`에 둡니다. 개인 파일의 부재도 보존합니다. 확장 슬롯은 `src/extensions/slots.js`의 `article-before-body`, `article-after-body`, `site-footer`입니다. API version 1은 Vanilla 구현의 계약이며 Svelte 컴포넌트 호환을 의미하지 않습니다.

`update:check`는 check → build → test:seo 전후 보호 파일을 해시로 비교합니다. 업데이트 패치 적용이나 자동 롤백은 하지 않습니다. 코어 변경은 사용자의 theme/custom page와 함께 통합 테스트하고, 사용자 파일을 통째로 교체하지 않습니다.
