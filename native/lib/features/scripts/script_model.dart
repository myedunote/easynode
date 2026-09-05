/// Mobile-side projection of `/api/v1/script` items.
///
/// Mirrors the schema served by `server/app/controller/scripts.js`. The web
/// includes read-only built-in shell-library rows; we expose
/// [isBuiltin] for the UI to disable editing on those rows.
class ScriptModel {
  const ScriptModel({
    required this.id,
    required this.name,
    required this.description,
    required this.command,
    required this.group,
    required this.useBase64,
  });

  final String id;
  final String name;
  final String description;
  final String command;

  final String group;
  final bool useBase64;

  bool get isBuiltin => group == 'builtin';

  ScriptModel copyWith({
    String? id,
    String? name,
    String? description,
    String? command,
    String? group,
    bool? useBase64,
  }) {
    return ScriptModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      command: command ?? this.command,
      group: group ?? this.group,
      useBase64: useBase64 ?? this.useBase64,
    );
  }

  factory ScriptModel.fromJson(Map<String, dynamic> json) {
    return ScriptModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      command: (json['command'] ?? '').toString(),
      group: (json['group'] ?? 'default').toString(),
      useBase64: json['useBase64'] == true,
    );
  }
}
