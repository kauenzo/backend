import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import dayjs from 'dayjs'
import { ClientError } from '../errors/client-error'

export const getActivities = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          activities: {
            orderBy: {
              occours_at: 'asc',
            },
          },
        },
      })

      if (!trip) {
        throw new ClientError('Viagem não encontrada.')
      }

      const diferenceInDaysBetweenTripStarAndEnd = dayjs(trip.ends_at).diff(
        trip.starts_at,
        'days'
      )

      const activities = Array.from({
        length: diferenceInDaysBetweenTripStarAndEnd + 1,
      }).map((_, index) => {
        const date = dayjs(trip.starts_at).add(index, 'days')

        return {
          date: date.toDate(),
          activities: trip.activities.filter((activity) => {
            return dayjs(activity.occours_at).isSame(date, 'day')
          }),
        }
      })
      return {
        activities: activities,
      }
    }
  )
}
