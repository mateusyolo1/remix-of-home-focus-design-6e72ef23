/* ============================================
   OrganizedContentWindow — Janela de Revisão
   ============================================ */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Pencil,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
  Copy,
} from "lucide-react";
import {
  useDraftOrganized,
  useDraftChecklist,
  useSavedNotes,
} from "../../lib/hermes/hermes-store";
import { saveReviewedContent, discardDraft } from "../../lib/hermes/hermes-core";
import { closeOrganizedWindow } from "../../lib/hermes/agents/ui-state-agent";
import { toast } from "sonner";
import type { ChecklistItem } from "../../lib/hermes/hermes-types";

type Props = {
  onClose: () => void;
  onFocus?: (task: string, minutes: number) => void;
};

export function OrganizedContentWindow({ onClose, onFocus }: Props) {
  const [organized] = useDraftOrganized();
  const [checklist, setChecklist] = useDraftChecklist();
  const [savedNotes] = useSavedNotes();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Animate in — não impede interação, apenas estilo inicial
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleEditTitle = () => {
    if (organized) {
      setTitleDraft(organized.title);
      setEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    if (organized && titleDraft.trim()) {
      setChecklist(checklist);
      // The title is stored in organized which we access from the store
      setEditingTitle(false);
    }
  };

  const toggleItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const editItemText = (id: string, newText: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, text: newText } : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      const note = saveReviewedContent(checklist);
      if (note) {
        toast.success("Nota salva com sucesso!");
      } else {
        toast.error("Nada para salvar");
      }
      closeOrganizedWindow();
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    discardDraft();
    closeOrganizedWindow();
    onClose();
    toast.info("Rascunho descartado");
  };

  const handleFocus = () => {
    const firstUndone = checklist.find((item) => !item.done);
    if (firstUndone && onFocus) {
      onFocus(firstUndone.text, 25);
    }
    closeOrganizedWindow();
    onClose();
  };

  if (!organized) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 p-8 text-center animate-in slide-in-from-bottom duration-200">
          <p className="text-sm text-muted-foreground">Nenhum conteúdo organizado disponível.</p>
          <button onClick={onClose} className="mt-4 text-sm font-medium text-accent">Fechar</button>
        </div>
      </div>
    );
  }

  const doneCount = checklist.filter((i) => i.done).length;
  const totalCount = checklist.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleSave} />
      <div
        className={[
          "relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl ring-1 ring-black/5 shadow-2xl flex flex-col transition-all duration-200",
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        ].join(" ")}
        style={{ maxHeight: "min(92dvh, 760px)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-border">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-3.5 text-accent" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                {organized.category.replace("_", " ")}
              </span>
            </div>

            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                  autoFocus
                  className="flex-1 text-lg font-semibold bg-secondary rounded-lg px-2 py-1 outline-none ring-1 ring-black/5"
                />
                <button
                  onClick={handleSaveTitle}
                  className="size-7 rounded-md bg-foreground text-background grid place-items-center"
                >
                  <Check className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold leading-tight truncate">{organized.title}</h2>
                <button
                  onClick={handleEditTitle}
                  aria-label="Editar título"
                  className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-secondary grid place-items-center"
                >
                  <Pencil className="size-3" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            aria-label="Salvar"
            className="size-9 shrink-0 rounded-full bg-foreground text-background grid place-items-center active:scale-95 transition-transform"
          >
            <Check className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              Resumo
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{organized.summary}</p>
          </div>

          {/* Tags */}
          {organized.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {organized.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary px-2 py-1 rounded-full text-muted-foreground"
                >
                  <Tag className="size-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Priority + Deadlines */}
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-secondary px-2.5 py-1 rounded-full">
              <AlertTriangle className="size-3 text-accent" />
              {organized.priority === "urgent"
                ? "Urgente"
                : organized.priority === "high"
                  ? "Alta prioridade"
                  : organized.priority === "low"
                    ? "Baixa prioridade"
                    : "Prioridade média"}
            </span>
            {organized.deadlines.map((dl, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-secondary px-2.5 py-1 rounded-full"
              >
                <Clock className="size-3 text-accent" />
                {dl}
              </span>
            ))}
          </div>

          {/* Warning */}
          {organized.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive mb-1">
                Avisos
              </p>
              <ul className="space-y-0.5">
                {organized.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-destructive/80 flex items-start gap-1.5">
                    <span>•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions */}
          {organized.questions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Perguntas a esclarecer
              </p>
              <ul className="space-y-1">
                {organized.questions.map((q, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-accent mt-0.5">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Checklist ({doneCount}/{totalCount})
              </p>
            </div>
            {checklist.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum item no checklist
              </p>
            ) : (
              <ul className="space-y-1.5">
                {checklist.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onEdit={editItemText}
                    onRemove={removeItem}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="grid grid-cols-3 gap-2 p-4 border-t border-border">
          <button
            onClick={handleDiscard}
            disabled={saving}
            className="h-11 rounded-xl bg-secondary text-foreground text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            onClick={handleFocus}
            disabled={checklist.length === 0 || saving}
            className="h-11 rounded-xl bg-secondary text-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            <ArrowUpRight className="size-4" />
            Focar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Checklist Item Row ---------- */

function ChecklistItemRow({
  item,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  const handleSaveEdit = () => {
    if (draft.trim()) {
      onEdit(item.id, draft.trim());
    }
    setEditing(false);
  };

  return (
    <li className="flex items-start gap-2 p-2 rounded-xl hover:bg-secondary/40 group transition-colors">
      <button
        onClick={() => onToggle(item.id)}
        aria-label={item.done ? "Desmarcar" : "Marcar como concluído"}
        className={[
          "mt-0.5 size-5 shrink-0 rounded-md grid place-items-center ring-1 transition-colors",
          item.done
            ? "bg-foreground text-background ring-foreground"
            : "bg-background ring-border",
        ].join(" ")}
      >
        {item.done && <Check className="size-3" />}
      </button>

      {editing ? (
        <div className="flex-1 flex items-center gap-1.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
            autoFocus
            className="flex-1 text-sm bg-secondary rounded-md px-2 py-1 outline-none ring-1 ring-black/5"
          />
          <button
            onClick={handleSaveEdit}
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
          onDoubleClick={() => {
            setDraft(item.text);
            setEditing(true);
          }}
        >
          {item.text}
        </span>
      )}

      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remover item"
        className="size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary grid place-items-center transition-opacity"
      >
        <Trash2 className="size-3" />
      </button>
    </li>
  );
}
