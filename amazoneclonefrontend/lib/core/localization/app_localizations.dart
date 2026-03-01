import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  // General
  String get appTitle => 'Amazon Clone';
  String get ok => 'OK';
  String get cancel => 'Cancel';
  String get save => 'Save';
  String get delete => 'Delete';
  String get edit => 'Edit';
  String get search => 'Search';
  String get loading => 'Loading...';
  String get error => 'Error';
  String get retry => 'Retry';
  String get close => 'Close';

  // Navigation
  String get home => 'Home';
  String get account => 'Account';
  String get cart => 'Cart';
  String get menu => 'Menu';
  String get back => 'Back';
  String get next => 'Next';
  String get previous => 'Previous';

  // Authentication
  String get signIn => 'Sign In';
  String get signUp => 'Sign Up';
  String get signOut => 'Sign Out';
  String get email => 'Email';
  String get password => 'Password';
  String get confirmPassword => 'Confirm Password';
  String get forgotPassword => 'Forgot Password?';
  String get rememberMe => 'Remember Me';
  String get alreadyHaveAccount => 'Already have an account?';
  String get dontHaveAccount => "Don't have an account?";
  String get welcomeBack => 'Welcome Back!';
  String get createAccount => 'Create Account';

  // Product
  String get products => 'Products';
  String get product => 'Product';
  String get price => 'Price';
  String get description => 'Description';
  String get category => 'Category';
  String get rating => 'Rating';
  String get reviews => 'Reviews';
  String get addToCart => 'Add to Cart';
  String get buyNow => 'Buy Now';
  String get outOfStock => 'Out of Stock';
  String get inStock => 'In Stock';
  String get dealOfTheDay => 'Deal of the Day';
  String get bestSellers => 'Best Sellers';
  String get newArrivals => 'New Arrivals';
  String get topRated => 'Top Rated';

  // Search
  String get searchProducts => 'Search products';
  String get searchHint => 'What are you looking for?';
  String get noResultsFound => 'No results found';
  String get tryDifferentKeywords => 'Try searching with different keywords';
  String get filters => 'Filters';
  String get clearAll => 'Clear All';
  String get applyFilters => 'Apply Filters';
  String get activeFilters => 'Active';
  String get minPrice => 'Min Price';
  String get maxPrice => 'Max Price';
  String get minRating => 'Minimum Rating';
  String get sortBy => 'Sort By';
  String get relevance => 'Relevance';
  String get priceLowToHigh => 'Price: Low to High';
  String get priceHighToLow => 'Price: High to Low';
  String get ratingHighToLow => 'Rating: High to Low';
  String get newestFirst => 'Newest First';
  String get freeShipping => 'Free Shipping';
  String get prime => 'Prime';

  // Cart
  String get shoppingCart => 'Shopping Cart';
  String get cartEmpty => 'Your cart is empty';
  String get cartTotal => 'Cart Total';
  String get subtotal => 'Subtotal';
  String get tax => 'Tax';
  String get shipping => 'Shipping';
  String get total => 'Total';
  String get checkout => 'Checkout';
  String get continueShopping => 'Continue Shopping';
  String get quantity => 'Quantity';
  String get remove => 'Remove';
  String get itemAddedToCart => 'Item added to cart';
  String get itemRemovedFromCart => 'Item removed from cart';

  // Wishlist
  String get wishlist => 'Wishlist';
  String get addToWishlist => 'Add to Wishlist';
  String get removeFromWishlist => 'Remove from Wishlist';
  String get wishlistEmpty => 'Your wishlist is empty';
  String get shareWishlist => 'Share Wishlist';
  String get itemAddedToWishlist => 'Item added to wishlist';
  String get itemRemovedFromWishlist => 'Item removed from wishlist';

  // Comparison
  String get compare => 'Compare';
  String get productComparison => 'Product Comparison';
  String get addToComparison => 'Add to Comparison';
  String get removeFromComparison => 'Remove from Comparison';
  String get comparisonEmpty => 'No products to compare';
  String get addAtLeastTwoProducts => 'Add at least 2 products to compare';
  String get compareUpToFourProducts => 'You can compare up to 4 products';
  String get browseProducts => 'Browse Products';
  String get clearComparison => 'Clear All';

  // Orders
  String get orders => 'Orders';
  String get order => 'Order';
  String get orderHistory => 'Order History';
  String get orderNumber => 'Order Number';
  String get orderDate => 'Order Date';
  String get orderStatus => 'Order Status';
  String get orderTotal => 'Order Total';
  String get trackOrder => 'Track Order';
  String get orderPlaced => 'Order Placed';
  String get orderConfirmed => 'Order Confirmed';
  String get orderShipped => 'Order Shipped';
  String get orderDelivered => 'Order Delivered';
  String get orderCancelled => 'Order Cancelled';
  String get noOrdersFound => 'No orders found';

  // Account
  String get myAccount => 'My Account';
  String get profile => 'Profile';
  String get editProfile => 'Edit Profile';
  String get name => 'Name';
  String get phone => 'Phone';
  String get address => 'Address';
  String get savedAddresses => 'Saved Addresses';
  String get addAddress => 'Add Address';
  String get paymentMethods => 'Payment Methods';
  String get addPaymentMethod => 'Add Payment Method';
  String get settings => 'Settings';
  String get notifications => 'Notifications';
  String get privacy => 'Privacy';
  String get help => 'Help';
  String get about => 'About';

  // Admin
  String get adminPanel => 'Admin Panel';
  String get dashboard => 'Dashboard';
  String get analytics => 'Analytics';
  String get sales => 'Sales';
  String get customers => 'Customers';
  String get manageProducts => 'Manage Products';
  String get addProduct => 'Add Product';
  String get editProduct => 'Edit Product';
  String get deleteProduct => 'Delete Product';
  String get manageOrders => 'Manage Orders';
  String get updateOrderStatus => 'Update Order Status';
  String get reports => 'Reports';

  // Errors
  String get somethingWentWrong => 'Something went wrong';
  String get networkError => 'Network error. Please check your connection.';
  String get serverError => 'Server error. Please try again later.';
  String get invalidCredentials => 'Invalid email or password';
  String get userNotFound => 'User not found';
  String get emailAlreadyExists => 'Email already exists';
  String get weakPassword => 'Password is too weak';
  String get invalidEmail => 'Invalid email address';
  String get fieldRequired => 'This field is required';
  String get passwordsDoNotMatch => 'Passwords do not match';

  // Success messages
  String get operationSuccessful => 'Operation successful';
  String get profileUpdated => 'Profile updated successfully';
  String get passwordChanged => 'Password changed successfully';
  String get orderPlacedSuccessfully => 'Order placed successfully';
  String get reviewSubmitted => 'Review submitted successfully';

  // Settings
  String get language => 'Language';
  String get theme => 'Theme';
  String get darkMode => 'Dark Mode';
  String get lightMode => 'Light Mode';
  String get systemTheme => 'System Theme';
  String get english => 'English';
  String get spanish => 'Spanish';
  String get french => 'French';
  String get german => 'German';
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['en', 'es', 'fr', 'de'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(LocalizationsDelegate<AppLocalizations> old) => false;
}
