import 'package:dartz/dartz.dart';
import 'package:flutter_amazon_clone_bloc/core/error/exceptions.dart';
import 'package:flutter_amazon_clone_bloc/core/error/failures.dart';
import 'package:flutter_amazon_clone_bloc/core/network/network_info.dart';
import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  @override
  ResultFuture<UserEntity> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final user = await remoteDataSource.signUp(
        name: name,
        email: email,
        password: password,
      );

      await localDataSource.cacheToken(user.token);
      await localDataSource.cacheUser(user);

      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<UserEntity> signIn({
    required String email,
    required String password,
  }) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final user = await remoteDataSource.signIn(
        email: email,
        password: password,
      );

      await localDataSource.cacheToken(user.token);
      await localDataSource.cacheUser(user);

      return Right(user);
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<bool> validateToken(String token) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final isValid = await remoteDataSource.validateToken(token);
      return Right(isValid);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<UserEntity> getUserData(String token) async {
    try {
      if (!await networkInfo.isConnected) {
        // Try to get cached user
        final cachedUser = await localDataSource.getCachedUser();
        if (cachedUser != null) {
          return Right(cachedUser);
        }
        return const Left(NetworkFailure('No internet connection'));
      }

      final user = await remoteDataSource.getUserData(token);
      await localDataSource.cacheUser(user);

      return Right(user);
    } on UnauthorizedException catch (e) {
      return Left(UnauthorizedFailure(e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<void> signOut() async {
    try {
      await localDataSource.clearAuthData();
      return const Right(null);
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } catch (e) {
      return Left(CacheFailure(e.toString()));
    }
  }
}
