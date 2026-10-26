# <img src="https://raw.githubusercontent.com/akai-ito/.github/main/profile/mark.svg" width="34" alt=""> ito-capabilities

**What Ito's agent can do, one package per capability.**

[![CI](https://github.com/akai-ito/ito-capabilities/actions/workflows/ci.yml/badge.svg)](https://github.com/akai-ito/ito-capabilities/actions/workflows/ci.yml)

> [!NOTE]
> The SDK and the first capability, Reports, are here. Ito's server installs this package with
> itself and runs each capability that's on as its own process.

## One definition, every door

A capability is one typed definition: its title and summary for Settings, its setup sheet's fields,
a skill for the agent, and its operations, each with an input schema written in
[Zod](https://zod.dev). From that definition Ito's server makes:

- an `ito <capability> <operation>` command for every operation, which the agent runs in its shell;
- an MCP tool for the few operations the agent needs on most turns, at most 20 across Ito;
- a setup sheet in Ari, drawn from the fields, with *Test connection*;
- a step on Ari's trail each time an operation runs.

Every call goes through the server, so a capability that's off is refused at once, and each
capability receives only its own setup values and secrets. The server and a capability speak the
[capability protocol](https://github.com/akai-ito/ito-core/tree/main/protocol);
`src/sdk` implements a capability's half of it, and `createTestCore` runs one in a test.

| Capability | Kind | What it does |
| --- | --- | --- |
| [Reports](src/reports) | hand | Files the gaps Ari hits as public issues on Ito's repositories |

## Working on it

```sh
npm ci              # builds dist/ too
npm test
npm run build       # after a change, for a server pointed here with ITO_CAPABILITIES
```

Point a local server at a working copy with `ITO_CAPABILITIES=/path/to/ito-capabilities`.
Capabilities run from `dist/`, because Node won't run TypeScript from inside another package's
`node_modules`, so the package builds itself whenever it's installed.

## Licence

Source-available under your choice of the
[PolyForm Noncommercial](LICENSES/PolyForm-Noncommercial-1.0.0.md) or
[PolyForm Small Business](LICENSES/PolyForm-Small-Business-1.0.0.md) licence; see
[LICENSE.md](LICENSE.md).
