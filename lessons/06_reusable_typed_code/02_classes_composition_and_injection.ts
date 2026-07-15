// Classes are useful for bundling stateful behavior, but the class below does
// not create its own storage or output channel. Those are injected so the
// service depends on capabilities rather than concrete implementations.
interface CounterStore {
  read(): number;
  write(value: number): void;
}

interface MessageWriter {
  write(message: string): void;
}

// This is one possible adapter for CounterStore. The service will work with any
// value that has the same read/write shape because TypeScript is structural.
class MemoryCounterStore implements CounterStore {
  private value = 0;

  read(): number {
    return this.value;
  }

  write(value: number): void {
    this.value = value;
  }
}

class VisitService {
  // Constructor injection makes ownership clear: VisitService owns the visit
  // rule, while the caller owns where counts and messages actually go.
  constructor(
    private readonly store: CounterStore,
    private readonly messages: MessageWriter,
  ) {}

  recordVisit(): number {
    const nextValue = this.store.read() + 1;
    this.store.write(nextValue);
    this.messages.write(`Recorded visit ${nextValue}`);
    return nextValue;
  }
}

const store = new MemoryCounterStore();
// The object never declares `implements MessageWriter`; its shape is enough.
const writer = {
  write(message: string): void {
    console.log(message);
  },
};
const service = new VisitService(store, writer);

service.recordVisit();
service.recordVisit();
