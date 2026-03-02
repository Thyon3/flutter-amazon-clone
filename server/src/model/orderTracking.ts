import { Schema, model, Document } from "mongoose";

export interface IOrderTracking extends Document {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'delayed' | 'returned';
  estimatedDelivery: Date;
  actualDelivery?: Date;
  currentLocation?: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  trackingEvents: Array<{
    timestamp: Date;
    status: string;
    location: string;
    description: string;
    isMilestone: boolean;
  }>;
  deliveryInstructions?: string;
  recipientInfo: {
    name: string;
    phone: string;
    email: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  metadata: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    serviceType?: string;
    signatureRequired: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const orderTrackingSchema = new Schema<IOrderTracking>({
  orderId: { type: String, required: true, ref: 'Order' },
  trackingNumber: { type: String, required: true, unique: true },
  carrier: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'returned'], 
    default: 'pending' 
  },
  estimatedDelivery: { type: Date, required: true },
  actualDelivery: { type: Date },
  currentLocation: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  trackingEvents: [{
    timestamp: { type: Date, required: true },
    status: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    isMilestone: { type: Boolean, default: false },
  }],
  deliveryInstructions: { type: String, maxlength: 500 },
  recipientInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },
  metadata: {
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    serviceType: { type: String },
    signatureRequired: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
orderTrackingSchema.index({ orderId: 1 });
orderTrackingSchema.index({ trackingNumber: 1 });
orderTrackingSchema.index({ status: 1 });
orderTrackingSchema.index({ estimatedDelivery: 1 });
orderTrackingSchema.index({ 'trackingEvents.timestamp': -1 });

export const OrderTracking = model<IOrderTracking>("OrderTracking", orderTrackingSchema);
