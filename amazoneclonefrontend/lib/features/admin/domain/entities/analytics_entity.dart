import 'package:equatable/equatable.dart';

class AnalyticsEntity extends Equatable {
  final double totalEarnings;
  final double mobilesEarnings;
  final double fashionEarnings;
  final double electronicsEarnings;
  final double homeEarnings;
  final double beautyEarnings;
  final double appliancesEarnings;
  final double groceryEarnings;
  final double booksEarnings;
  final double essentialsEarnings;

  const AnalyticsEntity({
    required this.totalEarnings,
    required this.mobilesEarnings,
    required this.fashionEarnings,
    required this.electronicsEarnings,
    required this.homeEarnings,
    required this.beautyEarnings,
    required this.appliancesEarnings,
    required this.groceryEarnings,
    required this.booksEarnings,
    required this.essentialsEarnings,
  });

  @override
  List<Object?> get props => [
        totalEarnings,
        mobilesEarnings,
        fashionEarnings,
        electronicsEarnings,
        homeEarnings,
        beautyEarnings,
        appliancesEarnings,
        groceryEarnings,
        booksEarnings,
        essentialsEarnings,
      ];
}
