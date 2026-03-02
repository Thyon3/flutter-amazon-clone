import { Schema, model, Document } from "mongoose";

export interface IReview extends Document {
  user: string;
  product: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  helpfulVotes: number;
  verifiedPurchase: boolean;
  isRecommended: boolean;
  response?: {
    content: string;
    respondedBy: string;
    respondedAt: Date;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  user: { type: String, required: true, ref: 'User' },
  product: { type: String, required: true, ref: 'Product' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 2000 },
  images: [{ type: String }],
  helpfulVotes: { type: Number, default: 0, min: 0 },
  verifiedPurchase: { type: Boolean, default: false },
  isRecommended: { type: Boolean, default: true },
  response: {
    content: { type: String, maxlength: 1000 },
    respondedBy: { type: String, ref: 'User' },
    respondedAt: { type: Date },
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ helpfulVotes: -1 });

export const Review = model<IReview>("Review", reviewSchema);
