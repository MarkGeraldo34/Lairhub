"use client";

import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AREAS, CITIES, STATES } from "@/lib/locations";

type Kind = "city" | "state" | "area";
type Item = { label: string; kind: Kind };
type Group = { title: string; kind: Kind; items: Item[] };

const GROUPS: { title: string; kind: Kind; source: string[] }[] = [
  { title: "Cities", kind: "city", source: CITIES },
  { title: "States", kind: "state", source: STATES },
  { title: "Neighbourhoods", kind: "area", source: AREAS },
];

const LIMIT = 5;

function words(q: string) {
  return q.toLowerCase().split(/[,\s]+/).filter(Boolean);
}

function score(label: string, ws: string[]): number | null {
  const l = label.toLowerCase();
  if (!ws.every((w) => l.includes(w))) return null;
  if (l.startsWith(ws[0])) return 0;
  if (l.split(/[\s,]+/).some((t) => t.startsWith(ws[0]))) return 1;
  return 2;
}

function buildGroups(q: string): Group[] {
  const ws = words(q);
  return GROUPS.map((g) => {
    let items: Item[];
    if (ws.length === 0) {
      items = g.source.slice(0, 4).map((label) => ({ label, kind: g.kind }));
    } else {
      items = g.source
        .map((label) => ({ label, kind: g.kind, s: score(label, ws) }))
        .filter((x): x is Item & { s: number } => x.s !== null)
        .sort((a, b) => a.s - b.s)
        .slice(0, LIMIT)
        .map(({ label, kind }) => ({ label, kind }));
    }
    return { title: g.title, kind: g.kind, items };
  }).filter((g) => g.items.length > 0);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const ws = words(query).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (ws.length === 0) return <>{text}</>;
  const parts = text.split(new RegExp(`(${ws.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="ls-mark">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const ICON: Record<Kind, string> = { city: "◆", state: "▣", area: "●" };

export default function LocationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opts = useRef<(HTMLDivElement | null)[]>([]);

  const groups = useMemo(() => buildGroups(value), [value]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const hasQuery = words(value).length > 0;

  function show() {
    if (!open) {
      setOpen(true);
      setOpenCount((c) => c + 1);
    }
  }

  function pick(label: string) {
    onChange(label);
    setOpen(false);
  }

  // Glide the highlight bar to the active row and keep it scrolled into view.
  useLayoutEffect(() => {
    const el = opts.current[active];
    const box = list.current;
    if (!open || !el || !box) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top - 40;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
    box.style.setProperty("--glide-y", `${top}px`);
    box.style.setProperty("--glide-h", `${el.offsetHeight}px`);
    box.style.setProperty("--glide-o", "1");
  }, [active, open, groups]);

  // Close when clicking elsewhere.
  useLayoutEffect(() => {
    function away(e: PointerEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) show();
      else setActive((a) => (a + 1) % Math.max(flat.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) show();
      else setActive((a) => (a - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === "Enter") {
      if (open && flat[active]) {
        e.preventDefault();
        pick(flat[active].label);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  let idx = -1;
  opts.current = [];

  return (
    <div className="ls" ref={wrap}>
      <div className="ls-field" data-open={open}>
        <svg className="ls-pin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <input
          className="ls-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? `${id}-opt-${active}` : undefined}
          aria-label="Search by location"
          autoComplete="off"
          placeholder="Where are you staying tonight?"
          value={value}
          onFocus={show}
          onClick={show}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(0);
            show();
          }}
          onKeyDown={onKey}
        />
        {value && (
          <button
            type="button"
            className="ls-clear"
            aria-label="Clear search"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setActive(0);
              show();
            }}
          >
            ×
          </button>
        )}
      </div>

      <div className="ls-panel" data-open={open} aria-hidden={!open}>
        <div className="ls-list" id={`${id}-list`} role="listbox" ref={list} key={openCount}>
          <span className="ls-glide" aria-hidden="true" />
          {flat.length === 0 && (
            <div className="ls-empty" style={{ ["--i" as string]: 0 }}>
              <strong>No match for “{value.trim()}”</strong>
              <span>Press Enter to search it as typed.</span>
            </div>
          )}
          {groups.map((g) => (
            <div className="ls-group" key={g.kind} role="group" aria-label={g.title}>
              <div className="ls-head" style={{ ["--i" as string]: idx + 1 }}>
                {hasQuery ? g.title : `Popular ${g.title.toLowerCase()}`}
              </div>
              {g.items.map((it) => {
                idx += 1;
                const i = idx;
                return (
                  <div
                    key={it.label}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`ls-opt k-${it.kind}`}
                    style={{ ["--i" as string]: i + 1 }}
                    ref={(el) => {
                      opts.current[i] = el;
                    }}
                    onPointerDown={(e) => e.preventDefault()}
                    onPointerMove={() => i !== active && setActive(i)}
                    onClick={() => pick(it.label)}
                  >
                    <span className="ls-ico">{ICON[it.kind]}</span>
                    <span className="ls-txt">
                      <Highlight text={it.label} query={value} />
                    </span>
                    <span className="ls-ret" aria-hidden="true">
                      ↵
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="ls-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> select
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
