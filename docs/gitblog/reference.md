# Vanilla 설정 참조

운영 시작점은 [AGENTS.md](../../AGENTS.md), 실제 값은 `author:context`입니다. 구현 상세는 [Vanilla 규격 구현](template-porting.md)에 있습니다.

| 설정                                                                                                                          | 의미                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`                                                                                                             | HTTPS 공개 URL. project base 포함                                              |
| `PUBLIC_SITE_REPOSITORY`                                                                                                      | owner/repo. CI의 GITHUB_REPOSITORY 우선, 구형 PUBLIC_HUB_REPOSITORY는 fallback |
| `PUBLIC_SITE_OWNER`                                                                                                           | 작성자. 구형 PUBLIC_SITE_AUTHOR·site.json author fallback                      |
| `PUBLIC_SITE_TITLE`, `PUBLIC_SITE_TAGLINE`, `PUBLIC_SITE_DESCRIPTION`, `PUBLIC_SITE_FOOTER`                                   | site.json의 대응 값 fallback                                                   |
| `PUBLIC_SOURCE_LOCALE`, `PUBLIC_TRANSLATION_LOCALES`                                                                          | 원문/번역 언어. 합계 최대 8개                                                  |
| `PUBLIC_RELEASE_LOCALE`, `PUBLIC_RELEASE_USE_TRANSLATIONS`                                                                    | CI Release 언어·번역 사용                                                      |
| `PUBLIC_GISCUS_ENABLED`, `PUBLIC_GISCUS_REPO`, `PUBLIC_GISCUS_REPO_ID`, `PUBLIC_GISCUS_CATEGORY`, `PUBLIC_GISCUS_CATEGORY_ID` | 댓글 표시·연결                                                                 |
| `PUBLIC_GISCUS_PROVIDER`, `PUBLIC_GISCUS_HOST`                                                                                | 기본은 기존 Vanilla의 gitblog/https://gitblog.app                                  |
| `PUBLIC_HUB_ENABLED`, `PUBLIC_HUB_URL`                                                                                        | 서비스 참여·등록 대상. 별도 승인 필요                                          |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`, `PUBLIC_BING_SITE_VERIFICATION`                                                            | 검색 사이트 검증 meta                                                          |
| `PUBLIC_AI_*`, `PUBLIC_GOOGLE_SEARCH_ENABLED`                                                                                 | [크롤러·공개 Markdown 정책](ai-discovery.md)                                   |

원문/번역/CMS 경로는 [작성 가이드](authoring.md)를 따릅니다. 설정은 process env → `.env.production` → `content/site.json` → 기본값 순으로 적용합니다. 명시적인 빈 값은 fallback으로 복구하지 않습니다. 자격 증명은 공개 설정에 저장하지 않습니다.

DeepL 모드에서 `translate:content`는 사이트 소개와 글·taxonomy를 갱신할 수 있습니다. `build`는 이를 수행하지 않습니다. manual 모드는 최신 원문 해시를 확인하고 [등록 절차](authoring.md)를 사용합니다.

GitBlog 공식 등록/Studio/이력 삭제와 추천·분석 기능의 범위는 [플랫폼 연동 경계](platform-integration.md)를 확인하세요.

## 최신 공통 기능

- [TTS](tts.md): 새 템플릿은 `PUBLIC_TTS_ENABLED=true`, 기본 목소리 `F1`입니다. 글별 `tts`·`ttsVoice`가 우선하며 지원 언어의 DeepL/수동 번역도 처리합니다. 재생 버튼·탐색 막대·시간·배속 메뉴는 Vanilla 테마와 언어를 따릅니다.
- [이미지 최적화](images.md): `static/uploads`의 빌드 사본을 압축하며 원본은 보존합니다. 해시 캐시와 크기 기준으로 중복 압축을 방지합니다.
- [멤버십](memberships.md): 공개 저장소에는 허용된 미리보기만 두고 전문은 인증된 임베드에서 읽습니다. 전문 TTS나 전문 검색 색인을 생성하지 않습니다.
- `site.webmanifest`는 기존 Vanilla 아이콘·블로그 이름·base 경로로 생성합니다. 서비스 워커나 오프라인 캐시는 추가하지 않습니다.
- GitHub/Cloudflare Pages 선택과 대표 도메인 리디렉션은 공통 배포 파이프라인을 사용합니다. 공식 등록 및 Git 이력 삭제는 [서비스 연동 조건](platform-integration.md)이 충족되어야 실행됩니다.
