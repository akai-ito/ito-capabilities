import { z } from "zod";
import type { Result } from "./result.ts";

export { fail, ok, type Result } from "./result.ts";

export const capabilityProtocol = "0.1";

export type Values = Readonly<Record<string, string | boolean>>;

export type Field = {
  readonly name: string;
  readonly kind: "text" | "secret" | "toggle" | "choice";
  readonly title: string;
  readonly description?: string;
  readonly optional?: boolean;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
};

export type Status = { readonly state: "ok" | "needs_you"; readonly detail?: string };

export type Server = { readonly version: string; readonly engine: string };

export type Context = {
  readonly values: Values;
  readonly folder: string;
  readonly server: Server;
  readonly status: (status: Status) => void;
};

export type CallContext = Context & { readonly turn?: string; readonly signal: AbortSignal };

export type CallResult = { readonly text: string; readonly data?: Readonly<Record<string, unknown>> };

export type Operation<Input extends z.ZodObject = z.ZodObject> = {
  readonly name: string;
  readonly title: string;
  readonly running: string;
  readonly done: string;
  readonly description: string;
  readonly input: Input;
  readonly tool?: string;
  readonly publishes?: boolean;
  readonly run: (input: z.infer<Input>, context: CallContext) => Promise<Result<CallResult, string>>;
};

export type Capability = {
  readonly id: string;
  readonly version: string;
  readonly kind: "domain" | "hand";
  readonly title: string;
  readonly symbol?: string;
  readonly summary: string;
  readonly skill: string;
  readonly uses: { readonly hosts: readonly string[]; readonly folders: readonly string[] };
  readonly setup: readonly Field[];
  readonly operations: readonly Operation[];
  readonly start?: (context: Context) => Promise<Result<undefined, string>>;
  readonly check?: (values: Values, server: Server) => Promise<string | undefined>;
};

export const defineOperation = <Input extends z.ZodObject>(operation: Operation<Input>): Operation => operation;

export const defineCapability = (capability: Capability): Capability => capability;

const toInputSchema = (input: z.ZodObject): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(z.toJSONSchema(input)).filter(([key]) => key !== "$schema"));

export const toManifest = ({
  id,
  version,
  kind,
  title,
  symbol,
  summary,
  skill,
  uses,
  setup,
  operations,
}: Capability): Readonly<Record<string, unknown>> => ({
  id,
  version,
  kind,
  title,
  ...(symbol !== undefined && { symbol }),
  summary,
  setup,
  operations: operations.map(({ name, title: operationTitle, running, done, description, input, tool, publishes }) => ({
    name,
    title: operationTitle,
    running,
    done,
    description,
    input: toInputSchema(input),
    ...(tool !== undefined && { tool }),
    ...(publishes === true && { publishes }),
  })),
  skill,
  uses,
});
