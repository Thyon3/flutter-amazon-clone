import { Schema, model, Document } from "mongoose";

export interface IExpressCheckout extends Document {
  user: string;
  paymentMethod: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  };
  savedPaymentMethods: Array<{
    id: string;
    type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay';
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    token: string;
    createdAt: Date;
  }>;
  preferences: {
    defaultShippingMethod: string;
    savePaymentInfo: boolean;
    requireConfirmation: boolean;
    skipReview: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expressCheckoutSchema = new Schema<IExpressCheckout>({
  user: { type: String, required: true, ref: 'User', unique: true },
  paymentMethod: { type: String, required: true },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
  },
  billingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
  },
  savedPaymentMethods: [{
    id: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'],
      required: true 
    },
    last4: { type: String, required: true },
    brand: { type: String, required: true },
    expiryMonth: { type: Number, required: true, min: 1, max: 12 },
    expiryYear: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  preferences: {
    defaultShippingMethod: { type: String, default: 'standard' },
    savePaymentInfo: { type: Boolean, default: true },
    requireConfirmation: { type: Boolean, default: true },
    skipReview: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Indexes for efficient queries
expressCheckoutSchema.index({ user: 1 });
expressCheckoutSchema.index({ 'savedPaymentMethods.isDefault': 1 });

export const ExpressCheckout = model<IExpressCheckout>("ExpressCheckout", expressCheckoutSchema);
