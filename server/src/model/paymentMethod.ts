import { Schema, model, Document } from "mongoose";

export interface IPaymentMethod extends Document {
  user: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_account';
  provider: string; // visa, mastercard, paypal, etc.
  lastFour: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string; // card brand
  isDefault: boolean;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  metadata: {
    cardholderName?: string;
    email?: string;
    phone?: string;
    paypalEmail?: string;
    bankName?: string;
    accountType?: string;
    routingNumber?: string;
  };
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  verificationStatus: 'pending' | 'verified' | 'failed';
  token?: string; // Payment processor token
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>({
  user: { type: String, required: true, ref: 'User' },
  type: { 
    type: String, 
    enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_account'], 
    required: true 
  },
  provider: { type: String, required: true, maxlength: 50 },
  lastFour: { type: String, required: true, maxlength: 4 },
  expiryMonth: { type: Number, min: 1, max: 12 },
  expiryYear: { type: Number, min: 2020, max: 2050 },
  brand: { type: String, maxlength: 50 },
  isDefault: { type: Boolean, default: false },
  billingAddress: {
    street: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, maxlength: 100 },
    state: { type: String, required: true, maxlength: 50 },
    zip: { type: String, required: true, maxlength: 20 },
    country: { type: String, required: true, maxlength: 100 },
  },
  metadata: {
    cardholderName: { type: String, maxlength: 100 },
    email: { type: String, maxlength: 255 },
    phone: { type: String, maxlength: 20 },
    paypalEmail: { type: String, maxlength: 255 },
    bankName: { type: String, maxlength: 100 },
    accountType: { type: String, maxlength: 50 },
    routingNumber: { type: String, maxlength: 20 },
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'expired', 'suspended'], 
    default: 'active' 
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'failed'], 
    default: 'pending' 
  },
  token: { type: String, maxlength: 255 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
paymentMethodSchema.index({ user: 1 });
paymentMethodSchema.index({ type: 1 });
paymentMethodSchema.index({ status: 1 });
paymentMethodSchema.index({ isDefault: 1 });
paymentMethodSchema.index({ token: 1 });

export const PaymentMethod = model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);
