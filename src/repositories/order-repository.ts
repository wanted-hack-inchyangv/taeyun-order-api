import type { Order } from "../types.js";
import { ioDelay } from "./io-delay.js";

export interface OrderRepository {
  findById(id: string): Promise<Order | undefined>;
  insert(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  reset(): Promise<void>;
}

export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async findById(id: string): Promise<Order | undefined> {
    const order = await ioDelay(this.orders.get(id));
    return order ? { ...order } : undefined;
  }

  async insert(order: Order): Promise<void> {
    await ioDelay(undefined);
    this.orders.set(order.id, { ...order });
  }

  async update(order: Order): Promise<void> {
    await ioDelay(undefined);
    this.orders.set(order.id, { ...order });
  }

  async reset(): Promise<void> {
    await ioDelay(undefined);
    this.orders.clear();
  }
}
