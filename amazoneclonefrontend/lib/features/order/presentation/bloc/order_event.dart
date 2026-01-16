part of 'order_bloc.dart';

abstract class OrderEvent extends Equatable {
  const OrderEvent();

  @override
  List<Object?> get props => [];
}

class PlaceOrderEvent extends OrderEvent {
  final String address;
  final double totalPrice;

  const PlaceOrderEvent({
    required this.address,
    required this.totalPrice,
  });

  @override
  List<Object?> get props => [address, totalPrice];
}

class GetOrdersEvent extends OrderEvent {
  const GetOrdersEvent();
}
