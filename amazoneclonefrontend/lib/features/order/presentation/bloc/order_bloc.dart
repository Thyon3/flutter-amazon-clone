import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/usecases/place_order.dart';
import '../../domain/usecases/get_orders.dart';

part 'order_event.dart';
part 'order_state.dart';

class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final PlaceOrder placeOrder;
  final GetOrders getOrders;

  OrderBloc({
    required this.placeOrder,
    required this.getOrders,
  }) : super(OrderInitial()) {
    on<PlaceOrderEvent>(_onPlaceOrder);
    on<GetOrdersEvent>(_onGetOrders);
  }

  Future<void> _onPlaceOrder(
    PlaceOrderEvent event,
    Emitter<OrderState> emit,
  ) async {
    emit(OrderLoading());
    
    final result = await placeOrder(
      PlaceOrderParams(
        address: event.address,
        totalPrice: event.totalPrice,
      ),
    );

    result.fold(
      (failure) => emit(OrderError(failure.message)),
      (order) => emit(OrderSuccess(order)),
    );
  }

  Future<void> _onGetOrders(
    GetOrdersEvent event,
    Emitter<OrderState> emit,
  ) async {
    emit(OrderLoading());
    
    final result = await getOrders();

    result.fold(
      (failure) => emit(OrderError(failure.message)),
      (orders) => emit(OrdersLoaded(orders)),
    );
  }
}
