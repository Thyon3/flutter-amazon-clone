import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_amazon_clone_bloc/core/network/network_info.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/repositories/auth_repository.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/get_user_data.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/sign_in.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/sign_up.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/validate_token.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/presentation/bloc/auth_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  sl.registerLazySingleton(() => http.Client());

  // Core
  sl.registerLazySingleton<NetworkInfo>(() => NetworkInfoImpl());

  // Auth Feature
  _initAuth();
}

void _initAuth() {
  // Bloc
  sl.registerFactory(
    () => AuthBloc(
      signUpUseCase: sl(),
      signInUseCase: sl(),
      validateTokenUseCase: sl(),
      getUserDataUseCase: sl(),
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => SignUp(sl()));
  sl.registerLazySingleton(() => SignIn(sl()));
  sl.registerLazySingleton(() => ValidateToken(sl()));
  sl.registerLazySingleton(() => GetUserData(sl()));

  // Repository
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
      networkInfo: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(client: sl()),
  );
  sl.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSourceImpl(sharedPreferences: sl()),
  );
}
