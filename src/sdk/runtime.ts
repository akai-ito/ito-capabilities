import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { createCell } from "./cell.ts";
import {
  capabilityProtocol,
  toManifest,
  type Capability,
  type Context,
  type Server,
  type Status,
  type Values,
} from "./capability.ts";

type RequestId = number | string;

type Message = {
  readonly id?: RequestId;
  readonly method?: string;
  readonly params?: Readonly<Record<string, unknown>>;
};

type Answer = { readonly result: unknown } | { readonly error: { readonly code: number; readonly message: string } };

type Started = { readonly values: Values; readonly folder: string; readonly server: Server };

export type Streams = { readonly input: Readable; readonly output: Writable; readonly onClose?: () => void };

const refused = (message: string): Answer => ({ error: { code: 1, message } });

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const isRequestId = (value: unknown): value is RequestId => typeof value === "number" || typeof value === "string";

const parse = (line: string): Message | undefined => {
  try {
    const value: unknown = JSON.parse(line);
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const processStreams: Streams = {
  input: process.stdin,
  output: process.stdout,
  onClose: () => {
    process.exit(0);
  },
};

export const runCapability = (capability: Capability, { input, output, onClose }: Streams = processStreams): void => {
  const started = createCell<Started | undefined>(undefined);
  const calls = createCell<ReadonlyMap<RequestId, AbortController>>(new Map());

  const send = (message: Readonly<Record<string, unknown>>): void => {
    if (output.writable) output.write(`${JSON.stringify(message)}\n`);
  };

  const status = (given: Status): void => {
    send({ method: "status", params: given });
  };

  const contextOf = ({ values, folder, server }: Started): Context => ({ values, folder, server, status });

  const start = async (parameters: Readonly<Record<string, unknown>>): Promise<Answer> => {
    const given: Started = {
      values: (parameters.values ?? {}) as Values,
      folder: typeof parameters.folder === "string" ? parameters.folder : "",
      server: (parameters.server ?? { version: "", engine: "" }) as Server,
    };
    const begun = capability.start ? await capability.start(contextOf(given)) : undefined;
    if (begun && !begun.ok) return refused(begun.failure);
    started.set(given);
    return { result: {} };
  };

  const check = async (parameters: Readonly<Record<string, unknown>>): Promise<Answer> => {
    const values = (parameters.values ?? {}) as Values;
    const server = started.get()?.server ?? { version: "", engine: "" };
    const problem = capability.check ? await capability.check(values, server) : undefined;
    return { result: problem === undefined ? {} : { problem } };
  };

  const call = async (id: RequestId, parameters: Readonly<Record<string, unknown>>): Promise<Answer> => {
    const current = started.get();
    if (!current) return refused(`${capability.title} hasn't started.`);
    const operation = capability.operations.find((candidate) => candidate.name === parameters.operation);
    if (!operation) return refused(`${capability.title} has no operation ${String(parameters.operation)}.`);
    const input = operation.input.safeParse(parameters.input ?? {});
    if (!input.success) {
      const problems = input.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
      return refused(`That input doesn't fit: ${problems.join("; ")}.`);
    }
    const controller = new AbortController();
    calls.update((current) => new Map([...current, [id, controller]]));
    try {
      const turn = typeof parameters.turn === "string" ? parameters.turn : undefined;
      const result = await operation.run(input.data, {
        ...contextOf(current),
        ...(turn !== undefined && { turn }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return refused("Cancelled.");
      return result.ok ? { result: result.value } : refused(result.failure);
    } finally {
      calls.update((current) => new Map([...current].filter(([key]) => key !== id)));
    }
  };

  const answer = async (
    id: RequestId,
    method: string,
    parameters: Readonly<Record<string, unknown>>,
  ): Promise<Answer> => {
    switch (method) {
      case "initialize": {
        return { result: { protocol: capabilityProtocol, manifest: toManifest(capability) } };
      }
      case "start": {
        return start(parameters);
      }
      case "check": {
        return check(parameters);
      }
      case "call": {
        return call(id, parameters);
      }
      default: {
        return { error: { code: -32_601, message: `${capability.title} doesn't handle ${method}.` } };
      }
    }
  };

  const receive = (line: string): void => {
    const message = parse(line);
    if (!message) {
      process.stderr.write(`Unreadable message: ${line}\n`);
      return;
    }
    const { id, method = "", params: parameters = {} } = message;
    if (method === "cancel") {
      calls
        .get()
        .get(parameters.id as RequestId)
        ?.abort();
      return;
    }
    if (!isRequestId(id)) return;
    void (async () => {
      try {
        send({ id, ...(await answer(id, method, parameters)) });
      } catch (error) {
        process.stderr.write(`${capability.title} failed on ${method}: ${describe(error)}\n`);
        send({ id, ...refused(`${capability.title} hit an unexpected error: ${describe(error)}`) });
      }
    })();
  };

  const lines = createInterface({ input, crlfDelay: Infinity });
  lines.on("line", (line) => {
    if (line.trim() !== "") receive(line);
  });
  lines.on("close", () => {
    onClose?.();
  });
};
