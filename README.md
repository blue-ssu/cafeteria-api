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

## DB 동작 확인 API

- `GET /meals` : 저장된 식단 목록 조회

로컬 실행 후 `http://localhost:3000/meals`를 호출해서 결과를 확인하세요.
