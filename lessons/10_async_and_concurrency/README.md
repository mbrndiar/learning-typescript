# ⚡ 10. Asynchronous JavaScript and Concurrency

## 🎯 Learning goals

- distinguish the call stack, microtasks, and later event-loop phases;
- compose asynchronous work with promises and `async`/`await`;
- propagate cancellation with `AbortSignal`;
- bound concurrency instead of starting unlimited work;
- understand when streams reduce memory use; and
- reserve worker threads for CPU-bound work.

## ▶️ Run the lessons

```bash
npm run lesson -- lessons/10_async_and_concurrency/01_event_loop_and_promises.ts
npm run lesson -- lessons/10_async_and_concurrency/02_cancellation_and_bounded_work.ts
```

JavaScript concurrency is not automatically parallel execution. Promises
coordinate eventual results; the event loop schedules callbacks; workers can
run CPU-heavy JavaScript on additional threads.

Cancellation is cooperative. A signal communicates that work should stop, but
the operation must listen to it and release timers, streams, sockets, or other
resources.

## ⚠️ Common mistakes

- forgetting to `await` a promise;
- using `forEach(async () => ...)` and assuming it waits;
- starting thousands of requests with one unbounded `Promise.all`;
- catching and discarding an `AbortError`; and
- moving I/O work to a worker thread when asynchronous APIs already avoid
  blocking the event loop.

## ❓ Review questions

1. What is the difference between concurrency and parallelism?
2. When do promise callbacks run relative to synchronous code?
3. Why is cancellation cooperative?
4. What resource does a concurrency limit protect?
5. Which work is a good candidate for a worker thread?

Continue with the
[matching exercise](../../exercises/10_async_and_concurrency/).
