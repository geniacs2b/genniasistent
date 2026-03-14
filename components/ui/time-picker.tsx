"use client";

import * as React from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  timeStr: string; // HH:mm format (24h)
  setTimeStr: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({ timeStr, setTimeStr, placeholder = "--:--", className }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const getInitial = () => {
    if (!timeStr) return { hours: 12, minutes: 0, ampm: "AM" as const };
    const [h, m] = timeStr.split(":").map(Number);
    return {
      hours: h % 12 || 12,
      minutes: m,
      ampm: h >= 12 ? ("PM" as const) : ("AM" as const),
    };
  };

  const initialParams = getInitial();
  const [hours, setHours] = React.useState<number>(initialParams.hours);
  const [minutes, setMinutes] = React.useState<number>(initialParams.minutes);
  const [ampm, setAmpm] = React.useState<"AM" | "PM">(initialParams.ampm);

  React.useEffect(() => {
    const params = getInitial();
    setHours(params.hours);
    setMinutes(params.minutes);
    setAmpm(params.ampm);
  }, [timeStr]);

  const updateTime = (h: number, m: number, ap: "AM" | "PM") => {
    setHours(h);
    setMinutes(m);
    setAmpm(ap);

    let adjustedHours = h;
    if (ap === "PM" && h < 12) adjustedHours += 12;
    if (ap === "AM" && h === 12) adjustedHours = 0;
    
    const formattedHour = adjustedHours.toString().padStart(2, "0");
    const formattedMinute = m.toString().padStart(2, "0");
    setTimeStr(`${formattedHour}:${formattedMinute}`);
  };

  const displayTime = () => {
    if (!timeStr) return <span>{placeholder}</span>;
    // Format to 12h for display
    const formattedH = hours.toString().padStart(2, "0");
    const formattedM = minutes.toString().padStart(2, "0");
    return `${formattedH}:${formattedM} ${ampm}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !timeStr && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayTime()}
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
  );
}
