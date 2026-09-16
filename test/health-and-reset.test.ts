import { describe, expect, it } from "vitest";
import { createOrder, expectError, getStock, newClient, postOrder } from "./helpers.js";

describe("GET /health", () => {
  it("항상 200과 { status: 'ok' }를 반환한다", async () => {
    const res = await newClient().get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /admin/reset", () => {
  it("200 { ok: true }를 반환한다", async () => {
    const res = await newClient().post("/admin/reset");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("재고를 시드로 되돌리고 주문 상태도 지운다", async () => {
    const client = newClient();
    const order = await createOrder(client, "reset-key", "p1", 2);
    expect(await getStock(client, "p1")).toBe(0);

    const reset = await client.post("/admin/reset");
    expect(reset.status).toBe(200);

    expect(await getStock(client, "p1")).toBe(2);
    expect(await getStock(client, "p2")).toBe(5);
    expect(await getStock(client, "p3")).toBe(0);
    expectError(await client.get(`/orders/${order.id}`), 404, "NOT_FOUND");

    // 초기화 전에 쓴 키도 새 키처럼 동작해야 한다
    const again = await postOrder(client, "reset-key", { productId: "p1", quantity: 1 });
    expect(again.status).toBe(201);
    expect((again.body as { id: string }).id).not.toBe(order.id);
  });
});

describe("정의되지 않은 경로", () => {
  it("404 NOT_FOUND를 반환한다", async () => {
    expectError(await newClient().get("/no-such-route"), 404, "NOT_FOUND");
  });
});
