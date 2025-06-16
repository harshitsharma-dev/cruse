import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { DayPicker, DayPickerSingleProps, DayPickerMultipleProps, DayPickerRangeProps } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type EnhancedCalendarProps = (DayPickerSingleProps | DayPickerMultipleProps | DayPickerRangeProps) & {
  enableYearNavigation?: boolean;
  enableMonthNavigation?: boolean;
  yearRange?: { start: number; end: number };
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function EnhancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  enableYearNavigation = true,
  enableMonthNavigation = true,
  yearRange = { start: 2020, end: new Date().getFullYear() + 2 },
  selected,
  onSelect,
  ...props
}: EnhancedCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    selected instanceof Date ? selected : new Date()
  );

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(monthIndex));
    setCurrentMonth(newMonth);
  };

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(year));
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const years = Array.from(
    { length: yearRange.end - yearRange.start + 1 }, 
    (_, i) => yearRange.start + i
  );

  return (
    <div className="space-y-4">
      {/* Enhanced Navigation */}
      {(enableYearNavigation || enableMonthNavigation) && (
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <div className="flex items-center gap-2">
            {enableMonthNavigation && (
              <Select 
                value={currentMonth.getMonth().toString()} 
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {enableYearNavigation && (
              <Select 
                value={currentMonth.getFullYear().toString()} 
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            Today
          </Button>
        </div>
      )}

      {/* Standard Calendar */}
      <DayPicker
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        selected={selected}
        onSelect={onSelect}
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />
    </div>
  );
}

EnhancedCalendar.displayName = "EnhancedCalendar";

export { EnhancedCalendar };
