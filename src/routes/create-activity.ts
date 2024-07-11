import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { dayjs } from '../lib/dayjs'
import { ClientError } from '../errors/client-error'

export const createActivity = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(4),
          occours_at: z.coerce.date(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params
      const { title, occours_at } = request.body

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
      })

      if (!trip) {
        throw new ClientError('Viagem não encontrada.')
      }

      if (dayjs(occours_at).isBefore(trip.starts_at)) {
        throw new ClientError('Data de atividade inválida.')
      }

      if (dayjs(occours_at).isAfter(trip.ends_at)) {
        throw new ClientError('Data de atividade inválida.')
      }

      const activity = await prisma.activity.create({
        data: {
          title,
          occours_at,
          trip_id: tripId,
        },
      })

      return {
        activity: activity.id,
      }
    }
  )
}
