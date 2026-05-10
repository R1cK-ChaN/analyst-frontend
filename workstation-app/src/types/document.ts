// Document AST + selection schema. Selection shape is stable per issue #9;
// AST shape is deferred to the editor-library decision (Tiptap/ProseMirror/Slate).
export interface Selection {
  section_path: string
  char_offset_start: number
  char_offset_end: number
  snippet: string
}

export type DocumentNode = unknown
