"use client";

import { useState, useTransition } from "react";
import {
  addChecklistItem,
  deleteChecklistItem,
  moveChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
} from "@/actions/videos";
import { STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/stages";
import type { ChecklistItemDTO } from "@/lib/types";
import { useI18n } from "./I18n";

/**
 * Checklist da etapa atual do vídeo. Os itens vêm do template da etapa,
 * mas daqui pra frente são livres: dá pra marcar, editar o texto,
 * reordenar e remover.
 */
export default function ChecklistEditor({
  videoId,
  stage,
  items,
}: {
  videoId: string;
  stage: Stage;
  items: ChecklistItemDTO[];
}) {
  const { t } = useI18n();
  const [, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");
  const color = STAGE_COLORS[stage];

  const done = items.filter((i) => i.done).length;

  function submitNew() {
    const text = newItem.trim();
    if (!text) return;
    setNewItem("");
    startTransition(() => addChecklistItem(videoId, stage, text));
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">
          Checklist · {t(STAGE_LABELS[stage])}
        </h3>
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{ background: `${color}1A`, color }}
        >
          {t(done)}/{t(items.length)}
        </span>
      </div>

      <ul className="space-y-1">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-canvas/60"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) =>
                startTransition(() =>
                  toggleChecklistItem(item.id, e.target.checked),
                )
              }
              className="mt-[3px] h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-line bg-canvas transition checked:border-teal checked:bg-teal"
              style={
                item.done
                  ? {
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23070c16'%3E%3Cpath d='M6.2 11.6 3 8.4l1.1-1.1 2.1 2.1 5-5L12.3 5.5z'/%3E%3C/svg%3E\")",
                      backgroundSize: "contain",
                    }
                  : undefined
              }
            />

            {/* contentEditable seria frágil; input transparente resolve bem */}
            <input
              defaultValue={item.text}
              onBlur={(e) => {
                if (e.target.value.trim() === item.text) return;
                startTransition(() =>
                  updateChecklistItem(item.id, e.target.value),
                );
              }}
              className={`flex-1 bg-transparent text-sm leading-relaxed outline-none ${
                item.done ? "text-ink-faint line-through" : "text-ink-dim"
              }`}
            />

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              <MiniBtn
                label="Subir"
                disabled={index === 0}
                onClick={() =>
                  startTransition(() => moveChecklistItem(item.id, -1))
                }
              >
                ↑
              </MiniBtn>
              <MiniBtn
                label="Descer"
                disabled={index === items.length - 1}
                onClick={() =>
                  startTransition(() => moveChecklistItem(item.id, 1))
                }
              >
                ↓
              </MiniBtn>
              <MiniBtn
                label="Remover item"
                danger
                onClick={() =>
                  startTransition(() => deleteChecklistItem(item.id))
                }
              >
                ×
              </MiniBtn>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-2 px-2">
        <span className="text-ink-faint">+</span>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitNew();
            }
          }}
          onBlur={submitNew}
          placeholder={t("adicionar item ao checklist…")}
          className="flex-1 bg-transparent py-1 text-sm outline-none"
        />
      </div>
    </section>
  );
}

function MiniBtn({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={t(label)}
      aria-label={t(label)}
      className={`flex h-5 w-5 items-center justify-center rounded text-[11px] transition disabled:opacity-20 ${
        danger
          ? "text-ink-faint hover:bg-rose/12 hover:text-rose"
          : "text-ink-faint hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {t(children)}
    </button>
  );
}
