import 'dart:convert';
import 'package:flutter_amazon_clone_bloc/features/auth/domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.name,
    required super.email,
    required super.address,
    required super.type,
    required super.token,
    required super.cart,
    required super.saveForLater,
    required super.keepShoppingFor,
    required super.wishList,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'address': address,
      'type': type,
      'token': token,
      'cart': cart,
      'saveForLater': saveForLater,
      'keepShoppingFor': keepShoppingFor,
      'wishList': wishList,
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['_id'] ?? '',
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      address: map['address'] ?? '',
      type: map['type'] ?? '',
      token: map['token'] ?? '',
      cart: List<Map<String, dynamic>>.from(
        map['cart']?.map(
              (x) => Map<String, dynamic>.from(x),
        ) ??
            [],
      ),
      saveForLater: List<Map<String, dynamic>>.from(
        map['saveForLater']?.map(
              (x) => Map<String, dynamic>.from(x),
        ) ??
            [],
      ),
      keepShoppingFor: List<Map<String, dynamic>>.from(
        map['keepShoppingFor']?.map(
              (x) => Map<String, dynamic>.from(x),
        ) ??
            [],
      ),
      wishList: List<Map<String, dynamic>>.from(
        map['wishList']?.map(
              (x) => Map<String, dynamic>.from(x),
        ) ??
            [],
      ),
    );
  }

  String toJson() => json.encode(toMap());
  
  factory UserModel.fromJson(String source) =>
      UserModel.fromMap(json.decode(source));

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? address,
    String? type,
    String? token,
    List<dynamic>? cart,
    List<dynamic>? saveForLater,
    List<dynamic>? keepShoppingFor,
    List<dynamic>? wishList,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      address: address ?? this.address,
      type: type ?? this.type,
      token: token ?? this.token,
      cart: cart ?? this.cart,
      saveForLater: saveForLater ?? this.saveForLater,
      keepShoppingFor: keepShoppingFor ?? this.keepShoppingFor,
      wishList: wishList ?? this.wishList,
    );
  }

  factory UserModel.empty() {
    return const UserModel(
      id: '',
      name: '',
      email: '',
      address: '',
      type: '',
      token: '',
      cart: [],
      saveForLater: [],
      keepShoppingFor: [],
      wishList: [],
    );
  }
}
