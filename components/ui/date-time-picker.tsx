"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getBogotaParts, setBogotaTime, BOGOTA_TIMEZONE } from "@/lib/date";
import { Matcher } from "react-day-picker";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: Matcher | Matcher[];
}

export function DateTimePicker({ date, setDate, placeholder = "Seleccionar fecha y hora", className, disabled }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [timeOpen, setTimeOpen] = React.useState(false);

  // Time handling
  const [hours, setHours] = React.useState<number>(12);
  const [minutes, setMinutes] = React.useState<number>(0);
  const [ampm, setAmpm] = React.useState<"AM" | "PM">("AM");

  // Sync state when date prop changes from outside
  React.useEffect(() => {
    if (date) {
      const parts = getBogotaParts(date);
      setHours(parts.hours);
      setMinutes(parts.minutes);
      setAmpm(parts.ampm);
    }
  }, [date]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = setBogotaTime(selectedDate, hours, minutes, ampm);
      setDate(newDate);
      
      // Auto-close calendar when date is picked
      setIsOpen(false);
    } else {
      setDate(undefined);
    }
  };

  const updateTime = (h: number, m: number, ap: "AM" | "PM") => {
    setHours(h);
    setMinutes(m);
    setAmpm(ap);

    if (date) {
      const newDate = setBogotaTime(date, h, m, ap);
      setDate(newDate);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "flex-1 justify-start text-left font-normal h-auto min-h-10 py-2 items-center",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-3 h-4 w-4 shrink-0" />
            <span className="line-clamp-2 leading-tight">
              {date ? new Intl.DateTimeFormat('es-CO', { 
                dateStyle: 'full', 
                timeZone: BOGOTA_TIMEZONE 
              }).format(date) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            locale={es}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>

      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-auto min-h-10 py-2 items-center",
              !date && "text-muted-foreground"
            )}
            disabled={!date}
          >
            <Clock className="mr-3 h-4 w-4 shrink-0" />
            <span className="line-clamp-2 leading-tight">
              {date ? new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: BOGOTA_TIMEZONE
              }).format(date) : "--:--"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex gap-2 h-[200px]">
            {/* Hours */}
            <ScrollArea className="w-[60px] h-full rounded-md border">
              <div className="flex flex-col p-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <Button
                    key={h}
                    variant={hours === h ? "default" : "ghost"}
                    className="w-full text-center p-0 h-8"
                    onClick={() => updateTime(h, minutes, ampm)}
                  >
                    {h.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            
            {/* Minutes */}
            <ScrollArea className="w-[60px] h-full rounded-md border">
              <div className="flex flex-col p-1">
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                  <Button
                    key={m}
                    variant={minutes === m ? "default" : "ghost"}
                    className="w-full text-center p-0 h-8"
                    onClick={() => updateTime(hours, m, ampm)}
                  >
                    {m.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {/* AM/PM */}
            <div className="w-[60px] flex flex-col gap-1">
              <Button
                variant={ampm === "AM" ? "default" : "outline"}
                className="w-full h-1/2 flex-1"
                onClick={() => updateTime(hours, minutes, "AM")}
              >
                AM
              </Button>
              <Button
                variant={ampm === "PM" ? "default" : "outline"}
                className="w-full h-1/2 flex-1"
                onClick={() => updateTime(hours, minutes, "PM")}
              >
                PM
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
