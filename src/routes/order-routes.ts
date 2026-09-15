import { Router } from "express";
import type { OrderService } from "../services/order-service.js";

/**
 * HTTP 계층. 라우팅, 헤더/본문 꺼내기, 응답 직렬화만 하고 도메인 규칙은 OrderService에 맡긴다.
 * Express 5는 async 핸들러에서 던진(reject된) 에러를 자동으로 에러 미들웨어로 넘겨준다.
 */
export function createOrderRoutes(service: OrderService): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.post("/admin/reset", async (_req, res) => {
    await service.reset();
    res.status(200).json({ ok: true });
  });

  router.get("/products/:id", async (req, res) => {
    const product = await service.getProduct(String(req.params.id));
    res.status(200).json(product);
  });

  router.post("/orders", async (req, res) => {
    const order = await service.createOrder(req.header("Idempotency-Key"), req.body);
    res.status(201).json(order);
  });

  router.get("/orders/:id", async (req, res) => {
    const order = await service.getOrder(String(req.params.id));
    res.status(200).json(order);
  });

  router.post("/orders/:id/cancel", async (req, res) => {
    const order = await service.cancelOrder(String(req.params.id));
    res.status(200).json(order);
  });

  return router;
}
