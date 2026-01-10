import type { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'

export async function requestIdHook(request: FastifyRequest, reply: FastifyReply) {
  const requestId = (request.headers['x-request-id'] as string) || randomUUID()
  request.headers['x-request-id'] = requestId
  reply.header('x-request-id', requestId)
  
  // Bind request ID to logger
  request.log = request.log.child({ requestId })
}
