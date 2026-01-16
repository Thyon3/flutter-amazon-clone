import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../domain/entities/analytics_entity.dart';
import '../../../domain/usecases/get_analytics.dart';

part 'admin_analytics_state.dart';

class AdminAnalyticsCubit extends Cubit<AdminAnalyticsState> {
  final GetAnalytics getAnalytics;

  AdminAnalyticsCubit({required this.getAnalytics}) : super(AdminAnalyticsInitial());

  Future<void> getAnalytics() async {
    emit(AdminAnalyticsLoading());
    
    final result = await getAnalytics();
    
    result.fold(
      (failure) => emit(AdminAnalyticsError(failure.message)),
      (analytics) => emit(AdminAnalyticsLoaded(analytics)),
    );
  }
}
