// A discriminated union models "one of these valid states" without optional
// fields for data that does not belong to the current state. The shared `state`
// property is the key TypeScript uses to narrow each branch.
type Download =
  | { readonly state: "waiting" }
  | { readonly state: "running"; readonly percent: number }
  | { readonly state: "complete"; readonly fileName: string }
  | { readonly state: "failed"; readonly message: string };

// `never` is the type of a value that should be impossible. If a new Download
// state is added later, the default branch stops type-checking until it is
// handled above.
function assertNever(value: never): never {
  throw new Error(`Unhandled download state: ${JSON.stringify(value)}`);
}

function describeDownload(download: Download): string {
  // Each case has access only to the fields that exist for that state.
  switch (download.state) {
    case "waiting":
      return "Waiting to start";
    case "running":
      return `Downloaded ${download.percent}%`;
    case "complete":
      return `Saved ${download.fileName}`;
    case "failed":
      return `Failed: ${download.message}`;
    default:
      return assertNever(download);
  }
}

const downloads: Download[] = [
  { state: "waiting" },
  { state: "running", percent: 60 },
  { state: "complete", fileName: "lesson.txt" },
];

for (const download of downloads) {
  console.log(describeDownload(download));
}
