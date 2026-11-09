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
