# cloudflare-workers-unirate

Cloudflare Worker template that serves currency exchange rates via the [UniRate API](https://unirateapi.com), built with [Hono](https://hono.dev).

Deploy a lightweight edge proxy that keeps your UniRate API key server-side while exposing clean JSON endpoints to your frontend.

<!-- dash-content-start -->

## Features

- Three ready-to-use endpoints: exchange rates, currency conversion, supported currencies
- API key stays in Cloudflare secrets — never exposed to browsers
- Input validation and sanitization on all currency codes and amounts
- Correct HTTP error codes mirrored from UniRate (401, 403, 404, 429, 502)
- Zero runtime dependencies beyond Hono
- TypeScript throughout

<!-- dash-content-end -->

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/UniRate-API/cloudflare-workers-unirate
cd cloudflare-workers-unirate
npm install

# 2. Add your UniRate API key as a Wrangler secret
wrangler secret put UNIRATE_API_KEY

# 3. Run locally
npm run dev

# 4. Deploy
npm run deploy
```

Get a free UniRate API key at [unirateapi.com](https://unirateapi.com).

## Endpoints

All endpoints accept query parameters and return JSON.

### `GET /rate`

Current exchange rate between two currencies.

| Param | Required | Default | Description |
|---|---|---|---|
| `from` | no | `USD` | Source currency (3-letter ISO code) |
| `to` | no | — | Target currency. Omit to return all rates for `from` |

```bash
# Single pair
curl https://your-worker.workers.dev/rate?from=USD&to=EUR
# → {"rate":"0.92"}

# All rates for USD
curl https://your-worker.workers.dev/rate?from=USD
# → {"rates":{"EUR":"0.92","GBP":"0.79",...}}
```

### `GET /convert`

Convert an amount between two currencies.

| Param | Required | Default | Description |
|---|---|---|---|
| `from` | no | `USD` | Source currency |
| `to` | yes | — | Target currency |
| `amount` | no | `1` | Amount to convert (positive number) |

```bash
curl "https://your-worker.workers.dev/convert?from=USD&to=EUR&amount=100"
# → {"result":"92.50"}
```

### `GET /currencies`

List all supported currency codes.

```bash
curl https://your-worker.workers.dev/currencies
# → {"currencies":["USD","EUR","GBP",...]}
```

## Error responses

| Status | Meaning |
|---|---|
| `400` | Missing or invalid parameter |
| `401` | Invalid API key |
| `403` | Endpoint requires a Pro subscription |
| `404` | Currency not found |
| `429` | Rate limit exceeded |
| `502` | UniRate upstream error |

```json
{"error":"Missing or invalid \"to\" parameter"}
```

## Running tests

```bash
npm test
```

21 mock tests covering all routes, error paths, currency code validation, header behaviour, and API key non-exposure.

## Free vs Pro tier

Free tier covers `/rate`, `/convert`, and `/currencies`. Historical endpoints require a [Pro subscription](https://unirateapi.com/pricing) and are not included in this template.

## Related packages

<!-- unirate-ecosystem-start -->
**UniRate API client libraries:** [Python](https://github.com/UniRate-API/unirate-api-python) · [Node.js](https://github.com/UniRate-API/unirate-api-nodejs) · [Go](https://github.com/UniRate-API/unirate-api-go) · [Rust](https://github.com/UniRate-API/unirate-api-rust) · [Ruby](https://github.com/UniRate-API/unirate-api-ruby) · [PHP](https://github.com/UniRate-API/unirate-api-php) · [Java](https://github.com/UniRate-API/unirate-api-java) · [Swift](https://github.com/UniRate-API/unirate-api-swift) · [.NET](https://github.com/UniRate-API/unirate-api-dotnet)

**Framework integrations:** [Next.js](https://github.com/UniRate-API/next-unirate) · [Nuxt](https://github.com/UniRate-API/nuxt-unirate) · [SvelteKit](https://github.com/UniRate-API/sveltekit-unirate) · [Astro](https://github.com/UniRate-API/astro-unirate) · [NestJS](https://github.com/UniRate-API/nestjs-unirate) · [Remix](https://github.com/UniRate-API/remix-unirate) · [Angular](https://github.com/UniRate-API/angular-unirate) · [Vue](https://github.com/UniRate-API/vue-unirate) · [React](https://github.com/UniRate-API/react-unirate)

**CMS / e-commerce:** [Strapi](https://github.com/UniRate-API/strapi-plugin-unirate) · [Directus](https://github.com/UniRate-API/directus-extension-unirate) · [Medusa](https://github.com/UniRate-API/medusa-plugin-unirate) · [WordPress](https://github.com/UniRate-API/unirate-currency-converter) · [Drupal](https://github.com/UniRate-API/drupal-unirate) · [Wagtail](https://github.com/UniRate-API/wagtail-unirate) · [Django REST](https://github.com/UniRate-API/djangorestframework-unirate)

**PHP ecosystem:** [Laravel Money](https://github.com/UniRate-API/laravel-money-unirate) · [Symfony Bundle](https://github.com/UniRate-API/unirate-bundle)

**Data & AI:** [LangChain Python](https://github.com/UniRate-API/langchain-unirate) · [LangChain.js](https://github.com/UniRate-API/langchain-js-unirate) · [FastAPI](https://github.com/UniRate-API/fastapi-unirate) · [Flask](https://github.com/UniRate-API/flask-unirate) · [dbt](https://github.com/UniRate-API/dbt-unirate) · [Airflow](https://github.com/UniRate-API/airflow-provider-unirate)

**Platform:** [MCP server](https://github.com/UniRate-API/unirate-mcp) · [CLI](https://github.com/UniRate-API/unirate-cli) · [Home Assistant](https://github.com/UniRate-API/unirate-home-assistant) · **Cloudflare Workers** (this template) · [Jekyll](https://github.com/UniRate-API/jekyll-unirate) · [Hugo](https://github.com/UniRate-API/hugo-unirate) · [Eleventy](https://github.com/UniRate-API/eleventy-unirate) · [Astro](https://github.com/UniRate-API/astro-unirate)
<!-- unirate-ecosystem-end -->

## License

MIT © Unirate Team
