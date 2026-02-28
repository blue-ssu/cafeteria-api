# meal-api

## WIP (Working In Progress)
현재 개발 중인 프로젝트입니다.

## 설치

```bash
pnpm install
```

`prisma`와 `@prisma/client`를 추가하고 SQLite가 준비됩니다.

## 환경 변수

`DATABASE_URL`은 반드시 설정해야 합니다.

```bash
cp .env.example .env
```

`DATABASE_URL` 예시:
- `file:./prisma/dev.db`

## Prisma 초기화

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## 개발 서버

```bash
pnpm run dev
```

## API

- `GET /api/meals` : 식단 목록 조회 (`cafeteria` 필수)
- `GET /api/meals/:mealId` : 단일 식단 조회
- `POST /api/meals` : 식단 생성
- `PATCH /api/meals/:mealId` : 단일 식단 부분 수정
- `POST /api/scrape-meals` : @bluessu/meal-scraper로 스크랩 후 식단 저장
- `GET /table` : 조회/수정용 테이블 UI
- `GET /table`은 서버 렌더링이 아닌 정적 `table.html`(클라이언트에서 API 호출) 기반 화면입니다.

로컬 실행 후 `http://localhost:3000/api/meals?cafeteria=haksik` 을 호출해 결과를 확인하세요.

### 쿼리 옵션
- `cafeteria`: `haksik | dodam | faculty | dormitory` (필수)
- `mealType`: `breakfast | lunch | dinner` (선택)
- 날짜 조회:
  - `date=YYYY-MM-DD` : 특정 날짜 조회
  - `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` : 기간 조회 (종료일 포함)
  - 미지정 시 `Asia/Seoul` 기준 오늘 조회
- `mealType`이나 날짜 포맷이 유효하지 않으면 `400` + `{ "error":"INVALID_QUERY", "message":"..." }` 로 응답

### 캐시
- 간단한 인메모리 캐시 사용
- 캐시 키: `meal:query:{cafeteria}:{mealType|all}:{rangeStart}:{rangeEnd}`
- TTL: 5분 (300초)

### 요청 예시

#### POST /api/meals
```json
{
  "cafeteriaType": "haksik",
  "mealType": "lunch",
  "name": "한식 도시락",
  "menu": ["김치찌개", "공기밥"],
  "date": "2026-02-28"
}
```

#### PATCH /api/meals/:mealId
```json
{
  "name": "새로운 메뉴 이름",
  "menu": ["비빔밥", "된장국"]
}
```

#### POST /api/scrape-meals
```json
{
  "cafeteria": "dodam",
  "date": "2026-02-28"
}
```

##### 스크랩 응답 예시
```json
{
  "requested": {
    "cafeteria": "dodam",
    "date": "2026-02-28"
  },
  "inserted": 3,
  "updated": 1,
  "skipped": 0,
  "errors": []
}
```

> 동작 방식
> - `cafeteria`가 `dormitory`가 아닌 경우 `parser: "gpt"`로 스크랩
> - `dormitory`는 `parser: "noop"`로 스크랩
> - 스크랩 결과는 `cafeteria`, `mealType`, `name`, `menu`, `date` 기준으로 덮어쓰기 처리
> - 쓰기 API와 동일하게 `Authorization: Bearer <JWT>` 인증이 필요 (`sub=-1`, `iss=ssu.blue`)

### 에러 응답
- 요청 검증 실패: `400`
  - `{ "error":"INVALID_QUERY", "message":"Invalid payload.", "details":[ ... ] }`
- 인증 실패: `401`
  - `{ "error":"UNAUTHORIZED" | "INVALID_TOKEN", ... }`
- 대상 없음: `404`
  - `{ "error":"NOT_FOUND", "message":"Meal not found." }`
