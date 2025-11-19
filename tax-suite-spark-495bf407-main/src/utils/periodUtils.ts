import { format, parse, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addMonths, addQuarters, addYears } from "date-fns";

export type PeriodFrequency = "monthly" | "quarterly" | "annual" | "one_time";

export const generatePeriodString = (date: Date, frequency: PeriodFrequency): string => {
  switch (frequency) {
    case "monthly":
      return format(date, "yyyy-MM");
    case "quarterly":
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter}-${format(date, "yyyy")}`;
    case "annual":
      return `FY-${format(date, "yyyy")}`;
    case "one_time":
      return format(date, "yyyy-MM-dd");
    default:
      return format(date, "yyyy-MM");
  }
};

export const getPeriodRange = (period: string): { start_date: Date; end_date: Date } => {
  // Monthly: 2025-01
  if (/^\d{4}-\d{2}$/.test(period)) {
    const date = parse(period, "yyyy-MM", new Date());
    return {
      start_date: startOfMonth(date),
      end_date: endOfMonth(date),
    };
  }

  // Quarterly: Q1-2025
  if (/^Q[1-4]-\d{4}$/.test(period)) {
    const [q, year] = period.split("-");
    const quarter = parseInt(q.substring(1));
    const date = new Date(parseInt(year), (quarter - 1) * 3, 1);
    return {
      start_date: startOfQuarter(date),
      end_date: endOfQuarter(date),
    };
  }

  // Annual: FY-2024
  if (/^FY-\d{4}$/.test(period)) {
    const year = parseInt(period.split("-")[1]);
    const date = new Date(year, 0, 1);
    return {
      start_date: startOfYear(date),
      end_date: endOfYear(date),
    };
  }

  // One-time: 2025-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const date = parse(period, "yyyy-MM-dd", new Date());
    return {
      start_date: date,
      end_date: date,
    };
  }

  // Default to current month
  const now = new Date();
  return {
    start_date: startOfMonth(now),
    end_date: endOfMonth(now),
  };
};

export const getNextPeriod = (period: string, frequency: PeriodFrequency): string => {
  const { start_date } = getPeriodRange(period);

  switch (frequency) {
    case "monthly":
      return generatePeriodString(addMonths(start_date, 1), "monthly");
    case "quarterly":
      return generatePeriodString(addQuarters(start_date, 1), "quarterly");
    case "annual":
      return generatePeriodString(addYears(start_date, 1), "annual");
    default:
      return period;
  }
};

export const getCurrentPeriod = (frequency: PeriodFrequency): string => {
  return generatePeriodString(new Date(), frequency);
};

export const formatPeriodDisplay = (period: string): string => {
  // Monthly: 2025-01 -> January 2025
  if (/^\d{4}-\d{2}$/.test(period)) {
    const date = parse(period, "yyyy-MM", new Date());
    return format(date, "MMMM yyyy");
  }

  // Quarterly: Q1-2025 -> Q1 2025
  if (/^Q[1-4]-\d{4}$/.test(period)) {
    return period.replace("-", " ");
  }

  // Annual: FY-2024 -> FY 2024
  if (/^FY-\d{4}$/.test(period)) {
    return period.replace("-", " ");
  }

  // One-time: 2025-01-15 -> Jan 15, 2025
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const date = parse(period, "yyyy-MM-dd", new Date());
    return format(date, "MMM dd, yyyy");
  }

  return period;
};

export const generatePeriodsForRange = (
  startDate: Date,
  endDate: Date,
  frequency: PeriodFrequency
): string[] => {
  const periods: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    periods.push(generatePeriodString(currentDate, frequency));

    switch (frequency) {
      case "monthly":
        currentDate = addMonths(currentDate, 1);
        break;
      case "quarterly":
        currentDate = addQuarters(currentDate, 1);
        break;
      case "annual":
        currentDate = addYears(currentDate, 1);
        break;
      default:
        return periods;
    }
  }

  return periods;
};
