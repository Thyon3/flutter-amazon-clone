import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  String? _fcmToken;
  final StreamController<String> _messageStreamController = StreamController<String>.broadcast();
  
  Stream<String> get messageStream => _messageStreamController.stream;
  String? get fcmToken => _fcmToken;

  Future<void> initialize() async {
    // Request permission for iOS
    await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    // Get FCM token
    _fcmToken = await _firebaseMessaging.getToken();
    debugPrint('FCM Token: $_fcmToken');

    // Initialize local notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestAlertPermission: true,
          requestBadgePermission: true,
          requestSoundPermission: true,
        );
    
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle background messages
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // Handle initial message (app opened from notification)
    final initialMessage = await _firebaseMessaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }

    // Listen for token refresh
    _firebaseMessaging.onTokenRefresh.listen((token) {
      _fcmToken = token;
      debugPrint('FCM Token refreshed: $token');
    });
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    debugPrint('Received foreground message: ${message.messageId}');
    
    // Show local notification for foreground messages
    await _showLocalNotification(message);
    
    // Add to message stream
    _messageStreamController.add(message.notification?.body ?? 'New notification');
  }

  Future<void> _handleMessageOpenedApp(RemoteMessage message) async {
    debugPrint('App opened from notification: ${message.messageId}');
    
    // Navigate based on notification data
    final data = message.data;
    if (data.containsKey('type')) {
      _navigateToScreen(data['type'], data);
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('Notification tapped: ${response.payload}');
    
    // Handle notification tap
    if (response.payload != null) {
      // Parse payload and navigate
      _navigateToScreen('order', {'orderId': response.payload});
    }
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'amazon_clone_channel',
          'Amazon Clone Notifications',
          channelDescription: 'Notifications for order updates and promotions',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
    );

    const DarwinNotificationDetails iOSPlatformChannelSpecifics =
        DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
    );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: iOSPlatformChannelSpecifics,
    );

    await _localNotifications.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      platformChannelSpecifics,
      payload: message.data['orderId'],
    );
  }

  void _navigateToScreen(String type, Map<String, dynamic> data) {
    // This would typically use navigation service or router
    debugPrint('Navigating to $type with data: $data');
    
    switch (type) {
      case 'order':
        // Navigate to order details
        break;
      case 'product':
        // Navigate to product details
        break;
      case 'promotion':
        // Navigate to promotion page
        break;
      default:
        // Navigate to home
        break;
    }
  }

  // Subscribe to topics
  Future<void> subscribeToTopic(String topic) async {
    await _firebaseMessaging.subscribeToTopic(topic);
    debugPrint('Subscribed to topic: $topic');
  }

  // Unsubscribe from topics
  Future<void> unsubscribeFromTopic(String topic) async {
    await _firebaseMessaging.unsubscribeFromTopic(topic);
    debugPrint('Unsubscribed from topic: $topic');
  }

  // Send local notification (for testing or immediate notifications)
  Future<void> showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'amazon_clone_channel',
          'Amazon Clone Notifications',
          channelDescription: 'Notifications for order updates and promotions',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
    );

    const DarwinNotificationDetails iOSPlatformChannelSpecifics =
        DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
    );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: iOSPlatformChannelSpecifics,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      platformChannelSpecifics,
      payload: payload,
    );
  }

  // Cancel notification
  Future<void> cancelNotification(int id) async {
    await _localNotifications.cancel(id);
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    await _localNotifications.cancelAll();
  }

  // Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return await _localNotifications.pendingNotificationRequests();
  }

  // Schedule notification
  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledTime,
    String? payload,
  }) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'amazon_clone_channel',
          'Amazon Clone Notifications',
          channelDescription: 'Notifications for order updates and promotions',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
    );

    const DarwinNotificationDetails iOSPlatformChannelSpecifics =
        DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
    );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
      iOS: iOSPlatformChannelSpecifics,
    );

    await _localNotifications.zonedSchedule(
      id,
      title,
      body,
      tz.TZDateTime.from(scheduledTime, tz.local),
      platformChannelSpecifics,
      androidAllowWhileIdle: true,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: payload,
    );
  }

  void dispose() {
    _messageStreamController.close();
  }
}
