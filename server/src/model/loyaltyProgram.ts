import { Schema, model, Document } from "mongoose";

export interface ILoyaltyProgram extends Document {
  user: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  ordersCount: number;
  joinDate: Date;
  lastActivityDate: Date;
  pointsHistory: Array<{
    type: 'earned' | 'redeemed' | 'expired';
    points: number;
    reason: string;
    orderId?: string;
    timestamp: Date;
    expiresAt?: Date;
  }>;
  rewards: Array<{
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    isRedeemed: boolean;
    redeemedAt?: Date;
  }>;
}

const loyaltyProgramSchema = new Schema<ILoyaltyProgram>({
  user: { type: String, required: true, ref: 'User', unique: true },
  points: { type: Number, default: 0, min: 0 },
  tier: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum'], 
    default: 'bronze' 
  },
  totalSpent: { type: Number, default: 0, min: 0 },
  ordersCount: { type: Number, default: 0, min: 0 },
  joinDate: { type: Date, default: Date.now },
  lastActivityDate: { type: Date, default: Date.now },
  pointsHistory: [{
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired'],
      required: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    orderId: { type: String },
    timestamp: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  }],
  rewards: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    pointsCost: { type: Number, required: true, min: 0 },
    isRedeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date },
  }],
}, {
  timestamps: true,
});

// Indexes for efficient queries
loyaltyProgramSchema.index({ user: 1 });
loyaltyProgramSchema.index({ tier: 1 });
loyaltyProgramSchema.index({ points: -1 });
loyaltyProgramSchema.index({ 'pointsHistory.expiresAt': 1 }, { expireAfterSeconds: 0 });

export const LoyaltyProgram = model<ILoyaltyProgram>("LoyaltyProgram", loyaltyProgramSchema);
