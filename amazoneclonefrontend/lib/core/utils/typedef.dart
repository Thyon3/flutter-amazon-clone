import 'package:dartz/dartz.dart';
import 'package:flutter_amazon_clone_bloc/core/error/failures.dart';

typedef ResultFuture<T> = Future<Either<Failure, T>>;
typedef ResultVoid = Future<Either<Failure, void>>;
typedef DataMap = Map<String, dynamic>;
