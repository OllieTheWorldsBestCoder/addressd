import { User } from '../types/user';
import { BillingPlan, PlanType, ApiPlan, EmbedPlan } from '../types/billing';
import { db } from '../config/firebase';
import { doc, updateDoc, increment, getDoc, arrayUnion } from 'firebase/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

export class BillingService {
  async calculateApiUsageCost(user: User, callCount: number): Promise<number> {
    const apiPlan = user.billing?.plans.find(
      plan => plan.type === PlanType.API
    ) as ApiPlan;

    if (!apiPlan) return 0;

    const totalCost = callCount * apiPlan.ratePerCall;
    const adjustedCost = Math.max(apiPlan.minimumSpend, totalCost);
    const discountFromPoints = apiPlan.contributionPoints * 0.01; // £0.01 per point

    return Math.max(0, adjustedCost - discountFromPoints);
  }

  async trackApiUsage(userId: string, callCount: number = 1): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userData = (await getDoc(userRef)).data() as User;
    
    if (!userData?.billing?.stripeCustomerId) {
      console.warn('No Stripe customer ID found for user:', userId);
      return;
    }

    try {
      // Create usage record using the correct endpoint
      await stripe.subscriptionItems.createUsageRecord(
        userData.billing.apiSubscriptionItemId!,
        {
          quantity: callCount,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment'
        }
      );

      // Also update local tracking
      await updateDoc(userRef, {
        'billing.plans.currentUsage': increment(callCount)
      });
    } catch (error) {
      console.error('Error tracking API usage in Stripe:', error);
      throw error;
    }
  }

  async validateEmbedAccess(user: User): Promise<boolean> {
    const embedPlan = user.billing?.plans.find(
      plan => plan.type === PlanType.EMBED
    ) as EmbedPlan;

    if (!embedPlan) return false;
    return embedPlan.status === 'active';
  }

  async createCustomer(user: User) {
    try {
      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
          firebaseId: user.id
        }
      });

      // Update user with Stripe customer ID
      await updateDoc(doc(db, 'users', user.id), {
        'billing.stripeCustomerId': customer.id
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async createSubscription(user: User, planType: PlanType) {
    if (!user.billing?.stripeCustomerId) {
      throw new Error('No Stripe customer ID found');
    }

    try {
      if (planType === PlanType.API) {
        // Create API subscription with metered price
        const subscription = await stripe.subscriptions.create({
          customer: user.billing.stripeCustomerId,
          items: [{
            price: process.env.STRIPE_API_PRICE_ID!,
          }],
          payment_behavior: 'allow_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        // Store the subscription item ID for usage reporting
        await updateDoc(doc(db, 'users', user.id), {
          'billing.apiSubscriptionItemId': subscription.items.data[0].id,
          'billing.plans': arrayUnion({
            type: PlanType.API,
            status: 'active',
            minimumSpend: 5000, // £50
            ratePerCall: 0.5, // £0.005
            currentUsage: 0,
            billingStartDate: new Date(),
            contributionPoints: 0,
            stripeSubscriptionId: subscription.id
          })
        });

        return subscription;
      }
      
      throw new Error('Invalid plan type or plan type handled by pricing table');
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  async updateSubscription(user: User, planType: PlanType) {
    if (!user.billing?.stripeCustomerId) {
      throw new Error('No Stripe customer ID found');
    }

    const plan = user.billing.plans.find(p => p.type === planType);
    if (!plan?.stripeSubscriptionId) {
      throw new Error('No subscription found for this plan type');
    }

    try {
      // Get current subscription
      const subscription = await stripe.subscriptions.retrieve(plan.stripeSubscriptionId);

      if (planType === PlanType.EMBED) {
        // For Embed plan, we handle updates through the customer portal
        const session = await stripe.billingPortal.sessions.create({
          customer: user.billing.stripeCustomerId,
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`
        });
        return { url: session.url };
      } else if (planType === PlanType.API) {
        // For API plan, we can update the minimum spend or rate
        const updatedSubscription = await stripe.subscriptions.update(
          plan.stripeSubscriptionId,
          {
            metadata: {
              minimumSpend: (plan as ApiPlan).minimumSpend.toString(),
              ratePerCall: (plan as ApiPlan).ratePerCall.toString()
            }
          }
        );
        return updatedSubscription;
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(user: User, planType: PlanType) {
    if (!user.billing?.stripeCustomerId) {
      throw new Error('No Stripe customer ID found');
    }

    const plan = user.billing.plans.find(p => p.type === planType);
    if (!plan?.stripeSubscriptionId) {
      throw new Error('No subscription found for this plan type');
    }

    try {
      // Cancel the subscription at period end
      const subscription = await stripe.subscriptions.update(
        plan.stripeSubscriptionId,
        {
          cancel_at_period_end: true
        }
      );

      // Update the plan status in Firebase
      const userRef = doc(db, 'users', user.id);
      const userData = (await getDoc(userRef)).data();
      
      if (userData) {
        const updatedPlans = userData.billing.plans.map((p: BillingPlan) => {
          if (p.stripeSubscriptionId === plan.stripeSubscriptionId) {
            return {
              ...p,
              status: 'cancelling',
              canceledAt: new Date(),
              endDate: new Date(subscription.current_period_end * 1000)
            };
          }
          return p;
        });

        await updateDoc(userRef, {
          'billing.plans': updatedPlans
        });
      }

      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }
} 