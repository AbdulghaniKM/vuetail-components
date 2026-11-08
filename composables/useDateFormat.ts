import { toValue, type MaybeRefOrGetter } from 'vue';
import { formatDate, formatDateRange, type DateFormatOptions, type DateFormatPreset } from '@/utils/date';

type DateInput = Date | string | number;

/** `date` may be a value, a ref or a getter; every call formats its current value. */
export const useDateFormat = (date: MaybeRefOrGetter<DateInput>) => {

  const format = (options?: DateFormatOptions) => {
    return formatDate(toValue(date), options);
  };

  const formatPreset = (preset: DateFormatPreset) => {
    return formatDate(toValue(date), { preset });
  };

  const relative = () => {
    return formatDate(toValue(date), { preset: 'relative' });
  };

  const relativeShort = () => {
    return formatDate(toValue(date), { preset: 'relativeShort' });
  };

  const custom = (formatString: string) => {
    return formatDate(toValue(date), { customFormat: formatString });
  };

  return {
    format,
    formatPreset,
    relative,
    relativeShort,
    custom,
  };
};

export const useDateRange = (startDate: MaybeRefOrGetter<DateInput>, endDate: MaybeRefOrGetter<DateInput>) => {

  const format = (options?: DateFormatOptions) => {
    return formatDateRange(toValue(startDate), toValue(endDate), options);
  };

  return {
    format,
  };
};
