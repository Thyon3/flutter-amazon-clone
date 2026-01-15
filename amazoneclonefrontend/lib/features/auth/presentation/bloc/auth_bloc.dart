import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user_entity.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/sign_in.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/sign_up.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/validate_token.dart';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/usecases/get_user_data.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final SignUp signUpUseCase;
  final SignIn signInUseCase;
  final ValidateToken validateTokenUseCase;
  final GetUserData getUserDataUseCase;

  AuthBloc({
    required this.signUpUseCase,
    required this.signInUseCase,
    required this.validateTokenUseCase,
    required this.getUserDataUseCase,
  }) : super(AuthInitial()) {
    on<SignUpEvent>(_onSignUp);
    on<SignInEvent>(_onSignIn);
    on<ValidateTokenEvent>(_onValidateToken);
    on<GetUserDataEvent>(_onGetUserData);
    on<SignOutEvent>(_onSignOut);
  }

  Future<void> _onSignUp(SignUpEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    
    final result = await signUpUseCase(
      name: event.name,
      email: event.email,
      password: event.password,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(AuthAuthenticated(user)),
    );
  }

  Future<void> _onSignIn(SignInEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    
    final result = await signInUseCase(
      email: event.email,
      password: event.password,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(AuthAuthenticated(user)),
    );
  }

  Future<void> _onValidateToken(
    ValidateTokenEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await validateTokenUseCase(event.token);

    result.fold(
      (failure) => emit(AuthUnauthenticated()),
      (isValid) {
        if (isValid) {
          add(GetUserDataEvent(event.token));
        } else {
          emit(AuthUnauthenticated());
        }
      },
    );
  }

  Future<void> _onGetUserData(
    GetUserDataEvent event,
    Emitter<AuthState> emit,
  ) async {
    final result = await getUserDataUseCase(event.token);

    result.fold(
      (failure) => emit(AuthUnauthenticated()),
      (user) => emit(AuthAuthenticated(user)),
    );
  }

  void _onSignOut(SignOutEvent event, Emitter<AuthState> emit) {
    emit(AuthUnauthenticated());
  }
}
