import type { Product } from "./types.js";

// 과제 명세 2절 시드 데이터. 코드에 그대로 둔다.
export function seedProducts(): Product[] {
  return [
    { id: "p1", name: "Keyboard", stock: 2 },
    { id: "p2", name: "Mouse", stock: 5 },
    { id: "p3", name: "Monitor", stock: 0 },
  ];
}
