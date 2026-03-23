import { loadMetaJson, saveMetaJson } from "@/lib/db";

import type { BillingCycle, SubscriptionPlan } from "@/lib/product/plans";

const ACCOUNT_PROFILE_KEY = "productAccountProfile";

export interface LocalAccountProfile {
  id: string;
  email: string;
  displayName: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  billingState: "free" | "trial" | "pro";
  trialEndsAt: string | null;
  signedInAt: string;
  sessionToken: string;
  cloudSyncEnabled: boolean;
}

function buildSessionToken() {
  return `preview_${crypto.randomUUID()}`;
}

export function hasProAccess(profile: LocalAccountProfile | null) {
  if (!profile) {
    return false;
  }

  if (profile.billingState === "pro") {
    return true;
  }

  if (profile.billingState !== "trial" || !profile.trialEndsAt) {
    return false;
  }

  return new Date(profile.trialEndsAt).getTime() > Date.now();
}

export async function loadAccountProfile() {
  return loadMetaJson<LocalAccountProfile>(ACCOUNT_PROFILE_KEY);
}

export async function saveAccountProfile(profile: LocalAccountProfile) {
  await saveMetaJson(ACCOUNT_PROFILE_KEY, profile);
  return profile;
}

export async function signInLocalAccount({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  const existingProfile = await loadAccountProfile();
  const nextProfile: LocalAccountProfile = {
    id: existingProfile?.id ?? crypto.randomUUID(),
    email,
    displayName,
    plan: existingProfile?.plan ?? "free",
    billingCycle: existingProfile?.billingCycle ?? "monthly",
    billingState: existingProfile?.billingState ?? "free",
    trialEndsAt: existingProfile?.trialEndsAt ?? null,
    signedInAt: existingProfile?.signedInAt ?? new Date().toISOString(),
    sessionToken: existingProfile?.sessionToken ?? buildSessionToken(),
    cloudSyncEnabled: existingProfile?.cloudSyncEnabled ?? true,
  };

  return saveAccountProfile(nextProfile);
}

export async function startProTrial(trialDays = 14) {
  const currentProfile = await loadAccountProfile();

  if (!currentProfile) {
    throw new Error("Create an account before starting a Pro trial.");
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  return saveAccountProfile({
    ...currentProfile,
    plan: "pro",
    billingState: "trial",
    trialEndsAt: trialEndsAt.toISOString(),
  });
}

export async function activateLocalProPlan(billingCycle: BillingCycle) {
  const currentProfile = await loadAccountProfile();

  if (!currentProfile) {
    throw new Error("Create an account before activating Pro.");
  }

  return saveAccountProfile({
    ...currentProfile,
    plan: "pro",
    billingCycle,
    billingState: "pro",
    trialEndsAt: null,
  });
}

export async function downgradeToFree() {
  const currentProfile = await loadAccountProfile();

  if (!currentProfile) {
    return null;
  }

  return saveAccountProfile({
    ...currentProfile,
    plan: "free",
    billingState: "free",
    trialEndsAt: null,
  });
}

export async function updateCloudSyncEnabled(enabled: boolean) {
  const currentProfile = await loadAccountProfile();

  if (!currentProfile) {
    throw new Error("Create an account before changing sync preferences.");
  }

  return saveAccountProfile({
    ...currentProfile,
    cloudSyncEnabled: enabled,
  });
}
