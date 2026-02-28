# meal-api

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
