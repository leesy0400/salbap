# 살림밥상 (v44 기반, Vercel 배포용)

원본 `salimbapsang_v44.html`을 그대로 쓰고, **API 키만 서버로 옮긴** 버전입니다. 화면과 기능은 v44와 같습니다.

## 바뀐 것
- `index.html`: 하드코딩돼 있던 Claude API 키 삭제. AI 호출은 `/api/llm`(서버 함수)로 보냅니다.
  Claude 앱 미리보기처럼 서버 함수가 없는 곳에서는 예전처럼 키 없는 미리보기 방식으로 시도합니다.
  Firebase를 설정하면 '로그인 없이 시작하기' 버튼은 숨겨집니다 (AI·서버 저장은 로그인 필요).
- `api/llm.js`: Firebase 로그인 토큰을 확인한 뒤 서버가 키를 붙여 Claude를 부릅니다.
  허용 모델(haiku-5-5, sonnet-5-5), 최대 토큰 4000, 입력 길이, 사용자당 시간당 횟수를 제한합니다.
- `firestore.rules`: 본인 문서(users/{uid})만 읽고 쓰는 보안 규칙.

## 어떤 값이 어디에

| 값 | 위치 | 공개돼도 되나 |
|---|---|---|
| Claude API 키 | Vercel 환경변수 `ANTHROPIC_API_KEY` | 안 됨 |
| Firebase 웹 설정(apiKey AIza…, projectId 등) | `index.html`의 `FIREBASE_CONFIG` | 됨 (원래 공개용. 보호는 firestore.rules가 담당) |
| 사용자 비밀번호 | Firebase Auth | 우리 코드·DB에 없음 |

## 배포 순서
1. **기존 Claude 키 폐기**: console.anthropic.com > API Keys에서 v44에 들어 있던 키를 삭제하고 새 키를 발급
2. **Firebase**: 프로젝트 생성 → Authentication에서 Google·이메일/비밀번호 사용 → Firestore 생성 →
   `firestore.rules` 내용 게시 → 웹 앱 추가 후 firebaseConfig를 `index.html`의 `FIREBASE_CONFIG`에 붙여넣기
3. **GitHub**에 이 폴더 올리기 → **Vercel**에서 import → 환경변수 `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID` 입력 → Deploy
4. Firebase > Authentication > 설정 > 승인된 도메인에 Vercel 주소(xxx.vercel.app) 추가
5. Anthropic 콘솔에서 월 사용 한도 설정

## 테스트
`npm i && npm test`

## 실사용 테스트 숫자 뽑기

앱은 사람마다 앱을 연 날짜와 AI 메뉴 조합 결과(통과·실패 횟수)를 계정 기록에 남겨요. 테스트가 끝나면 아래 스크립트로 **모든 계정을 합친 숫자만** 뽑아요. 사람별 숫자, 이메일, UID는 출력하지 않아요.

1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → **새 비공개 키 생성**. 받은 파일을 `scripts/service-account.json`으로 저장해요. 이 파일은 `.gitignore`에 들어 있어 깃허브에 올라가지 않아요. 절대 공유하지 마세요.
2. `npm install`
3. `node scripts/test-report.mjs --since 2026-11-11 --until 2026-11-18 --exclude 팀원1@gmail.com,팀원2@gmail.com`
   - `--since`: 테스트 시작일(포함), `--until`: 끝나는 날(선택)
   - `--exclude`: 집계에서 뺄 팀원·시험용 계정 이메일

결과는 화면에 나오고 `scripts/test-report-<날짜>.json`에도 저장돼요. 재방문률(다른 날 다시 연 사람 비율), 산 재료 중 다 쓴 비율, 예산 지킨 주 비율, 해먹은 메뉴 수, AI 조합 첫 요청 통과율과 실패 종류가 들어 있어요.
