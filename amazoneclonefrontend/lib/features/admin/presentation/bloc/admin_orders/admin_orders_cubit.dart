import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../order/domain/entities/order_entity.dart';
import '../../../domain/usecases/get_admin_orders.dart';
import '../../../domain/usecases/change_order_status.dart';

part 'admin_orders_state.dart';

class AdminOrdersCubit extends Cubit<AdminOrdersState> {
  final GetAdminOrders getAdminOrders;
  final ChangeOrderStatus changeOrderStatus;

  AdminOrdersCubit({
    required this.getAdminOrders,
    required this.changeOrderStatus,
  }) : super(AdminOrdersInitial());

  Future<void> getOrders() async {
    emit(AdminOrdersLoading());
    
    final result = await getAdminOrders();
    
    result.fold(
      (failure) => emit(AdminOrdersError(failure.message)),
      (orders) => emit(AdminOrdersLoaded(orders)),
    );
  }

  Future<void> changeOrderStatus({
    required String orderId,
    required int status,
  }) async {
    final result = await changeOrderStatus(
      ChangeOrderStatusParams(orderId: orderId, status: status),
    );
    
    result.fold(
      (failure) => emit(AdminOrdersError(failure.message)),
      (_) => getOrders(), // Refresh orders list
    );
  }
}
