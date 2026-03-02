import { Schema, model, Document } from "mongoose";

export interface IWishlist extends Document {
  user: string;
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
  shareToken?: string;
  items: Array<{
    productId: string;
    addedAt: Date;
    notes?: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  tags: string[];
  collaborators: Array<{
    userId: string;
    permission: 'view' | 'edit';
    addedAt: Date;
  }>;
  settings: {
    allowComments: boolean;
    notifyOnPriceDrop: boolean;
    notifyOnBackInStock: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlist>({
  user: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  category: { 
    type: String, 
    enum: ['general', 'birthday', 'wedding', 'holiday', 'baby', 'home', 'electronics', 'fashion', 'books', 'sports', 'other'],
    default: 'general' 
  },
  isPublic: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  items: [{
    productId: { type: String, required: true, ref: 'Product' },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 200 },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
  }],
  tags: [{ type: String, maxlength: 50 }],
  collaborators: [{
    userId: { type: String, required: true, ref: 'User' },
    permission: { 
      type: String, 
      enum: ['view', 'edit'], 
      default: 'view' 
    },
    addedAt: { type: Date, default: Date.now },
  }],
  settings: {
    allowComments: { type: Boolean, default: true },
    notifyOnPriceDrop: { type: Boolean, default: true },
    notifyOnBackInStock: { type: Boolean, default: true },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ category: 1 });
wishlistSchema.index({ shareToken: 1 });
wishlistSchema.index({ 'items.productId': 1 });
wishlistSchema.index({ tags: 1 });

export const Wishlist = model<IWishlist>("Wishlist", wishlistSchema);
