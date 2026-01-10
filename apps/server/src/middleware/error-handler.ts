import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { isAequiError, toAequiError, ErrorCode } from '@aequi/core'
import { ZodError } from 'zod'

export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const logger = request.log

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({ err: error, path: request.url }, 'Validation error')
    return reply.status(400).send({
      error: ErrorCode.INVALID_REQUEST,
      message: 'Validation failed',
      statusCode: 400,
      details: error.flatten(),
      timestamp: Date.now(),
    })
  }

  // Convert to AequiError if needed
  const aequiError = isAequiError(error) ? error : toAequiError(error)

  // Log based on severity
  if (aequiError.statusCode >= 500) {
    logger.error(
      {
        err: error,
        code: aequiError.code,
        metadata: aequiError.metadata,
        path: request.url,
        method: request.method,
      },
      'Internal server error',
    )
  } else if (aequiError.statusCode >= 400) {
    logger.warn(
      {
        code: aequiError.code,
        metadata: aequiError.metadata,
        path: request.url,
      },
      'Client error',
    )
  }

  // Send response
  return reply.status(aequiError.statusCode).send(aequiError.toJSON())
}
