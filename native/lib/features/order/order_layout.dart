class OrderSection {
  const OrderSection({required this.groupId, required this.itemIds});

  final String groupId;
  final List<String> itemIds;

  factory OrderSection.fromJson(Map<String, dynamic> json) => OrderSection(
    groupId: json['groupId']?.toString() ?? '',
    itemIds: (json['itemIds'] as List? ?? const [])
        .map((item) => item.toString())
        .toList(growable: false),
  );
}

class OrderLayout {
  const OrderLayout({
    required this.schemaVersion,
    required this.revision,
    required this.sections,
    this.flatItemIds = const [],
  });

  final int schemaVersion;
  final int revision;
  final List<OrderSection> sections;
  final List<String> flatItemIds;

  factory OrderLayout.fromJson(Map<String, dynamic> json) => OrderLayout(
    schemaVersion: (json['schemaVersion'] as num?)?.toInt() ?? 1,
    revision: (json['revision'] as num?)?.toInt() ?? 0,
    sections: (json['sections'] as List? ?? const [])
        .whereType<Map>()
        .map(
          (item) => OrderSection.fromJson(
            item.map((key, value) => MapEntry(key.toString(), value)),
          ),
        )
        .toList(growable: false),
    flatItemIds: (json['flatItemIds'] as List? ?? const [])
        .map((item) => item.toString())
        .toList(growable: false),
  );
}

class OrderChange {
  const OrderChange({
    required this.scope,
    required this.orderedIds,
    this.groupId,
  });

  final String scope;
  final String? groupId;
  final List<String> orderedIds;

  Map<String, dynamic> toJson() => {
    'scope': scope,
    if (groupId != null) 'groupId': groupId,
    'orderedIds': orderedIds,
  };
}
