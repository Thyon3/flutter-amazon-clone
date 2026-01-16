part of 'admin_analytics_cubit.dart';

abstract class AdminAnalyticsState extends Equatable {
  const AdminAnalyticsState();

  @override
  List<Object?> get props => [];
}

class AdminAnalyticsInitial extends AdminAnalyticsState {}

class AdminAnalyticsLoading extends AdminAnalyticsState {}

class AdminAnalyticsLoaded extends AdminAnalyticsState {
  final AnalyticsEntity analytics;

  const AdminAnalyticsLoaded(this.analytics);

  @override
  List<Object?> get props => [analytics];
}

class AdminAnalyticsError extends AdminAnalyticsState {
  final String message;

  const AdminAnalyticsError(this.message);

  @override
  List<Object?> get props => [message];
}
