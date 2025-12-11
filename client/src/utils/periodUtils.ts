// Period utility functions for workflows

export type PeriodFrequency = "monthly" | "quarterly" | "yearly";

export const formatPeriodDisplay = (period: string): string => {
  if (!period) return "";
  
  // Check for YYYY-MM format (monthly)
  const monthlyMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthlyMatch) {
    const [, year, month] = monthlyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  
  // Check for YYYY-QX format (quarterly)
  const quarterlyMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarterlyMatch) {
    const [, year, quarter] = quarterlyMatch;
    return `Q${quarter} ${year}`;
  }
  
  // Check for YYYY format (yearly)
  const yearlyMatch = period.match(/^(\d{4})$/);
  if (yearlyMatch) {
    return period;
  }
  
  return period;
};

export const getCurrentPeriod = (frequency: PeriodFrequency): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  switch (frequency) {
    case "monthly":
      return `${year}-${month.toString().padStart(2, "0")}`;
    case "quarterly":
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    case "yearly":
      return `${year}`;
    default:
      return `${year}-${month.toString().padStart(2, "0")}`;
  }
};

export const generatePeriodString = (
  startDate: Date,
  frequency: PeriodFrequency
): string => {
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  
  switch (frequency) {
    case "monthly":
      return `${year}-${month.toString().padStart(2, "0")}`;
    case "quarterly":
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    case "yearly":
      return `${year}`;
    default:
      return `${year}-${month.toString().padStart(2, "0")}`;
  }
};
