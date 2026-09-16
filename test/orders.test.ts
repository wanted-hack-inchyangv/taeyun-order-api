import { describe, expect, it } from "vitest";
import { createOrder, expectError, getStock, newClient, postOrder } from "./helpers.js";

describe("POST /orders 정상 흐름", () => {
  it("201로 주문을 만들고 재고를 quantity만큼 줄인다", async () => {
    const client = newClient();
    const res = await postOrder(client, "order-key-1", { productId: "p1", quantity: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ productId: "p1", quantity: 1, status: "CREATED" });
    expect(typeof (res.body as { id: string }).id).toBe("string");
    expect((res.body as { id: string }).id.length).toBeGreaterThan(0);
    expect(await getStock(client, "p1")).toBe(1);
  });

  it("재고와 정확히 같은 수량이면 201이고 재고는 0이 된다", async () => {
    const client = newClient();
    const res = await postOrder(client, "order-key-2", { productId: "p1", quantity: 2 });
    expect(res.status).toBe(201);
    expect(await getStock(client, "p1")).toBe(0);
  });
});

describe("GET /products/:id, GET /orders/:id", () => {
  it("시드 상품을 조회할 수 있다", async () => {
    const client = newClient();
    expect((await client.get("/products/p1")).body).toEqual({ id: "p1", name: "Keyboard", stock: 2 });
    expect((await client.get("/products/p2")).body).toEqual({ id: "p2", name: "Mouse", stock: 5 });
    expect((await client.get("/products/p3")).body).toEqual({ id: "p3", name: "Monitor", stock: 0 });
  });

  it("만든 주문을 조회할 수 있다", async () => {
    const client = newClient();
    const order = await createOrder(client, "order-key-3", "p1", 1);
    const res = await client.get(`/orders/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ productId: "p1", quantity: 1, status: "CREATED" });
  });

  it("존재하지 않는 상품/주문은 404 NOT_FOUND다", async () => {
    const client = newClient();
    expectError(await client.get("/products/p9"), 404, "NOT_FOUND");
    expectError(await client.get("/orders/no-such-order"), 404, "NOT_FOUND");
  });
});

describe("재고 부족", () => {
  it("재고보다 많이 주문하면 409 INSUFFICIENT_STOCK이고 재고는 그대로다", async () => {
    const client = newClient();
    const res = await postOrder(client, "stock-key-1", { productId: "p1", quantity: 3 });
    expectError(res, 409, "INSUFFICIENT_STOCK");
    expect(await getStock(client, "p1")).toBe(2);
  });

  it("재고가 0인 상품은 어떤 수량이든 409다", async () => {
    const client = newClient();
    expectError(
      await postOrder(client, "stock-key-2", { productId: "p3", quantity: 1 }),
      409,
      "INSUFFICIENT_STOCK",
    );
  });
});

describe("입력 검증", () => {
  const invalidBodies: Array<{ name: string; key: string; body: unknown }> = [
    { name: "quantity 누락", key: "quantity-missing", body: { productId: "p1" } },
    { name: "quantity 0", key: "quantity-zero", body: { productId: "p1", quantity: 0 } },
    { name: "quantity 음수", key: "quantity-negative", body: { productId: "p1", quantity: -1 } },
    { name: "quantity 소수", key: "quantity-fraction", body: { productId: "p1", quantity: 1.5 } },
    { name: "quantity 문자열", key: "quantity-string", body: { productId: "p1", quantity: "1" } },
    { name: "productId 누락", key: "product-id-missing", body: { quantity: 1 } },
    { name: "productId 빈 문자열", key: "product-id-empty", body: { productId: "", quantity: 1 } },
  ];

  for (const { name, key, body } of invalidBodies) {
    it(`${name} → 400 VALIDATION_ERROR`, async () => {
      const client = newClient();
      expectError(await postOrder(client, `validation-${key}`, body), 400, "VALIDATION_ERROR");
      expect(await getStock(client, "p1")).toBe(2);
    });
  }

  it("Idempotency-Key 헤더가 없으면 400이다", async () => {
    const client = newClient();
    expectError(
      await postOrder(client, undefined, { productId: "p1", quantity: 1 }),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("Idempotency-Key가 빈 문자열이면 400이다", async () => {
    const client = newClient();
    expectError(
      await postOrder(client, "", { productId: "p1", quantity: 1 }),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("본문이 JSON이 아니면 400이다", async () => {
    const client = newClient();
    const res = await client
      .post("/orders")
      .set("Idempotency-Key", "validation-not-json")
      .set("Content-Type", "application/json")
      .send("{not json");
    expectError(res, 400, "VALIDATION_ERROR");
  });

  it("400으로 끝난 요청의 키는 이후 유효한 본문으로 재사용할 수 있다", async () => {
    const client = newClient();
    await postOrder(client, "reusable-key", { productId: "p1", quantity: 0 });
    const res = await postOrder(client, "reusable-key", { productId: "p1", quantity: 1 });
    expect(res.status).toBe(201);
  });
});
