import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

part 'admin_bottom_bar_state.dart';

class AdminBottomBarCubit extends Cubit<AdminBottomBarState> {
  AdminBottomBarCubit() : super(const AdminBottomBarState(index: 0));

  void changePage(int index) {
    emit(AdminBottomBarState(index: index));
  }
}
