import { Schema, model, Document } from "mongoose";

export interface IComparisonHistory extends Document {
  userId: string;
  sessionId: string;
  products: Array<{
    productId: string;
    name: string;
    price: number;
    rating: number;
    category: string;
    images: string[];
    features: Record<string, any>;
    addedAt: Date;
  }>;
  comparisonDate: Date;
  status: 'active' | 'saved' | 'deleted';
  title?: string;
  notes?: string;
  tags: string[];
  shareToken?: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const comparisonHistorySchema = new Schema<IComparisonHistory>({
  userId: { type: String, required: true, ref: 'User' },
  sessionId: { type: String, required: true },
  products: [{
    productId: { type: String, required: true, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    category: { type: String, required: true },
    images: [{ type: String }],
    features: { type: Schema.Types.Mixed },
    addedAt: { type: Date, default: Date.now },
  }],
  comparisonDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'saved', 'deleted'], 
    default: 'active' 
  },
  title: { type: String, maxlength: 100 },
  notes: { type: String, maxlength: 500 },
  tags: [{ type: String, maxlength: 50 }],
  shareToken: { type: String, unique: true, sparse: true },
  isPublic: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
comparisonHistorySchema.index({ userId: 1 });
comparisonHistory.index({ sessionId: 1 });
comparisonHistory.index({ status: 1 });
comparisonHistory.index({ shareToken: 1 });
comparisonHistory.index({ tags: 1 });
comparisonHistory.index({ comparisonDate: -1 });

export const ComparisonHistory = model<IComparisonHistory>("ComparisonHistory", comparisonHistory);
