import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export const createLink = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/links',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(4),
          url: z.string().url(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params
      const { title, url } = request.body

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      })

      if (!trip) {
        throw new Error('Link não encontrado.')
      }

      const link = await prisma.link.create({
        data: {
          title,
          url,
          trip_id: tripId,
        },
      })

      return {
        link: link.id,
      }
    }
  )
}
