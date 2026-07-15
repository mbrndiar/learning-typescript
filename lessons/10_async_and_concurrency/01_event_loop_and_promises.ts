const order: string[] = [];

order.push("synchronous start");

queueMicrotask(() => {
  order.push("queued microtask");
});

void Promise.resolve().then(() => {
  order.push("promise callback");
});

setTimeout(() => {
  order.push("timer");
}, 0);

order.push("synchronous end");

await new Promise<void>((resolve) => {
  setTimeout(resolve, 10);
});

console.log(order);
