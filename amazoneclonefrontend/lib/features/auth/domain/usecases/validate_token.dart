import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/repositories/auth_repository.dart';

class ValidateToken {
  final AuthRepository repository;

  ValidateToken(this.repository);

  ResultFuture<bool> call(String token) async {
    return await repository.validateToken(token);
  }
}
