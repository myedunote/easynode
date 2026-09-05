import 'package:easynode_native/features/order/order_layout.dart';
import 'package:easynode_native/features/scripts/script_repository.dart';
import 'package:easynode_native/features/servers/server_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses host flat and grouped scopes independently', () {
    final layout = OrderLayout.fromJson({
      'schemaVersion': 1,
      'revision': 7,
      'sections': [
        {
          'groupId': 'group-a',
          'itemIds': ['host-1', 'host-2'],
        },
        {
          'groupId': 'default',
          'itemIds': ['host-3'],
        },
      ],
      'flatItemIds': ['host-2', 'host-3', 'host-1'],
    });

    expect(layout.revision, 7);
    expect(layout.sections.first.itemIds, ['host-1', 'host-2']);
    expect(layout.flatItemIds, ['host-2', 'host-3', 'host-1']);
  });

  test('script layout has no redundant flat scope', () {
    final layout = OrderLayout.fromJson({
      'schemaVersion': 1,
      'revision': 3,
      'sections': [
        {
          'groupId': 'default',
          'itemIds': ['script-1'],
        },
      ],
    });

    expect(layout.flatItemIds, isEmpty);
    expect(layout.sections.single.groupId, 'default');
  });

  test('serializes full order changes', () {
    expect(
      const OrderChange(
        scope: 'groupItems',
        groupId: 'group-a',
        orderedIds: ['a', 'b'],
      ).toJson(),
      {
        'scope': 'groupItems',
        'groupId': 'group-a',
        'orderedIds': ['a', 'b'],
      },
    );
  });

  test('parses aggregate host and script catalogs without index fields', () {
    final hosts = HostCatalog.fromJson({
      'hosts': [
        {'id': 'host-1', 'name': 'Host', 'host': '127.0.0.1'},
      ],
      'groups': [
        {'id': 'default', 'name': 'Default'},
      ],
      'order': {
        'schemaVersion': 1,
        'revision': 2,
        'sections': [
          {
            'groupId': 'default',
            'itemIds': ['host-1'],
          },
        ],
        'flatItemIds': ['host-1'],
      },
    });
    final scripts = ScriptCatalog.fromJson({
      'scripts': [
        {
          'id': 'script-1',
          'name': 'Script',
          'command': 'true',
          'group': 'default',
        },
      ],
      'groups': [
        {'id': 'default', 'name': 'Default'},
      ],
      'order': {
        'schemaVersion': 1,
        'revision': 3,
        'sections': [
          {
            'groupId': 'default',
            'itemIds': ['script-1'],
          },
        ],
      },
    });

    expect(hosts.hosts.single.id, 'host-1');
    expect(hosts.groups.single.id, 'default');
    expect(hosts.order.flatItemIds, ['host-1']);
    expect(scripts.scripts.single.id, 'script-1');
    expect(scripts.order.flatItemIds, isEmpty);
  });
}
