# fastify-jaeger

> ## DEPRECATED
>
> **This package is deprecated and no longer maintained.**
>
> The underlying libraries (`jaeger-client` and `opentracing`) are end-of-life.
> The Jaeger project has fully migrated to [OpenTelemetry](https://opentelemetry.io/).
>
> **Please use [`@fastify/otel`](https://github.com/fastify/otel) instead** — the
> official Fastify OpenTelemetry instrumentation plugin, maintained by the Fastify team.
>
> ### Migration
>
> ```sh
> npm remove fastify-jaeger
> npm install @fastify/otel @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-http
> ```
>
> ```js
> // Setup OpenTelemetry SDK (run before importing fastify)
> const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
> const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
> const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base')
>
> const provider = new NodeTracerProvider()
> provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter({
>   url: 'http://localhost:4318/v1/traces' // Jaeger OTLP endpoint
> })))
> provider.register()
>
> // Register the Fastify plugin
> const fastify = require('fastify')()
> fastify.register(require('@fastify/otel'), { serviceName: 'my-service' })
> ```
>
> Jaeger natively supports OTLP ingestion (port 4317 for gRPC, 4318 for HTTP)
> since Jaeger v1.35+. No Jaeger-specific client library is needed.

---

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
[![Lint, Test](https://github.com/maumercado/fastify-jaeger/workflows/Lint,%20Test/badge.svg?branch=master)](https://github.com/maumercado/fastify-jaeger/actions?query=workflow%3A%22Lint%2C+Test%22)

Fastify plugin for Jaeger distributed tracing system.

## Install

```sh
npm install fastify-jaeger
```

## Usage
Require the plugin and register it within Fastify, the pass the following options: `{ serviceName [, exposeAPI] }`

*exposeAPI: (true by default)* Exposes the Span API, binded to the current request, which allows the user to setTags, and log the current span.

This plugins supports all options and configurations of [jaeger-client-node's `initTracer` method](https://github.com/jaegertracing/jaeger-client-node#initialization).

- The options param can be configured via `opts.initTracerOpts`
- All other top-level `opts` will be passed in as the config param.

It uses the logger set to the fastify instance as the tracer logger.

```js
const fastify = require('fastify')()

fastify.register(require('fastify-jaeger'), {
  serviceName: 'my-service-name'
})

fastify.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on localhost:', fastify.server.address().port)
})
```

## License

Licensed under [MIT](./LICENSE).
