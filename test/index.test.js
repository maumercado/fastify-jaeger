'use strict'

const Fastify = require('fastify')
const { test } = require('tap')
const path = require('path')
const { spy } = require('sinon')

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

test('Should initialize plugin with default configuration', async ({ }) => {
  const fastify = Fastify()
  delete require.cache[path.join(__dirname, '../index.js')]
  delete require.cache[require.resolve('jaeger-client')]
  require('jaeger-client')
  const initTracerSpy = spy(require.cache[require.resolve('jaeger-client')].exports.initTracer)
  require.cache[require.resolve('jaeger-client')].exports.initTracer = initTracerSpy

  console.log(initTracerSpy, 'WWWAT')

  const jaegerPlugin = require('../')

  await fastify.register(jaegerPlugin, { serviceName: 'test' })

  await fastify.get('/', (req, reply) => {
    reply.code(200).send({ hello: 'world' })
  })

  console.log(initTracerSpy.called)
})
