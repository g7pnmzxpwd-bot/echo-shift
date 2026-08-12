# OpenAI Game Builders Seoul 2026 — Submission Package

Verified on 2026-08-12 against the official event page: https://openaigame2026.com/

## Copy into the form

### Game title

ECHO//SHIFT

### Game description (95/200 Korean characters)

과거의 움직임을 에코로 기록해 현재의 나와 협력하는 36라운드 타임루프 퍼즐입니다. 에코들의 경로와 도착 시간을 설계해 플레이트를 유지하고 연쇄 게이트를 열어 탈출하세요.

### Playable game URL

https://g7pnmzxpwd-bot.github.io/echo-shift/

### Demo video URL

https://g7pnmzxpwd-bot.github.io/echo-shift/echo-shift-game-builders-2026.mp4

- Runtime: 92.2 seconds (under the 3-minute limit)
- Actual play from the public build: rounds 1, 7, and 36
- Format: H.264/yuv420p video + AAC audio, 1440×900

### Thumbnail

`submission/echo-shift-thumbnail.jpg`

- 1920×1080 JPEG
- 16:9
- Uses an actual Round 36 gameplay frame

### Codex process

ECHO//SHIFT의 핵심 창작 방향과 최종 판단은 개발자가 담당했습니다. “실패한 과거의 움직임이 다음 시도의 동료가 된다”는 게임 콘셉트, 현재 플레이어는 orange/에코는 cyan으로 구분하는 시각 언어, 6개 챕터와 36개 라운드의 난이도 방향, 후반부를 단순 반복이 아닌 단계식 게이트·도착 시간 동기화 퍼즐로 만드는 결정은 사람이 내렸습니다.

Codex는 이 방향을 실제 브라우저 게임으로 구현하는 과정에서 협업했습니다. Phaser·TypeScript 기반의 20Hz 고정 timestep 기록/재생 시스템을 테스트 우선으로 구현하고, 하나의 generic GameScene이 데이터 기반 LevelDefinition 36개를 읽도록 리팩터링했습니다. 다중 플레이트·게이트·에코, 순차 해금과 localStorage 저장, 키보드·터치 입력, QA 전용 deep link, 절차적 Web Audio 효과음을 구현했습니다.

또한 Codex를 디버깅과 검증에 활용했습니다. 저장 데이터 조작으로 잠긴 라운드에 접근하던 문제를 발견해 연속 완료 prefix만 인정하도록 수정했고, 후반 난이도가 오히려 낮아진다는 플레이 피드백을 분석해 dependency depth가 증가하도록 Round 13–36을 재설계했습니다. 정적 reachability validator만으로 해결 가능성을 과장하지 않고, Playwright에서 실제 키 입력으로 2·3·4 에코 대표 라운드를 완주하는 브라우저 해법도 작성했습니다.

최종적으로 unit test 21개, production build, 대표 7개 라운드 로딩, Round 1 전체 완주, Round 7/19/36 실제 해법, Chromium 및 WebKit 모바일 터치 완주를 검증했습니다. 공개 GitHub Pages URL에서도 같은 검사를 다시 실행했고 console/page 오류가 없음을 확인했습니다. 사람의 창작 결정과 Codex 보조 구현·테스트 기록은 저장소의 docs/CODEX_LOG.md에 분리해 보존했습니다.

## Required participant fields — user must complete

- Google account login and award-contact email
- Country of residence
- Event terms and privacy consent
- Birth date
- Applicant name
- Team name (suggested: StackFlow Studio)
- Affiliation, if any
- Ability to attend the Seoul final on 2026-08-31
- Emergency phone number and event-update consent

Do not submit until those personal details and legal consents have been reviewed by the participant.

## Official requirements verified

- Entry period: 2026-08-04 through 2026-08-26
- Browser-playable public web build: required
- Access without approval or installation: required
- Demo video up to 3 minutes: optional bonus
- Codex collaboration description: optional bonus
- Judging: Playability, Originality, Codex Collaboration, Release Potential, Presentation

## QA evidence

- GitHub Pages status: built; HTTPS enabled
- Public URL response: HTTP 200
- Unit tests: 21/21
- Production build: passed
- Representative rounds loaded: 1, 7, 13, 19, 25, 31, 36
- Authored browser solutions passed: rounds 7, 19, 36
- Round 1 keyboard flow and restart: passed
- Chromium 390×844 touch completion: passed
- WebKit 26.5 390×844 touch completion: passed
- Browser console/page errors in smoke suites: 0
- Physical iPhone Safari: not run because the paired device was offline during final QA

## Source

https://github.com/g7pnmzxpwd-bot/echo-shift
