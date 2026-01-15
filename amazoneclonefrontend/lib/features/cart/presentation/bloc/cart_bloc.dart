import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_amazon_clone_bloc/features/cart/domain/entities/cart_item_entity.dart';

part 'cart_event.dart';
part 'cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc() : super(CartInitial()) {
    on<LoadCartEvent>(_onLoadCart);
    on<AddToCartEvent>(_onAddToCart);
    on<RemoveFromCartEvent>(_onRemoveFromCart);
    on<UpdateCartQuantityEvent>(_onUpdateQuantity);
    on<ClearCartEvent>(_onClearCart);
  }

  Future<void> _onLoadCart(LoadCartEvent event, Emitter<CartState> emit) async {
    emit(CartLoading());
    // TODO: Implement actual cart loading from repository
    emit(const CartLoaded([]));
  }

  Future<void> _onAddToCart(AddToCartEvent event, Emitter<CartState> emit) async {
    if (state is CartLoaded) {
      final currentState = state as CartLoaded;
      final items = List<CartItemEntity>.from(currentState.items);
      
      // Check if product already exists
      final existingIndex = items.indexWhere(
        (item) => item.product.id == event.item.product.id,
      );
      
      if (existingIndex != -1) {
        // Update quantity
        final updatedItem = CartItemEntity(
          product: items[existingIndex].product,
          quantity: items[existingIndex].quantity + event.item.quantity,
        );
        items[existingIndex] = updatedItem;
      } else {
        items.add(event.item);
      }
      
      emit(CartLoaded(items));
    }
  }

  Future<void> _onRemoveFromCart(
    RemoveFromCartEvent event,
    Emitter<CartState> emit,
  ) async {
    if (state is CartLoaded) {
      final currentState = state as CartLoaded;
      final items = List<CartItemEntity>.from(currentState.items);
      items.removeWhere((item) => item.product.id == event.productId);
      emit(CartLoaded(items));
    }
  }

  Future<void> _onUpdateQuantity(
    UpdateCartQuantityEvent event,
    Emitter<CartState> emit,
  ) async {
    if (state is CartLoaded) {
      final currentState = state as CartLoaded;
      final items = List<CartItemEntity>.from(currentState.items);
      
      final index = items.indexWhere(
        (item) => item.product.id == event.productId,
      );
      
      if (index != -1) {
        if (event.quantity <= 0) {
          items.removeAt(index);
        } else {
          items[index] = CartItemEntity(
            product: items[index].product,
            quantity: event.quantity,
          );
        }
      }
      
      emit(CartLoaded(items));
    }
  }

  Future<void> _onClearCart(ClearCartEvent event, Emitter<CartState> emit) async {
    emit(const CartLoaded([]));
  }
}
