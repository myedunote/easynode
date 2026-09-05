import 'package:easynode_native/core/ui/app_color_theme.dart';
import 'package:easynode_native/features/order/order_layout.dart';
import 'package:easynode_native/features/scripts/script_group_model.dart';
import 'package:easynode_native/features/scripts/script_model.dart';
import 'package:easynode_native/features/scripts/script_repository.dart';
import 'package:easynode_native/features/shell/scripts_tab.dart';
import 'package:easynode_native/l10n/app_localizations.dart';
import 'package:easynode_native/state/api_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeScriptRepository extends ScriptRepository {
  _FakeScriptRepository({required this.scripts, required this.groups});

  List<ScriptModel> scripts;
  List<ScriptGroupModel> groups;
  List<OrderChange> submittedOrderChanges = const [];

  @override
  Future<ScriptCatalog> fetchCatalog() async => ScriptCatalog(
    scripts: scripts,
    groups: groups,
    order: OrderLayout(
      schemaVersion: 1,
      revision: 7,
      sections: groups
          .where((group) => !group.isBuiltin)
          .map(
            (group) => OrderSection(
              groupId: group.id,
              itemIds: scripts
                  .where((script) => script.group == group.id)
                  .map((script) => script.id)
                  .toList(),
            ),
          )
          .toList(),
    ),
  );

  @override
  Future<List<ScriptModel>> fetchScripts() async => scripts;

  @override
  Future<List<ScriptGroupModel>> fetchGroups() async => groups;

  @override
  Future<OrderLayout> updateOrder(
    int revision,
    List<OrderChange> changes,
  ) async {
    submittedOrderChanges = changes;
    return (await fetchCatalog()).order;
  }

  @override
  Future<String> createScript(ScriptFormData form) async => 'success';

  @override
  Future<String> updateScript(ScriptFormData form) async => 'success';

  @override
  Future<String> deleteScript(String id) async => 'success';

  @override
  Future<String> batchDeleteScripts(List<String> ids) async => 'success';

  @override
  Future<String> createGroup(ScriptGroupFormData form) async => 'success';

  @override
  Future<String> updateGroup(ScriptGroupFormData form) async => 'success';

  @override
  Future<String> deleteGroup(String id) async => 'success';
}

const _groups = [
  ScriptGroupModel(id: 'default', name: 'Default group'),
  ScriptGroupModel(id: 'custom', name: 'Custom'),
  ScriptGroupModel(id: 'builtin', name: 'Built in'),
];

const _scripts = [
  ScriptModel(
    id: 's1',
    name: 'Deploy',
    description: '',
    command: 'echo deploy',
    group: 'custom',
    useBase64: false,
  ),
  ScriptModel(
    id: 's2',
    name: 'Restart',
    description: '',
    command: 'systemctl restart app',
    group: 'custom',
    useBase64: false,
  ),
  ScriptModel(
    id: 's3',
    name: 'Built in script',
    description: '',
    command: 'uptime',
    group: 'builtin',
    useBase64: false,
  ),
];

Widget _wrap(_FakeScriptRepository repository) {
  return ProviderScope(
    overrides: [scriptRepositoryProvider.overrideWithValue(repository)],
    child: MaterialApp(
      theme: ThemeData(extensions: const [AppColorTheme.defaultLight]),
      locale: const Locale('en'),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: const ScriptsTab(),
    ),
  );
}

void main() {
  testWidgets('keeps add direct and moves low-frequency actions into more', (
    tester,
  ) async {
    final repository = _FakeScriptRepository(
      scripts: _scripts,
      groups: _groups,
    );
    await tester.pumpWidget(_wrap(repository));
    await tester.pumpAndSettle();

    expect(find.byTooltip('Add script'), findsOneWidget);
    expect(find.byTooltip('More actions'), findsOneWidget);
    expect(find.byIcon(Icons.more_vert), findsOneWidget);
    expect(find.byTooltip('Search'), findsNothing);
    expect(find.byTooltip('Manage groups'), findsNothing);
    expect(find.byTooltip('Adjust order'), findsNothing);

    final addX = tester.getCenter(find.byTooltip('Add script')).dx;
    final moreX = tester.getCenter(find.byTooltip('More actions')).dx;
    expect(addX, lessThan(moreX));

    await tester.tap(find.byTooltip('More actions'));
    await tester.pumpAndSettle();

    expect(find.text('Search'), findsOneWidget);
    expect(find.text('Manage groups'), findsOneWidget);
    expect(find.text('Adjust order'), findsOneWidget);
    final orderItem = tester.widget<PopupMenuItem<String>>(
      find.ancestor(
        of: find.text('Adjust order'),
        matching: find.byType(PopupMenuItem<String>),
      ),
    );
    expect(orderItem.enabled, isFalse);
  });

  testWidgets('orders only a selected custom group with compact cards', (
    tester,
  ) async {
    final repository = _FakeScriptRepository(
      scripts: _scripts,
      groups: _groups,
    );
    await tester.pumpWidget(_wrap(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Custom').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('More actions'));
    await tester.pumpAndSettle();

    final orderItem = tester.widget<PopupMenuItem<String>>(
      find.ancestor(
        of: find.text('Adjust order'),
        matching: find.byType(PopupMenuItem<String>),
      ),
    );
    expect(orderItem.enabled, isTrue);
    await tester.tap(find.text('Adjust order'));
    await tester.pumpAndSettle();

    expect(find.text('Cancel'), findsOneWidget);
    expect(find.text('Save'), findsOneWidget);
    expect(find.byIcon(Icons.drag_handle), findsNWidgets(2));
    expect(
      tester.getSize(find.byKey(const Key('script-s1'))).height,
      lessThan(76),
    );

    final drag = await tester.startGesture(
      tester.getCenter(find.byIcon(Icons.drag_handle).first),
    );
    await drag.moveBy(const Offset(0, 20));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const ValueKey('app-order-drag-proxy')), findsOneWidget);
    await drag.up();
    await tester.pumpAndSettle();

    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(repository.submittedOrderChanges.single.scope, 'groupItems');
    expect(repository.submittedOrderChanges.single.groupId, 'custom');
    expect(repository.submittedOrderChanges.single.orderedIds, ['s1', 's2']);
  });
}
