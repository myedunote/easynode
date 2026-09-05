import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/order/order_layout.dart';

class OrderNotifier extends Notifier<OrderLayout?> {
  @override
  OrderLayout? build() => null;

  void setLayout(OrderLayout layout) => state = layout;
}

final hostOrderProvider = NotifierProvider<OrderNotifier, OrderLayout?>(
  OrderNotifier.new,
);

final scriptOrderProvider = NotifierProvider<OrderNotifier, OrderLayout?>(
  OrderNotifier.new,
);
