import 'package:dartz/dartz.dart';
import 'package:flutter_amazon_clone_bloc/core/error/exceptions.dart';
import 'package:flutter_amazon_clone_bloc/core/error/failures.dart';
import 'package:flutter_amazon_clone_bloc/core/network/network_info.dart';
import 'package:flutter_amazon_clone_bloc/core/utils/typedef.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/product/data/datasources/product_remote_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/entities/product_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/product/domain/repositories/product_repository.dart';

class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  ProductRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  Future<String?> _getToken() async {
    return await localDataSource.getToken();
  }

  @override
  ResultFuture<List<ProductEntity>> getProductsByCategory(String category) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      final products = await remoteDataSource.getProductsByCategory(category, token);
      return Right(products);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<List<ProductEntity>> searchProducts(String query) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      final products = await remoteDataSource.searchProducts(query, token);
      return Right(products);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<ProductEntity> getDealOfTheDay() async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      final product = await remoteDataSource.getDealOfTheDay(token);
      return Right(product);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<void> rateProduct(String productId, double rating) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      await remoteDataSource.rateProduct(productId, rating, token);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<double> getUserRating(String productId) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      final rating = await remoteDataSource.getUserRating(productId, token);
      return Right(rating);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<double> getAverageRating(String productId) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      final rating = await remoteDataSource.getAverageRating(productId, token);
      return Right(rating);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<int> getRatingCount(String productId) async {
    try {
      if (!await networkInfo.isConnected) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final token = await _getToken();
      if (token == null) {
        return const Left(UnauthorizedFailure('No authentication token'));
      }

      final count = await remoteDataSource.getRatingCount(productId, token);
      return Right(count);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  ResultFuture<ProductEntity> getProductById(String id) async {
    // This would typically fetch from a dedicated endpoint
    // For now, returning as not implemented
    return const Left(ServerFailure('Not implemented'));
  }
}
