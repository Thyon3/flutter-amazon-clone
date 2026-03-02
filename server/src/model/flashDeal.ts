import { Schema, model, Document } from "mongoose";

export interface IFlashDeal extends Document {
  title: string;
  description: string;
  products: Array<{
    productId: string;
    originalPrice: number;
    dealPrice: number;
    maxQuantity: number;
    soldQuantity: number;
  }>;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  priority: number;
  bannerImage?: string;
  tags: string[];
  targetAudience: 'all' | 'new' | 'prime' | 'loyalty';
  maxPurchasePerUser: number;
  createdAt: Date;
  updatedAt: Date;
}

const flashDealSchema = new Schema<IFlashDeal>({
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 500 },
  products: [{
    productId: { type: String, required: true, ref: 'Product' },
    originalPrice: { type: Number, required: true, min: 0 },
    dealPrice: { type: Number, required: true, min: 0 },
    maxQuantity: { type: Number, required: true, min: 1 },
    soldQuantity: { type: Number, default: 0, min: 0 },
  }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  bannerImage: { type: String },
  tags: [{ type: String, maxlength: 50 }],
  targetAudience: { 
    type: String, 
    enum: ['all', 'new', 'prime', 'loyalty'], 
    default: 'all' 
  },
  maxPurchasePerUser: { type: Number, default: 1, min: 1 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
flashDealSchema.index({ startTime: 1, endTime: 1 });
flashDealSchema.index({ isActive: 1, endTime: 1 });
flashDealSchema.index({ priority: -1 });
flashDealSchema.index({ tags: 1 });
flashDealSchema.index({ targetAudience: 1 });

export const FlashDeal = model<IFlashDeal>("FlashDeal", flashDealSchema);
