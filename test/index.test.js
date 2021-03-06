'use strict'

const createFastify = require('fastify')
const { test } = require('tap')
const spy = require('./helper')

test('Should error when initializing the plugin without serviceName argument', async ({ throws }) => {
  const fastify = createFastify()
  const jaegerPlugin = require('../')

  throws(
    () => {
      fastify.register(jaegerPlugin, { }).after()
    },
    {},
    'serviceName option should not be empty'
  )
})

test('Should not expose jaeger api when explicitly set to false', async ({ teardown, is }) => {
  const fastify = createFastify()

  teardown(async () => {
    await fastify.close()
  })

  fastify.register(require('../index'), { serviceName: 'test', exposeAPI: false })

  await fastify.ready()

  is(fastify.hasRequestDecorator('jaeger'), false)
})

const setupTracerTest = (pluginOpts) => {
  const clear = () => {
    delete require.cache[require.resolve('jaeger-client')]
    delete require.cache[require.resolve(require('path').join(__dirname, '../index'))]
  }

  clear()
  require('jaeger-client')
  const initTracerSpy = spy(require.cache[require.resolve('jaeger-client')].exports.initTracer)
  require.cache[require.resolve('jaeger-client')].exports.initTracer = initTracerSpy

  const fastify = createFastify()
  fastify.get('/', (req, reply) => {
    reply.code(200).send({ hello: 'world' })
  })

  fastify.register(require('../index'), pluginOpts)

  return {
    fastify,
    initTracerSpy,
    teardownCb: async () => {
      clear()
      await fastify.close()
    }
  }
}

test('should use default config when no configuration is provided', async ({ teardown, is, has }) => {
  const { fastify, initTracerSpy, teardownCb } = setupTracerTest({ serviceName: 'test' })

  teardown(teardownCb)

  await fastify.ready()
  const response = await fastify.inject({ method: 'GET', url: '/' })

  is(initTracerSpy.spy.calls.length, 1)
  has(initTracerSpy.spy.calls[0][0], {
    serviceName: 'test',
    sampler: { type: 'const', param: 1 },
    reporter: { logSpans: false }
  })
  has(initTracerSpy.spy.calls[0][1], { logger: fastify.log })
  is(fastify.hasRequestDecorator('jaeger'), true)
  is(response.statusCode, 200)
})

test('should merge default config with the user provided config', async ({ teardown, is, has }) => {
  const { fastify, initTracerSpy, teardownCb } = setupTracerTest({
    serviceName: 'test',
    reporter: {
      logSpans: true
    },
    initTracerOpts: {
      tags: {
        foo: 'bar'
      }
    }
  })

  teardown(teardownCb)

  await fastify.ready()
  const response = await fastify.inject({ method: 'GET', url: '/' })

  is(initTracerSpy.spy.calls.length, 1)
  has(initTracerSpy.spy.calls[0][0], {
    serviceName: 'test',
    sampler: { type: 'const', param: 1 },
    reporter: { logSpans: true }
  })
  has(initTracerSpy.spy.calls[0][1], {
    logger: fastify.log,
    tags: {
      foo: 'bar'
    }
  })
  has(initTracerSpy.spy.results[0].value, { _tags: { foo: 'bar' } })
  is(fastify.hasRequestDecorator('jaeger'), true)
  is(response.statusCode, 200)
})

test('Should set proper tag values', async ({ teardown, same }) => {
  const fastify = createFastify()
  const route = '/test'
  const method = 'GET'
  teardown(async () => {
    await fastify.close()
  })

  fastify[method.toLowerCase()](route, (req, reply) => {
    const tagMethod = req.jaeger().span._tags.find(tag => tag.key === 'http.method')
    const tagRoute = req.jaeger().span._tags.find(tag => tag.key === 'http.url')
    same(tagRoute, { key: 'http.url', value: route })
    same(tagMethod, { key: 'http.method', value: method })
    reply.code(200).send({ hello: 'world' })
  })

  fastify.register(require('../index'), { serviceName: 'test', exposeAPI: true })

  await fastify.ready()

  await fastify.inject({
    method,
    url: route
  })
})

test('Should set proper tag values on error', async ({ teardown, is, same, plan }) => {
  const fastify = createFastify()
  const route = '/error'
  const method = 'GET'
  const testErr = new Error('test error')
  let finalRequest
  teardown(async () => {
    await fastify.close()
  })

  fastify[method.toLowerCase()](route, async (req, reply) => {
    finalRequest = req

    throw testErr
  })

  fastify.register(require('../index'), { serviceName: 'test', exposeAPI: true })

  await fastify.ready()

  await fastify.inject({
    method,
    url: route
  })

  const tagError = finalRequest.jaeger().span._tags.find(tag => tag.key === 'error')
  is(tagError.key, 'error')
  same(tagError.value, { 'error.object': testErr, message: testErr.message, stack: testErr.stack })
})

test('Should set proper tag values on response', async ({ teardown, is }) => {
  const fastify = createFastify()
  const route = '/restest'
  const method = 'GET'
  let finalRequest

  teardown(async () => {
    await fastify.close()
  })

  fastify[method.toLowerCase()](route, async (req, reply) => {
    finalRequest = req
    return {}
  })

  fastify.register(require('../index'), { serviceName: 'test', exposeAPI: true })

  await fastify.ready()

  await fastify.inject({
    method,
    url: route
  })
  const tagRes = finalRequest.jaeger().span._tags.find(tag => tag.key === 'http.status_code')
  is(tagRes.key, 'http.status_code')
  is(tagRes.value, 200)
})
