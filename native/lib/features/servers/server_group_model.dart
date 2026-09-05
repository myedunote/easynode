/// Mobile-side projection of `/api/v1/host-catalog` group items.
class ServerGroupModel {
  const ServerGroupModel({required this.id, required this.name});

  final String id;
  final String name;

  factory ServerGroupModel.fromJson(Map<String, dynamic> json) {
    return ServerGroupModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
    );
  }

  bool get isDefault => id == 'default';
  String get displayName => name.isEmpty ? id : name;
}
