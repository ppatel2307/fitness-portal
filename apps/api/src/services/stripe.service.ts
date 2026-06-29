import Stripe from 'stripe';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { NotificationService } from './notification.service.js';

// Stripe throws at construction if the key is empty. Fall back to a harmless
// placeholder so the server still boots when billing isn't configured; real
// Stripe calls only happen on the accountability tier, which needs a real key.
const stripe = new Stripe(config.stripe.secretKey || 'sk_placeholder_not_configured');

export class StripeService {
  static async getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
    const profile = await prisma.clientProfile.findUnique({ where: { userId } });

    if (profile?.stripeCustomerId) return profile.stripeCustomerId;

    const customer = await stripe.customers.create({ email, name, metadata: { userId } });

    await prisma.clientProfile.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  static async createSetupIntent(customerId: string): Promise<string> {
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return intent.client_secret!;
  }

  static async chargeForMissedWorkout(userId: string, workoutDate: Date): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true, accountabilitySubscription: true },
    });

    if (!user || !user.accountabilitySubscription?.active) return;
    if (!user.clientProfile?.stripeCustomerId) return;

    const existing = await prisma.missedWorkoutCharge.findFirst({
      where: {
        userId,
        workoutDate: {
          gte: new Date(workoutDate.toDateString()),
          lt: new Date(new Date(workoutDate.toDateString()).getTime() + 86400000),
        },
        status: { in: ['PENDING', 'SUCCEEDED'] },
      },
    });
    if (existing) return;

    const charge = await prisma.missedWorkoutCharge.create({
      data: { userId, workoutDate, amount: 1000, status: 'PENDING' },
    });

    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.clientProfile.stripeCustomerId,
        type: 'card',
      });

      if (!paymentMethods.data.length) {
        await prisma.missedWorkoutCharge.update({
          where: { id: charge.id },
          data: { status: 'FAILED' },
        });
        return;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000,
        currency: 'usd',
        customer: user.clientProfile.stripeCustomerId,
        payment_method: paymentMethods.data[0].id,
        confirm: true,
        off_session: true,
        description: `Missed workout charge - ${workoutDate.toDateString()}`,
        metadata: { userId, workoutDate: workoutDate.toISOString(), chargeId: charge.id },
      });

      await prisma.missedWorkoutCharge.update({
        where: { id: charge.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
        },
      });

      await NotificationService.create(
        userId,
        'SUBSCRIPTION_EVENT',
        'Missed Workout Charge',
        `You were charged $10 for missing your workout on ${workoutDate.toDateString()}.`,
        { chargeId: charge.id }
      );
    } catch {
      await prisma.missedWorkoutCharge.update({
        where: { id: charge.id },
        data: { status: 'FAILED' },
      });
    }
  }

  static async getPaymentMethods(customerId: string) {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return methods.data.map(m => ({
      id: m.id,
      brand: m.card?.brand,
      last4: m.card?.last4,
      expMonth: m.card?.exp_month,
      expYear: m.card?.exp_year,
    }));
  }

  static constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  }
}
