import { formatShortDate, toDateInput } from "@/lib/format";

export type SlotItem = {
  id: string;
  dateInput: string;
  dateLabel: string;
  capacity: number;
  booked: number;
  reserved: number;
  spotsLeft: number;
  bookingCount: number;
};

export function toSlotItem(slot: {
  id: string;
  date: Date | string;
  capacity: number;
  booked: number;
  reserved: number;
  _count?: { bookings: number };
}): SlotItem {
  return {
    id: slot.id,
    dateInput: toDateInput(slot.date),
    dateLabel: formatShortDate(slot.date),
    capacity: slot.capacity,
    booked: slot.booked,
    reserved: slot.reserved,
    spotsLeft: Math.max(0, slot.capacity - slot.booked - slot.reserved),
    bookingCount: slot._count?.bookings ?? 0,
  };
}
