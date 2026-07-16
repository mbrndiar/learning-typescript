import type {
  ClosableEventLog,
  IncomingEvent,
  StoredEvent,
  Subscriber,
} from "./contracts.ts";
import { relayFailure, throwIfAborted } from "./errors.ts";
import { BoundedAsyncQueue, deferred } from "./queue.ts";

interface Delivery {
  readonly event: StoredEvent;
  readonly completed: ReturnType<typeof deferred<StoredEvent>>;
}

export class EventRelay {
  private readonly queue: BoundedAsyncQueue<Delivery>;
  private readonly deliverySignal = new AbortController();
  private readonly pending = new Set<Delivery>();
  private readonly worker: Promise<void>;
  private production: Promise<void> = Promise.resolve();
  private failure: unknown;
  private acceptingValue = true;
  private closePromise: Promise<void> | undefined;

  constructor(
    readonly eventLog: ClosableEventLog,
    private readonly subscribers: readonly Subscriber[] = [],
    queueCapacity = 64,
  ) {
    if (
      !Number.isSafeInteger(queueCapacity) ||
      queueCapacity < 1 ||
      queueCapacity > 1_024
    ) {
      throw relayFailure(
        "invalid_cli",
        "queue capacity must be an integer from 1 to 1024",
      );
    }
    this.queue = new BoundedAsyncQueue(queueCapacity);
    this.worker = this.deliver();
  }

  get accepting(): boolean {
    return this.acceptingValue && this.failure === undefined;
  }

  stopAccepting(): void {
    this.acceptingValue = false;
  }

  submit(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent> {
    throwIfAborted(signal);
    const operation = async (): Promise<Delivery> => {
      if (!this.accepting) {
        if (this.failure !== undefined) {
          throw this.failure;
        }
        throw relayFailure("shutting_down", "relay is shutting down");
      }
      throwIfAborted(signal);
      const stored = await this.eventLog.append(event, signal);
      const delivery: Delivery = {
        event: stored,
        completed: deferred<StoredEvent>(),
      };
      this.pending.add(delivery);
      try {
        // Once append succeeds the event must finish delivery even if the
        // producing request is subsequently cancelled.
        await this.queue.push(delivery);
      } catch (error: unknown) {
        this.pending.delete(delivery);
        const failure = this.failure ?? error;
        delivery.completed.reject(failure);
        throw failure;
      }
      return delivery;
    };
    const queued = this.production.then(operation, operation);
    this.production = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued.then((delivery) => delivery.completed.promise);
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeOnce();
    return this.closePromise;
  }

  private async closeOnce(): Promise<void> {
    this.stopAccepting();
    await this.production;
    this.queue.close();
    await this.worker;
    this.deliverySignal.abort();
    await this.eventLog.close();
  }

  private async deliver(): Promise<void> {
    for await (const delivery of this.queue) {
      try {
        for (const subscriber of this.subscribers) {
          await subscriber.accept(delivery.event, this.deliverySignal.signal);
        }
        this.pending.delete(delivery);
        delivery.completed.resolve(delivery.event);
      } catch (error: unknown) {
        const sequencedFailure = relayFailure(
          "subscriber_failed",
          error instanceof Error
            ? error.message
            : "subscriber failed while accepting an event",
          {
            details: { sequence: delivery.event.sequence },
          },
        );
        this.failure = sequencedFailure;
        this.acceptingValue = false;
        this.queue.fail(sequencedFailure);
        for (const pending of this.pending) {
          pending.completed.reject(sequencedFailure);
        }
        this.pending.clear();
        return;
      }
    }
  }
}
