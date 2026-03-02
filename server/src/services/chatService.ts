import { Chat, IChat } from '../model/chat';
import { User } from '../model/user';
import { EmailService } from './emailService';
import { randomBytes } from 'crypto';

export interface ChatRequest {
  customerName: string;
  customerEmail: string;
  userId?: string;
  category?: 'general' | 'order' | 'payment' | 'technical' | 'refund' | 'product';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  initialMessage?: string;
  metadata?: {
    source?: 'web' | 'mobile' | 'email' | 'phone';
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
  };
}

export interface ChatResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  chat?: IChat;
}

export interface MessageRequest {
  sessionId: string;
  content: string;
  sender: 'customer' | 'agent' | 'bot';
  attachments?: Array<{
    type: 'image' | 'document' | 'link';
    url: string;
    name: string;
  }>;
}

export interface ChatStats {
  totalChats: number;
  activeChats: number;
  waitingChats: number;
  closedChats: number;
  averageResponseTime: number;
  satisfactionScore: number;
  chatsByCategory: Record<string, number>;
  chatsByPriority: Record<string, number>;
}

export class ChatService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Create a new chat session
  async createChatSession(request: ChatRequest): Promise<ChatResponse> {
    try {
      const sessionId = this.generateSessionId();

      const chat = new Chat({
        sessionId,
        user: request.userId,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        status: 'waiting',
        priority: request.priority || 'medium',
        category: request.category || 'general',
        messages: [],
        tags: [],
        metadata: {
          source: request.metadata?.source || 'web',
          userAgent: request.metadata?.userAgent,
          ipAddress: request.metadata?.ipAddress,
          referrer: request.metadata?.referrer,
        },
      });

      // Add initial message if provided
      if (request.initialMessage) {
        chat.messages.push({
          id: this.generateMessageId(),
          sender: 'customer',
          content: request.initialMessage,
          timestamp: new Date(),
          isRead: false,
        });
        chat.status = 'active';
      }

      await chat.save();

      // Send welcome message from bot
      if (request.initialMessage) {
        await this.sendBotMessage(sessionId, 'Hello! I\'m here to help you. An agent will be with you shortly.');
      }

      return {
        success: true,
        sessionId,
        message: 'Chat session created successfully',
        chat,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create chat session: ${error}`,
      };
    }
  }

  // Get chat by session ID
  async getChatBySessionId(sessionId: string): Promise<IChat | null> {
    try {
      const chat = await Chat.findOne({ sessionId })
        .populate('user', 'name email')
        .populate('assignedAgent', 'name email');

      return chat;
    } catch (error) {
      throw new Error(`Failed to get chat: ${error}`);
    }
  }

  // Get user's chat history
  async getUserChats(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ chats: IChat[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const chats = await Chat.find({ user: userId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedAgent', 'name');

      const total = await Chat.countDocuments({ user: userId });

      return { chats, total };
    } catch (error) {
      throw new Error(`Failed to get user chats: ${error}`);
    }
  }

  // Get chats for agent
  async getAgentChats(
    agentId: string,
    status?: 'active' | 'waiting' | 'closed',
    page: number = 1,
    limit: number = 20
  ): Promise<{ chats: IChat[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = { assignedAgent: agentId };

      if (status) {
        filter.status = status;
      }

      const chats = await Chat.find(filter)
        .sort({ priority: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email');

      const total = await Chat.countDocuments(filter);

      return { chats, total };
    } catch (error) {
      throw new Error(`Failed to get agent chats: ${error}`);
    }
  }

  // Get all chats for admin
  async getAllChats(
    status?: 'active' | 'waiting' | 'closed',
    category?: string,
    priority?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ chats: IChat[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      let filter: any = {};

      if (status) {
        filter.status = status;
      }
      if (category) {
        filter.category = category;
      }
      if (priority) {
        filter.priority = priority;
      }

      const chats = await Chat.find(filter)
        .sort({ priority: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('assignedAgent', 'name');

      const total = await Chat.countDocuments(filter);

      return { chats, total };
    } catch (error) {
      throw new Error(`Failed to get all chats: ${error}`);
    }
  }

  // Send message
  async sendMessage(request: MessageRequest): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({ sessionId: request.sessionId });
      
      if (!chat) {
        return {
          success: false,
          message: 'Chat session not found',
        };
      }

      const message = {
        id: this.generateMessageId(),
        sender: request.sender,
        content: request.content,
        timestamp: new Date(),
        isRead: request.sender === 'agent', // Agent messages are marked as read
        attachments: request.attachments || [],
      };

      chat.messages.push(message);
      chat.updatedAt = new Date();

      // Update status based on sender
      if (request.sender === 'customer' && chat.status === 'waiting') {
        chat.status = 'active';
      }

      await chat.save();

      // Send notification if agent message
      if (request.sender === 'agent') {
        await this.notifyCustomer(chat, message);
      }

      return {
        success: true,
        message: 'Message sent successfully',
        chat,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send message: ${error}`,
      };
    }
  }

  // Assign chat to agent
  async assignChatToAgent(sessionId: string, agentId: string): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({ sessionId });
      
      if (!chat) {
        return {
          success: false,
          message: 'Chat session not found',
        };
      }

      chat.assignedAgent = agentId;
      chat.status = 'active';
      await chat.save();

      return {
        success: true,
        message: 'Chat assigned to agent successfully',
        chat,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to assign chat: ${error}`,
      };
    }
  }

  // Close chat
  async closeChat(
    sessionId: string,
    agentId: string,
    resolutionSummary: string
  ): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({ sessionId });
      
      if (!chat) {
        return {
          success: false,
          message: 'Chat session not found',
        };
      }

      chat.status = 'closed';
      chat.resolution = {
        summary: resolutionSummary,
        resolvedBy: agentId,
        resolvedAt: new Date(),
      };

      await chat.save();

      // Send satisfaction survey
      await this.sendSatisfactionSurvey(chat);

      return {
        success: true,
        message: 'Chat closed successfully',
        chat,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to close chat: ${error}`,
      };
    }
  }

  // Submit satisfaction rating
  async submitSatisfactionRating(
    sessionId: string,
    rating: number,
    comment?: string
  ): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({ sessionId });
      
      if (!chat) {
        return {
          success: false,
          message: 'Chat session not found',
        };
      }

      chat.satisfaction = {
        rating,
        comment,
        timestamp: new Date(),
      };

      await chat.save();

      return {
        success: true,
        message: 'Satisfaction rating submitted successfully',
        chat,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to submit rating: ${error}`,
      };
    }
  }

  // Get chat statistics
  async getChatStats(): Promise<ChatStats> {
    try {
      const totalChats = await Chat.countDocuments();
      const activeChats = await Chat.countDocuments({ status: 'active' });
      const waitingChats = await Chat.countDocuments({ status: 'waiting' });
      const closedChats = await Chat.countDocuments({ status: 'closed' });

      // Calculate average response time
      const responseTimes = await this.calculateAverageResponseTime();

      // Calculate satisfaction score
      const satisfactionResult = await Chat.aggregate([
        { $match: { 'satisfaction.rating': { $exists: true } } },
        { $group: { _id: null, avgRating: { $avg: '$satisfaction.rating' } } }
      ]);
      const satisfactionScore = satisfactionResult[0]?.avgRating || 0;

      // Chats by category
      const categoryResult = await Chat.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      const chatsByCategory = categoryResult.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Chats by priority
      const priorityResult = await Chat.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);
      const chatsByPriority = priorityResult.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalChats,
        activeChats,
        waitingChats,
        closedChats,
        averageResponseTime: responseTimes,
        satisfactionScore,
        chatsByCategory,
        chatsByPriority,
      };
    } catch (error) {
      throw new Error(`Failed to get chat stats: ${error}`);
    }
  }

  // Send bot message
  private async sendBotMessage(sessionId: string, content: string): Promise<void> {
    try {
      const chat = await Chat.findOne({ sessionId });
      if (!chat) return;

      const message = {
        id: this.generateMessageId(),
        sender: 'bot' as const,
        content,
        timestamp: new Date(),
        isRead: true,
      };

      chat.messages.push(message);
      await chat.save();
    } catch (error) {
      console.error('Failed to send bot message:', error);
    }
  }

  // Notify customer of new message
  private async notifyCustomer(chat: IChat, message: any): Promise<void> {
    try {
      // In a real app, you'd use WebSocket or push notifications
      // For now, we'll send an email for important messages
      if (message.content.toLowerCase().includes('important') || 
          message.content.toLowerCase().includes('urgent')) {
        
        const emailData = {
          to: chat.customerEmail,
          subject: 'New message in your Amazon Clone support chat',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
                <h1>💬 New Message</h1>
              </div>
              <div style="padding: 20px;">
                <h2>Hi ${chat.customerName},</h2>
                <p>You have a new message in your support chat:</p>
                
                <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Message:</strong> ${message.content}</p>
                  <p><strong>Time:</strong> ${message.timestamp.toLocaleString()}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://yourapp.com/chat/${chat.sessionId}" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    View Chat
                  </a>
                </div>
              </div>
            </div>
          `,
        };

        await this.emailService.sendEmail(emailData);
      }
    } catch (error) {
      console.error('Failed to notify customer:', error);
    }
  }

  // Send satisfaction survey
  private async sendSatisfactionSurvey(chat: IChat): Promise<void> {
    try {
      const emailData = {
        to: chat.customerEmail,
        subject: 'How was your support experience?',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #232f3e; color: white; padding: 20px; text-align: center;">
              <h1>⭐ Rate Your Experience</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hi ${chat.customerName},</h2>
              <p>Your support chat has been resolved. We'd love to hear about your experience!</p>
              
              <div style="background-color: #f0f2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Chat Summary:</strong> ${chat.resolution?.summary}</p>
                <p><strong>Agent:</strong> ${chat.assignedAgent}</p>
                <p><strong>Duration:</strong> ${Math.round((chat.updatedAt.getTime() - chat.createdAt.getTime()) / (1000 * 60))} minutes</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://yourapp.com/chat/${chat.sessionId}/rate" style="background-color: #ff9900; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Rate Experience
                </a>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('Failed to send satisfaction survey:', error);
    }
  }

  // Calculate average response time
  private async calculateAverageResponseTime(): Promise<number> {
    try {
      const chats = await Chat.find({
        'messages.sender': 'agent',
        status: 'closed'
      });

      let totalResponseTime = 0;
      let responseCount = 0;

      for (const chat of chats) {
        const customerMessage = chat.messages.find(m => m.sender === 'customer');
        const agentMessage = chat.messages.find(m => m.sender === 'agent');

        if (customerMessage && agentMessage) {
          const responseTime = agentMessage.timestamp.getTime() - customerMessage.timestamp.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      return responseCount > 0 ? totalResponseTime / responseCount / (1000 * 60) : 0; // in minutes
    } catch (error) {
      console.error('Failed to calculate response time:', error);
      return 0;
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  // Generate message ID
  private generateMessageId(): string {
    return randomBytes(8).toString('hex');
  }

  // Search chats
  async searchChats(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ chats: IChat[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(query, 'i');

      const chats = await Chat.find({
        $or: [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { 'messages.content': searchRegex },
          { tags: searchRegex },
        ],
      })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('assignedAgent', 'name');

      const total = await Chat.countDocuments({
        $or: [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { 'messages.content': searchRegex },
          { tags: searchRegex },
        ],
      });

      return { chats, total };
    } catch (error) {
      throw new Error(`Failed to search chats: ${error}`);
    }
  }

  // Get chat transcript
  async getChatTranscript(sessionId: string): Promise<string> {
    try {
      const chat = await Chat.findOne({ sessionId })
        .populate('user', 'name email')
        .populate('assignedAgent', 'name email');

      if (!chat) {
        throw new Error('Chat not found');
      }

      let transcript = `Chat Transcript - Session: ${sessionId}\n`;
      transcript += `Customer: ${chat.customerName} (${chat.customerEmail})\n`;
      transcript += `Status: ${chat.status}\n`;
      transcript += `Category: ${chat.category}\n`;
      transcript += `Priority: ${chat.priority}\n`;
      transcript += `Started: ${chat.createdAt.toLocaleString()}\n`;
      transcript += `Last Updated: ${chat.updatedAt.toLocaleString()}\n\n`;

      if (chat.assignedAgent) {
        transcript += `Agent: ${(chat.assignedAgent as any).name}\n\n`;
      }

      transcript += `Messages:\n`;
      transcript += `${'='.repeat(50)}\n\n`;

      for (const message of chat.messages) {
        const sender = message.sender === 'customer' ? 'Customer' : 
                       message.sender === 'agent' ? 'Agent' : 'Bot';
        transcript += `[${sender}] - ${message.timestamp.toLocaleString()}\n`;
        transcript += `${message.content}\n\n`;
      }

      if (chat.resolution) {
        transcript += `Resolution:\n`;
        transcript += `${chat.resolution.summary}\n`;
        transcript += `Resolved by: ${(chat.resolution.resolvedBy as any).name}\n`;
        transcript += `Resolved at: ${chat.resolution.resolvedAt.toLocaleString()}\n`;
      }

      return transcript;
    } catch (error) {
      throw new Error(`Failed to get chat transcript: ${error}`);
    }
  }
}
