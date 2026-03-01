import 'package:equatable/equatable.dart';

abstract class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

class UpdateProfileEvent extends ProfileEvent {
  final String? name;
  final String? email;

  const UpdateProfileEvent({this.name, this.email});

  @override
  List<Object?> get props => [name, email];
}
