import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';

class ARService {
  static final ARService _instance = ARService._internal();
  factory ARService() => _instance;
  ARService._internal();

  bool _isARSupported = false;
  bool _isInitialized = false;

  bool get isARSupported => _isARSupported;
  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      _isARSupported = await _checkARSupport();
      _isInitialized = true;
      
      debugPrint('AR Support: $_isARSupported');
    } catch (e) {
      debugPrint('Failed to initialize AR service: $e');
      _isARSupported = false;
      _isInitialized = true;
    }
  }

  Future<bool> _checkARSupport() async {
    if (kIsWeb) {
      return false; // AR not supported on web
    }

    if (Platform.isAndroid) {
      return await _checkAndroidARSupport();
    } else if (Platform.isIOS) {
      return await _checkIOSARSupport();
    }

    return false;
  }

  Future<bool> _checkAndroidARSupport() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      
      // Check if device supports ARCore
      final version = androidInfo.version.release;
      final sdkInt = androidInfo.version.sdkInt;
      
      // ARCore requires Android 7.0 (API level 24) or higher
      if (sdkInt < 24) {
        return false;
      }

      // List of known ARCore supported devices (simplified)
      final supportedDevices = [
        'Pixel', 'Samsung', 'OnePlus', 'Xiaomi', 'Huawei', 'Oppo', 'Vivo'
      ];

      final model = androidInfo.model.toLowerCase();
      final brand = androidInfo.brand.toLowerCase();
      
      return supportedDevices.any((device) => 
        model.contains(device.toLowerCase()) || 
        brand.contains(device.toLowerCase())
      );
    } catch (e) {
      debugPrint('Error checking Android AR support: $e');
      return false;
    }
  }

  Future<bool> _checkIOSARSupport() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      final iosInfo = await deviceInfo.iosInfo;
      
      // ARKit requires iOS 11.0 or higher
      final version = double.tryParse(iosInfo.systemVersion.split('.').first) ?? 0;
      
      if (version < 11) {
        return false;
      }

      // Check if device has A9 chip or higher (simplified)
      final model = iosInfo.model.toLowerCase();
      final supportedModels = [
        'iphone6s', 'iphone6splus', 'iphone7', 'iphone7plus',
        'iphone8', 'iphone8plus', 'iphonex', 'iphonexr', 'iphonexs',
        'iphonexsmax', 'iphone11', 'iphone11pro', 'iphone11promax',
        'iphone12', 'iphone12mini', 'iphone12pro', 'iphone12promax',
        'iphone13', 'iphone13mini', 'iphone13pro', 'iphone13promax',
        'iphone14', 'iphone14plus', 'iphone14pro', 'iphone14promax',
        'iphone15', 'iphone15plus', 'iphone15pro', 'iphone15promax',
        'ipadpro', 'ipadair3', 'ipadair4', 'ipadair5', 'ipad8', 'ipad9', 'ipad10'
      ];

      return supportedModels.any((supportedModel) => 
        model.contains(supportedModel)
      );
    } catch (e) {
      debugPrint('Error checking iOS AR support: $e');
      return false;
    }
  }

  // Get AR capability details
  Map<String, dynamic> getARCapabilities() {
    return {
      'isSupported': _isARSupported,
      'platform': Platform.operatingSystem,
      'version': Platform.operatingSystemVersion,
      'features': _getARFeatures(),
    };
  }

  List<String> _getARFeatures() {
    if (!_isARSupported) {
      return [];
    }

    final features = <String>[];
    
    if (Platform.isAndroid) {
      features.addAll([
        'ARCore Support',
        'Light Estimation',
        'Environmental Textures',
        'Occlusion',
        'Anchors',
        'Plane Detection',
      ]);
    } else if (Platform.isIOS) {
      features.addAll([
        'ARKit Support',
        'Face Tracking',
        'Image Recognition',
        'Object Scanning',
        'Light Estimation',
        'Occlusion',
        'Anchors',
        'Plane Detection',
      ]);
    }

    return features;
  }

  // Get 3D model URL for product
  String getProduct3DModelUrl(String productId) {
    // In a real app, this would fetch from your CDN or storage
    return 'https://your-cdn.com/models/$productId.glb';
  }

  // Check if product has 3D model available
  Future<bool> hasProduct3DModel(String productId) async {
    // In a real app, this would check your database or CDN
    // For demo purposes, we'll assume some products have 3D models
    final productsWith3D = [
      'product1', 'product2', 'product3', 'product4', 'product5'
    ];
    
    return productsWith3D.contains(productId);
  }

  // Get AR viewing instructions based on platform
  String getARInstructions() {
    if (Platform.isAndroid) {
      return '''
1. Ensure you have good lighting
2. Move your device slowly to scan the area
3. Point camera at a flat surface
4. Tap to place the product
5. Walk around to see from all angles
      ''';
    } else if (Platform.isIOS) {
      return '''
1. Ensure you have good lighting
2. Move your device slowly to scan the area
3. Point camera at a flat surface
4. Tap to place the product
5. Walk around to see from all angles
      ''';
    }

    return 'AR is not supported on this device';
  }

  // Get AR troubleshooting tips
  List<String> getARTroubleshootingTips() {
    return [
      'Ensure good lighting conditions',
      'Move device slowly when scanning',
      'Point camera at textured surfaces',
      'Avoid reflective or transparent surfaces',
      'Restart the app if AR doesn\'t start',
      'Check for app and system updates',
      'Free up device storage if needed',
    ];
  }

  // Simulate AR session start (in real app, this would initialize ARCore/ARKit)
  Future<bool> startARSession() async {
    if (!_isARSupported) {
      return false;
    }

    try {
      // Simulate AR session initialization
      await Future.delayed(const Duration(seconds: 2));
      
      debugPrint('AR session started successfully');
      return true;
    } catch (e) {
      debugPrint('Failed to start AR session: $e');
      return false;
    }
  }

  // Simulate AR session stop
  Future<void> stopARSession() async {
    try {
      // Simulate AR session cleanup
      await Future.delayed(const Duration(milliseconds: 500));
      
      debugPrint('AR session stopped');
    } catch (e) {
      debugPrint('Error stopping AR session: $e');
    }
  }

  // Check camera permissions
  Future<bool> hasCameraPermission() async {
    // In a real app, this would check camera permissions
    return true; // Simplified for demo
  }

  // Request camera permissions
  Future<bool> requestCameraPermission() async {
    // In a real app, this would request camera permissions
    return true; // Simplified for demo
  }

  void dispose() {
    // Cleanup if needed
  }
}
