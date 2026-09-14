/**
 * 저장소를 나중에 실제 DB로 바꿀 걸 생각해서 모든 저장소 메서드를 async로 만들었다.
 * 지금은 인메모리라 굳이 기다릴 필요는 없지만, 짧은 지연을 흉내 내 두면
 * "저장소가 항상 즉시 응답한다"는 잘못된 가정으로 코드를 짜는 걸 막을 수 있을 것 같아 넣었다.
 */
export function ioDelay<T>(value: T): Promise<T> {
  const ms = 1 + Math.floor(Math.random() * 5); // 1~5ms
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}
