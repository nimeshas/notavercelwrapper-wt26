import { execa } from "execa";

export class CodeFetchError extends Error {
  constructor(
    message: string,
    public readonly logs: string,
  ) {
    super(message);
    this.name = "CodeFetchError";
  }
}

export async function cloneRepo(url: string, destination: string, signal?: AbortSignal): Promise<void> {
  const result = await execa("git", ["clone", "--depth", "1", url, destination], {
    reject: false,
    all: true,
    signal,
  });

  if (result.exitCode !== 0) {
    throw new CodeFetchError(`Failed to clone repository: ${url}`, result.all ?? "");
  }
}

export async function extractZip(file: string, destination: string, signal?: AbortSignal): Promise<void> {
  const result = await execa("unzip", ["-o", file, "-d", destination], {
    reject: false,
    all: true,
    signal,
  });

  if (result.exitCode !== 0) {
    throw new CodeFetchError(`Failed to extract zip: ${file}`, result.all ?? "");
  }
}
