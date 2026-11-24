import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";
import type { Reservation } from "../src/contracts/reservation.contract.js";

const reservations = "/api/v1/reservations";
const bookingsFor = (student: string) => `${reservations}/user/${student}`;

type Students = {
  booker: string;
  contender: string;
};

const test = base.extend<{ students: Students }>({
  students: async ({ request }, use) => {
    const students = {
      booker: `e2e-${randomUUID()}`,
      contender: `e2e-${randomUUID()}`,
    };
    await use(students);

    // Release any slots used by this test before the next browser project starts.
    for (const student of Object.values(students)) {
      const response = await request.get(bookingsFor(student));
      await expect(response).toBeOK();
      const bookings: Reservation[] = await response.json();
      for (const booking of bookings) {
        const cancellation = await request.delete(
          `${reservations}/${booking.id}`,
        );
        expect(cancellation.status()).toBe(204);
      }
    }
  },
});

function tomorrowAt(hour: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function submitBooking(
  page: Page,
  student: string,
  category: string,
  resource: string,
  start: string,
  end: string,
) {
  await page.goto("/");
  await page.getByLabel("Student ID").fill(student);
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  const filters = page.getByRole("group", { name: "Filter resource type" });
  const filter = filters.getByRole("button", { name: category, exact: true });
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");

  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: resource, exact: true }),
  });
  await card.getByRole("button", { name: "Book resource" }).click();

  const dialog = page.getByRole("dialog", {
    name: `Book ${resource}`,
    exact: true,
  });
  await dialog.getByLabel("Start time").fill(start.slice(0, 16));
  await dialog.getByLabel("End time").fill(end.slice(0, 16));
  await dialog.getByRole("button", { name: "Confirm booking" }).click();
  return dialog;
}

test("Student successfully reserves an available study room", async ({
  page,
  students,
}) => {
  await submitBooking(
    page,
    students.booker,
    "Study rooms",
    "Study Room 302",
    tomorrowAt(10),
    tomorrowAt(11),
  );

  await expect(
    page.getByRole("status").filter({ hasText: "Reservation confirmed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "My bookings" }),
  ).toBeVisible();
  const booking = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Study Room 302", exact: true }),
  });
  await expect(booking.getByText("CONFIRMED", { exact: true })).toBeVisible();
});

test("Student receives a conflict alert for an overlapping booking", async ({
  page,
  request,
  students,
}) => {
  const start = tomorrowAt(14);
  const end = tomorrowAt(15);
  const existing = await request.post(reservations, {
    data: {
      resourceId: "res-102",
      userId: students.booker,
      startTime: start,
      endTime: end,
    },
  });
  expect(existing.status()).toBe(201);

  const dialog = await submitBooking(
    page,
    students.contender,
    "Equipment",
    "3D Printer A",
    start,
    end,
  );
  await expect(dialog.getByRole("alert")).toHaveText(
    "This resource is already reserved for the selected time window. Please choose a different time.",
  );
  await expect(dialog).toBeVisible();

  const bookings = await request.get(bookingsFor(students.contender));
  await expect(bookings).toBeOK();
  expect(await bookings.json()).toEqual([]);
});
