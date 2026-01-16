import 'package:dartz/dartz.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../../domain/repositories/save_for_later_repository.dart';
import '../datasources/save_for_later_remote_data_source.dart';

class SaveForLaterRepositoryImpl implements SaveForLaterRepository {
  final SaveForLaterRemoteDataSource remoteDataSource;

  SaveForLaterRepositoryImpl({required this.remoteDataSource});

  @override
  ResultFuture<List<ProductEntity>> getSaveForLater() async {
    try {
      final result = await remoteDataSource.getSaveForLater();
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    }
  }

  @override
  ResultVoid saveForLater(String productId) async {
    try {
      await remoteDataSource.saveForLater(productId);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    }
  }

  @override
  ResultVoid deleteFromLater(String productId) async {
    try {
      await remoteDataSource.deleteFromLater(productId);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    }
  }

  @override
  ResultVoid moveToCart(String productId) async {
    try {
      await remoteDataSource.moveToCart(productId);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    }
  }
}
