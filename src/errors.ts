// 오류 코드 -> HTTP 상태 매핑. 새 오류 코드가 필요하면 이 표에 한 줄만 추가하면 된다.
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  ALREADY_CANCELLED: 409,
  IDEMPOTENCY_CONFLICT: 422,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}
