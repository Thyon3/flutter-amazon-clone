import { User } from '../model/user';

export interface FraudDetectionResult {
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
  recommendedAction: 'allow' | 'review' | 'block';
}

export interface UserActivityPattern {
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  action: string;
  metadata?: any;
}

export class FraudDetectionService {
  private userActivities: Map<string, UserActivityPattern[]> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousUsers: Set<string> = new Set();

  // Analyze user activity for fraud patterns
  async analyzeUserActivity(
    userId: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    metadata?: any
  ): Promise<FraudDetectionResult> {
    const activity: UserActivityPattern = {
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      action,
      metadata,
    };

    // Store activity
    if (!this.userActivities.has(userId)) {
      this.userActivities.set(userId, []);
    }
    this.userActivities.get(userId)!.push(activity);

    // Keep only last 100 activities per user
    const userActivities = this.userActivities.get(userId)!;
    if (userActivities.length > 100) {
      this.userActivities.set(userId, userActivities.slice(-100));
    }

    const result = this.detectFraudPatterns(activity, userActivities);
    
    // Auto-block high-risk activities
    if (result.recommendedAction === 'block') {
      await this.blockSuspiciousActivity(userId, result.reasons);
    }

    return result;
  }

  private detectFraudPatterns(
    currentActivity: UserActivityPattern,
    userHistory: UserActivityPattern[]
  ): FraudDetectionResult {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for rapid successive actions
    const recentActions = userHistory.filter(
      activity => Date.now() - activity.timestamp.getTime() < 60000 // Last minute
    );

    if (recentActions.length > 50) {
      reasons.push('Unusually high activity rate');
      riskScore += 30;
    }

    // Check for multiple IP addresses
    const uniqueIPs = new Set(userHistory.map(activity => activity.ipAddress));
    if (uniqueIPs.size > 5) {
      reasons.push('Multiple IP addresses detected');
      riskScore += 25;
    }

    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(currentActivity.userAgent)) {
      reasons.push('Suspicious user agent detected');
      riskScore += 20;
    }

    // Check for velocity patterns (e.g., rapid account creation)
    if (currentActivity.action === 'signup') {
      const recentSignups = this.getRecentSignups(currentActivity.ipAddress);
      if (recentSignups > 3) {
        reasons.push('Multiple account creations from same IP');
        riskScore += 40;
      }
    }

    // Check for order patterns
    if (currentActivity.action === 'order') {
      const recentOrders = this.getRecentOrders(currentActivity.userId);
      if (recentOrders > 10) {
        reasons.push('Unusually high order frequency');
        riskScore += 35;
      }
    }

    // Check for failed authentication attempts
    const failedAuthAttempts = this.getFailedAuthAttempts(currentActivity.ipAddress);
    if (failedAuthAttempts > 5) {
      reasons.push('Multiple failed authentication attempts');
      riskScore += 45;
    }

    // Check for geolocation anomalies (simplified)
    if (this.hasGeolocationAnomalies(userHistory)) {
      reasons.push('Suspicious geolocation pattern');
      riskScore += 30;
    }

    // Determine risk level and action
    let recommendedAction: 'allow' | 'review' | 'block' = 'allow';
    
    if (riskScore >= 70) {
      recommendedAction = 'block';
    } else if (riskScore >= 40) {
      recommendedAction = 'review';
    }

    return {
      isSuspicious: riskScore > 0,
      riskScore,
      reasons,
      recommendedAction,
    };
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /automated/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private getRecentSignups(ipAddress: string): number {
    let count = 0;
    const oneHourAgo = Date.now() - 3600000; // 1 hour ago

    for (const activities of this.userActivities.values()) {
      for (const activity of activities) {
        if (
          activity.ipAddress === ipAddress &&
          activity.action === 'signup' &&
          activity.timestamp.getTime() > oneHourAgo
        ) {
          count++;
        }
      }
    }

    return count;
  }

  private getRecentOrders(userId: string): number {
    const userActivities = this.userActivities.get(userId) || [];
    const oneHourAgo = Date.now() - 3600000; // 1 hour ago

    return userActivities.filter(
      activity =>
        activity.action === 'order' &&
        activity.timestamp.getTime() > oneHourAgo
    ).length;
  }

  private getFailedAuthAttempts(ipAddress: string): number {
    let count = 0;
    const thirtyMinutesAgo = Date.now() - 1800000; // 30 minutes ago

    for (const activities of this.userActivities.values()) {
      for (const activity of activities) {
        if (
          activity.ipAddress === ipAddress &&
          activity.action === 'auth_failed' &&
          activity.timestamp.getTime() > thirtyMinutesAgo
        ) {
          count++;
        }
      }
    }

    return count;
  }

  private hasGeolocationAnomalies(userHistory: UserActivityPattern[]): boolean {
    // Simplified geolocation check - in real implementation, would use IP geolocation
    const recentIPs = userHistory
      .filter(activity => Date.now() - activity.timestamp.getTime() < 3600000) // Last hour
      .map(activity => activity.ipAddress);

    const uniqueIPs = new Set(recentIPs);
    
    // If user has more than 3 different IPs in the last hour, flag as suspicious
    return uniqueIPs.size > 3;
  }

  private async blockSuspiciousActivity(userId: string, reasons: string[]): Promise<void> {
    this.suspiciousUsers.add(userId);
    
    // Log the suspicious activity
    console.warn(`Suspicious activity detected for user ${userId}:`, reasons);
    
    // In a real implementation, you would:
    // 1. Send alert to security team
    // 2. Temporarily block the user
    // 3. Add to watchlist
    // 4. Trigger additional verification
  }

  // Get fraud statistics
  async getFraudStatistics(): Promise<any> {
    const totalUsers = this.userActivities.size;
    const suspiciousUsers = this.suspiciousUsers.size;
    const blockedIPs = this.blockedIPs.size;
    
    // Calculate activity patterns
    let totalActivities = 0;
    let suspiciousActivities = 0;

    for (const activities of this.userActivities.values()) {
      totalActivities += activities.length;
      
      for (const activity of activities) {
        const result = this.detectFraudPatterns(activity, activities);
        if (result.isSuspicious) {
          suspiciousActivities++;
        }
      }
    }

    return {
      totalUsers,
      suspiciousUsers,
      blockedIPs,
      totalActivities,
      suspiciousActivities,
      suspiciousActivityRate: totalActivities > 0 ? (suspiciousActivities / totalActivities) * 100 : 0,
    };
  }

  // Check if IP is blocked
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  // Block an IP address
  blockIP(ipAddress: string): void {
    this.blockedIPs.add(ipAddress);
  }

  // Unblock an IP address
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
  }

  // Check if user is suspicious
  isUserSuspicious(userId: string): boolean {
    return this.suspiciousUsers.has(userId);
  }

  // Clear user from suspicious list
  clearSuspiciousUser(userId: string): void {
    this.suspiciousUsers.delete(userId);
  }

  // Get suspicious activities for review
  async getSuspiciousActivities(limit: number = 50): Promise<UserActivityPattern[]> {
    const suspiciousActivities: UserActivityPattern[] = [];

    for (const [userId, activities] of this.userActivities.entries()) {
      for (const activity of activities) {
        const result = this.detectFraudPatterns(activity, activities);
        if (result.isSuspicious) {
          suspiciousActivities.push(activity);
        }
      }
    }

    // Sort by timestamp (most recent first) and limit
    return suspiciousActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Clean up old activities (prevent memory leaks)
  cleanupOldActivities(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const [userId, activities] of this.userActivities.entries()) {
      const recentActivities = activities.filter(
        activity => activity.timestamp.getTime() > oneWeekAgo
      );

      if (recentActivities.length === 0) {
        this.userActivities.delete(userId);
      } else {
        this.userActivities.set(userId, recentActivities);
      }
    }
  }
}
