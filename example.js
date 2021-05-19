'use strict'

const fastify = require('fastify')({ logger: true })
const jaegerPlugin = require('./')

fastify.register(jaegerPlugin, {
  serviceName: 'test-service'
})

fastify.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on localhost:', fastify.server.address().port)
})
