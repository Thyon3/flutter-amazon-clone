import 'package:dartz/dartz.dart';
import 'package:flutter_amazon_clone_bloc/core/error/failures.dart';
import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/account/data/datasources/account_remote_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/account/domain/repositories/account_repository.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AccountRepositoryImpl implements AccountRepository {
  final AccountRemoteDataSource remoteDataSource;
  final SharedPreferences sharedPreferences;

  AccountRepositoryImpl({
    required this.remoteDataSource,
    required this.sharedPreferences,
  });

  @override
  ResultFuture<User> updateProfile({String? name, String? email}) async {
    try {
      final token = sharedPreferences.getString('x-auth-token') ?? '';
      final user = await remoteDataSource.updateProfile(
        token: token,
        name: name,
        email: email,
      );
      return Right(user);
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  ResultFuture<List<ProductEntity>> getBrowsingHistory() async {
    // Basic implementation for now to satisfy interface
    return const Right([]);
  }

  @override
  ResultVoid clearBrowsingHistory() async {
    return const Right(null);
  }

  @override
  ResultVoid addToBrowsingHistory(String productId) async {
    return const Right(null);
  }
}
