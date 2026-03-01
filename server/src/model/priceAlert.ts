import { Schema, model, Document } from "mongoose";

export interface IPriceAlert extends Document {
  user: string;
  product: string;
  targetPrice: number;
  currentPrice: number;
  originalPrice: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: Date;
  triggeredAt?: Date;
  expiresAt?: Date;
}

const priceAlertSchema = new Schema<IPriceAlert>({
  user: { type: String, required: true, ref: 'User' },
  product: { type: String, required: true, ref: 'Product' },
  targetPrice: { type: Number, required: true, min: 0 },
  currentPrice: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  isTriggered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  triggeredAt: { type: Date },
  expiresAt: { type: Date },
}, {
  timestamps: true,
});

// Indexes for efficient queries
priceAlertSchema.index({ user: 1, product: 1 });
priceAlertSchema.index({ product: 1, isActive: 1, isTriggered: 1 });
priceAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PriceAlert = model<IPriceAlert>("PriceAlert", priceAlertSchema);
