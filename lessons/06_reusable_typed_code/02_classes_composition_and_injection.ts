interface CounterStore {
  read(): number;
  write(value: number): void;
}

interface MessageWriter {
  write(message: string): void;
}

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
const writer = {
  write(message: string): void {
    console.log(message);
  },
};
const service = new VisitService(store, writer);

service.recordVisit();
service.recordVisit();
