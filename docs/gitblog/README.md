# GitBlog 운영 지침

Hosting: [GitHub Pages / Cloudflare Pages](deployment.md).

처음에는 [AGENTS.md](../../AGENTS.md)를 읽고 `npm run author:context`를 실행합니다. 반환된 경로와 실제 설정을 따르세요. 루트 README는 사용자 소개 문서입니다.

| 작업 | 문서 |
| --- | --- |
| 에이전트 시작 | [공식 작업 흐름](agent-workflow.md), [개인 지침](../../.gitblog/user-instructions.md) |
| Vanilla 구현·개발 | [이식 규약](template-porting.md) |
| 최초 개설·도메인 변경 | [설정](setup.md) |
| GitHub 인증 | [인증](github-auth.md), [App 연결](github-app.md) |
| 글 작성·번역·발행 | [하네스 사용법](authoring.md), [LLM 글쓰기 지침](llm-writing-guidelines.md) |
| 분류·태그 번역 | [Taxonomy](taxonomy.md) |
| 크롤러 정책 | [AI discovery](ai-discovery.md) |
| 음성 생성·재생 | [TTS](tts.md) |
| 빌드 이미지 최적화 | [이미지 최적화](images.md) |
| 최신 Svelte 기능 반영 내역 | [기능 동기화](template-parity.md) |
| 설정·기능 | [참조](reference.md) |
| 커스터마이징·업데이트 | [보존 규칙](customization.md) |
| 로컬 검증 결과 | [검증 기록](verification.md) |

개인 지침은 없어도 됩니다. 업데이트에서 파일의 부재도 보존합니다. 영문 운영 지침은 공통 규격을 따르며, Vanilla의 설정 fallback과 provider 기본값은 [Vanilla 구현 안내](template-porting.md)를 확인하세요. [플랫폼 연동 경계](platform-integration.md)는 별도로 적용됩니다.

## Template distribution

[Getting started](getting-started.md) contains template setup and feature information. The root README belongs to the blog owner and may be replaced or removed. GitBlog preserves it during updates; operational instructions do not depend on it.

Development tests and fixture commands documented here run in the [development repository](https://github.com/gitblogapp/vanilla-gitblog-template-dev). User blogs contain `check` and `update:check`, but do not include development tests or publishing tools.

Answer-first writing and evidence: [Optional answer, sources, reference date and FAQ](answer-engine-content.md).
