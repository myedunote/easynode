import 'package:flutter/material.dart';

import 'app_color_theme.dart';

@immutable
class AppOverflowMenuItem<T> {
  const AppOverflowMenuItem({
    required this.value,
    required this.icon,
    required this.label,
    this.enabled = true,
  });

  final T value;
  final IconData icon;
  final String label;
  final bool enabled;
}

class AppOverflowMenu<T> extends StatelessWidget {
  const AppOverflowMenu({
    super.key,
    required this.tooltip,
    required this.items,
    required this.onSelected,
    this.width = 164,
  });

  final String tooltip;
  final List<AppOverflowMenuItem<T>> items;
  final ValueChanged<T> onSelected;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 36,
      height: 36,
      child: PopupMenuButton<T>(
        tooltip: tooltip,
        padding: EdgeInsets.zero,
        position: PopupMenuPosition.under,
        offset: const Offset(0, -16),
        color: context.colors.card,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: 0.18),
        elevation: 10,
        menuPadding: const EdgeInsets.all(4),
        constraints: BoxConstraints.tightFor(width: width),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: context.colors.border),
        ),
        popUpAnimationStyle: const AnimationStyle(
          duration: Duration(milliseconds: 120),
          reverseDuration: Duration(milliseconds: 90),
          curve: Curves.easeOutCubic,
          reverseCurve: Curves.easeInCubic,
        ),
        icon: Icon(Icons.more_vert, color: context.colors.muted, size: 22),
        onSelected: onSelected,
        itemBuilder: (context) => items
            .map(
              (item) => PopupMenuItem<T>(
                value: item.value,
                enabled: item.enabled,
                height: 40,
                padding: EdgeInsets.zero,
                child: _AppOverflowMenuItemContent(item: item),
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}

class _AppOverflowMenuItemContent<T> extends StatelessWidget {
  const _AppOverflowMenuItemContent({required this.item});

  final AppOverflowMenuItem<T> item;

  @override
  Widget build(BuildContext context) {
    final foreground = item.enabled
        ? context.colors.text
        : context.colors.softMuted;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: item.enabled ? context.colors.banner : context.colors.chip,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              item.icon,
              size: 17,
              color: item.enabled ? context.colors.primary : foreground,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: foreground, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
