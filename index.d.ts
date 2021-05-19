import {Span} from 'opentracing';
import {FastifyPluginCallback} from 'fastify'

interface PluginOptions {
    serviceName?: string,
    reporter?: {
        logSpans?: boolean
    }
    exposeAPI?: boolean,
    state?: never,
    initTracerOpts?: never,

    [key: string]: unknown;
}

declare module 'fastify' {
    interface FastifyRequest {
        jaeger: () => { span: Span, tags: [string] }
    }
}

declare const fastifyJaeger: FastifyPluginCallback<PluginOptions>
export default fastifyJaeger;

