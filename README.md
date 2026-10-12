# <img src="https://raw.githubusercontent.com/akai-ito/.github/main/profile/mark.svg" width="34" alt=""> ito-capabilities

**What Ito's agent can do, one package per capability.**

[![CI](https://github.com/akai-ito/ito-capabilities/actions/workflows/ci.yml/badge.svg)](https://github.com/akai-ito/ito-capabilities/actions/workflows/ci.yml)

> [!NOTE]
> Nothing is built yet. The first capability, the Thread, arrives in slice 2. The
> [map](https://github.com/akai-ito/.github/blob/main/map.md) has the design and the plan.

## One operation, two doors

Each operation is written once, typed, and becomes an `ito` command, such as `ito mail search`.
The few the agent needs on most turns are also MCP tools, at most 20 across all capabilities,
because every tool's definition is sent with every turn. Each capability ships a skill that
documents its commands, which the agent reads only when it needs them, and you can run the same
commands yourself.

## Licence

Source-available under your choice of the
[PolyForm Noncommercial](LICENSES/PolyForm-Noncommercial-1.0.0.md) or
[PolyForm Small Business](LICENSES/PolyForm-Small-Business-1.0.0.md) licence; see
[LICENSE.md](LICENSE.md).
