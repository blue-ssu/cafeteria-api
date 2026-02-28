# Cafeteria API

<p align="left">
  <img src="public/icon-background.png" alt="Cafeteria API Banner" width="900" />
</p>

숭실대학교 학식 데이터를 조회·관리하는 오픈소스 REST API입니다.

## 목차

- [기능](#기능)
- [시작하기](#시작하기)
- [환경 변수](#환경-변수)
- [실행 방법](#실행-방법)
- [API 엔드포인트](#api-엔드포인트)
- [정적 페이지](#정적-페이지)
- [에러 응답](#에러-응답)
- [캐시 정책](#캐시-정책)
- [데이터베이스](#데이터베이스)
- [라이선스/저장소](#라이선스저장소)

## 기능

- `cafeteria`, `mealType`, `date` 기반 식단 조회
- 단일 식사 조회
- 작성/수정/삭제(쓰기 API)
- 스크래퍼 연동으로 메뉴 수집 저장
- 간단한 인메모리 캐시(TTL 5분)
- 브라우저 기반 관리 UI 제공
  - `/table` : 조회/편집/저장
  - `/playground.html` : 조회 API용 플레이그라운드
- 인증 기반 쓰기 API (`Bearer Token`, JWT)

## 시작하기

```bash
git clone <repo-url>
cd meal-api
npm install
```

또는 `pnpm` 사용 시:

```bash
pnpm install
```

## 환경 변수

루트에 `.env` 파일을 만들고 아래 값을 설정하세요.

```bash
cp .env.example .env
```

필수 항목:

- `DATABASE_URL` (예: `file:./prisma/dev.db`)
- `JWT_SECRET` (쓰기 API(`POST /api/meals`, `PATCH /api/meals/:mealId`, `DELETE /api/meals/:mealId`, `POST /api/scrape-meals`) 인증용)

스크랩 연동 사용 시:

- `GPT_API_KEY` (dormitory 이외 식당)

## 실행 방법

```bash
# Prisma Client 생성
npm run db:generate

# 스키마 반영/DB 생성
npm run db:push

# 개발 서버
npm run dev
```

빌드 후 실행:

```bash
npm run build
npm run start
```

기본 URL: `http://localhost:3000`

## API 엔드포인트

### 공통

- 기본 날짜 기준: `Asia/Seoul`
- 날짜 포맷: `YYYY-MM-DD`
- 쿼리/페이로드 유효성 실패: `400 INVALID_QUERY`
- 인증 실패: `401 UNAUTHORIZED` 또는 `401 INVALID_TOKEN`

### 조회 API

#### GET /api/meals

식단 목록 조회.

쿼리:

- `cafeteria` (필수): `haksik | dodam | faculty | dormitory`
- `mealType` (선택): `breakfast | lunch | dinner`
- `date` (선택): `YYYY-MM-DD`
- `startDate` + `endDate` (선택): `YYYY-MM-DD`
  - 기간 조회 모드에서 사용
  - 종료일은 포함
- 기간 조회와 단일 조회는 동시에 사용하지 않음

예시:

```bash
curl "http://localhost:3000/api/meals?cafeteria=haksik&mealType=lunch&date=2026-02-28"
```

```bash
curl "http://localhost:3000/api/meals?cafeteria=haksik&startDate=2026-02-24&endDate=2026-02-26"
```

#### GET /api/meals/:mealId

단일 식단 조회.

### 쓰기 API (인증 필요)

요청 헤더:

- `Authorization: Bearer <token>`
- JWT payload 조건:
  - `sub === -1`
  - `iss === "ssu.blue"`

서버의 서명 키: `JWT_SECRET`

#### POST /api/meals

식단 생성. 동일 `cafeteria + mealType + name + date` 조합은 업데이트 처리(덮어쓰기).

요청:

```bash
curl -X POST http://localhost:3000/api/meals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "cafeteriaType":"haksik",
    "mealType":"lunch",
    "name":"한식 도시락",
    "menu":["김치찌개","공기밥","김치"],
    "date":"2026-02-28"
  }'
```

#### PATCH /api/meals/:mealId

부분 수정.

```bash
curl -X PATCH http://localhost:3000/api/meals/<mealId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "menu": ["비빔밥","된장국"] }'
```

#### DELETE /api/meals/:mealId

단일 식사 삭제.

```bash
curl -X DELETE http://localhost:3000/api/meals/<mealId> \
  -H "Authorization: Bearer <token>"
```

#### POST /api/scrape-meals

스크랩 파이프라인을 통해 메뉴 수집 후 저장.

```bash
curl -X POST http://localhost:3000/api/scrape-meals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "cafeteria":"dodam", "date":"2026-02-28" }'
```

응답 예시:

```json
{
  "requested": {
    "cafeteria": "dodam",
    "date": "2026-02-28"
  },
  "inserted": 2,
  "updated": 1,
  "skipped": 0,
  "errors": []
}
```

동작 규칙:

- `dormitory`는 `parser: "noop"`, 나머지는 `parser: "gpt"`
- 스크랩 결과는 `cafeteria + mealType + name + date` 단위로 저장/갱신
- `menu`가 빈 값이거나 유효하지 않으면 저장 제외

## 정적 페이지

정적 파일은 루트에서 서빙됩니다(`public`).

- `/` : 랜딩 페이지 (`index.html`)
- `/table` : 식단 조회/수정 UI
- `/playground.html` : 조회 API 테스트용 플레이그라운드 (GET 전용)
- `/table.html`, `/table.css`, `/table.js` 등 직접 접근 가능
- `/manifest.json`, `/manifast.json` 접근 가능

## 에러 응답

### 공통 형식

- `400`
  - `{"error":"INVALID_QUERY","message":"..."}`  
  - `details`가 추가될 수 있음(검증 실패 상세)
- `401`
  - `{"error":"UNAUTHORIZED","message":"Authentication required."}`
  - 또는 `{"error":"INVALID_TOKEN","message":"Invalid or expired token."}`
- `404`
  - `{"error":"NOT_FOUND","message":"Meal not found."}`

요청 페이로드 검증은 `zod v4` 기반으로 수행됩니다.

## 캐시 정책

- 조회 캐시 키: `meal:query:{cafeteria}:{mealType|all}:{rangeStart}:{rangeEnd}`
- TTL: 5분 (`300000ms`)
- 쓰기/삭제/스크랩 시 조회 캐시 무효화

## 데이터베이스

- ORM: Prisma
- DB: SQLite
- 모델 핵심:
  - `Meal`:
    - `cafeteriaType`, `mealType`, `name`, `menu(Json)`, `date`

## 라이선스/저장소

- 오픈소스 프로젝트
- GitHub: `https://github.com/blue-ssu/meal-api`
- 더 자세한 기여 가이드는 추후 업데이트 예정
