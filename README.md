# fastify-jaeger

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

This plugins supports all other options and configurations of the official [jaeger-client-node](https://github.com/jaegertracing/jaeger-client-node) throught the options object of the plugin.

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
  console.log('Server listenting on localhost:', fastify.server.address().port)
})
```

## License

Licensed under [MIT](./LICENSE).
