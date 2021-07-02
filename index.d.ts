import { Span } from 'opentracing'
import { FastifyPluginCallback } from 'fastify'
import { TracingConfig, TracingOptions } from 'jaeger-client'

interface PluginOptions extends TracingConfig {
    exposeAPI?: boolean,
    state?: never,
    initTracerOpts?: TracingOptions,
}

declare module 'fastify' {
    interface FastifyRequest {
        jaeger: () => { span: Span, tags: [string] }
    }
}

declare const fastifyJaeger: FastifyPluginCallback<PluginOptions>
export default fastifyJaeger;

