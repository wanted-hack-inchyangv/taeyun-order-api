# order-api-taeyun

주문·재고 API 과제 제출물입니다. Express 5 + TypeScript로 만들었고, 상품 재고 확인 → 주문 생성/조회/취소를 REST API로 제공합니다.

## 실행 방법

과제 안내에 있는 고정 의존성(`templates/order-api-ts`)만 쓰고, 이 저장소에서 별도로 `npm install`은 하지 않았습니다.

```bash
PORT=3000 npm start   # tsx로 src/server.ts를 바로 실행합니다 (빌드 없음)
npm test               # vitest
npm run typecheck      # tsc --noEmit
```

- `PORT` 환경변수로 포트를 지정합니다. 지정하지 않으면 3000번으로 뜹니다.
- 기동 확인은 `GET /health` (`{ "status": "ok" }`)입니다.
- `POST /admin/reset`으로 상품 재고와 주문 상태를 시드 값으로 되돌릴 수 있습니다.

## 구조

```
src/
  types.ts                 도메인 타입 (Product, Order, ...)
  errors.ts                에러 코드 <-> HTTP 상태 매핑
  validation.ts             요청 검증 (zod)
  seed.ts                   시드 데이터
  repositories/             저장소 계층 (인터페이스 + 인메모리 구현)
    product-repository.ts
    order-repository.ts
    idempotency-repository.ts
    io-delay.ts
  services/
    order-service.ts        도메인 규칙 (주문 생성/조회/취소, 초기화)
  routes/
    order-routes.ts          HTTP 라우팅
  error-handler.ts           에러 응답 직렬화
  app.ts                     앱 조립
  server.ts                  엔트리 포인트
test/
  helpers.ts
  health-and-reset.test.ts
  orders.test.ts
  cancel.test.ts
  idempotency.test.ts
```

- 라우트(HTTP)와 서비스(도메인 규칙)를 분리했습니다. 서비스는 req/res를 직접 다루지 않고 순수한 값(헤더 문자열, 파싱된 바디)만 받습니다.
- 저장소는 인터페이스 뒤에 숨겨서, 나중에 실제 DB로 바꿀 때 서비스 코드를 건드리지 않아도 되도록 했습니다. 지금은 인메모리 Map이고, 나중에 바꿀 걸 생각해서 메서드를 전부 `async`로 만들고 안에서 짧은 지연(1~5ms)을 흉내 냈습니다.

## 구현한 것

- 상품 조회, 주문 생성/조회/취소 (명세 5절 엔드포인트 전부)
- 입력 검증: `Idempotency-Key` 필수/길이, `productId`/`quantity` 스키마 (zod)
- 재고 부족(409), 상품/주문 없음(404), 이미 취소된 주문(409) 처리
- 같은 `Idempotency-Key`로 순차 재전송하면 새 주문을 만들지 않고 같은 응답을 돌려줌
- 취소 시 재고 복구, 이중 취소 방지
- `POST /admin/reset`으로 시드 초기화

## 아쉬운 점

- 동시성 관련 테스트를 충분히 작성하지 못했습니다. 순차 재전송 케이스 하나만 테스트로 남겼고, 여러 요청이 동시에 들어오는 상황은 손으로만 확인했습니다. 시간이 더 있었으면 동시 요청 시나리오도 테스트로 남기고 싶었습니다.
- 멱등성 저장소가 지금은 키 존재 여부만 보고 응답을 재생하는 단순한 형태라, 더 꼼꼼하게 다듬을 여지가 있습니다.
