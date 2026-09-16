import { describe, expect, it } from "vitest";
import { getStock, newClient, postOrder } from "./helpers.js";

describe("같은 Idempotency-Key로 재전송", () => {
  it("같은 키를 순차적으로 재전송하면 같은 주문을 그대로 돌려준다", async () => {
    const client = newClient();
    const first = await postOrder(client, "idem-key-1", { productId: "p1", quantity: 1 });
    expect(first.status).toBe(201);

    const second = await postOrder(client, "idem-key-1", { productId: "p1", quantity: 1 });
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    // 재고는 처음 한 번만 줄어야 한다
    expect(await getStock(client, "p1")).toBe(1);
  });
});
