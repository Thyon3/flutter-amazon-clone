class AppConstants {
  // App Info
  static const String appName = 'Amazon Clone';
  static const String appVersion = '1.0.0';
  
  // Storage Keys
  static const String authTokenKey = 'x-auth-token';
  static const String userDataKey = 'userData';
  
  // Categories
  static const List<String> productCategories = [
    'Mobiles',
    'Fashion',
    'Electronics',
    'Home',
    'Beauty',
    'Appliances',
    'Grocery',
    'Books',
    'Essentials',
  ];
  
  // Validation
  static const int minPasswordLength = 6;
  static const int maxProductNameLength = 100;
}
