import type { ErrorRequestHandler } from "express";
import { AppError } from "./errors.js";

// express.json()이 파싱에 실패하면 이 모양의 에러를 던진다.
function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: unknown }).type === "entity.parse.failed"
  );
}

// 에러 응답 직렬화를 한 곳에서 처리한다: { error: { code, message } }
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (isBodyParseError(err)) {
    res
      .status(400)
      .json({ error: { code: "VALIDATION_ERROR", message: "request body is not valid JSON" } });
    return;
  }
  const message = err instanceof Error ? err.message : "unexpected error";
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
};
