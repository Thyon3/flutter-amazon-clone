import { Schema, model, Document } from "mongoose";

export interface IProductBundle extends Document {
  name: string;
  description: string;
  type: 'bundle' | 'kit' | 'combo' | 'package';
  products: Array<{
    productId: string;
    quantity: number;
    discountPercentage: number;
    isRequired: boolean;
  }>;
  pricing: {
    originalTotal: number;
    bundlePrice: number;
    totalSavings: number;
    discountPercentage: number;
  };
  images: string[];
  tags: string[];
  category: string;
  brand?: string;
  availability: {
    inStock: boolean;
    stockCount: number;
    estimatedRestock?: Date;
  };
  restrictions: {
    minQuantity: number;
    maxQuantity: number;
    requiresAllItems: boolean;
    allowedSubstitutions: boolean;
  };
  metadata: {
    bundleType: 'seasonal' | 'everyday' | 'limited' | 'exclusive';
    targetAudience: string[];
    occasions: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedAssemblyTime?: number; // in minutes
  };
  status: 'active' | 'inactive' | 'discontinued';
  featured: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const productBundleSchema = new Schema<IProductBundle>({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  type: { 
    type: String, 
    enum: ['bundle', 'kit', 'combo', 'package'], 
    required: true 
  },
  products: [{
    productId: { type: String, required: true, ref: 'Product' },
    quantity: { type: Number, required: true, min: 1 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    isRequired: { type: Boolean, default: true },
  }],
  pricing: {
    originalTotal: { type: Number, required: true, min: 0 },
    bundlePrice: { type: Number, required: true, min: 0 },
    totalSavings: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  },
  images: [{ type: String }],
  tags: [{ type: String, maxlength: 50 }],
  category: { type: String, required: true, maxlength: 100 },
  brand: { type: String, maxlength: 100 },
  availability: {
    inStock: { type: Boolean, default: true },
    stockCount: { type: Number, default: 0, min: 0 },
    estimatedRestock: { type: Date },
  },
  restrictions: {
    minQuantity: { type: Number, default: 1, min: 1 },
    maxQuantity: { type: Number, default: 999, min: 1 },
    requiresAllItems: { type: Boolean, default: false },
    allowedSubstitutions: { type: Boolean, default: false },
  },
  metadata: {
    bundleType: { 
      type: String, 
      enum: ['seasonal', 'everyday', 'limited', 'exclusive'], 
      default: 'everyday' 
    },
    targetAudience: [{ type: String, maxlength: 50 }],
    occasions: [{ type: String, maxlength: 50 }],
    difficulty: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'], 
      default: 'beginner' 
    },
    estimatedAssemblyTime: { type: Number, min: 1 },
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'discontinued'], 
    default: 'active' 
  },
  featured: { type: Boolean, default: false },
  priority: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
productBundleSchema.index({ type: 1 });
productBundleSchema.index({ category: 1 });
productBundleSchema.index({ status: 1 });
productBundleSchema.index({ featured: 1 });
productBundleSchema.index({ priority: -1 });
productBundleSchema.index({ tags: 1 });
productBundleSchema.index({ 'products.productId': 1 });

export const ProductBundle = model<IProductBundle>("ProductBundle", productBundleSchema);
