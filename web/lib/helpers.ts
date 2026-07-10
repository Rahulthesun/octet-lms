export const toTitleCase = (str?: string | null) =>
  str
    ? str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : ''

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getOrdinal = (n: number): string => {
    if (n >= 11 && n <= 13) return `${n}th`;

    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  };

  return `${getOrdinal(day)} ${months[month - 1]} ${year}`;
}