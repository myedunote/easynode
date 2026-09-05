import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/scripts/script_model.dart';
import 'api_providers.dart';
import 'order_notifiers.dart';

/// Exposes the script projection from the shared script catalog. The list is
/// fetched on first read and exposed as an [AsyncValue]; consumers across
/// the app (scripts tab, terminal quick-actions, etc.) share the same
/// snapshot — refresh once, every screen sees it.
class ScriptListNotifier extends AsyncNotifier<List<ScriptModel>> {
  @override
  Future<List<ScriptModel>> build() async {
    final repo = ref.watch(scriptRepositoryProvider);
    final catalog = await repo.fetchCatalog();
    ref.read(scriptOrderProvider.notifier).setLayout(catalog.order);
    return catalog.scripts;
  }

  Future<void> refresh({bool throwOnError = false}) async {
    final previous = state.valueOrNull;
    if (previous == null) {
      state = const AsyncLoading();
    }
    try {
      final catalog = await ref.read(scriptRepositoryProvider).fetchCatalog();
      ref.read(scriptOrderProvider.notifier).setLayout(catalog.order);
      state = AsyncData(catalog.scripts);
    } catch (error, stackTrace) {
      state = previous == null
          ? AsyncError(error, stackTrace)
          : AsyncData(previous);
      if (!throwOnError) return;
      rethrow;
    }
  }
}

final scriptListProvider =
    AsyncNotifierProvider<ScriptListNotifier, List<ScriptModel>>(
      ScriptListNotifier.new,
    );
