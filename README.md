# R10Progress

Track and visualize your golf shot progress from the Garmin Approach R10 Radar.

This is a self-hosted fork: a React SPA backed by a small Node/Express + SQLite server, packaged as a single Docker image.

## Features

- **Data Import**: Upload Garmin R10 CSV exports (EN/DE/ES/NL multi-language support).
- **Data Visualization**: Dispersion charts and performance trends via Vega/ECharts.
- **Interactive Tables**: ag-Grid-powered shot table with filtering and sorting.
- **AI Shot Analysis**: OpenAI-powered analysis of your sessions (requires API key).
- **Goals** (WIP): Set and track shot metric goals.
- **No account required**: all data stays on your machine — no Firebase, no cloud sync.

## How to Use

1. Capture shots with your R10 during practice.
2. Export the session as CSV from the Garmin Golf app.
3. Open R10Progress and upload the CSV.
4. Browse charts and tables to analyze your performance.

## Getting Started (Development)

Requires Node 22 and pnpm.

```bash
git clone https://github.com/thraizz/R10Progress.git
cd R10Progress
pnpm install
pnpm --dir server install
pnpm dev
```

`pnpm dev` runs Vite (port 5173) and the API server concurrently. The SQLite database is created on first run.

## Running with Docker

```bash
docker build -t r10progress .
docker run -p 8080:8080 -v r10progress-data:/data r10progress
```

The container serves the SPA and API on port 8080. SQLite data is persisted to the `/data` volume.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — | Required for AI shot analysis |
| `PORT` | `8080` | HTTP port |
| `DATA_DIR` | `{cwd}/data` | Directory for `sqlite.db` |
| `STATIC_DIR` | `{cwd}/dist` | Path to built SPA |

Pass variables with `-e`:

```bash
docker run -p 8080:8080 -v r10progress-data:/data \
  -e OPENAI_API_KEY=sk-... \
  r10progress
```

## Contributing

Fork and submit a PR.

## Support

File an issue on GitHub.
If you want to support upstream development, [buy the original author a coffee](https://buymeacoffee.com/aronschueler).

## License

[GNU LGPLv3](https://opensource.org/license/lgpl-3-0/).

## Disclaimer

R10Progress is not affiliated with Garmin Ltd. Garmin is a registered trademark of Garmin Ltd.
