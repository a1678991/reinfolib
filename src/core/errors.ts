import type { ZodIssue } from "zod";

export type ReinfolibError =
  | { kind: "validation"; phase: "params" | "response"; issues: ZodIssue[] }
  | { kind: "api"; status: number; body: unknown; attempts: number }
  | { kind: "network"; cause: unknown; attempts: number }
  | { kind: "timeout"; timeoutMs: number; attempts: number }
  | { kind: "aborted"; cause: unknown };
