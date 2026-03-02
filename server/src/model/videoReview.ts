import { Schema, model, Document } from "mongoose";

export interface IVideoReview extends Document {
  user: string;
  product: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  resolution: {
    width: number;
    height: number;
  };
  quality: 'low' | 'medium' | 'high' | '4k';
  status: 'processing' | 'ready' | 'approved' | 'rejected' | 'flagged';
  moderationFlags: Array<{
    type: 'inappropriate' | 'spam' | 'copyright' | 'quality';
    reason: string;
    flaggedBy: string;
    flaggedAt: Date;
  }>;
  engagement: {
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
  };
  metadata: {
    device?: string;
    browser?: string;
    ipAddress?: string;
    uploadDate: Date;
    processingTime?: number;
    tags: string[];
  };
  verifiedPurchase: boolean;
  isRecommended: boolean;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const videoReviewSchema = new Schema<IVideoReview>({
  user: { type: String, required: true, ref: 'User' },
  product: { type: String, required: true, ref: 'Product' },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  videoUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  duration: { type: Number, required: true, min: 1, max: 600 }, // Max 10 minutes
  fileSize: { type: Number, required: true, min: 1 },
  resolution: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  quality: { 
    type: String, 
    enum: ['low', 'medium', 'high', '4k'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['processing', 'ready', 'approved', 'rejected', 'flagged'], 
    default: 'processing' 
  },
  moderationFlags: [{
    type: { 
      type: String, 
      enum: ['inappropriate', 'spam', 'copyright', 'quality'], 
      required: true 
    },
    reason: { type: String, required: true, maxlength: 500 },
    flaggedBy: { type: String, required: true, ref: 'User' },
    flaggedAt: { type: Date, default: Date.now },
  }],
  engagement: {
    views: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    dislikes: { type: Number, default: 0, min: 0 },
    comments: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
  },
  metadata: {
    device: { type: String, maxlength: 100 },
    browser: { type: String, maxlength: 100 },
    ipAddress: { type: String, maxlength: 45 },
    uploadDate: { type: Date, default: Date.now },
    processingTime: { type: Number },
    tags: [{ type: String, maxlength: 50 }],
  },
  verifiedPurchase: { type: Boolean, default: false },
  isRecommended: { type: Boolean, default: true },
  helpfulVotes: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
videoReviewSchema.index({ user: 1 });
videoReviewSchema.index({ product: 1 });
videoReviewSchema.index({ status: 1 });
videoReviewSchema.index({ 'engagement.views': -1 });
videoReviewSchema.index({ 'engagement.likes': -1 });
videoReviewSchema.index({ createdAt: -1 });
videoReviewSchema.index({ 'metadata.tags': 1 });

export const VideoReview = model<IVideoReview>("VideoReview", videoReviewSchema);
