import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/scripts/script_group_model.dart';
import 'api_providers.dart';
import 'order_notifiers.dart';

/// Exposes the group projection from the shared script catalog.
/// Shared between the scripts list, the edit form (group picker), and the
/// group-management page.
class ScriptGroupListNotifier extends AsyncNotifier<List<ScriptGroupModel>> {
  @override
  Future<List<ScriptGroupModel>> build() async {
    final repo = ref.watch(scriptRepositoryProvider);
    final catalog = await repo.fetchCatalog();
    ref.read(scriptOrderProvider.notifier).setLayout(catalog.order);
    return catalog.groups;
  }

  Future<void> refresh({bool throwOnError = false}) async {
    final previous = state.valueOrNull;
    if (previous == null) {
      state = const AsyncLoading();
    }
    try {
      final catalog = await ref.read(scriptRepositoryProvider).fetchCatalog();
      ref.read(scriptOrderProvider.notifier).setLayout(catalog.order);
      state = AsyncData(catalog.groups);
    } catch (error, stackTrace) {
      state = previous == null
          ? AsyncError(error, stackTrace)
          : AsyncData(previous);
      if (!throwOnError) return;
      rethrow;
    }
  }
}

final scriptGroupListProvider =
    AsyncNotifierProvider<ScriptGroupListNotifier, List<ScriptGroupModel>>(
      ScriptGroupListNotifier.new,
    );
