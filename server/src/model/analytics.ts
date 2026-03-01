import { Schema, model, Document } from "mongoose";

export interface IAnalytics extends Document {
  date: Date;
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    sales: number;
    revenue: number;
  }>;
  topCategories: Array<{
    category: string;
    sales: number;
    revenue: number;
  }>;
  conversionRate: number;
  averageOrderValue: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  cartAbandonmentRate: number;
}

const analyticsSchema = new Schema<IAnalytics>({
  date: { type: Date, required: true, unique: true },
  totalUsers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  topProducts: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    sales: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  }],
  topCategories: [{
    category: { type: String, required: true },
    sales: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  }],
  conversionRate: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  cartAbandonmentRate: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Index for efficient queries
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ date: 1 });

export const Analytics = model<IAnalytics>("Analytics", analyticsSchema);
