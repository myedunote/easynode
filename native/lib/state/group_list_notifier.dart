import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/servers/server_group_model.dart';
import 'api_providers.dart';
import 'order_notifiers.dart';

/// Exposes the group projection from the shared host catalog.
class GroupListNotifier extends AsyncNotifier<List<ServerGroupModel>> {
  @override
  Future<List<ServerGroupModel>> build() async {
    final repo = ref.watch(serverRepositoryProvider);
    final catalog = await repo.fetchCatalog();
    ref.read(hostOrderProvider.notifier).setLayout(catalog.order);
    return catalog.groups;
  }

  Future<void> refresh({bool throwOnError = false}) async {
    final previous = state.valueOrNull;
    if (previous == null) {
      state = const AsyncLoading();
    }
    try {
      final catalog = await ref.read(serverRepositoryProvider).fetchCatalog();
      ref.read(hostOrderProvider.notifier).setLayout(catalog.order);
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

final groupListProvider =
    AsyncNotifierProvider<GroupListNotifier, List<ServerGroupModel>>(
      GroupListNotifier.new,
    );
