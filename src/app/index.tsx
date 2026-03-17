import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { signOut } from "@/lib/auth-client";
import {
  bootstrapCurrentUser,
  createSalon,
  getEmployeeBookings,
  getNextCustomer,
  getViewerContext,
  staffLogin,
  type Booking,
  type CreateSalonInput,
  type Employee,
  type Salon,
  type ViewerContext,
} from "@/lib/api";
import { usePortalIntent } from "@/lib/portal-intent";

const initialSalonForm: CreateSalonInput = {
  name: "",
  slug: "",
  description: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "Denmark",
  timezone: "Europe/Copenhagen",
};

export default function Index() {
  const { width } = useWindowDimensions();
  const { portalIntent, setPortalIntent } = usePortalIntent();
  const [viewer, setViewer] = useState<ViewerContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const [workerPin, setWorkerPin] = useState("");
  const [staffEmployee, setStaffEmployee] = useState<Employee | null>(null);
  const [staffSalon, setStaffSalon] = useState<Salon | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);
  const [salonForm, setSalonForm] = useState<CreateSalonInput>(initialSalonForm);
  const [isSalonSubmitting, setIsSalonSubmitting] = useState(false);
  const [createdSalon, setCreatedSalon] = useState<Salon | null>(null);
  const isWide = width >= 1000;
  const isTablet = width >= 720;

  useEffect(() => {
    let isMounted = true;

    async function loadViewer() {
      try {
        setIsLoading(true);
        setScreenMessage(null);
        await bootstrapCurrentUser();
        const nextViewer = await getViewerContext();

        if (!isMounted) {
          return;
        }

        setViewer(nextViewer);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const fallbackMessage =
          error instanceof Error
            ? error.message
            : "Vi kunne ikke hente din konto.";

        setScreenMessage(
          fallbackMessage === "Request failed with status 404."
            ? "API'et svarer ikke på /api/v1. Sæt EXPO_PUBLIC_API_URL til Cut&Go API-serveren."
            : fallbackMessage,
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadViewer();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    if (viewer.appUser.role === "admin") {
      setPortalIntent("admin");
      return;
    }

    if (viewer.appUser.role === "staff" || viewer.salon) {
      setPortalIntent("salon");
    }
  }, [setPortalIntent, viewer]);

  const shellTitle = useMemo(() => {
    if (portalIntent === "salon") {
      return "Salon-tablet";
    }

    if (portalIntent === "admin") {
      return "Platform admin";
    }

    return "Kundeprofil";
  }, [portalIntent]);

  const handleSignOut = async () => {
    await signOut();
    setViewer(null);
    setStaffEmployee(null);
    setStaffSalon(null);
    setNextBooking(null);
    setTodaysBookings([]);
    setCreatedSalon(null);
    setWorkerPin("");
  };

  const handleStaffPinSubmit = async () => {
    if (!workerPin.trim()) {
      setScreenMessage("Indtast medarbejderens 4-cifrede PIN.");
      return;
    }

    if (!viewer?.salon?._id) {
      setScreenMessage("Denne konto er ikke knyttet til en salon endnu.");
      return;
    }

    try {
      setIsPinSubmitting(true);
      setScreenMessage(null);
      const session = await staffLogin(workerPin.trim(), viewer.salon._id);

      setStaffEmployee(session.employee);
      setStaffSalon(session.salon);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [nextCustomer, bookingOverview] = await Promise.all([
        getNextCustomer(session.employee._id),
        getEmployeeBookings(
          session.employee._id,
          startOfDay.getTime(),
          endOfDay.getTime(),
        ),
      ]);

      setNextBooking(nextCustomer.nextBooking);
      setTodaysBookings(bookingOverview.bookings);
      setWorkerPin("");
    } catch (error) {
      setScreenMessage(
        error instanceof Error
          ? error.message
          : "PIN-login fejlede. Prøv igen.",
      );
    } finally {
      setIsPinSubmitting(false);
    }
  };

  const handleSalonCreate = async () => {
    if (
      !salonForm.name.trim() ||
      !salonForm.slug.trim() ||
      !salonForm.phone.trim() ||
      !salonForm.email.trim() ||
      !salonForm.addressLine1.trim() ||
      !salonForm.postalCode.trim() ||
      !salonForm.city.trim()
    ) {
      setScreenMessage("Udfyld de vigtigste salonfelter før du opretter den.");
      return;
    }

    try {
      setIsSalonSubmitting(true);
      setScreenMessage(null);
      const salon = await createSalon({
        ...salonForm,
        description: salonForm.description?.trim() || undefined,
        addressLine2: salonForm.addressLine2?.trim() || undefined,
      });

      setCreatedSalon(salon);
      setSalonForm(initialSalonForm);
    } catch (error) {
      setScreenMessage(
        error instanceof Error
          ? error.message
          : "Vi kunne ikke oprette salonen.",
      );
    } finally {
      setIsSalonSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color="#b45524" size="large" />
        <Text style={styles.stateTitle}>Klargør din konto</Text>
        <Text style={styles.stateSubtitle}>
          Vi henter din bruger, rolle og salonkontekst.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.shell, isWide && styles.shellWide]}>
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <Text style={styles.eyebrow}>Cut&Go</Text>
          <Text style={styles.heroTitle}>{shellTitle}</Text>
          <Text style={styles.heroSubtitle}>
            {portalIntent === "salon"
              ? "Salonens hovedkonto logger ind først. Derefter vælger medarbejderen sig selv med PIN."
              : portalIntent === "admin"
                ? "Admin-flowet er minimalt, men kan nu oprette saloner direkte mod API’et."
                : "Kundeflowet er stadig enkelt, men konto og roller er nu synlige efter login."}
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Logget ind som</Text>
            <Text style={styles.summaryValue}>
              {viewer?.appUser.fullName || viewer?.authUser.name}
            </Text>
            <Text style={styles.summaryMeta}>{viewer?.authUser.email}</Text>
            <Text style={styles.summaryMeta}>
              Rolle: {viewer?.appUser.role ?? "ukendt"}
            </Text>
            {viewer?.salon ? (
              <Text style={styles.summaryMeta}>Salon: {viewer.salon.name}</Text>
            ) : null}
          </View>

          <View style={styles.heroActions}>
            <Pressable
              onPress={() => setPortalIntent("client")}
              style={[
                styles.intentChip,
                portalIntent === "client" && styles.intentChipActive,
              ]}
            >
              <Text
                style={[
                  styles.intentChipText,
                  portalIntent === "client" && styles.intentChipTextActive,
                ]}
              >
                Kunde
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPortalIntent("salon")}
              style={[
                styles.intentChip,
                portalIntent === "salon" && styles.intentChipActive,
              ]}
            >
              <Text
                style={[
                  styles.intentChipText,
                  portalIntent === "salon" && styles.intentChipTextActive,
                ]}
              >
                Salon
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPortalIntent("admin")}
              style={[
                styles.intentChip,
                portalIntent === "admin" && styles.intentChipActive,
              ]}
            >
              <Text
                style={[
                  styles.intentChipText,
                  portalIntent === "admin" && styles.intentChipTextActive,
                ]}
              >
                Admin
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={handleSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Log ud</Text>
          </Pressable>
        </View>

        <View style={[styles.content, isWide && styles.contentWide]}>
          {screenMessage ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{screenMessage}</Text>
            </View>
          ) : null}

          {portalIntent === "salon" ? (
            <SalonPanel
              isTablet={isTablet}
              isSubmitting={isPinSubmitting}
              nextBooking={nextBooking}
              salon={staffSalon ?? viewer?.salon ?? null}
              staffEmployee={staffEmployee}
              todaysBookings={todaysBookings}
              workerPin={workerPin}
              onChangeWorkerPin={setWorkerPin}
              onSubmitPin={handleStaffPinSubmit}
            />
          ) : null}

          {portalIntent === "admin" ? (
            <AdminPanel
              createdSalon={createdSalon}
              form={salonForm}
              isSubmitting={isSalonSubmitting}
              viewer={viewer}
              onChange={setSalonForm}
              onSubmit={handleSalonCreate}
            />
          ) : null}

          {portalIntent === "client" ? <ClientPanel viewer={viewer} /> : null}
        </View>
      </View>
    </ScrollView>
  );
}

function SalonPanel({
  isTablet,
  isSubmitting,
  nextBooking,
  salon,
  staffEmployee,
  todaysBookings,
  workerPin,
  onChangeWorkerPin,
  onSubmitPin,
}: {
  isTablet: boolean;
  isSubmitting: boolean;
  nextBooking: Booking | null;
  salon: Salon | null;
  staffEmployee: Employee | null;
  todaysBookings: Booking[];
  workerPin: string;
  onChangeWorkerPin: (value: string) => void;
  onSubmitPin: () => void;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Salon login</Text>
        <Text style={styles.panelTitle}>
          {staffEmployee ? "Medarbejder aktiv" : "Indtast medarbejder-PIN"}
        </Text>
        <Text style={styles.panelBody}>
          {staffEmployee
            ? `${staffEmployee.displayName} er nu valgt på tabletten.`
            : "Efter salonens login vælger medarbejderen sig selv med sin 4-cifrede PIN."}
        </Text>

        <View style={[styles.pinRow, isTablet && styles.pinRowTablet]}>
          <TextInput
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={onChangeWorkerPin}
            placeholder="1234"
            placeholderTextColor="#9d9284"
            style={styles.pinInput}
            value={workerPin}
          />
          <Pressable
            onPress={onSubmitPin}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.pinButton,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff8f1" />
            ) : (
              <Text style={styles.primaryButtonText}>Bekræft PIN</Text>
            )}
          </Pressable>
        </View>

        {salon ? (
          <View style={styles.inlineInfo}>
            <Text style={styles.inlineInfoText}>{salon.name}</Text>
            <Text style={styles.inlineInfoMeta}>
              {salon.addressLine1}, {salon.city}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.grid, isTablet && styles.gridTablet]}>
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>Næste kunde</Text>
          <Text style={styles.panelTitle}>
            {nextBooking ? nextBooking.customerName : "Ingen kunde endnu"}
          </Text>
          <Text style={styles.panelBody}>
            {nextBooking
              ? `${formatTime(nextBooking.startsAt)} • ${nextBooking.service?.name ?? "Behandling"}`
              : "Når medarbejderen er valgt, dukker næste booking op her."}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>Dagens bookinger</Text>
          <Text style={styles.panelTitle}>{todaysBookings.length} bookinger</Text>
          <View style={styles.bookingList}>
            {todaysBookings.slice(0, 4).map((booking) => (
              <View key={booking._id} style={styles.bookingRow}>
                <Text style={styles.bookingTime}>
                  {formatTime(booking.startsAt)}
                </Text>
                <View style={styles.bookingCopy}>
                  <Text style={styles.bookingName}>{booking.customerName}</Text>
                  <Text style={styles.bookingMeta}>
                    {booking.service?.name ?? "Behandling"}
                  </Text>
                </View>
              </View>
            ))}
            {!todaysBookings.length ? (
              <Text style={styles.emptyText}>
                Ingen bookinger hentet endnu for i dag.
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function AdminPanel({
  createdSalon,
  form,
  isSubmitting,
  viewer,
  onChange,
  onSubmit,
}: {
  createdSalon: Salon | null;
  form: CreateSalonInput;
  isSubmitting: boolean;
  viewer: ViewerContext | null;
  onChange: (value: CreateSalonInput) => void;
  onSubmit: () => void;
}) {
  const isAdmin = viewer?.appUser.role === "admin";

  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Admin</Text>
        <Text style={styles.panelTitle}>Opret salon på platformen</Text>
        <Text style={styles.panelBody}>
          Minimal version lige nu: vi opretter salonens grunddata direkte mod
          backend.
        </Text>

        {!isAdmin ? (
          <View style={styles.noticeSoft}>
            <Text style={styles.noticeSoftText}>
              Din bruger er logget ind, men har ikke `admin`-rolle endnu. Selve
              UI’et er klar, men backend vil afvise oprettelsen uden admin-adgang.
            </Text>
          </View>
        ) : null}

        <View style={styles.formGrid}>
          <FormInput
            label="Salonnavn"
            onChangeText={(value) => onChange({ ...form, name: value })}
            value={form.name}
          />
          <FormInput
            label="Slug"
            onChangeText={(value) => onChange({ ...form, slug: slugify(value) })}
            value={form.slug}
          />
          <FormInput
            label="Telefon"
            onChangeText={(value) => onChange({ ...form, phone: value })}
            value={form.phone}
          />
          <FormInput
            label="Email"
            onChangeText={(value) => onChange({ ...form, email: value })}
            value={form.email}
          />
          <FormInput
            label="Adresse"
            onChangeText={(value) => onChange({ ...form, addressLine1: value })}
            value={form.addressLine1}
          />
          <FormInput
            label="Adresse 2"
            onChangeText={(value) => onChange({ ...form, addressLine2: value })}
            value={form.addressLine2 ?? ""}
          />
          <FormInput
            label="Postnr."
            onChangeText={(value) => onChange({ ...form, postalCode: value })}
            value={form.postalCode}
          />
          <FormInput
            label="By"
            onChangeText={(value) => onChange({ ...form, city: value })}
            value={form.city}
          />
          <FormInput
            label="Land"
            onChangeText={(value) => onChange({ ...form, country: value })}
            value={form.country}
          />
          <FormInput
            label="Tidszone"
            onChangeText={(value) => onChange({ ...form, timezone: value })}
            value={form.timezone}
          />
        </View>

        <TextInput
          multiline
          onChangeText={(value) => onChange({ ...form, description: value })}
          placeholder="Kort beskrivelse af salonen"
          placeholderTextColor="#9d9284"
          style={[styles.input, styles.textarea]}
          value={form.description ?? ""}
        />

        <Pressable
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            isSubmitting && styles.buttonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff8f1" />
          ) : (
            <Text style={styles.primaryButtonText}>Opret salon</Text>
          )}
        </Pressable>
      </View>

      {createdSalon ? (
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>Ny salon</Text>
          <Text style={styles.panelTitle}>{createdSalon.name}</Text>
          <Text style={styles.panelBody}>
            Salon oprettet med slug `{createdSalon.slug}` og timezone{" "}
            {createdSalon.timezone}.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ClientPanel({ viewer }: { viewer: ViewerContext | null }) {
  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Konto</Text>
        <Text style={styles.panelTitle}>
          {viewer?.appUser.fullName ?? "Din Cut&Go profil"}
        </Text>
        <Text style={styles.panelBody}>
          Det her er en bevidst lille startskærm. Når bookingflowet kobles på,
          kan denne del vise favorit-salon, kommende tider og tidligere besøg.
        </Text>
      </View>
    </View>
  );
}

function FormInput({
  label,
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#9d9284"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#efe5d6",
    flexGrow: 1,
    padding: 20,
  },
  shell: {
    gap: 20,
    marginHorizontal: "auto",
    maxWidth: 1200,
    width: "100%",
  },
  shellWide: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  hero: {
    backgroundColor: "#20352d",
    borderRadius: 32,
    gap: 18,
    padding: 24,
  },
  heroWide: {
    flex: 0.92,
    minHeight: 760,
  },
  content: {
    gap: 16,
  },
  contentWide: {
    flex: 1.08,
  },
  eyebrow: {
    color: "#e7a06e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff9f3",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  heroSubtitle: {
    color: "#d2ddd7",
    fontSize: 16,
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: "rgba(255, 249, 243, 0.1)",
    borderColor: "rgba(255, 249, 243, 0.1)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  summaryLabel: {
    color: "#d2ddd7",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#fff9f3",
    fontSize: 24,
    fontWeight: "800",
  },
  summaryMeta: {
    color: "#d2ddd7",
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  intentChip: {
    backgroundColor: "rgba(255, 249, 243, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  intentChipActive: {
    backgroundColor: "#fff9f3",
  },
  intentChipText: {
    color: "#fff9f3",
    fontSize: 14,
    fontWeight: "700",
  },
  intentChipTextActive: {
    color: "#20352d",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(255, 249, 243, 0.22)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#fff9f3",
    fontSize: 15,
    fontWeight: "800",
  },
  notice: {
    backgroundColor: "#fff3e8",
    borderColor: "#efceb0",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  noticeText: {
    color: "#8e4d20",
    fontSize: 14,
    lineHeight: 20,
  },
  noticeSoft: {
    backgroundColor: "#f6efe3",
    borderRadius: 18,
    padding: 14,
  },
  noticeSoftText: {
    color: "#6e655b",
    fontSize: 14,
    lineHeight: 20,
  },
  stack: {
    gap: 16,
  },
  grid: {
    gap: 16,
  },
  gridTablet: {
    flexDirection: "row",
  },
  panel: {
    backgroundColor: "#fff9f3",
    borderColor: "#e7d8c6",
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  panelEyebrow: {
    color: "#b45524",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  panelTitle: {
    color: "#1f2937",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  panelBody: {
    color: "#6b635b",
    fontSize: 15,
    lineHeight: 22,
  },
  pinRow: {
    gap: 12,
  },
  pinRowTablet: {
    alignItems: "center",
    flexDirection: "row",
  },
  pinInput: {
    backgroundColor: "#f7efe4",
    borderColor: "#eadfce",
    borderRadius: 20,
    borderWidth: 1,
    color: "#1f2937",
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 8,
    minHeight: 64,
    paddingHorizontal: 18,
    textAlign: "center",
  },
  pinButton: {
    minWidth: 170,
  },
  inlineInfo: {
    backgroundColor: "#f5ede2",
    borderRadius: 20,
    gap: 6,
    padding: 16,
  },
  inlineInfoText: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "800",
  },
  inlineInfoMeta: {
    color: "#6b635b",
    fontSize: 14,
  },
  bookingList: {
    gap: 12,
  },
  bookingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  bookingTime: {
    color: "#b45524",
    fontSize: 15,
    fontWeight: "800",
    minWidth: 48,
  },
  bookingCopy: {
    flex: 1,
    gap: 2,
  },
  bookingName: {
    color: "#1f2937",
    fontSize: 15,
    fontWeight: "700",
  },
  bookingMeta: {
    color: "#6b635b",
    fontSize: 13,
  },
  emptyText: {
    color: "#8f877d",
    fontSize: 14,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  formField: {
    flexGrow: 1,
    gap: 8,
    minWidth: 220,
  },
  formLabel: {
    color: "#4f4a45",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#f7efe4",
    borderColor: "#eadfce",
    borderRadius: 18,
    borderWidth: 1,
    color: "#1f2937",
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#c65a18",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#fffaf3",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#efe5d6",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
  stateTitle: {
    color: "#1f2937",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  stateSubtitle: {
    color: "#6b635b",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
