import { randomUUID } from "node:crypto";
import { AppError } from "../errors.js";
import type { IdempotencyRepository } from "../repositories/idempotency-repository.js";
import type { OrderRepository } from "../repositories/order-repository.js";
import type { ProductRepository } from "../repositories/product-repository.js";
import { seedProducts } from "../seed.js";
import type { Order, Product } from "../types.js";
import { validateCreateOrderBody, validateIdempotencyKey } from "../validation.js";

export type OrderServiceDeps = {
  products: ProductRepository;
  orders: OrderRepository;
  idempotency: IdempotencyRepository;
  newId?: () => string;
};

/**
 * 도메인 규칙. HTTP 요청·응답 객체를 직접 다루지 않고, 라우트 계층이 뽑아준 값(헤더 문자열,
 * 파싱된 본문)을 받아서 도메인 객체나 AppError를 돌려준다.
 */
export class OrderService {
  private readonly products: ProductRepository;
  private readonly orders: OrderRepository;
  private readonly idempotency: IdempotencyRepository;
  private readonly newId: () => string;

  constructor(deps: OrderServiceDeps) {
    this.products = deps.products;
    this.orders = deps.orders;
    this.idempotency = deps.idempotency;
    this.newId = deps.newId ?? randomUUID;
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) throw new AppError("NOT_FOUND", `product ${id} not found`);
    return product;
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) throw new AppError("NOT_FOUND", `order ${id} not found`);
    return order;
  }

  // 판정 순서: 검증(400) -> 멱등성 재전송 -> 재고 확인 -> 생성(201).
  async createOrder(rawKey: string | undefined, rawBody: unknown): Promise<Order> {
    const key = validateIdempotencyKey(rawKey);
    const input = validateCreateOrderBody(rawBody);

    // 같은 키로 이미 처리한 요청이면 새로 만들지 않고 그때 응답을 그대로 돌려준다.
    const existing = await this.idempotency.get(key);
    if (existing) {
      return existing;
    }

    const product = await this.products.reserveStock(input.productId, input.quantity);

    const order: Order = {
      id: this.newId(),
      productId: product.id,
      quantity: input.quantity,
      status: "CREATED",
    };
    await this.orders.insert(order);
    await this.idempotency.set(key, order);
    return order;
  }

  async cancelOrder(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) throw new AppError("NOT_FOUND", `order ${id} not found`);
    if (order.status === "CANCELLED") {
      throw new AppError("ALREADY_CANCELLED", `order ${id} is already cancelled`);
    }
    const cancelled: Order = { ...order, status: "CANCELLED" };
    await this.orders.update(cancelled);
    await this.products.restock(order.productId, order.quantity);
    return cancelled;
  }

  async reset(): Promise<void> {
    await this.products.reset(seedProducts());
    await this.orders.reset();
    await this.idempotency.reset();
  }
}
