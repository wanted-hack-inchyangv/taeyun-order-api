import { describe, expect, it } from "vitest";
import { createOrder, expectError, getStock, newClient } from "./helpers.js";

describe("POST /orders/:id/cancel", () => {
  it("취소하면 200과 CANCELLED를 반환하고 재고를 복구한다", async () => {
    const client = newClient();
    const order = await createOrder(client, "cancel-key-1", "p1", 1);
    expect(await getStock(client, "p1")).toBe(1);

    const res = await client.post(`/orders/${order.id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: order.id, status: "CANCELLED" });
    expect(await getStock(client, "p1")).toBe(2);
  });

  it("이미 취소된 주문을 다시 취소하면 409 ALREADY_CANCELLED이고 재고는 그대로다", async () => {
    const client = newClient();
    const order = await createOrder(client, "cancel-key-2", "p1", 1);
    await client.post(`/orders/${order.id}/cancel`);
    expect(await getStock(client, "p1")).toBe(2);

    expectError(await client.post(`/orders/${order.id}/cancel`), 409, "ALREADY_CANCELLED");
    expect(await getStock(client, "p1")).toBe(2);
  });

  it("존재하지 않는 주문을 취소하면 404다", async () => {
    const client = newClient();
    expectError(await client.post("/orders/no-such-order/cancel"), 404, "NOT_FOUND");
  });

  it("취소된 주문은 GET /orders/:id에서 CANCELLED로 조회된다", async () => {
    const client = newClient();
    const order = await createOrder(client, "cancel-key-3", "p1", 1);
    await client.post(`/orders/${order.id}/cancel`);
    const res = await client.get(`/orders/${order.id}`);
    expect(res.body).toMatchObject({ status: "CANCELLED" });
  });
});
