import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:pay/pay.dart';
import '../../../../core/utils/show_snackbar.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../order/presentation/bloc/order_bloc.dart';

class PaymentScreen extends StatefulWidget {
  final String address;
  final double totalAmount;

  const PaymentScreen({
    super.key,
    required this.address,
    required this.totalAmount,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final Future<PaymentConfiguration> _googlePayConfigFuture =
      PaymentConfiguration.fromAsset('assets/gpay.json');
  final Future<PaymentConfiguration> _applePayConfigFuture =
      PaymentConfiguration.fromAsset('assets/applepay.json');

  List<PaymentItem> _paymentItems = [];

  @override
  void initState() {
    super.initState();
    _paymentItems = [
      PaymentItem(
        label: 'Total Amount',
        amount: widget.totalAmount.toStringAsFixed(2),
        status: PaymentItemStatus.final_price,
      ),
    ];
  }

  void _onGooglePayResult(Map<String, dynamic> result) {
    // Payment successful, place order
    context.read<OrderBloc>().add(
          PlaceOrderEvent(
            address: widget.address,
            totalPrice: widget.totalAmount,
          ),
        );
  }

  void _onApplePayResult(Map<String, dynamic> result) {
    // Payment successful, place order
    context.read<OrderBloc>().add(
          PlaceOrderEvent(
            address: widget.address,
            totalPrice: widget.totalAmount,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment'),
        elevation: 0,
      ),
      body: BlocListener<OrderBloc, OrderState>(
        listener: (context, state) {
          if (state is OrderSuccess) {
            showSuccessSnackBar(context, 'Order placed successfully!');
            context.go('/main');
          } else if (state is OrderError) {
            showErrorSnackBar(context, state.message);
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Address Section
              const Text(
                'Delivery Address',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Text(
                  widget.address,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
              const SizedBox(height: 24),

              // Price Summary
              const Text(
                'Price Summary',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Total Amount:',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '\$${widget.totalAmount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFF9900),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Payment Methods
              const Text(
                'Select Payment Method',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // Google Pay Button
              FutureBuilder<PaymentConfiguration>(
                future: _googlePayConfigFuture,
                builder: (context, snapshot) {
                  if (snapshot.hasData) {
                    return GooglePayButton(
                      paymentConfiguration: snapshot.data!,
                      paymentItems: _paymentItems,
                      type: GooglePayButtonType.buy,
                      margin: const EdgeInsets.only(bottom: 16),
                      onPaymentResult: _onGooglePayResult,
                      loadingIndicator: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),

              // Apple Pay Button
              FutureBuilder<PaymentConfiguration>(
                future: _applePayConfigFuture,
                builder: (context, snapshot) {
                  if (snapshot.hasData) {
                    return ApplePayButton(
                      paymentConfiguration: snapshot.data!,
                      paymentItems: _paymentItems,
                      style: ApplePayButtonStyle.black,
                      type: ApplePayButtonType.buy,
                      margin: const EdgeInsets.only(bottom: 16),
                      onPaymentResult: _onApplePayResult,
                      loadingIndicator: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),

              const SizedBox(height: 16),

              // Cash on Delivery Option
              ElevatedButton(
                onPressed: () {
                  context.read<OrderBloc>().add(
                        PlaceOrderEvent(
                          address: widget.address,
                          totalPrice: widget.totalAmount,
                        ),
                      );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFBF00),
                  foregroundColor: Colors.black,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Cash on Delivery',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
