import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/cart/domain/entities/cart_item_entity.dart';

abstract class CartRepository {
  ResultFuture<List<CartItemEntity>> getCartItems();
  
  ResultFuture<void> addToCart(String productId);
  
  ResultFuture<void> removeFromCart(String productId);
  
  ResultFuture<void> updateQuantity(String productId, int quantity);
  
  ResultFuture<void> clearCart();
}
