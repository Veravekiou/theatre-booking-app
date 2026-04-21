const dateFormatter = new Intl.DateTimeFormat('el-GR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const currencyFormatter = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const parseIsoDate = (dateValue: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const formatCurrency = (value: number | string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 'N/A';
  }

  return currencyFormatter.format(parsed);
};

export const formatDate = (dateValue: string) => {
  const parsedDate = parseIsoDate(dateValue);
  if (!parsedDate) {
    return dateValue;
  }

  return dateFormatter.format(parsedDate);
};

export const formatTime = (timeValue: string) => {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(timeValue.trim());
  if (!match) {
    return timeValue;
  }

  return `${match[1]}:${match[2]}`;
};

export const formatShowDateTime = (dateValue: string, timeValue: string) => {
  return `${formatDate(dateValue)} - ${formatTime(timeValue)}`;
};

export const isValidIsoDateInput = (value: string) => {
  if (!value.trim()) {
    return true;
  }

  return parseIsoDate(value) !== null;
};
