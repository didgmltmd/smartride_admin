# Smart Ride 관리자

기존 신영택시 백엔드를 사용하는 React 관리자 웹입니다. 사용자 관리, 정산 엑셀 업로드, 공지사항 및 확인 현황을 제공합니다.

## 연결 구조

```text
브라우저 → 관리자 웹 /api/* → 포함된 Node.js 프록시 → 기존 신영택시 API
```

웹과 프록시가 같은 Render Web Service에서 실행됩니다. 브라우저는 같은 출처의 상대 경로로 요청하므로 새 관리자 도메인을 기존 백엔드의 CORS 목록에 추가하지 않아도 됩니다. 프록시는 지정된 서버의 관리자 화면용 경로만 전달합니다. 로그인 토큰의 실제 검증과 관리자 권한 통제는 기존 백엔드가 담당합니다. 독립적인 대체 업무 백엔드나 데이터베이스를 새로 만든 구성은 아닙니다.

## 로컬 실행

Node.js 22.18 이상(22.x)을 사용합니다.

```sh
npm ci
npm run dev:server
```

다른 터미널에서:

```sh
npm run dev
```

http://localhost:5173 에 접속합니다. API 프록시는 기본적으로 3001번 포트에서 실행합니다. Vite는 /api 요청을 프록시로 전달합니다. 기존 API의 유효한 관리자 계정으로 로그인해야 하며 테스트 계정은 자동 생성하지 않습니다.

필요하면 .env.example을 .env로 복사합니다. API_ORIGIN에는 기존 서버의 출처만 설정하고 /api 경로를 붙이지 않습니다. VITE_API_BASE_URL은 /api로 유지하세요. .env에는 비밀값을 저장할 수 있으므로 Git에서 제외됩니다. 서버 포트를 바꾸면 vite.config.js의 프록시 대상 포트도 맞춰야 합니다.

## 검증

```sh
npm run check
npm run build
npm run test:browser
npm run validate:render
```

check는 ESLint와 Vitest 회귀 테스트를 실행합니다. 브라우저 테스트는 설치된 Microsoft Edge를 사용하고, API를 모의 응답으로 대체하므로 기존 서버의 데이터가 변경되지 않습니다. 다른 환경에서는 BROWSER_CHANNEL=chromium으로 설정하고 Playwright 브라우저를 설치하세요. validate:render는 공식 Render JSON Schema를 다운로드하므로 인터넷 연결이 필요합니다.

프로덕션 빌드 확인:

```sh
npm run build
npm start
```

http://localhost:3001 에서 확인합니다. npm preview는 정적 화면 확인용이며 API 프록시를 포함하지 않습니다.

## Render 배포

render.yaml에 무료 Node Web Service 설정을 정의했습니다. 기존 백엔드가 있는 Render 워크스페이스에 관리자 웹을 별도 서비스로 배포합니다. 기존 백엔드 서비스와 데이터베이스를 교체하지 않습니다.

1. 변경 사항을 Git 저장소에 커밋하고 push합니다.
2. Render에서 New → Blueprint로 이 저장소를 연결하고 render.yaml을 선택합니다.
3. 서비스 유형은 Static Site가 아닌 Web Service입니다.
4. 빌드 명령: npm ci --include=dev && npm run check && npm run build
5. 시작 명령: npm start
6. 환경 변수: NODE_ENV=production, NODE_VERSION=22.18.0, API_ORIGIN=https://sinyongtaxi-i7e5.onrender.com
7. VITE_API_BASE_URL은 설정하지 않거나 /api로 설정합니다. 예전 백엔드 절대 URL을 입력하지 않습니다.
8. 배포 후 /healthz의 200 응답, /login, /users 직접 접속, 실제 관리자 로그인 및 읽기 요청을 확인합니다.

서비스 이름이 이미 사용 중이면 다른 이름을 사용해도 됩니다. 프록시 방식은 예전 관리자 도메인에 의존하지 않습니다. Blueprint의 자동 배포는 off로 설정했으며 검토 후 켤 수 있습니다.

Render CLI가 연결된 환경에서는 `render blueprints validate render.yaml`로 검증할 수 있습니다. 현재 환경에는 Render CLI가 없어 공식 JSON Schema로 설정 파일을 검증합니다.

무료 인스턴스의 유휴 중단 등 제약은 [Render 무료 서비스 문서](https://render.com/docs/free)를 확인하세요. /healthz는 관리자 웹의 실행 상태만 확인하며, 기존 업무 API와 데이터베이스의 정상 여부까지 보장하지 않습니다.

## 확인된 기존 서버 규격

2026-10-16에 [Swagger](https://sinyongtaxi-i7e5.onrender.com/swagger-ui/index.html)와 /v3/api-docs의 정상 응답을 확인했습니다.

- 로그인: POST /api/auth/login
- 사용자: GET/POST /api/admin/users
- 퇴사 처리: DELETE /api/admin/users/{employeeId}
- 복구: PUT /api/admin/users/{employeeId}/restore
- 비밀번호: PUT /api/admin/users/{employeeId}/password
- 공지: GET/POST /api/admin/messages, PUT/DELETE /api/admin/messages/{id}
- 확인자: GET /api/admin/messages/{id}/reads
- 이미지 업로드: POST /api/admin/uploads/images
- 정산 엑셀: POST /api/admin/excel/settlements

기존 프런트엔드의 /api/app 기본 경로를 /api로 수정했습니다. 기존 API에는 일부 공지 경로만 /api/app 별칭이 있습니다.

CORS 사전 요청 검사 결과, https://smartride-admin.onrender.com은 허용됐고 http://localhost:5173은 거절됐습니다. 이는 검사 당시 결과이며 향후 서버 설정 변경에 따라 달라질 수 있습니다.

Render의 환경 변수에 임의로 CORS_ORIGINS 같은 값을 넣는 것만으로는 CORS가 바뀌지 않습니다. 기존 서버 코드가 해당 환경 변수를 읽도록 구현되어 있어야 합니다. 이 저장소의 프록시 방식은 기존 서버 코드나 Render 계정 접근이 없어도 관리자 웹을 연결하는 용도입니다.

## 입력·인증 동작

- 로그인 기본 자격증명을 제거하고 토큰은 탭 단위 sessionStorage에 저장합니다. 기존 localStorage 토큰은 제거되어 다시 로그인해야 합니다.
- JWT의 역할·만료를 확인하고, 새로고침 후 관리자 사용자 조회 API로 서버에서 세션을 확인합니다. 만료/401이면 로그인 화면으로 이동합니다. 로그인 요청 자체의 401은 입력 화면에 표시합니다.
- 새 비밀번호는 10~128자이며, 변경 시 재입력을 요구합니다. 입력값의 앞뒤 공백을 임의로 지우지 않습니다.
- 이미지: JPG/PNG/WEBP, 파일당 5MB 이하, 공지당 최대 5개. 화면 검증은 서버 검증을 대체하지 않습니다.
- 엑셀: .xlsx, 10MB 이하. 기존 .xls는 Excel에서 .xlsx로 변환해야 합니다.
- 제공된 taxi.xlsx는 콜분석자료와 카드수입금자료 시트로 구성되어 있으며 콜분석자료의 K3에 정산 월이 있습니다. 업로드 시 원본 파일을 기존 API에 그대로 전달합니다. 원본이나 개인정보는 저장소에 복사하지 않았습니다.
- 업로드 성공 후 파일 선택을 비워 실수로 재전송하는 것을 줄입니다. 서버 응답이 유실된 경우 중복 처리 여부는 기존 서버의 구현에 달려 있으므로 결과 확인 후 재시도해야 합니다.

## 범위와 후속 확인

백엔드의 기존 데이터와 비즈니스 로직은 유지합니다. 실제 관리자 자격증명이 없어 실서버 로그인·생성·퇴사·업로드 등은 실행하지 않았습니다. 서버의 비밀번호 정책, 업로드 파일 검증, 삭제/복구 정책, 데이터 백업과 권한 검증 구현 자체는 이 저장소에서 변경할 수 없습니다.

독립적인 대체 백엔드가 필요해지면 기존 서버 소스 또는 전체 API 계약, 기사 앱 연동 규격, 데이터 백업 및 FCM 설정을 확보한 뒤 진행해야 합니다. 관리자 UI만으로 기사 앱 전체 호환이나 기존 데이터 복원을 보장할 수 없습니다.
