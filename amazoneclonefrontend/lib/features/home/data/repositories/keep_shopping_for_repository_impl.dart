import 'package:dartz/dartz.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/typedef.dart';
import '../../../product/domain/entities/product_entity.dart';
import '../../domain/repositories/keep_shopping_for_repository.dart';
import '../datasources/keep_shopping_for_remote_data_source.dart';

class KeepShoppingForRepositoryImpl implements KeepShoppingForRepository {
  final KeepShoppingForRemoteDataSource remoteDataSource;

  KeepShoppingForRepositoryImpl({required this.remoteDataSource});

  @override
  ResultFuture<List<ProductEntity>> getKeepShoppingFor() async {
    try {
      final result = await remoteDataSource.getKeepShoppingFor();
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
  ResultVoid addKeepShoppingFor(String productId) async {
    try {
      await remoteDataSource.addKeepShoppingFor(productId);
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
