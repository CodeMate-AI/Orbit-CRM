"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_LOCALE = "en-IN";

type ProfileFormState = {
  name: string;
  email: string;
  timezone: string;
  locale: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    email: "",
    timezone: DEFAULT_TIMEZONE,
    locale: DEFAULT_LOCALE,
  });

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const session = await authClient.getSession();
        if (!session || !session.data?.user) {
          router.push("/signin");
          return;
        }

        if (!mounted) {
          return;
        }

        const sessionUser = session.data.user as typeof session.data.user & {
          timezone?: string | null;
          locale?: string | null;
        };

        setProfileForm({
          name: sessionUser.name ?? "",
          email: sessionUser.email ?? "",
          timezone: sessionUser.timezone ?? DEFAULT_TIMEZONE,
          locale: sessionUser.locale ?? DEFAULT_LOCALE,
        });
      } catch (error: any) {
        toast.error(error.message || "Failed to load settings.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);

    try {
      await authClient.updateUser({ name: profileForm.name });
      const session = await authClient.getSession();
      const sessionUser = session?.data?.user;

      if (sessionUser) {
        const typedSessionUser = sessionUser as typeof sessionUser & {
          timezone?: string | null;
          locale?: string | null;
        };

        setProfileForm((current) => ({
          ...current,
          name: typedSessionUser.name ?? current.name,
          email: typedSessionUser.email ?? current.email,
          timezone: typedSessionUser.timezone ?? DEFAULT_TIMEZONE,
          locale: typedSessionUser.locale ?? DEFAULT_LOCALE,
        }));
      }

      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("Profile updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout pageTitle="Settings">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <Card>
            <CardContent className="flex min-h-[420px] items-center justify-center p-6">
              <div className="flex items-center gap-3 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading settings…
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Settings">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal profile</CardTitle>
            <CardDescription>
              Update your display name. Email, timezone, and locale are shown for reference only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5 md:grid-cols-2" onSubmit={handleProfileSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={profileForm.email} disabled readOnly className="cursor-not-allowed bg-bg-secondary/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-timezone">Timezone</Label>
                <Input
                  id="profile-timezone"
                  value={profileForm.timezone === "Asia/Kolkata" ? "Asia/Kolkata (IST)" : profileForm.timezone}
                  disabled
                  readOnly
                  className="cursor-not-allowed bg-bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-locale">Locale</Label>
                <Input
                  id="profile-locale"
                  value={profileForm.locale === "en-IN" ? "English (India) - en-IN" : profileForm.locale}
                  disabled
                  readOnly
                  className="cursor-not-allowed bg-bg-secondary/50"
                />
              </div>

              <div className="md:col-span-2 mt-2 flex flex-col gap-3">
                <Button type="submit" className="w-full sm:w-auto" disabled={profileSaving}>
                  {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save profile
                </Button>
                <p className="text-xs text-text-secondary">
                  Changes are applied to your account profile and reflected across the app.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
