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
  const [hasEditedSlug, setHasEditedSlug] = useState(false);
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

  const isAdminWithoutSalon =
    portalIntent === "admin" &&
    viewer?.appUser.role === "admin" &&
    !viewer.salon &&
    !createdSalon;

  const shellTitle = useMemo(() => {
    if (isAdminWithoutSalon) {
      return "Admin onboarding";
    }

    if (portalIntent === "salon") {
      return "Salon-tablet";
    }

    if (portalIntent === "admin") {
      return "Platform admin";
    }

    return "Kundeprofil";
  }, [isAdminWithoutSalon, portalIntent]);

  const handleSignOut = async () => {
    await signOut();
    setViewer(null);
    setStaffEmployee(null);
    setStaffSalon(null);
    setNextBooking(null);
    setTodaysBookings([]);
    setCreatedSalon(null);
    setHasEditedSlug(false);
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
      setScreenMessage("Udfyld navn, adresse og kontaktinfo for at fortsætte.");
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
      setViewer((currentViewer) =>
        currentViewer
          ? {
              ...currentViewer,
              salon,
            }
          : currentViewer,
      );
      setSalonForm(initialSalonForm);
      setHasEditedSlug(false);
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
      <View style={styles.shell}>
        <View style={styles.topBar}>
          <Text style={styles.logoText}>Cut&Go</Text>
          <Pressable onPress={handleSignOut} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Log ud</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
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
              hasEditedSlug={hasEditedSlug}
              isOnboarding={isAdminWithoutSalon}
              isSubmitting={isSalonSubmitting}
              viewer={viewer}
              onChange={setSalonForm}
              onNameChange={(value) => {
                setSalonForm((currentForm) => ({
                  ...currentForm,
                  name: value,
                  slug:
                    hasEditedSlug || currentForm.slug.trim()
                      ? currentForm.slug
                      : slugify(value),
                }));
              }}
              onSlugChange={(value) => {
                setHasEditedSlug(true);
                setSalonForm((currentForm) => ({
                  ...currentForm,
                  slug: slugify(value),
                }));
              }}
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
  hasEditedSlug,
  isOnboarding,
  isSubmitting,
  viewer,
  onChange,
  onNameChange,
  onSlugChange,
  onSubmit,
}: {
  createdSalon: Salon | null;
  form: CreateSalonInput;
  hasEditedSlug: boolean;
  isOnboarding: boolean;
  isSubmitting: boolean;
  viewer: ViewerContext | null;
  onChange: (value: CreateSalonInput) => void;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const isAdmin = viewer?.appUser.role === "admin";
  const [step, setStep] = useState(1);

  if (createdSalon) {
    return (
      <View style={[styles.panel, styles.successPanel]}>
        <Text style={styles.panelEyebrow}>Klar</Text>
        <Text style={styles.panelTitle}>{createdSalon.name}</Text>
        <Text style={styles.panelBody}>
          Salonen er oprettet. Du logges nu ind på klinikkens system...
        </Text>
        <View style={styles.successMeta}>
          <Text style={styles.successMetaText}>Slug: {createdSalon.slug}</Text>
          <Text style={styles.successMetaText}>
            {createdSalon.addressLine1}, {createdSalon.postalCode} {createdSalon.city}
          </Text>
        </View>
      </View>
    );
  }

  const isStep1Valid = form.name.trim().length > 0;
  const isStep2Valid = form.addressLine1.trim().length > 0 && form.postalCode.trim().length > 0 && form.city.trim().length > 0;

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <View style={styles.stack}>
      <View style={[styles.panel, isOnboarding && styles.onboardingPanel]}>
        <Text style={styles.panelEyebrow}>{isOnboarding ? "Opret din første salon" : "Ny salon"}</Text>
        
        {isOnboarding ? (
          <View style={styles.stepsRow}>
            <StepBadge active={step >= 1} label="1. Salon" />
            <StepBadge active={step >= 2} label="2. Adresse" />
            <StepBadge active={step >= 3} label="3. Kontakt" />
          </View>
        ) : null}

        {!isAdmin ? (
          <View style={styles.noticeSoft}>
            <Text style={styles.noticeSoftText}>
              Din bruger mangler admin-rolle, så backend kan afvise oprettelsen.
            </Text>
          </View>
        ) : null}

        {step === 1 || !isOnboarding ? (
          <View style={styles.formSection}>
            <Text style={styles.panelTitle}>Hvad hedder salonen?</Text>
            <Text style={styles.panelBody}>Vælg et stærkt navn til din forretning.</Text>
            <View style={styles.formGrid}>
              <FormInput
                label="Salonnavn"
                onChangeText={onNameChange}
                value={form.name}
              />
              <FormInput
                autoCapitalize="none"
                helperText={hasEditedSlug ? "Bruges i links." : "Genereres automatisk."}
                label="Slug"
                onChangeText={onSlugChange}
                value={form.slug}
              />
            </View>
          </View>
        ) : null}

        {step === 2 || !isOnboarding ? (
          <View style={styles.formSection}>
            <Text style={styles.panelTitle}>Hvor ligger den?</Text>
            <Text style={styles.panelBody}>Kunderne skal kunne finde dig.</Text>
            <View style={styles.formGrid}>
              <FormInput
                label="Adresse"
                onChangeText={(value) => onChange({ ...form, addressLine1: value })}
                value={form.addressLine1}
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formRowCompact}>
                <FormInput
                  keyboardType="number-pad"
                  label="Postnr."
                  onChangeText={(value) => onChange({ ...form, postalCode: value })}
                  value={form.postalCode}
                />
              </View>
              <View style={styles.formRowWide}>
                <FormInput
                  label="By"
                  onChangeText={(value) => onChange({ ...form, city: value })}
                  value={form.city}
                />
              </View>
            </View>
          </View>
        ) : null}

        {step === 3 || !isOnboarding ? (
          <View style={styles.formSection}>
            <Text style={styles.panelTitle}>Kontaktoplysninger</Text>
            <Text style={styles.panelBody}>Hold forbindelsen til dine kunder.</Text>
            <View style={styles.formGrid}>
              <FormInput
                keyboardType="phone-pad"
                label="Telefon"
                onChangeText={(value) => onChange({ ...form, phone: value })}
                value={form.phone}
              />
              <FormInput
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email"
                onChangeText={(value) => onChange({ ...form, email: value })}
                value={form.email}
              />
            </View>
            <TextInput
              multiline
              onChangeText={(value) => onChange({ ...form, description: value })}
              placeholder="Din bio (valgfrit)"
              placeholderTextColor="#9d9284"
              style={[styles.input, styles.textarea]}
              value={form.description ?? ""}
            />
          </View>
        ) : null}

        <View style={styles.formActions}>
          {isOnboarding && step > 1 ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>Tilbage</Text>
            </Pressable>
          ) : <View style={{ flex: 1 }} />}

          {isOnboarding && step < 3 ? (
            <Pressable 
              onPress={handleNext} 
              disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              style={[styles.primaryButton, (step === 1 ? !isStep1Valid : !isStep2Valid) && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>Næste</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
                { minWidth: 140 }
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isOnboarding ? "Opret salon" : "Opret salon"}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function StepBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <View style={[styles.stepBadge, active && styles.stepBadgeActive]}>
      <Text style={[styles.stepBadgeText, active && styles.stepBadgeTextActive]}>
        {label}
      </Text>
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
  autoCapitalize,
  helperText,
  keyboardType,
  label,
  onChangeText,
  value,
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  helperText?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#9d9284"
        style={styles.input}
        value={value}
      />
      {helperText ? <Text style={styles.formHelper}>{helperText}</Text> : null}
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
    backgroundColor: "#ffffff",
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#20352d",
    letterSpacing: -0.5,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#f5f5f5",
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
  },
  shell: {
    marginHorizontal: "auto",
    maxWidth: 600,
    width: "100%",
  },
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
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
    backgroundColor: "#ffffff",
    borderColor: "#e2e2e2",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 28,
  },
  onboardingPanel: {
    gap: 18,
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
  stepsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stepBadge: {
    backgroundColor: "#f2e8db",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepBadgeActive: {
    backgroundColor: "#e7f0ea",
  },
  stepBadgeText: {
    color: "#73695f",
    fontSize: 12,
    fontWeight: "700",
  },
  stepBadgeTextActive: {
    color: "#315743",
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
  formSection: {
    gap: 12,
  },
  sectionTitle: {
    color: "#3c3935",
    fontSize: 15,
    fontWeight: "800",
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formRowCompact: {
    flex: 0.45,
  },
  formRowWide: {
    flex: 1,
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
  formHelper: {
    color: "#8b8177",
    fontSize: 12,
    lineHeight: 16,
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
  inlineMetaCard: {
    backgroundColor: "#f6efe3",
    borderRadius: 18,
    gap: 6,
    padding: 14,
  },
  inlineMetaTitle: {
    color: "#3c3935",
    fontSize: 13,
    fontWeight: "800",
  },
  inlineMetaText: {
    color: "#6e655b",
    fontSize: 13,
    lineHeight: 18,
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
  successPanel: {
    backgroundColor: "#f6fbf7",
    borderColor: "#d6e8da",
  },
  successMeta: {
    backgroundColor: "#ebf5ed",
    borderRadius: 16,
    gap: 6,
    padding: 14,
  },
  successMetaText: {
    color: "#355744",
    fontSize: 13,
    lineHeight: 18,
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
