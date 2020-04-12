'use strict'

const assert = require('assert')
const fp = require('fastify-plugin')
const { initTracer } = require('jaeger-client')
const url = require('url')

function jaegerPlugin (fastify, opts, next) {
  assert(opts.serviceName, 'Jaeger Plugin requires serviceName option')

  const tracerConfig = {
    serviceName: opts.serviceName,
    sampler: {
      type: 'const',
      param: 1
    },
    reporter: {
      logSpans: false
    }
  }

  const tracerOptions = {
    logger: fastify.log
  }

  const tracer = initTracer({ ...tracerConfig, ...opts }, { ...tracerOptions, ...opts })

  fastify.decorateRequest('span', '')

  function onRequest (req, res, done) {
    const parentSpanContext = tracer.extract('http_headers', req.raw.headers)
    const span = tracer.startSpan(`${req.raw.method} - ${url.format(req.raw.url)}`, {
      childOf: parentSpanContext,
      tags: { 'span.kind': 'producer', 'http.method': req.raw.method, 'http.url': url.format(req.raw.url) }
    })

    req.span = span
    done()
  }

  function onResponse (req, reply, done) {
    req.span.log({ statusCode: reply.res.statusCode })
    req.span.finish()
    done()
  }

  function onError (req, reply, error, done) {
    req.span.setTag('error', error)
    req.span.setTag('http.method', req.raw.method)
    done()
  }

  function onClose (instance, done) {
    tracer.close(done)
  }

  fastify.addHook('onRequest', onRequest)
  fastify.addHook('onResponse', onResponse)
  fastify.addHook('onError', onError)
  fastify.addHook('onClose', onClose)

  next()
}

module.exports = fp(jaegerPlugin, { name: 'fastify-jaeger' })
