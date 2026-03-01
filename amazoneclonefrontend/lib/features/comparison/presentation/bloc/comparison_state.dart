part of 'comparison_bloc.dart';

import 'package:equatable/equatable.dart';
import '../../domain/models/product_comparison.dart';

abstract class ComparisonState extends Equatable {
  const ComparisonState();

  @override
  List<Object?> get props => [];
}

class ComparisonInitial extends ComparisonState {
  const ComparisonInitial();
}

class ComparisonUpdated extends ComparisonState {
  final ProductComparison comparison;

  const ComparisonUpdated(this.comparison);

  @override
  List<Object?> get props => [comparison];
}

class ComparisonError extends ComparisonState {
  final String message;

  const ComparisonError(this.message);

  @override
  List<Object?> get props => [message];
}
