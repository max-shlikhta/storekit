// Money is an integer in minor units (cents); every price on screen goes through here.
export const formatMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / 100);

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

// "12.50" typed by a person → 1250 minor units; null when it is not a price. The text is read as
// digits, never as a float: 1.005 * 100 is 100.49999999999999, and money must not drift. More
// than two decimals is refused rather than rounded.
export const parseMoney = (text: string) => {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(text.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
};

export const toMajor = (minor: number) => (minor / 100).toFixed(2);
