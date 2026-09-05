import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/servers/server_model.dart';
import 'api_providers.dart';
import 'order_notifiers.dart';

/// Exposes the host projection from the shared host catalog.
/// on first read and exposed as an [AsyncValue] so the UI can show
/// loading / error / data without manual `_loading` flags.
class HostListNotifier extends AsyncNotifier<List<ServerModel>> {
  @override
  Future<List<ServerModel>> build() async {
    final repo = ref.watch(serverRepositoryProvider);
    final catalog = await repo.fetchCatalog();
    ref.read(hostOrderProvider.notifier).setLayout(catalog.order);
    return catalog.hosts;
  }

  Future<void> refresh({bool throwOnError = false}) async {
    final previous = state.valueOrNull;
    if (previous == null) {
      state = const AsyncLoading();
    }
    try {
      final catalog = await ref.read(serverRepositoryProvider).fetchCatalog();
      ref.read(hostOrderProvider.notifier).setLayout(catalog.order);
      state = AsyncData(catalog.hosts);
    } catch (error, stackTrace) {
      state = previous == null
          ? AsyncError(error, stackTrace)
          : AsyncData(previous);
      if (!throwOnError) return;
      rethrow;
    }
  }
}

final hostListProvider =
    AsyncNotifierProvider<HostListNotifier, List<ServerModel>>(
      HostListNotifier.new,
    );
