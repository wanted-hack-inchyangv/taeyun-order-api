import express, { type Express } from "express";
import { errorHandler } from "./error-handler.js";
import { InMemoryIdempotencyRepository } from "./repositories/idempotency-repository.js";
import { InMemoryOrderRepository } from "./repositories/order-repository.js";
import { InMemoryProductRepository } from "./repositories/product-repository.js";
import { createOrderRoutes } from "./routes/order-routes.js";
import { seedProducts } from "./seed.js";
import { OrderService } from "./services/order-service.js";

// 앱 조립. 저장소를 다른 구현으로 바꾸려면 여기서 주입하는 구현만 바꾸면 된다.
export function createApp(): Express {
  const service = new OrderService({
    products: new InMemoryProductRepository(seedProducts()),
    orders: new InMemoryOrderRepository(),
    idempotency: new InMemoryIdempotencyRepository(),
  });

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ strict: true, limit: "64kb" }));
  app.use(createOrderRoutes(service));
  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "route not found" } });
  });
  app.use(errorHandler);
  return app;
}
