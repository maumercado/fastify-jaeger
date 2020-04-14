'use strict'

const Fastify = require('fastify')
const { test } = require('tap')
const spy = require('./helper')

test('Should error when initializing the plugin without serviceName argument', async ({ rejects }) => {
  const fastify = Fastify()
  const jaegerPlugin = require('../')

  rejects(
    async () => fastify.register(jaegerPlugin, { }).after(),
    {},
    'serviceName option should not be empty'
  )
})

test('Should initialize plugin with default configuration', async ({ resolves }) => {
  const fastify = Fastify()
  const jaegerPlugin = require('../')
  resolves(
    async () => fastify.register(jaegerPlugin, { serviceName: 'test' })
  )
})

test('Should initialize plugin with default configuration', async ({ teardown, is, has }) => {
  delete require.cache[require.resolve('jaeger-client')]
  delete require.cache[require.resolve(require('path').join(__dirname, '../index'))]
  require('jaeger-client')
  const initTracerSpy = spy(require.cache[require.resolve('jaeger-client')].exports.initTracer)
  require.cache[require.resolve('jaeger-client')].exports.initTracer = initTracerSpy

  const fastify = Fastify()

  teardown(async () => {
    delete require.cache[require.resolve('jaeger-client')]
    delete require.cache[require.resolve(require('path').join(__dirname, '../index'))]
    await fastify.close()
  })

  fastify.get('/', (req, reply) => {
    reply.code(200).send({ hello: 'world' })
  })

  fastify.register(require('../index'), { serviceName: 'test' })

  await fastify.ready()

  const response = await fastify.inject({ method: 'GET', url: '/' })
  is(initTracerSpy.spy.calls.length, 1)
  has(initTracerSpy.spy.calls[0][0], {
    serviceName: 'test',
    sampler: { type: 'const', param: 1 },
    reporter: { logSpans: false },
    state: undefined
  })

  has(initTracerSpy.spy.calls[0][1], {
    state: undefined,
    serviceName: 'test'
  })

  is(initTracerSpy.spy.calls[0][1].logger, fastify.log)
  is(response.statusCode, 200)
})
