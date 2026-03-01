import 'package:dartz/dartz.dart';
import 'package:flutter_amazon_clone_bloc/core/error/failures.dart';
import 'package:flutter_amazon_clone_bloc/core/usecase/usecase.dart';
import 'package:flutter_amazon_clone_bloc/features/account/domain/repositories/account_repository.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user.dart';

class UpdateProfile implements UseCase<User, UpdateProfileParams> {
  final AccountRepository repository;

  UpdateProfile(this.repository);

  @override
  Future<Either<Failure, User>> call(UpdateProfileParams params) async {
    return await repository.updateProfile(
      name: params.name,
      email: params.email,
    );
  }
}

class UpdateProfileParams {
  final String? name;
  final String? email;

  UpdateProfileParams({this.name, this.email});
}
