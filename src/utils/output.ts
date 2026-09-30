import { getServerConfig } from "../config.js";

export interface Truncation {
  field: string;
  returnedBytes: number;
  totalBytes: number;
}

export interface LimitedText {
  text: string;
  truncated?: Truncation;
}

export function limitText(value: string, field: string, maxBytes = getServerConfig().maxOutputBytes): LimitedText {
  const totalBytes = Buffer.byteLength(value, "utf8");
  if (totalBytes <= maxBytes) {
    return { text: value };
  }

  const bytes = Buffer.from(value, "utf8");
  let end = maxBytes;
  // Back up to a character boundary so a multi-byte character is not cut in
  // half and decoded as a replacement character.
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end -= 1;
  }

  const limited = bytes.subarray(0, end).toString("utf8");
  return {
    text: limited,
    truncated: {
      field,
      returnedBytes: Buffer.byteLength(limited, "utf8"),
      totalBytes,
    },
  };
}

export function compactTruncations(values: Array<Truncation | undefined>): Truncation[] | undefined {
  const truncations = values.filter((value): value is Truncation => value !== undefined);
  return truncations.length > 0 ? truncations : undefined;
}
