part of 'order_search_cubit.dart';

abstract class OrderSearchState extends Equatable {
  const OrderSearchState();

  @override
  List<Object?> get props => [];
}

class OrderSearchInitial extends OrderSearchState {}

class OrderSearchLoading extends OrderSearchState {}

class OrderSearchLoaded extends OrderSearchState {
  final List<OrderEntity> orders;

  const OrderSearchLoaded(this.orders);

  @override
  List<Object?> get props => [orders];
}

class OrderSearchError extends OrderSearchState {
  final String message;

  const OrderSearchError(this.message);

  @override
  List<Object?> get props => [message];
}
