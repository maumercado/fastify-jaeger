'use strict'

const assert = require('assert')
const fp = require('fastify-plugin')
const { initTracer, opentracing } = require('jaeger-client')
const url = require('url')

const { Tags, FORMAT_HTTP_HEADERS } = opentracing

function jaegerPlugin (fastify, opts, next) {
  assert(opts.serviceName, 'Jaeger Plugin requires serviceName option')
  const exposeAPI = opts.exposeAPI !== false
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

  function api () {
    const req = this
    return {
      get span () {
        return tracerMap.get(req)
      },
      Tags
    }
  }

  if (exposeAPI) {
    fastify.decorateRequest('jaeger', api)
  }

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
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, setContext(req.raw.headers))
    const span = tracer.startSpan(`${req.raw.method} - ${url.format(req.raw.url)}`, {
      childOf: parentSpanContext,
      tags: { [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER, [Tags.HTTP_METHOD]: req.raw.method, [Tags.HTTP_URL]: url.format(req.raw.url) }
    })

    tracerMap.set(req, span)
    done()
  }

  function onResponse (req, reply, done) {
    const span = tracerMap.get(req)
    span.setTag(Tags.HTTP_STATUS_CODE, reply.res.statusCode)
    done()
  }

  function onError (req, reply, error, done) {
    const span = tracerMap.get(req)
    span.setTag(Tags.ERROR, {
      'error.object': error,
      message: error.message,
      stack: error.stack
    })
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
