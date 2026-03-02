import { Schema, model, Document } from "mongoose";

export interface IReferral extends Document {
  referrerId: string;
  referredUserId?: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  rewardType: 'discount' | 'credit' | 'points';
  rewardValue: number;
  rewardDescription: string;
  referralLink: string;
  expiryDate: Date;
  completedAt?: Date;
  metadata: {
    source: 'email' | 'social' | 'link' | 'qr';
    campaign?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>({
  referrerId: { type: String, required: true, ref: 'User' },
  referredUserId: { type: String, ref: 'User' },
  referralCode: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'expired', 'cancelled'], 
    default: 'pending' 
  },
  rewardType: { 
    type: String, 
    enum: ['discount', 'credit', 'points'], 
    required: true 
  },
  rewardValue: { type: Number, required: true, min: 0 },
  rewardDescription: { type: String, required: true, maxlength: 200 },
  referralLink: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  completedAt: { type: Date },
  metadata: {
    source: { 
      type: String, 
      enum: ['email', 'social', 'link', 'qr'], 
      default: 'link' 
    },
    campaign: { type: String, maxlength: 100 },
    utmSource: { type: String, maxlength: 100 },
    utmMedium: { type: String, maxlength: 100 },
    utmCampaign: { type: String, maxlength: 100 },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
referralSchema.index({ referrerId: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ expiryDate: 1 });
referralSchema.index({ referredUserId: 1 });

export const Referral = model<IReferral>("Referral", referralSchema);
