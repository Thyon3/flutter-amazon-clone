import { Schema, model, Document } from "mongoose";

export interface IGiftWrap extends Document {
  orderId: string;
  items: Array<{
    productId: string;
    giftWrapOptions: {
      wrapType: 'standard' | 'premium' | 'luxury' | 'seasonal';
      wrapColor?: string;
      ribbonColor?: string;
      giftTag?: {
        message: string;
        signature: string;
        font: string;
      };
      personalization?: {
        type: 'engraving' | 'embroidery' | 'printing';
        text: string;
        font: string;
        position: string;
      };
    };
    price: number;
  }>;
  recipientInfo: {
    name: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  giftMessage?: {
    title: string;
    message: string;
    signature: string;
    sendDate?: Date;
  };
  packaging: {
    giftBox: boolean;
    giftBag: boolean;
    tissuePaper: boolean;
    greetingCard: boolean;
  };
  specialInstructions?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalGiftPrice: number;
  estimatedDelivery: Date;
  createdAt: Date;
  updatedAt: Date;
}

const giftWrapSchema = new Schema<IGiftWrap>({
  orderId: { type: String, required: true, ref: 'Order' },
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    giftWrapOptions: {
      wrapType: { 
        type: String, 
        enum: ['standard', 'premium', 'luxury', 'seasonal'], 
        required: true 
      },
      wrapColor: { type: String },
      ribbonColor: { type: String },
      giftTag: {
        message: { type: String, maxlength: 200 },
        signature: { type: String, maxlength: 50 },
        font: { type: String, maxlength: 50 },
      },
      personalization: {
        type: { 
          type: String, 
          enum: ['engraving', 'embroidery', 'printing'], 
          required: true 
        },
        text: { type: String, required: true, maxlength: 100 },
        font: { type: String, required: true, maxlength: 50 },
        position: { type: String, required: true, maxlength: 50 },
      },
    },
    price: { type: Number, required: true, min: 0 },
  }],
  recipientInfo: {
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, maxlength: 255 },
    phone: { type: String, maxlength: 20 },
    address: {
      street: { type: String, maxlength: 200 },
      city: { type: String, maxlength: 100 },
      state: { type: String, maxlength: 50 },
      zip: { type: String, maxlength: 20 },
      country: { type: String, maxlength: 100 },
    },
  },
  giftMessage: {
    title: { type: String, maxlength: 100 },
    message: { type: String, maxlength: 500 },
    signature: { type: String, maxlength: 50 },
    sendDate: { type: Date },
  },
  packaging: {
    giftBox: { type: Boolean, default: false },
    giftBag: { type: Boolean, default: false },
    tissuePaper: { type: Boolean, default: false },
    greetingCard: { type: Boolean, default: false },
  },
  specialInstructions: { type: String, maxlength: 500 },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  totalGiftPrice: { type: Number, required: true, min: 0 },
  estimatedDelivery: { type: Date, required: true },
}, {
  timestamps: true,
});

// Indexes for efficient queries
giftWrapSchema.index({ orderId: 1 });
giftWrapSchema.index({ status: 1 });
giftWrapSchema.index({ estimatedDelivery: 1 });
giftWrapSchema.index({ 'recipientInfo.email': 1 });

export const GiftWrap = model<IGiftWrap>("GiftWrap", giftWrapSchema);
