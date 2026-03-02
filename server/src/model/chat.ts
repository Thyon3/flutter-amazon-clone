import { Schema, model, Document } from "mongoose";

export interface IChat extends Document {
  sessionId: string;
  user?: string;
  customerName: string;
  customerEmail: string;
  status: 'active' | 'waiting' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'order' | 'payment' | 'technical' | 'refund' | 'product';
  assignedAgent?: string;
  messages: Array<{
    id: string;
    sender: 'customer' | 'agent' | 'bot';
    content: string;
    timestamp: Date;
    isRead: boolean;
    attachments?: Array<{
      type: 'image' | 'document' | 'link';
      url: string;
      name: string;
    }>;
  }>;
  tags: string[];
  satisfaction?: {
    rating: number;
    comment?: string;
    timestamp: Date;
  };
  resolution?: {
    summary: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
  metadata: {
    source: 'web' | 'mobile' | 'email' | 'phone';
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  sessionId: { type: String, required: true, unique: true },
  user: { type: String, ref: 'User' },
  customerName: { type: String, required: true, maxlength: 100 },
  customerEmail: { type: String, required: true, maxlength: 255 },
  status: { 
    type: String, 
    enum: ['active', 'waiting', 'closed'], 
    default: 'waiting' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  category: { 
    type: String, 
    enum: ['general', 'order', 'payment', 'technical', 'refund', 'product'], 
    default: 'general' 
  },
  assignedAgent: { type: String, ref: 'User' },
  messages: [{
    id: { type: String, required: true },
    sender: { 
      type: String, 
      enum: ['customer', 'agent', 'bot'], 
      required: true 
    },
    content: { type: String, required: true, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    attachments: [{
      type: { 
        type: String, 
        enum: ['image', 'document', 'link'], 
        required: true 
      },
      url: { type: String, required: true },
      name: { type: String, required: true, maxlength: 255 },
    }],
  }],
  tags: [{ type: String, maxlength: 50 }],
  satisfaction: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    timestamp: { type: Date },
  },
  resolution: {
    summary: { type: String, maxlength: 1000 },
    resolvedBy: { type: String, ref: 'User' },
    resolvedAt: { type: Date },
  },
  metadata: {
    source: { 
      type: String, 
      enum: ['web', 'mobile', 'email', 'phone'], 
      default: 'web' 
    },
    userAgent: { type: String },
    ipAddress: { type: String },
    referrer: { type: String },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
chatSchema.index({ sessionId: 1 });
chatSchema.index({ status: 1, createdAt: -1 });
chatSchema.index({ assignedAgent: 1 });
chatSchema.index({ category: 1 });
chatSchema.index({ priority: 1 });
chatSchema.index({ 'messages.timestamp': -1 });

export const Chat = model<IChat>("Chat", chatSchema);
