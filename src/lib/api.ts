import { Platform } from "react-native";

import { authBaseUrl, authClient } from "@/lib/auth-client";

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? authBaseUrl;

const apiV1BaseUrl = `${apiBaseUrl}/api/v1`;

export type Role = "client" | "staff" | "admin";

export type AppUser = {
  _id: string;
  authUserId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  salonId?: string;
  employeeId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Salon = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  ownerUserId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Employee = {
  _id: string;
  salonId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: "staff" | "admin";
  email?: string;
  phone?: string;
  bio?: string;
  workerPin?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Service = {
  _id: string;
  salonId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceDkk: number;
  category?: string;
  employeeIds: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Booking = {
  _id: string;
  salonId: string;
  clientUserId: string;
  employeeId: string;
  serviceId: string;
  createdByUserId: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  startsAt: number;
  endsAt: number;
  notes?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cancellationReason?: string;
  cancelledAt?: number;
  createdAt: number;
  updatedAt: number;
  salon: Salon | null;
  employee: Employee | null;
  service: Service | null;
  client: AppUser | null;
};

export type ViewerContext = {
  authUser: {
    _id: string;
    name: string;
    email: string;
  };
  appUser: AppUser;
  salon: Salon | null;
  employee: Employee | null;
};

export type StaffLoginResponse = {
  authenticated: boolean;
  employee: Employee;
  salon: Salon | null;
};

export type NextCustomerResponse = {
  employee: Employee;
  nextBooking: Booking | null;
};

export type EmployeeBookingsResponse = {
  employee: Employee;
  bookings: Booking[];
};

export type CreateSalonInput = {
  name: string;
  slug: string;
  description?: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
};

type ApiEnvelope<T> = {
  data: T;
  error?: {
    message?: string;
  };
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

function getCookieHeader() {
  const clientWithCookie = authClient as typeof authClient & {
    getCookie?: () => string;
  };

  return clientWithCookie.getCookie?.();
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const cookie = getCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (Platform.OS !== "web" && cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(`${apiV1BaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const json = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new Error(
      json?.error?.message || `Request failed with status ${response.status}.`,
    );
  }

  if (!json) {
    throw new Error("API returned an empty response.");
  }

  return json.data;
}

export function bootstrapCurrentUser(phone?: string) {
  return apiRequest<AppUser>("/users/me/bootstrap", {
    method: "POST",
    body: phone ? { phone } : {},
  });
}

export function getViewerContext() {
  return apiRequest<ViewerContext>("/users/me");
}

export function staffLogin(workerPin: string, salonId?: string) {
  return apiRequest<StaffLoginResponse>("/staff/login", {
    method: "POST",
    body: salonId ? { workerPin, salonId } : { workerPin },
  });
}

export function getNextCustomer(employeeId: string) {
  return apiRequest<NextCustomerResponse>(
    `/staff/${employeeId}/next-customer?now=${Date.now()}`,
  );
}

export function getEmployeeBookings(
  employeeId: string,
  startsAt: number,
  endsAt: number,
) {
  return apiRequest<EmployeeBookingsResponse>(
    `/staff/${employeeId}/bookings?startsAt=${startsAt}&endsAt=${endsAt}`,
  );
}

export function createSalon(input: CreateSalonInput) {
  return apiRequest<Salon>("/salons", {
    method: "POST",
    body: input,
  });
}
