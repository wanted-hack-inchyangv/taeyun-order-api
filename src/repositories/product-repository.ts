import { AppError } from "../errors.js";
import type { Product } from "../types.js";
import { ioDelay } from "./io-delay.js";

export interface ProductRepository {
  findById(id: string): Promise<Product | undefined>;
  /** 재고 확인과 차감을 한 번에 처리한다. 모자라면 던지고 상태는 바뀌지 않는다. */
  reserveStock(productId: string, quantity: number): Promise<Product>;
  restock(productId: string, quantity: number): Promise<void>;
  reset(seed: Product[]): Promise<void>;
}

export class InMemoryProductRepository implements ProductRepository {
  private products: Map<string, Product>;

  constructor(seed: Product[]) {
    this.products = new Map(seed.map((product) => [product.id, { ...product }]));
  }

  async findById(id: string): Promise<Product | undefined> {
    const product = await ioDelay(this.products.get(id));
    return product ? { ...product } : undefined;
  }

  // 재고 확인 → 차감을 이 메서드 하나의 동기 구간에서 처리한다. await는 위에서 한 번만
  // 쓰고, 그 뒤로는 끝까지 동기라서 다른 요청이 중간에 끼어들 수 없다.
  async reserveStock(productId: string, quantity: number): Promise<Product> {
    await ioDelay(undefined);
    const product = this.products.get(productId);
    if (!product) {
      throw new AppError("NOT_FOUND", `product ${productId} not found`);
    }
    if (quantity > product.stock) {
      throw new AppError(
        "INSUFFICIENT_STOCK",
        `requested ${quantity} but only ${product.stock} in stock`,
      );
    }
    product.stock -= quantity;
    return { ...product };
  }

  async restock(productId: string, quantity: number): Promise<void> {
    await ioDelay(undefined);
    const product = this.products.get(productId);
    if (product) product.stock += quantity;
  }

  async reset(seed: Product[]): Promise<void> {
    await ioDelay(undefined);
    this.products = new Map(seed.map((product) => [product.id, { ...product }]));
  }
}
