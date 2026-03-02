import { Schema, model, Document } from "mongoose";

export interface IInventory extends Document {
  productId: string;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  warehouseLocation: string;
  binLocation?: string;
  batchNumber?: string;
  expiryDate?: Date;
  restockDate?: Date;
  lastRestockDate?: Date;
  supplier: {
    name: string;
    contact: string;
    leadTime: number; // in days
    minOrderQuantity: number;
  };
  metadata: {
    sku: string;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>({
  productId: { type: String, required: true, ref: 'Product', unique: true },
  quantity: { type: Number, required: true, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, required: true, min: 1 },
  warehouseLocation: { type: String, required: true },
  binLocation: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  restockDate: { type: Date },
  lastRestockDate: { type: Date },
  supplier: {
    name: { type: String, required: true },
    contact: { type: String, required: true },
    leadTime: { type: Number, required: true, min: 1 },
    minOrderQuantity: { type: Number, required: true, min: 1 },
  },
  metadata: {
    sku: { type: String, required: true },
    barcode: { type: String },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
  },
  status: { 
    type: String, 
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'], 
    default: 'in_stock' 
  },
  notes: { type: String, maxlength: 500 },
}, {
  timestamps: true,
});

// Indexes for efficient queries
inventorySchema.index({ productId: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ warehouseLocation: 1 });
inventorySchema.index { quantity: 1 });
inventorySchema.index { reorderLevel: 1 });
inventorySchema.index({ 'supplier.name': 1 });
inventorySchema.index({ 'metadata.sku': 1 });

export const Inventory = model<IInventory>("Inventory", inventorySchema);
