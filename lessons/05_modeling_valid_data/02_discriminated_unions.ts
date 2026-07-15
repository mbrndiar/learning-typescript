type Download =
  | { readonly state: "waiting" }
  | { readonly state: "running"; readonly percent: number }
  | { readonly state: "complete"; readonly fileName: string }
  | { readonly state: "failed"; readonly message: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled download state: ${JSON.stringify(value)}`);
}

function describeDownload(download: Download): string {
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
