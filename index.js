'use strict'

const assert = require('assert')
const fp = require('fastify-plugin')
const { initTracer } = require('jaeger-client')
const url = require('url')

function jaegerPlugin (fastify, opts, next) {
  assert(opts.serviceName, 'Jaeger Plugin requires serviceName option')

  const { state } = opts
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

  const tracerDefaults = { state, ...opts }

  const tracer = initTracer({ ...tracerConfig, ...tracerDefaults }, { ...tracerOptions, ...tracerDefaults })

  const tracerMap = new WeakMap()

  function getTraceAndTracer () {
    return {
      get span () {
        return opts.exposeAPI ? tracerMap.get(this) : () => {}
      }
    }
  }

  fastify.decorateRequest('jaeger', getTraceAndTracer)

  function filterObject (obj) {
    const ret = {}
    Object.keys(obj)
      .filter((key) => obj[key] != null)
      .forEach((key) => { ret[key] = obj[key] })

    return ret
  }

  function setContext (headers) {
    return filterObject({ ...headers, ...state })
  }

  function onRequest (req, res, done) {
    const parentSpanContext = tracer.extract('http_headers', setContext(req.raw.headers))
    const span = tracer.startSpan(`${req.raw.method} - ${url.format(req.raw.url)}`, {
      childOf: parentSpanContext,
      tags: { 'span.kind': 'producer', 'http.method': req.raw.method, 'http.url': url.format(req.raw.url) }
    })

    tracerMap.set(req, span)
    done()
  }

  function onResponse (req, reply, done) {
    const span = tracerMap.get(this)
    span.log({ statusCode: reply.res.statusCode })
    done()
  }

  function onError (req, reply, error, done) {
    const span = tracerMap.get(this)
    span.setTag('error', error)
    span.setTag('http.method', req.raw.method)
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
