import { Schema, model, Document } from "mongoose";

export interface IShoppingCart extends Document {
  user: string;
  sessionId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    addedAt: Date;
    price: number;
    variant?: {
      size?: string;
      color?: string;
      customOptions?: Record<string, any>;
    };
    savedForLater: boolean;
  }>;
  metadata: {
    source: 'web' | 'mobile' | 'api';
    device?: string;
    userAgent?: string;
    ipAddress?: string;
    lastActivity: Date;
  };
  status: 'active' | 'abandoned' | 'converted' | 'expired';
  expiresAt: Date;
  couponCode?: string;
  discountAmount?: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const shoppingCartSchema = new Schema<IShoppingCart>({
  user: { type: String, required: true, ref: 'User' },
  sessionId: { type: String, unique: true, sparse: true },
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    quantity: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now },
    price: { type: Number, required: true, min: 0 },
    variant: {
      size: { type: String },
      color: { type: String },
      customOptions: { type: Schema.Types.Mixed },
    },
    savedForLater: { type: Boolean, default: false },
  }],
  metadata: {
    source: { 
      type: String, 
      enum: ['web', 'mobile', 'api'], 
      default: 'web' 
    },
    device: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
    lastActivity: { type: Date, default: Date.now },
  },
  status: { 
    type: String, 
    enum: ['active', 'abandoned', 'converted', 'expired'], 
    default: 'active' 
  },
  expiresAt: { type: Date, required: true },
  couponCode: { type: String },
  discountAmount: { type: Number, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0 },
  shippingAmount: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
shoppingCartSchema.index({ user: 1 });
shoppingCartSchema.index({ sessionId: 1 });
shoppingCartSchema.index({ status: 1 });
shoppingCartSchema.index({ expiresAt: 1 });
shoppingCartSchema.index({ 'items.productId': 1 });

export const ShoppingCart = model<IShoppingCart>("ShoppingCart", shoppingCartSchema);
