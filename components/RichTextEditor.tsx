"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Undo, 
  Redo, 
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editorRef?: any;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Ingresa la URL del enlace:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-800 pr-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive("bold") ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive("italic") ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive("underline") ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-800 pr-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive({ textAlign: "left" }) ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive({ textAlign: "center" }) ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive({ textAlign: "right" }) ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-800 pr-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive("bulletList") ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 rounded-lg ${editor.isActive("orderedList") ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-800 pr-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={addLink}
          className={`h-8 w-8 rounded-lg ${editor.isActive("link") ? "bg-primary/10 text-primary" : "text-slate-500"}`}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 rounded-lg text-slate-500"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 rounded-lg text-slate-500"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export function RichTextEditor({ content, onChange, placeholder, className, editorRef }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: placeholder || "Escribe el contenido aquí...",
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[150px] p-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Exponer el editor al padre si se necesita (ej: para insertar tokens)
  useEffect(() => {
    if (editor && editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  // Actualizar contenido si cambia externamente (pero no si es circular)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all ${className}`}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
