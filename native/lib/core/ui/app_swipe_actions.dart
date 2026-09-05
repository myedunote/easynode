import 'package:flutter/material.dart';

import 'app_color_theme.dart';

enum AppSwipeActionTone { neutral, primary, danger }

@immutable
class AppSwipeAction {
  const AppSwipeAction({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.key,
    this.tone = AppSwipeActionTone.neutral,
  });

  final Key? key;
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final AppSwipeActionTone tone;
}

/// Coordinates swipe actions so only one row can remain open at a time.
class AppSwipeActionsController extends ChangeNotifier {
  String? _openItemId;

  String? get openItemId => _openItemId;

  void open(String itemId) {
    if (_openItemId == itemId) return;
    _openItemId = itemId;
    notifyListeners();
  }

  void close() {
    if (_openItemId == null) return;
    _openItemId = null;
    notifyListeners();
  }
}

/// A compact trailing action pane for mobile list rows.
///
/// Drag the row to the left to reveal the actions. The foreground never
/// dismisses the item, and tapping it while open only closes the action pane.
class AppSwipeActions extends StatefulWidget {
  const AppSwipeActions({
    super.key,
    required this.itemId,
    required this.controller,
    required this.actions,
    required this.child,
    this.actionWidth = 64,
  });

  final String itemId;
  final AppSwipeActionsController controller;
  final List<AppSwipeAction> actions;
  final Widget child;
  final double actionWidth;

  @override
  State<AppSwipeActions> createState() => _AppSwipeActionsState();
}

class _AppSwipeActionsState extends State<AppSwipeActions> {
  static const _animationDuration = Duration(milliseconds: 140);

  double _offset = 0;
  bool _dragging = false;

  double get _revealWidth => widget.actionWidth * widget.actions.length;
  bool get _isOpen => widget.controller.openItemId == widget.itemId;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_handleControllerChanged);
    if (_isOpen) _offset = -_revealWidth;
  }

  @override
  void didUpdateWidget(covariant AppSwipeActions oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_handleControllerChanged);
      widget.controller.addListener(_handleControllerChanged);
    }
    final target = _isOpen ? -_revealWidth : 0.0;
    if (_offset != target) _offset = target;
  }

  @override
  void dispose() {
    widget.controller.removeListener(_handleControllerChanged);
    super.dispose();
  }

  void _handleControllerChanged() {
    final target = _isOpen ? -_revealWidth : 0.0;
    if (!mounted || _offset == target) return;
    setState(() {
      _dragging = false;
      _offset = target;
    });
  }

  void _handleDragStart(DragStartDetails details) {
    if (!_isOpen) widget.controller.close();
    setState(() => _dragging = true);
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    setState(() {
      _offset = (_offset + details.delta.dx).clamp(-_revealWidth, 0.0);
    });
  }

  void _handleDragEnd(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0;
    final shouldOpen =
        velocity < -450 ||
        (velocity <= 450 && _offset.abs() >= _revealWidth * 0.34);
    setState(() {
      _dragging = false;
      _offset = shouldOpen ? -_revealWidth : 0;
    });
    if (shouldOpen) {
      widget.controller.open(widget.itemId);
    } else if (_isOpen) {
      widget.controller.close();
    }
  }

  void _runAction(AppSwipeAction action) {
    widget.controller.close();
    action.onPressed();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.actions.isEmpty) return widget.child;
    return Stack(
      children: [
        Positioned.fill(
          child: Align(
            alignment: Alignment.centerRight,
            child: SizedBox(
              width: _revealWidth,
              child: Row(
                children: [
                  for (final action in widget.actions)
                    SizedBox(
                      width: widget.actionWidth,
                      child: _SwipeActionButton(
                        action: action,
                        onPressed: () => _runAction(action),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        AnimatedContainer(
          duration: _dragging ? Duration.zero : _animationDuration,
          curve: Curves.easeOutCubic,
          transform: Matrix4.translationValues(_offset, 0, 0),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _offset == 0 ? null : widget.controller.close,
            onHorizontalDragStart: _handleDragStart,
            onHorizontalDragUpdate: _handleDragUpdate,
            onHorizontalDragEnd: _handleDragEnd,
            child: AbsorbPointer(
              absorbing: _offset != 0,
              child: ColoredBox(
                color: context.colors.card,
                child: widget.child,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SwipeActionButton extends StatelessWidget {
  const _SwipeActionButton({required this.action, required this.onPressed});

  final AppSwipeAction action;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (action.tone) {
      AppSwipeActionTone.primary => (
        context.colors.banner,
        context.colors.primary,
      ),
      AppSwipeActionTone.danger => (
        context.colors.dangerSoft,
        context.colors.danger,
      ),
      AppSwipeActionTone.neutral => (context.colors.chip, context.colors.muted),
    };
    return Material(
      key: action.key,
      color: background,
      child: InkWell(
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(action.icon, size: 19, color: foreground),
              const SizedBox(height: 3),
              Text(
                action.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: foreground,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
