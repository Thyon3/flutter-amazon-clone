import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/repositories/auth_repository.dart';

class GetUserData {
  final AuthRepository repository;

  GetUserData(this.repository);

  ResultFuture<UserEntity> call(String token) async {
    return await repository.getUserData(token);
  }
}
