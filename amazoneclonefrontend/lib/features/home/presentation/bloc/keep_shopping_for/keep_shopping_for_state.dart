part of 'keep_shopping_for_cubit.dart';

abstract class KeepShoppingForState extends Equatable {
  const KeepShoppingForState();

  @override
  List<Object?> get props => [];
}

class KeepShoppingForInitial extends KeepShoppingForState {}

class KeepShoppingForLoading extends KeepShoppingForState {}

class KeepShoppingForLoaded extends KeepShoppingForState {
  final List<ProductEntity> products;

  const KeepShoppingForLoaded(this.products);

  @override
  List<Object?> get props => [products];
}

class KeepShoppingForError extends KeepShoppingForState {
  final String message;

  const KeepShoppingForError(this.message);

  @override
  List<Object?> get props => [message];
}
