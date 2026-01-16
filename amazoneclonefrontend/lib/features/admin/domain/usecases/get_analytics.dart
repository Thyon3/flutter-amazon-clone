import '../../../../core/utils/typedef.dart';
import '../entities/analytics_entity.dart';
import '../repositories/admin_repository.dart';

class GetAnalytics {
  final AdminRepository repository;

  GetAnalytics(this.repository);

  ResultFuture<AnalyticsEntity> call() async {
    return await repository.getAnalytics();
  }
}
