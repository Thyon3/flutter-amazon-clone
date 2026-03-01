import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_amazon_clone_bloc/features/account/domain/usecases/update_profile.dart';
import 'package:flutter_amazon_clone_bloc/features/account/presentation/bloc/profile_event.dart';
import 'package:flutter_amazon_clone_bloc/features/account/presentation/bloc/profile_state.dart';

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final UpdateProfile updateProfile;

  ProfileBloc({required this.updateProfile}) : super(ProfileInitial()) {
    on<UpdateProfileEvent>(_onUpdateProfile);
  }

  Future<void> _onUpdateProfile(
    UpdateProfileEvent event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileLoading());
    final result = await updateProfile(
      UpdateProfileParams(name: event.name, email: event.email),
    );

    result.fold(
      (failure) => emit(ProfileError(failure.message)),
      (user) => emit(ProfileUpdated(user)),
    );
  }
}
