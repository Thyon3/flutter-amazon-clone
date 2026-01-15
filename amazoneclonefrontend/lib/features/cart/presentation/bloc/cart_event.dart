part of 'cart_bloc.dart';

abstract class CartEvent extends Equatable {
  const CartEvent();

  @override
  List<Object?> get props => [];
}

class LoadCartEvent extends CartEvent {
  const LoadCartEvent();
}

class AddToCartEvent extends CartEvent {
  final CartItemEntity item;

  const AddToCartEvent(this.item);

  @override
  List<Object?> get props => [item];
}

class RemoveFromCartEvent extends CartEvent {
  final String productId;

  const RemoveFromCartEvent(this.productId);

  @override
  List<Object?> get props => [productId];
}

class UpdateCartQuantityEvent extends CartEvent {
  final String productId;
  final int quantity;

  const UpdateCartQuantityEvent({
    required this.productId,
    required this.quantity,
  });

  @override
  List<Object?> get props => [productId, quantity];
}

class ClearCartEvent extends CartEvent {
  const ClearCartEvent();
}
