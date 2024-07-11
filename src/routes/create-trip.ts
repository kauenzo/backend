import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getMailClient } from '../lib/mail'
import dayjs from 'dayjs'

export const createTrip = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips',
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          starts_at: z.coerce.date(),
          ends_at: z.coerce.date(),
          owner_name: z.string(),
          owner_email: z.string().email(),
          emails_to_invite: z.array(z.string().email()),
        }),
      },
    },
    async (request) => {
      const {
        destination,
        starts_at,
        ends_at,
        owner_name,
        owner_email,
        emails_to_invite,
      } = request.body

      if (dayjs(starts_at).isBefore(new Date())) {
        throw new Error('Data de inicio da viagem inválida.')
      }

      if (dayjs(ends_at).isBefore(starts_at)) {
        throw new Error('Data de final da viagem inválida.')
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          starts_at,
          ends_at,
          participant: {
            createMany: {
              data: [
                {
                  email: owner_email,
                  name: owner_name,
                  is_owner: true,
                  is_confirmed: true,
                },
                ...emails_to_invite.map((email) => {
                  return { email }
                }),
              ],
            },
          },
        },
      })

      const formattedStartDate = dayjs(starts_at).format('LL')
      const formattedEndDate = dayjs(ends_at).format('LL')

      const confirmationLink = `http://locahost:3333/trips/${trip.id}/confirm`

      const mail = await getMailClient()
      const message = await mail.sendMail({
        from: {
          name: 'Equipe pann.er',
          address: 'no-reply@plann.er',
        },
        to: {
          name: owner_name,
          address: owner_email,
        },
        subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Você solicitou a criação de uma viagem para <strong> ${destination}, Brasil</strong> nas datas de <strong>${formattedStartDate} até ${formattedEndDate}</strong></p>
            <p></p>
            <p>Para confirmar sua viagem, clique no link abaixo:</p>
            <p></p>
            <p>
                <a href="${confirmationLink}">Confirmar viagem</a>
            </p>
            <p></p>
        <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
        </div>`.trim(),
      })

      console.log(nodemailer.getTestMessageUrl(message))

      return {
        tripId: trip.id,
      }
    }
  )
}
