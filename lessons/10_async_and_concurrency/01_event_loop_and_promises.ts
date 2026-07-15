// This lesson makes event-loop ordering visible: the current call stack runs
// to completion, then microtasks drain, and only then can timer callbacks run.
const order: string[] = [];

order.push("synchronous start");

// queueMicrotask and promise callbacks share the microtask checkpoint, so both
// run before the zero-delay timer even though the timer was scheduled nearby.
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

// `await` yields back to the event loop. The promise resolves from a later
// timer turn, giving the queued microtasks and the first timer time to run.
await new Promise<void>((resolve) => {
  setTimeout(resolve, 10);
});

console.log(order);
