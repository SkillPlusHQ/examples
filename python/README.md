# python

One of three parallel SkillPlus SDK examples — see [../README.md](../README.md)
for the map. All three do the same five steps; this is the python one.

## Run it

```bash
python -m venv .venv && . .venv/bin/activate
pip install -e .
cp .env.example .env && export $(grep -v "^#" .env | xargs)
python -m skillplus_example https://www.skills.sh/vercel-labs/skills/find-skills
```

A GitHub URL works the same way, and `/tree/<branch>/<path>` picks one skill out
of a repo that holds many:

```bash
python -m skillplus_example https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
```

## The five steps

| Step | File |
|---|---|
| 1. build a client | [`src/skillplus_example/client.py`](src/skillplus_example/client.py) |
| 2. `query` | [`src/skillplus_example/lookup.py`](src/skillplus_example/lookup.py) |
| 3. `scan` | [`src/skillplus_example/lookup.py`](src/skillplus_example/lookup.py) |
| 4. read the report | [`src/skillplus_example/report.py`](src/skillplus_example/report.py) |
| 5. `get_report` / badge | [`src/skillplus_example/badge.py`](src/skillplus_example/badge.py) |

`__main__.py` wires them together.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | verdict is `safe` or `medium` |
| `1` | verdict is `high` or `unknown` |
| `2` | misconfigured, or the API could not be reached |

`2` is deliberately distinct from `1`: an outage is not a verdict, and code that
treats "could not check" as "clean" turns a SkillPlus incident into a silent
pass. That is the single most important line to copy out of this example.

## Concurrency

The client is `httpx`-backed and safe to share across threads. Auditing a whole
catalogue is I/O-bound, so a `ThreadPoolExecutor` is the right tool — a process
pool would only add overhead.
