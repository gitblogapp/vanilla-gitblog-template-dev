# GitBlog 서비스 연동 경계

이 Vanilla 템플릿은 공통 manifest/RSS v1과 buildCommit을 출력합니다. 공식 서비스 등록은 템플릿 계보와 pinned reusable workflow에 대한 서버 지원을 별도로 요구합니다.

고정된 등록 실행 코드는 공식 Svelte·Astro·React·Vanilla 배포 저장소의 template/parent/source 계보를 확인합니다. 개발 저장소나 다른 계정의 동명 템플릿은 허용하지 않습니다. 공식 템플릿의 `deploy.yml`과 `sync-hub.yml`은 `PUBLIC_HUB_ENABLED=true`와 유효한 `PUBLIC_HUB_URL` 설정으로 등록 job을 실행합니다. 피드 등록에는 별도의 Actions 변수 `GITBLOG_OFFICIAL_INTEGRATION`이 필요하지 않습니다. 승인된 reusable workflow pin과 실행 코드의 템플릿 계보 검증과 서버의 OIDC 검증은 그대로 유지됩니다. 새 템플릿을 추가할 때는 서버 카탈로그와 인증 지원을 먼저 준비해야 합니다.

별도 템플릿 지원 시 서비스의 repository 판별·템플릿 업데이트 소스·등록 OIDC 허용값·worker 코드의 계보 정책을 함께 조정해야 합니다. 로컬 register-blog 스크립트만 변경해도 pinned 원격 실행 코드가 바뀌지 않습니다. 이 업데이트에서 서비스 코드는 변경하지 않았습니다.

Git history 삭제는 `post-history.yml` 호출 workflow를 통해 Svelte와 동일한 승인된 immutable worker를 재사용합니다. 사용자 코드나 로컬 history worker를 실행하지 않습니다. `GITBLOG_OFFICIAL_INTEGRATION=true`인 일반 블로그에서만 실행되고, GitBlog 서버가 발급한 operation과 정확한 삭제 계획 승인 없이는 삭제할 수 없습니다. 해당 workflow 추가 자체로 Git 이력을 변경하지 않습니다. 추천 패널·분석·멤버십·TTS 클라이언트는 공통 패키지와 Vanilla 어댑터로 구현되어 있습니다. GitBlog 등록 및 인증 서비스는 별도로 필요합니다.

댓글은 기존 giscus provider를 유지하며 GitBlog provider를 선택하면 해당 App의 저장소 접근을 확인해야 합니다. gh/PAT 인증, Discussions 활성화, App 설치, 실제 위젯 로딩은 별도 상태입니다.

배포 결과는 push → Pages 성공 → live discovery → 등록 접수 → 각 언어 수집 완료를 구분해 보고합니다. 로컬 검증만으로 원격 배포나 수집 성공을 보고하지 않습니다.


## 기존 블로그 적용

기존 블로그는 템플릿 업데이트를 적용하거나 `deploy.yml`과 `sync-hub.yml`의 등록 job에서 추가 `GITBLOG_OFFICIAL_INTEGRATION` 조건을 제거합니다. 변경을 기본 브랜치에 반영한 뒤 **Sync GitBlog feed**를 실행하면 전체 사이트를 다시 빌드하지 않고 배포된 피드의 수집을 요청할 수 있습니다. 등록 성공과 실제 게시글 수집 완료를 각각 확인하세요. 이 변경은 Git 이력 삭제 workflow의 별도 실행 조건을 바꾸지 않습니다.
