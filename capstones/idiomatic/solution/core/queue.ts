import { relayFailure, throwIfAborted } from "./errors.ts";

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export function deferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function waitFor<T>(pending: Deferred<T>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  if (signal === undefined) {
    return pending.promise;
  }
  const cancelled = deferred<T>();
  const onAbort = () => {
    cancelled.reject(relayFailure("cancelled", "operation was cancelled"));
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([pending.promise, cancelled.promise]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export class BoundedAsyncQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = [];
  private readonly consumers: Array<Deferred<IteratorResult<T>>> = [];
  private readonly capacityWaiters: Array<Deferred<void>> = [];
  private closed = false;
  private failed: unknown;

  constructor(readonly capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError("queue capacity must be a positive safe integer");
    }
  }

  get size(): number {
    return this.items.length;
  }

  async push(value: T, signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    while (
      !this.closed &&
      this.failed === undefined &&
      this.items.length >= this.capacity
    ) {
      const waiter = deferred<void>();
      this.capacityWaiters.push(waiter);
      try {
        await waitFor(waiter, signal);
      } catch (error: unknown) {
        const index = this.capacityWaiters.indexOf(waiter);
        if (index >= 0) {
          this.capacityWaiters.splice(index, 1);
        }
        throw error;
      }
    }
    if (this.failed !== undefined) {
      throw this.failed;
    }
    if (this.closed) {
      throw relayFailure("cancelled", "queue is closed");
    }
    const consumer = this.consumers.shift();
    if (consumer === undefined) {
      this.items.push(value);
    } else {
      consumer.resolve({ done: false, value });
    }
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    for (const waiter of this.capacityWaiters.splice(0)) {
      waiter.reject(relayFailure("cancelled", "queue is closed"));
    }
    if (this.items.length === 0) {
      for (const consumer of this.consumers.splice(0)) {
        consumer.resolve({ done: true, value: undefined });
      }
    }
  }

  fail(error: unknown): void {
    if (this.failed !== undefined) {
      return;
    }
    this.failed = error;
    this.closed = true;
    this.items.length = 0;
    for (const waiter of this.capacityWaiters.splice(0)) {
      waiter.reject(error);
    }
    for (const consumer of this.consumers.splice(0)) {
      consumer.reject(error);
    }
  }

  private next(state: {
    returned: boolean;
    pending?: Deferred<IteratorResult<T>>;
  }): Promise<IteratorResult<T>> {
    if (state.returned) {
      return Promise.resolve({ done: true, value: undefined });
    }
    if (this.items.length > 0) {
      const value = this.items.shift();
      this.capacityWaiters.shift()?.resolve();
      if (this.closed && this.items.length === 0) {
        for (const consumer of this.consumers.splice(0)) {
          consumer.resolve({ done: true, value: undefined });
        }
      }
      return Promise.resolve({ done: false, value: value as T });
    }
    if (this.failed !== undefined) {
      return Promise.reject(this.failed);
    }
    if (this.closed) {
      return Promise.resolve({ done: true, value: undefined });
    }
    const consumer = deferred<IteratorResult<T>>();
    state.pending = consumer;
    this.consumers.push(consumer);
    return consumer.promise.finally(() => {
      if (state.pending === consumer) {
        delete state.pending;
      }
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    const state: {
      returned: boolean;
      pending?: Deferred<IteratorResult<T>>;
    } = { returned: false };
    return {
      next: () => this.next(state),
      return: () => {
        state.returned = true;
        const pending = state.pending;
        if (pending !== undefined) {
          const index = this.consumers.indexOf(pending);
          if (index >= 0) {
            this.consumers.splice(index, 1);
          }
          pending.resolve({ done: true, value: undefined });
          delete state.pending;
        }
        return Promise.resolve({ done: true, value: undefined });
      },
    };
  }
}
