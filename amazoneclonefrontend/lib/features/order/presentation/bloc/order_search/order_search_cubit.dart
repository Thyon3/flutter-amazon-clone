import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../domain/entities/order_entity.dart';
import '../../../domain/usecases/search_orders.dart';

part 'order_search_state.dart';

class OrderSearchCubit extends Cubit<OrderSearchState> {
  final SearchOrders searchOrders;

  OrderSearchCubit({required this.searchOrders}) : super(OrderSearchInitial());

  Future<void> searchOrders(String query) async {
    emit(OrderSearchLoading());
    
    final result = await searchOrders(query);
    
    result.fold(
      (failure) => emit(OrderSearchError(failure.message)),
      (orders) => emit(OrderSearchLoaded(orders)),
    );
  }

  void clearSearch() {
    emit(OrderSearchInitial());
  }
}
