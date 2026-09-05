import 'package:flutter/material.dart';

Widget buildAppReorderProxy(
  Widget child,
  int index,
  Animation<double> animation,
) {
  return AnimatedBuilder(
    key: const ValueKey('app-order-drag-proxy'),
    animation: animation,
    child: child,
    builder: (context, child) {
      final lift = Curves.easeOutCubic.transform(animation.value);
      return Transform.scale(
        scale: 1 + (0.012 * lift),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12 + (0.08 * lift)),
                blurRadius: 18 + (8 * lift),
                offset: Offset(0, 5 + (3 * lift)),
              ),
            ],
          ),
          child: child,
        ),
      );
    },
  );
}
