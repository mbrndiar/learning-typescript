import type { ClosableEventLog } from "./api.ts";
import {
  collect,
  deepEqual,
  equal,
  rejects,
  validAlert,
  validMetric,
} from "./testing.ts";

export interface FileContract {
  readonly root: string;
  createLog(path: string, capacity?: number): ClosableEventLog;
  writeText(path: string, text: string): Promise<void>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  readText(path: string): Promise<string>;
  reset(): Promise<void>;
}

const header = '{"record":"header","schemaVersion":1}\n';

export async function runM3AdapterContract(files: FileContract): Promise<void> {
  await files.reset();
  try {
    const path = `${files.root}/events.jsonl`;
    const log = files.createLog(path, 2);
    const first = await log.append(validMetric());
    const second = await log.append(validAlert());
    await log.close();
    const raw = await files.readText(path);
    equal(
      raw.split("\n").filter(Boolean).length,
      3,
      "log must contain one header and one line per event",
    );
    equal(
      raw.startsWith(header),
      true,
      "new logs must start with exactly one version header",
    );

    const reopened = files.createLog(path, 3);
    deepEqual(
      await collect(reopened.replay({})),
      [first, second],
      "reopen must replay normalized events in order",
    );
    const third = await reopened.append(validMetric("evt-003"));
    equal(third.sequence, 3, "reopen must continue the maximum sequence");
    await reopened.close();

    const capacityPath = `${files.root}/capacity.jsonl`;
    const capacity = files.createLog(capacityPath, 1);
    await capacity.append(validMetric());
    await rejects(
      () => capacity.append(validMetric("full")),
      "log_full",
      "file log must enforce capacity",
    );
    await capacity.close();

    const changedPath = `${files.root}/changed-while-open.jsonl`;
    const changed = files.createLog(changedPath);
    await changed.append(validMetric());
    await files.writeText(changedPath, `${header}{"record":"event"`);
    await rejects(
      () => changed.append(validMetric("after-corruption")),
      "log_corrupt",
      "append must rediscover corruption instead of repairing the log",
    );
    await changed.close();

    const corrupt = [
      ["empty.jsonl", "", "log_corrupt"],
      ["unterminated.jsonl", header.trimEnd(), "log_corrupt"],
      ["malformed-header.jsonl", "{\n", "log_corrupt"],
      ["scalar-header.jsonl", "1\n", "log_corrupt"],
      ["wrong-header.jsonl", '{"record":"event","schemaVersion":1}\n', "log_corrupt"],
      [
        "extra-header.jsonl",
        '{"record":"header","schemaVersion":1,"extra":true}\n',
        "log_corrupt",
      ],
      [
        "bad-header.jsonl",
        '{"record":"header","schemaVersion":2}\n',
        "unsupported_log_version",
      ],
      ["partial.jsonl", `${header}{"record":"event"`, "log_corrupt"],
      [
        "invalid-event.jsonl",
        `${header}{"record":"event","sequence":1,"event":{"kind":"alert"}}\n`,
        "log_corrupt",
      ],
      [
        "non-normalized-event.jsonl",
        `${header}${JSON.stringify({
          record: "event",
          sequence: 1,
          event: validAlert(),
        })}\n`,
        "log_corrupt",
      ],
      [
        "gap.jsonl",
        `${header}${JSON.stringify({
          record: "event",
          sequence: 2,
          event: validMetric(),
        })}\n`,
        "log_corrupt",
      ],
      ["blank.jsonl", `${header}\n`, "log_corrupt"],
      ["scalar-record.jsonl", `${header}1\n`, "log_corrupt"],
      [
        "unknown-record.jsonl",
        `${header}{"record":"unknown","sequence":1,"event":{}}\n`,
        "log_corrupt",
      ],
      [
        "bad-sequence.jsonl",
        `${header}${JSON.stringify({
          record: "event",
          sequence: "1",
          event: validMetric(),
        })}\n`,
        "log_corrupt",
      ],
    ] as const;
    for (const [name, contents, code] of corrupt) {
      const corruptPath = `${files.root}/${name}`;
      await files.writeText(corruptPath, contents);
      const corruptLog = files.createLog(corruptPath);
      await rejects(
        () => collect(corruptLog.replay({})),
        code,
        `${name} must fail closed`,
      );
      await corruptLog.close();
    }

    const invalidUtf8Path = `${files.root}/invalid-utf8.jsonl`;
    await files.writeBytes(invalidUtf8Path, new Uint8Array([0xff]));
    const invalidUtf8 = files.createLog(invalidUtf8Path);
    await rejects(
      () => collect(invalidUtf8.replay({})),
      "log_corrupt",
      "invalid UTF-8 must fail closed",
    );
    await invalidUtf8.close();
  } finally {
    await files.reset();
  }
}
