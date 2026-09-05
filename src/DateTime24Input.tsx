import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type ParsedDateTime = {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
};

type DateTime24InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  labelStyle?: CSSProperties;
  inputStyle?: CSSProperties;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateTime(value: string): ParsedDateTime | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month) - 1,
    day: Number(day),
    hour,
    minute,
  };
}

function toDateTimeValue(year: number, month: number, day: number, hour: string, minute: string): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}T${hour}:${minute}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDisplay(value: string): string {
  const parsed = parseDateTime(value);
  if (!parsed) return "";
  return `${parsed.year}年${pad2(parsed.month + 1)}月${pad2(parsed.day)}日 ${parsed.hour}:${parsed.minute}`;
}

export default function DateTime24Input({
  label,
  value,
  onChange,
  placeholder = "年 /月/日 --:--",
  labelStyle,
  inputStyle,
}: DateTime24InputProps) {
  const parsed = parseDateTime(value);
  const now = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth());

  useEffect(() => {
    if (!open) return;
    const latest = parseDateTime(value);
    const base = latest ?? new Date();
    setViewYear(base instanceof Date ? base.getFullYear() : base.year);
    setViewMonth(base instanceof Date ? base.getMonth() : base.month);
  }, [open, value]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const currentMonthDays = daysInMonth(viewYear, viewMonth);
    const prevMonthDays = daysInMonth(viewYear, viewMonth - 1);
    return Array.from({ length: 42 }, (_, index) => {
      const rawDay = index - firstDay + 1;
      if (rawDay < 1) {
        return { day: prevMonthDays + rawDay, monthOffset: -1 };
      }
      if (rawDay > currentMonthDays) {
        return { day: rawDay - currentMonthDays, monthOffset: 1 };
      }
      return { day: rawDay, monthOffset: 0 };
    });
  }, [viewMonth, viewYear]);

  const selectedHour = parsed?.hour ?? "00";
  const selectedMinute = parsed?.minute ?? "00";
  const selectedDate = parsed ? `${parsed.year}-${parsed.month}-${parsed.day}` : "";

  const moveMonth = (direction: -1 | 1) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDay = (day: number, monthOffset: number) => {
    const target = new Date(viewYear, viewMonth + monthOffset, day);
    onChange(toDateTimeValue(target.getFullYear(), target.getMonth(), target.getDate(), selectedHour, selectedMinute));
  };

  const selectTime = (nextHour: string, nextMinute: string) => {
    const date = parsed ?? {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: "00",
      minute: "00",
    };
    onChange(toDateTimeValue(date.year, date.month, date.day, nextHour, nextMinute));
  };

  const setToday = () => {
    const current = new Date();
    onChange(toDateTimeValue(current.getFullYear(), current.getMonth(), current.getDate(), pad2(current.getHours()), pad2(current.getMinutes())));
    setViewYear(current.getFullYear());
    setViewMonth(current.getMonth());
  };

  return (
    <div style={styles.wrapper}>
      <span style={labelStyle ?? styles.label}>{label}</span>
      <button type="button" style={{ ...styles.field, ...inputStyle }} onClick={() => setOpen(prev => !prev)}>
        <span style={value ? styles.value : styles.placeholder}>{value ? formatDisplay(value) : placeholder}</span>
        <span style={styles.calendarIcon} aria-hidden="true">□</span>
      </button>
      {open && (
        <div style={styles.popover}>
          <div style={styles.monthHeader}>
            <button type="button" style={styles.navButton} onClick={() => moveMonth(-1)} aria-label="上個月">↑</button>
            <strong style={styles.monthTitle}>{viewYear}年{pad2(viewMonth + 1)}月</strong>
            <button type="button" style={styles.navButton} onClick={() => moveMonth(1)} aria-label="下個月">↓</button>
          </div>
          <div style={styles.pickerGrid}>
            <div style={styles.calendarGrid}>
              {WEEKDAYS.map(day => (
                <div key={day} style={styles.weekday}>{day}</div>
              ))}
              {calendarCells.map(cell => {
                const target = new Date(viewYear, viewMonth + cell.monthOffset, cell.day);
                const key = `${target.getFullYear()}-${target.getMonth()}-${target.getDate()}`;
                const isSelected = key === selectedDate;
                const isToday =
                  target.getFullYear() === now.getFullYear() &&
                  target.getMonth() === now.getMonth() &&
                  target.getDate() === now.getDate();
                return (
                  <button
                    type="button"
                    key={`${cell.monthOffset}-${cell.day}`}
                    style={{
                      ...styles.dayButton,
                      ...(cell.monthOffset !== 0 ? styles.mutedDay : {}),
                      ...(isToday ? styles.todayDay : {}),
                      ...(isSelected ? styles.selectedDay : {}),
                    }}
                    onClick={() => selectDay(cell.day, cell.monthOffset)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div style={styles.timeGrid}>
              <TimeColumn label="時" options={HOUR_OPTIONS} value={selectedHour} onSelect={(hour) => selectTime(hour, selectedMinute)} />
              <TimeColumn label="分" options={MINUTE_OPTIONS} value={selectedMinute} onSelect={(minute) => selectTime(selectedHour, minute)} />
            </div>
          </div>
          <div style={styles.footer}>
            <button type="button" style={styles.linkButton} onClick={() => onChange("")}>清除</button>
            <button type="button" style={styles.linkButton} onClick={setToday}>今天</button>
            <button type="button" style={styles.doneButton} onClick={() => setOpen(false)}>完成</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeColumn({ label, options, value, onSelect }: {
  label: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <div style={styles.timeLabel}>{label}</div>
      <div style={styles.timeColumn}>
        {options.map(option => (
          <button
            type="button"
            key={option}
            style={{ ...styles.timeOption, ...(option === value ? styles.selectedTime : {}) }}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { position: "relative", width: "100%" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 },
  field: {
    width: "100%",
    minHeight: 46,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1.5px solid #DDE5F0",
    background: "#fff",
    color: "#0F172A",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    textAlign: "left",
    cursor: "pointer",
  },
  value: { fontSize: 15, fontWeight: 750, color: "#0F172A" },
  placeholder: { fontSize: 15, fontWeight: 750, color: "#94A3B8" },
  calendarIcon: {
    width: 17,
    height: 17,
    border: "2px solid #0F172A",
    borderRadius: 3,
    color: "transparent",
    flex: "0 0 auto",
    boxSizing: "border-box",
  },
  popover: {
    position: "absolute",
    left: 0,
    top: "calc(100% + 6px)",
    zIndex: 80,
    width: "min(640px, calc(100vw - 36px))",
    padding: 16,
    border: "1px solid #CBD5E1",
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 22px 45px rgba(15, 23, 42, 0.18)",
    boxSizing: "border-box",
  },
  monthHeader: { display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", marginBottom: 10 },
  monthTitle: { textAlign: "center", fontSize: 16, color: "#0F172A" },
  navButton: { width: 36, height: 36, border: "none", borderRadius: 8, background: "#F8FAFC", color: "#0F172A", fontSize: 22, cursor: "pointer" },
  pickerGrid: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 188px", gap: 16, alignItems: "start" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  weekday: { height: 28, display: "grid", placeItems: "center", fontSize: 13, color: "#475569", fontWeight: 800 },
  dayButton: { height: 34, border: "1px solid transparent", borderRadius: 8, background: "#fff", color: "#0F172A", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  mutedDay: { color: "#94A3B8" },
  todayDay: { borderColor: "#99F6E4" },
  selectedDay: { background: "#0D9488", color: "#fff", borderColor: "#0D9488" },
  timeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  timeLabel: { height: 28, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 850, color: "#475569" },
  timeColumn: { maxHeight: 238, overflowY: "auto", display: "grid", gap: 4, paddingRight: 2 },
  timeOption: { minHeight: 34, border: "1px solid transparent", borderRadius: 8, background: "#F8FAFC", color: "#0F172A", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  selectedTime: { background: "#0D9488", color: "#fff" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 14 },
  linkButton: { border: "none", background: "transparent", color: "#0D9488", fontSize: 14, fontWeight: 850, cursor: "pointer", padding: "8px 10px" },
  doneButton: { marginLeft: "auto", border: "none", borderRadius: 8, background: "#0D9488", color: "#fff", fontSize: 14, fontWeight: 850, cursor: "pointer", padding: "9px 14px" },
};
