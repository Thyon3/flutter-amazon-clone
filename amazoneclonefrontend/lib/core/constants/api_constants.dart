class ApiConstants {
  static const String baseUrl = 'http://localhost:3000';
  
  // Auth endpoints
  static const String signUp = '/api/signup';
  static const String signIn = '/api/signin';
  static const String tokenValidation = '/IsTokenValid';
  static const String getUserData = '/';
  
  // Product endpoints
  static const String getProducts = '/api/products';
  static const String searchProducts = '/api/products/search';
  static const String rateProduct = '/api/rate-product';
  static const String getProductRating = '/api/get-product-rating';
  static const String getAverageRating = '/api/get-ratings-average';
  static const String getAverageRatingLength = '/api/get-average-ratings-length';
  static const String dealOfTheDay = '/api/deal-of-the-day';
  
  // Admin endpoints
  static const String adminAddProduct = '/admin/add-product';
  static const String adminGetProducts = '/admin/get-products';
  static const String adminGetCategoryProduct = '/admin/get-category-product';
  static const String adminDeleteProduct = '/admin/delete-product';
  static const String adminGetOrders = '/admin/get-orders';
  static const String adminChangeOrderStatus = '/admin/change-order-status';
  static const String adminAnalytics = '/admin/analytics';
}
