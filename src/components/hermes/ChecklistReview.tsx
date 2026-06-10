/* ============================================
   ChecklistReview — Revisão de Checklist
   ============================================ */

import { useEffect, useState } from "react";
import { Check, Pencil, Trash2, Plus } from "lucide-react";
import type { ChecklistItem } from "../../lib/hermes/hermes-types";

type Props = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  onSave?: () => void;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function ChecklistReview({ items, onChange, onSave }: Props) {
  const [newText, setNewText] = useState("");

  const toggleItem = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const editItem = (id: string, text: string) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    const text = newText.trim();
    if (!text) return;
    onChange([...items, { id: uid(), text, done: false }]);
    setNewText("");
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditDraft(item.text);
  };

  const saveEdit = () => {
    if (editingId && editDraft.trim()) {
      editItem(editingId, editDraft.trim());
    }
    setEditingId(null);
  };

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Checklist ({doneCount}/{totalCount})
        </p>
        {onSave && totalCount > 0 && (
          <button
            onClick={onSave}
            className="text-[10px] font-medium text-accent"
          >
            Salvar nota
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum item no checklist. Adicione abaixo.
        </p>
      )}

      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 p-2 rounded-xl hover:bg-secondary/40 group transition-colors"
          >
            <button
              onClick={() => toggleItem(item.id)}
              aria-label={item.done ? "Desmarcar" : "Marcar"}
              className={[
                "mt-0.5 size-5 shrink-0 rounded-md grid place-items-center ring-1 transition-colors",
                item.done
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-background ring-border",
              ].join(" ")}
            >
              {item.done && <Check className="size-3" />}
            </button>

            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  autoFocus
                  className="flex-1 text-sm bg-secondary rounded-md px-2 py-1 outline-none ring-1 ring-black/5"
                />
                <button
                  onClick={saveEdit}
                  className="size-6 rounded bg-foreground text-background grid place-items-center"
                >
                  <Check className="size-3" />
                </button>
              </div>
            ) : (
              <span
                className={[
                  "flex-1 text-sm leading-relaxed cursor-pointer",
                  item.done ? "line-through text-muted-foreground" : "text-foreground",
                ].join(" ")}
                onDoubleClick={() => startEdit(item)}
              >
                {item.text}
              </span>
            )}

            <button
              onClick={() => startEdit(item)}
              aria-label="Editar"
              className="size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary grid place-items-center transition-opacity"
            >
              <Pencil className="size-3" />
            </button>
            <button
              onClick={() => removeItem(item.id)}
              aria-label="Remover"
              className="size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary grid place-items-center transition-opacity"
            >
              <Trash2 className="size-3" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 bg-secondary/60 rounded-lg p-1.5">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Adicionar item ao checklist..."
          className="flex-1 bg-transparent text-sm outline-none px-2 py-1.5 placeholder:text-muted-foreground"
        />
        <button
          onClick={addItem}
          aria-label="Adicionar"
          className="size-8 rounded-md bg-foreground text-background grid place-items-center active:scale-95"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
