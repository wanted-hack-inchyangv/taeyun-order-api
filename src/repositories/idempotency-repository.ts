import type { Order } from "../types.js";
import { ioDelay } from "./io-delay.js";

export interface IdempotencyRepository {
  get(key: string): Promise<Order | undefined>;
  set(key: string, order: Order): Promise<void>;
  reset(): Promise<void>;
}

/**
 * Idempotency-Key -> 원래 응답(주문)만 저장한다. 같은 키가 다시 들어오면 저장된 응답을
 * 그대로 돌려준다.
 */
export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private responses = new Map<string, Order>();

  async get(key: string): Promise<Order | undefined> {
    const order = await ioDelay(this.responses.get(key));
    return order ? { ...order } : undefined;
  }

  async set(key: string, order: Order): Promise<void> {
    await ioDelay(undefined);
    this.responses.set(key, { ...order });
  }

  async reset(): Promise<void> {
    await ioDelay(undefined);
    this.responses.clear();
  }
}
