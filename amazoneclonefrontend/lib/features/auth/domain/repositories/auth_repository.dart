import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user_entity.dart';

abstract class AuthRepository {
  ResultFuture<UserEntity> signUp({
    required String name,
    required String email,
    required String password,
  });

  ResultFuture<UserEntity> signIn({
    required String email,
    required String password,
  });

  ResultFuture<bool> validateToken(String token);

  ResultFuture<UserEntity> getUserData(String token);

  ResultFuture<void> signOut();
}
