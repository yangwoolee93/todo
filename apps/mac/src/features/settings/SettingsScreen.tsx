import { CaretRightIcon, MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { GlassButton } from "../../components/GlassButton";
import { fontStepLabel, fontSteps } from "./fontSteps";
import {
  exportDocument,
  importDocument,
  loadTransferTimes,
  reloadDocument,
  type TransferTimes,
} from "./transfer";
import { useIconScale } from "../../hooks/useIconScale";
import { useFontSizeStore } from "../../stores/useFontSizeStore";
import {
  settingsSectionLabel,
  useSettingsStore,
} from "../../stores/useSettingsStore";
import { useThemeStore, type ThemeMode } from "../../stores/useThemeStore";
import { cn } from "../../utils/cn";

const themeOptions: {
  value: ThemeMode;
  label: string;
  desc: string;
  icon: typeof SunIcon;
}[] = [
  { value: "light", label: "밝음", desc: "밝은 화면", icon: SunIcon },
  { value: "dark", label: "어두움", desc: "어두운 화면", icon: MoonIcon },
  { value: "auto", label: "시스템", desc: "시스템 설정을 따름", icon: MonitorIcon },
];

function themeLabel(mode: ThemeMode) {
  return themeOptions.find((option) => option.value === mode)?.label ?? "시스템";
}

function SettingsLink({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick: () => void;
}) {
  const icon = useIconScale();
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:bg-fg/5"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-1 block text-xs text-fg-secondary">{detail}</span>
      </span>
      <CaretRightIcon
        aria-hidden="true"
        size={icon(16)}
        className="shrink-0 text-fg-secondary"
      />
    </button>
  );
}

function SettingsHome() {
  const step = useFontSizeStore((state) => state.step);
  const mode = useThemeStore((state) => state.mode);
  const setSection = useSettingsStore((state) => state.setSection);

  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">
        {settingsSectionLabel("home")}
      </h1>
      <div className="mt-4 flex max-w-xl flex-col gap-2">
        <SettingsLink
          title={settingsSectionLabel("display")}
          detail={`${themeLabel(mode)} · 글자 크기 ${fontStepLabel(step)}`}
          onClick={() => setSection("display")}
        />
        <SettingsLink
          title={settingsSectionLabel("data")}
          detail="이 기기 파일 · Google Drive"
          onClick={() => setSection("data")}
        />
      </div>
    </div>
  );
}

function ThemeControl() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const current = themeOptions.find((option) => option.value === mode) ?? themeOptions[2];
  const icon = useIconScale();

  return (
    <section className="@container rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">테마</p>
      <div
        role="radiogroup"
        aria-label="테마"
        className="mt-3 grid grid-cols-1 gap-1 rounded-2xl bg-fg/5 p-1 @min-[20rem]:grid-cols-3 @min-[20rem]:rounded-full"
      >
        {themeOptions.map((option) => {
          const selected = option.value === mode;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl pad-seg text-sm whitespace-nowrap",
                "@min-[20rem]:rounded-full",
                selected ? "bg-fg/15 text-fg" : "text-fg-secondary hover:bg-fg/10",
              )}
              onClick={() => setMode(option.value)}
            >
              <Icon aria-hidden="true" size={icon(16)} className="shrink-0" />
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-fg-secondary">{current.desc}</p>
    </section>
  );
}

function FontSizeControl() {
  const step = useFontSizeStore((state) => state.step);
  const setStep = useFontSizeStore((state) => state.setStep);
  const index = Math.max(
    0,
    fontSteps.findIndex((item) => item.id === step),
  );
  const fill = `${(index / (fontSteps.length - 1)) * 100}%`;

  return (
    <section className="settings-scale rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">글자 크기</p>
      <input
        className="settings-range mt-4"
        type="range"
        min={0}
        max={fontSteps.length - 1}
        step={1}
        value={index}
        aria-label="글자 크기"
        aria-valuetext={fontStepLabel(step)}
        style={{ "--fill": fill } as CSSProperties}
        onChange={(event) => {
          const next = fontSteps[Number(event.target.value)];
          if (next) setStep(next.id);
        }}
      />
      <div className="relative mt-1 h-5">
        {fontSteps.map((item, itemIndex) => {
          const selected = itemIndex === index;
          const ratio = itemIndex / (fontSteps.length - 1);
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                "absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap",
                selected ? "text-fg" : "text-fg-muted",
              )}
              style={{
                left: `calc(var(--thumb) / 2 + ${ratio} * (100% - var(--thumb)))`,
              }}
              onClick={() => setStep(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DisplaySection() {
  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">
        {settingsSectionLabel("display")}
      </h1>
      <div className="mt-4 flex max-w-xl flex-col gap-2">
        <ThemeControl />
        <FontSizeControl />
      </div>
    </div>
  );
}

function DataSection() {
  const [times, setTimes] = useState<TransferTimes>({ exportedAt: null, importedAt: null });
  const [step, setStep] = useState<"choose" | "replace" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    void loadTransferTimes()
      .then((next) => {
        if (live) setTimes(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function refreshTimes() {
    try {
      setTimes(await loadTransferTimes());
    } catch {
      /* 시각은 없어도 파일 작업 결과는 보여 준다. */
    }
  }

  async function onExport() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const path = await exportDocument();
      if (!path) return;
      await refreshTimes();
      setMessage({ tone: "ok", text: "내보냈습니다." });
    } catch (error) {
      setMessage({ tone: "error", text: explainTransfer(error) });
    } finally {
      setBusy(false);
    }
  }

  async function onImport(mode: "merge" | "replace") {
    setStep(null);
    setBusy(true);
    setMessage(null);
    try {
      const report = await importDocument(mode);
      if (!report) return;
      await reloadDocument();
      await refreshTimes();
      const changed = report.added + report.updated + report.deleted;
      setMessage({
        tone: "ok",
        text:
          mode === "replace"
            ? "파일로 바꿨습니다."
            : changed === 0
              ? "이미 같은 내용입니다."
              : `추가 ${report.added} · 수정 ${report.updated} · 삭제 ${report.deleted}`,
      });
    } catch (error) {
      setMessage({ tone: "error", text: explainTransfer(error) });
    } finally {
      setBusy(false);
    }
  }

  const exported = clock(times.exportedAt);
  const imported = clock(times.importedAt);

  return (
    <div className="px-4 py-3">
      <h1 className="text-2xl font-medium text-fg">{settingsSectionLabel("data")}</h1>
      <p className="mt-1 text-sm text-fg-secondary">Google Drive</p>
      <div className="mt-4 max-w-xl rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-medium text-fg">계정</p>
        <p className="mt-1 text-xs text-fg-secondary">
          연결하면 이 기기의 프로젝트와 메모를 내 Drive와 맞춥니다.
        </p>
        <p className="mt-3 text-xs text-fg-secondary">연결 전</p>
      </div>
      <p className="mt-6 text-sm text-fg-secondary">이 기기 파일</p>
      <div className="mt-4 max-w-xl overflow-hidden rounded-2xl border border-border bg-surface">
        <FileRow
          title="내보내기"
          detail="지금 데이터를 JSON 파일로 저장"
          disabled={busy}
          onClick={() => void onExport()}
        />
        <div className="mx-4 border-t border-border" />
        <FileRow
          title="가져오기"
          detail="JSON 파일을 병합하거나 덮어쓰기"
          disabled={busy}
          onClick={() => setStep("choose")}
        />
      </div>
      <p className="mt-3 max-w-xl text-xs text-fg-secondary">
        병합은 같은 항목 중 더 최근에 고친 쪽을 남기고, 덮어쓰기는 파일로 바꿉니다. 둘 다 바꾸기
        전에 백업합니다.
      </p>
      {exported || imported ? (
        <p className="mt-2 max-w-xl text-xs text-fg-secondary">
          {exported ? `마지막 내보내기 ${exported}` : null}
          {exported && imported ? " · " : null}
          {imported ? `마지막 가져오기 ${imported}` : null}
        </p>
      ) : null}
      {message ? (
        <p
          className={cn("mt-2 max-w-xl text-xs", message.tone === "error" ? "text-danger" : "text-fg-secondary")}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
      {step === "choose" ? (
        <TransferDialog
          title="가져오기"
          body="병합은 지금 데이터를 유지하고, 같은 항목은 더 최근에 고친 쪽을 남깁니다. 덮어쓰기는 지금 데이터를 파일로 바꿉니다."
          onCancel={() => setStep(null)}
          actions={[
            { label: "병합", onClick: () => void onImport("merge") },
            { label: "덮어쓰기", onClick: () => setStep("replace") },
          ]}
        />
      ) : null}
      {step === "replace" ? (
        <TransferDialog
          title="덮어쓰기"
          body="현재 저장된 데이터가 선택한 파일로 바뀝니다. 바꾸기 전에 이 기기에 백업을 남깁니다."
          onCancel={() => setStep(null)}
          actions={[{ label: "확인", onClick: () => void onImport("replace") }]}
        />
      ) : null}
    </div>
  );
}

function FileRow({
  title,
  detail,
  disabled,
  onClick,
}: {
  title: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full flex-col px-4 py-3 text-left hover:bg-fg/5 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="text-sm font-medium text-fg">{title}</span>
      <span className="mt-1 text-xs text-fg-secondary">{detail}</span>
    </button>
  );
}

function TransferDialog({
  title,
  body,
  actions,
  onCancel,
}: {
  title: string;
  body: string;
  actions: { label: string; onClick: () => void }[];
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/20" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
        className="dialog-sm rounded-2xl border border-border bg-surface"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id="transfer-title" className="text-sm font-medium text-fg">
          {title}
        </p>
        <p className="mt-2 text-sm text-fg-secondary">{body}</p>
        <div className="mt-[1.143em] flex justify-end gap-[0.571em]">
          <GlassButton className="pad-sm text-sm" onClick={onCancel} autoFocus>
            취소
          </GlassButton>
          {actions.map((action) => (
            <GlassButton key={action.label} className="pad-sm text-sm" onClick={action.onClick}>
              {action.label}
            </GlassButton>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function explainTransfer(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/not found|not allowed|export_document|import_document|transfer_times/i.test(text)) {
    return "앱을 다시 열면 파일을 주고받을 수 있습니다.";
  }
  return text || "파일을 처리하지 못했습니다.";
}

function clock(value: number | null) {
  if (value == null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function SettingsScreen() {
  const section = useSettingsStore((state) => state.section);
  return (
    <div className="scrollbar min-h-0 flex-1 overflow-y-auto">
      {section === "display" ? (
        <DisplaySection />
      ) : section === "data" ? (
        <DataSection />
      ) : (
        <SettingsHome />
      )}
    </div>
  );
}
