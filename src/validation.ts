import { z } from "zod";
import { AppError } from "./errors.js";
import type { CreateOrderInput } from "./types.js";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

const createOrderBodySchema = z.object({
  productId: z.string().min(1, "productId is required"),
  quantity: z.number().int("quantity must be an integer"),
});

export function validateIdempotencyKey(raw: string | undefined): string {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Idempotency-Key header is required");
  }
  if (raw.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
    );
  }
  return raw;
}

export function validateCreateOrderBody(body: unknown): CreateOrderInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be a JSON object");
  }
  const parsed = createOrderBodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError("VALIDATION_ERROR", issue?.message ?? "invalid request body");
  }
  if (parsed.data.quantity <= 0) {
    throw new AppError("VALIDATION_ERROR", "quantity must be at least 1");
  }
  return parsed.data;
}
