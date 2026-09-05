/// Mobile-side projection of `/api/v1/script-catalog` group items.
///
/// The server seeds two special groups: `default` (cannot be deleted, the
/// fallback when others are removed) and `builtin` (read-only, contains the
/// shell-library entries). [isDefault] / [isBuiltin] let the UI gate edits.
class ScriptGroupModel {
  const ScriptGroupModel({required this.id, required this.name});

  final String id;
  final String name;

  bool get isDefault => id == 'default';
  bool get isBuiltin => id == 'builtin';
  String get displayName => name.isEmpty ? id : name;

  factory ScriptGroupModel.fromJson(Map<String, dynamic> json) {
    return ScriptGroupModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
    );
  }
}
