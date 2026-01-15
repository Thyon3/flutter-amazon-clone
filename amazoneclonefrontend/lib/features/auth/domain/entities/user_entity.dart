import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String name;
  final String email;
  final String address;
  final String type;
  final String token;
  final List<dynamic> cart;
  final List<dynamic> saveForLater;
  final List<dynamic> keepShoppingFor;
  final List<dynamic> wishList;

  const UserEntity({
    required this.id,
    required this.name,
    required this.email,
    required this.address,
    required this.type,
    required this.token,
    required this.cart,
    required this.saveForLater,
    required this.keepShoppingFor,
    required this.wishList,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        email,
        address,
        type,
        token,
        cart,
        saveForLater,
        keepShoppingFor,
        wishList
      ];

  bool get isAdmin => type == 'admin';
  bool get isUser => type == 'user';
}
