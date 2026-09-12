import { randomInt } from "crypto";

// Excludes visually ambiguous characters (0/O, 1/I) to reduce transcription
// errors when a participant needs to read their ID back to a researcher.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const PREFIX = "SRM";

export function generateParticipantCode(): string {
  let suffix = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    suffix += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return `${PREFIX}-${suffix}`;
}

export function generateSessionCode(): string {
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return `SESS-${suffix}`;
}
