import { Schema, model, Document } from "mongoose";

export interface ISubscription extends Document {
  user: string;
  name: string;
  description: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    variant?: string;
  }>;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  deliveryDay: number; // Day of week/month (1-31)
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: {
    type: 'credit_card' | 'debit_card' | 'paypal';
    token: string;
    last4: string;
  };
  pricing: {
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
    discount: number;
  };
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  nextDeliveryDate: Date;
  lastDeliveryDate?: Date;
  startDate: Date;
  endDate?: Date;
  skipCount: number;
  maxSkips: number;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  user: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  description: { type: String, required: true },
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    variant: { type: String },
  }],
  frequency: { 
    type: String, 
    enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'], 
    required: true 
  },
  deliveryDay: { type: Number, required: true, min: 1, max: 31 },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  paymentMethod: {
    type: { type: String, enum: ['credit_card', 'debit_card', 'paypal'], required: true },
    token: { type: String, required: true },
    last4: { type: String, required: true },
  },
  pricing: {
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
  },
  status: { 
    type: String, 
    enum: ['active', 'paused', 'cancelled', 'expired'], 
    default: 'active' 
  },
  nextDeliveryDate: { type: Date, required: true },
  lastDeliveryDate: { type: Date },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  skipCount: { type: Number, default: 0, min: 0 },
  maxSkips: { type: Number, default: 2, min: 0 },
  autoRenew: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Indexes for efficient queries
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ nextDeliveryDate: 1 });
subscriptionSchema.index({ frequency: 1 });

export const Subscription = model<ISubscription>("Subscription", subscriptionSchema);
