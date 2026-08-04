import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import { branchPreferenceStorageKey } from "../constants/branches";
import { clearSessionNavigationState } from "../utils/sessionNavigation";
import { formatUserCreationError } from "../utils/userCreationErrors";
import { syncSentryUser } from "../utils/sentryMonitoring";
import { isAccountant, isOrgPharmacyAdmin, isSuperAdmin } from "../utils/roles";
import { appUserFromStoredProfile, isBrowserOffline } from "../utils/offlineAuth";
import { buildAppAuthSession, clearAppAuthSession } from "../services/appAuthSession";
import type { AppUser } from "../types";

export type LoginScreenStatus = "loading" | "login" | "denied";

type UseAppAuthOptions = {
  isArabic: boolean;
  activeBranchId: string | null;
  setActiveBranchId: Dispatch<SetStateAction<string | null>>;
};

export function useAppAuth({ isArabic, activeBranchId, setActiveBranchId }: UseAppAuthOptions) {
  const [user, setUser] = useState<{ uid: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [registerName, setRegisterName] = useState("");
  const [registerPharmacyName, setRegisterPharmacyName] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registering, setRegistering] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState("");
  const accessRevokedRef = useRef(false);
  const appUserRef = useRef<AppUser | null>(null);
  const isArabicRef = useRef(isArabic);

  appUserRef.current = appUser;
  isArabicRef.current = isArabic;

  function applyBranchScopeForUser(data: AppUser) {
    if (isSuperAdmin(data)) {
      const tenantScope = activeBranchId || data.pharmacyId || "main";
      setActiveBranchId(tenantScope);
      pharmacyService.setActivePharmacy(tenantScope);
    } else if (isOrgPharmacyAdmin(data) || isAccountant(data)) {
      const saved = localStorage.getItem(branchPreferenceStorageKey(data.uid));
      const initialBranch = saved || data.pharmacyId || null;
      setActiveBranchId(initialBranch);
      pharmacyService.setActivePharmacy(initialBranch);
    } else {
      setActiveBranchId(data.pharmacyId || null);
      pharmacyService.setActivePharmacy(data.pharmacyId || null);
    }
  }

  function finishAuthenticatedSession(data: AppUser) {
    pharmacyService.setCurrentAppUser(data);
    setAppUser(data);
    applyBranchScopeForUser(data);
  }

  useEffect(() => {
    let cancelled = false;

    const processSession = async (
      session: {
        user?: {
          id: string;
          email?: string | null;
          app_metadata?: Record<string, unknown>;
          identities?: Array<{ provider?: string }>;
          user_metadata?: Record<string, unknown>;
        };
      } | null,
    ) => {
      if (cancelled) return;

      const authUser = session?.user;
      const currentUser = authUser
        ? { uid: authUser.id, email: authUser.email || undefined }
        : null;

      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser || !authUser) {
        setAppUser(null);
        setActiveBranchId(null);
        clearSessionNavigationState();
        pharmacyService.setActivePharmacy(null);
        pharmacyService.setCurrentAppUser(null);
        setUserLoading(false);
        setSubscriptionBlocked("");
        return;
      }

      try {
        if (!appUserRef.current) {
          setUserLoading(true);
        }
        setSubscriptionBlocked("");
        let data = await pharmacyService.getAppUserByUid(currentUser.uid);

        if (!data && isBrowserOffline()) {
          data = appUserFromStoredProfile(currentUser.uid);
        }

        if (!data && !isBrowserOffline()) {
          const provisioned = await pharmacyService.ensureTrialPharmacyFromAuth(authUser);
          if (provisioned) {
            data = await pharmacyService.getAppUserByUid(currentUser.uid);
          }
        }

        if (!data) {
          if (isBrowserOffline()) {
            console.warn("[Auth] offline session without cached profile");
          }
          setAppUser(null);
          pharmacyService.setCurrentAppUser(null);
          if (!isBrowserOffline()) {
            await pharmacyService.signOutUser();
            alert(
              isArabic
                ? "هذا المستخدم غير مسجل في نظام الصيدلية"
                : "This user is not registered in the pharmacy system",
            );
          }
          return;
        }

        if (!data.isActive) {
          setAppUser(null);
          pharmacyService.setCurrentAppUser(null);
          await pharmacyService.signOutUser();
          alert(isArabic ? "هذا المستخدم موقوف" : "This user account is inactive");
          return;
        }

        if (!isSuperAdmin(data)) {
          const pharmacyAllowed = await pharmacyService.isPharmacyAccessAllowed(data.pharmacyId);
          if (!pharmacyAllowed) {
            setAppUser(null);
            pharmacyService.setCurrentAppUser(null);
            if (!isBrowserOffline()) {
              await pharmacyService.signOutUser();
              const msg = isArabic
                ? "الصيدلية غير نشطة أو موقوفة. تواصل مع الدعم."
                : "Pharmacy is inactive or suspended. Contact support.";
              setSubscriptionBlocked(msg);
              alert(msg);
            }
            return;
          }
        }

        let linkedUser = data;
        if (!isBrowserOffline()) {
          linkedUser = await pharmacyService.ensureAppUserEmployeeLink(data);
        }
        finishAuthenticatedSession(linkedUser);
        if (!isBrowserOffline()) {
          void pharmacyService.recordLastLogin(data.uid);
        }
      } catch (error) {
        console.error("[Auth] error loading app user", error);
        const offlineUser = appUserFromStoredProfile(currentUser.uid);
        if (isBrowserOffline() && offlineUser?.isActive) {
          finishAuthenticatedSession(offlineUser);
          return;
        }
        setAppUser(null);
        pharmacyService.setCurrentAppUser(null);
        await pharmacyService.signOutUser();
        alert(isArabic ? "حدث خطأ أثناء تحميل بيانات المستخدم" : "Error loading user profile");
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    };

    pharmacyService
      .getAuthSession()
      .then(({ data: { session } }) => processSession(session))
      .catch((error) => {
        console.error("[Auth] getSession failed", error);
        if (!cancelled) {
          setAuthLoading(false);
          setUserLoading(false);
        }
      });

    const authSubscription = pharmacyService.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      window.setTimeout(() => {
        if (!cancelled) void processSession(session);
      }, 0);
    });

    const authTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setAuthLoading(false);
        setUserLoading(false);
      }
    }, 10000);

    return () => {
      cancelled = true;
      window.clearTimeout(authTimeout);
      authSubscription.data?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    accessRevokedRef.current = false;
  }, [appUser?.uid]);

  useEffect(() => {
    syncSentryUser(appUser);
  }, [appUser]);

  useEffect(() => {
    if (!appUser || isBrowserOffline()) return;

    const interval = window.setInterval(() => {
      if (buildAppAuthSession()) return;
      window.setTimeout(() => clearAppAuthSession(), 0);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [appUser?.uid]);

  useEffect(() => {
    const uid = appUser?.uid;
    if (!uid) return;

    let cancelled = false;

    const forceLogout = async () => {
      if (cancelled || accessRevokedRef.current) return;
      accessRevokedRef.current = true;
      setAppUser(null);
      pharmacyService.setCurrentAppUser(null);
      clearSessionNavigationState();
      await pharmacyService.signOutUser();
      alert(
        isArabicRef.current
          ? "تم إنهاء جلستك من قبل مدير النظام"
          : "Your session was ended by the system owner",
      );
    };

    const unsubscribe = pharmacyService.subscribeUserAccessRevocation(uid, () => {
      void forceLogout();
    });

    const interval = window.setInterval(() => {
      if (isBrowserOffline()) return;
      void pharmacyService.isAppUserStillActive(uid).then((active) => {
        if (!active) void forceLogout();
      });
    }, 5000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [appUser?.uid]);

  const handleLogin = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      try {
        setLoginError("");
        setRegisterSuccess("");
        const { error } = await pharmacyService.signInWithUsernameOrEmail(
          loginEmail,
          loginPassword,
        );
        if (error) {
          if (error.message === "username_login_not_configured") {
            setLoginError(
              isArabic
                ? "نظام اسم المستخدم غير مفعّل. شغّل supabase/username-login.sql في Supabase."
                : "Username login not configured. Run supabase/username-login.sql in Supabase.",
            );
            return;
          }
          if (error.message === "jwt_secret_not_configured") {
            setLoginError(
              isArabic
                ? "شغّل supabase/fix-admin-login-now.sql وضع JWT Secret من Supabase → Settings → API"
                : "Run supabase/fix-admin-login-now.sql and set JWT Secret from Supabase → Settings → API",
            );
            return;
          }
          if (error.message === "app_auth_not_deployed") {
            setLoginError(
              isArabic
                ? "دالة تسجيل الدخول غير منشورة. نفّذ: supabase functions deploy app-auth"
                : "Login function not deployed. Run: supabase functions deploy app-auth",
            );
            return;
          }
          if (error.message === "user_inactive") {
            setLoginError(isArabic ? "هذا الحساب موقوف" : "This account is inactive");
            return;
          }
          if (error.message === "invalid_login_identifier") {
            setLoginError(
              isArabic ? "الإيميل أو اسم المستخدم غير موجود" : "Email or username not found",
            );
            return;
          }
          if (error.message === "invalid_credentials") {
            setLoginError(
              isArabic
                ? "الإيميل أو كلمة المرور غير صحيحة. مالك النظام: admin@victory.com — إن فشل الدخول شغّل reset-owner-login.sql في Supabase (وضع JWT Secret)."
                : "Invalid email or password. System owner: admin@victory.com — if login fails, run reset-owner-login.sql in Supabase (set JWT Secret).",
            );
            return;
          }
          throw error;
        }
      } catch (error) {
        console.error(error);
        setLoginError(isArabic ? "بيانات الدخول غير صحيحة" : "Invalid login credentials");
      }
    },
    [isArabic, loginEmail, loginPassword],
  );

  const handleRegister = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoginError("");
      setRegisterSuccess("");
      setRegistering(true);

      try {
        const result = await pharmacyService.registerPublicUser({
          name: registerName,
          pharmacyName: registerPharmacyName,
          email: loginEmail,
          password: loginPassword,
        });

        if (result.needsEmailConfirmation) {
          setRegisterSuccess(
            isArabic
              ? "تم إنشاء الحساب. سجّل الدخول يدوياً بنفس الإيميل وكلمة المرور."
              : "Account created. Sign in manually with the same email and password.",
          );
          setAuthMode("login");
          setLoginPassword("");
          return;
        }

        setRegisterSuccess(
          isArabic
            ? `تم إنشاء الصيدلية والتجربة ${TRIAL_SUBSCRIPTION_DAYS} يوماً — تم تسجيل الدخول`
            : `Pharmacy and ${TRIAL_SUBSCRIPTION_DAYS}-day free trial created — you are signed in`,
        );
      } catch (error) {
        console.error(error);
        const raw = error instanceof Error ? error.message : "";
        setLoginError(
          formatUserCreationError(raw, isArabic) ||
            (isArabic ? "تعذر إنشاء الحساب" : "Could not create account"),
        );
      } finally {
        setRegistering(false);
      }
    },
    [isArabic, loginEmail, loginPassword, registerName, registerPharmacyName],
  );

  const switchAuthMode = useCallback((mode: "login" | "register") => {
    setAuthMode(mode);
    setLoginError("");
    setRegisterSuccess("");
  }, []);

  const handleLogout = useCallback(async () => {
    clearSessionNavigationState();
    await pharmacyService.signOutUser();
  }, []);

  const loginScreenStatus: LoginScreenStatus | null =
    (authLoading && !appUser) || (userLoading && !appUser)
      ? "loading"
      : !user
        ? "login"
        : !appUser
          ? "denied"
          : null;

  const loginFormProps = {
    authMode,
    loginEmail,
    loginPassword,
    registerName,
    registerPharmacyName,
    loginError,
    registerSuccess,
    registering,
    onEmailChange: setLoginEmail,
    onPasswordChange: setLoginPassword,
    onRegisterNameChange: setRegisterName,
    onRegisterPharmacyNameChange: setRegisterPharmacyName,
    onAuthModeChange: switchAuthMode,
    onSubmit: handleLogin,
    onRegisterSubmit: handleRegister,
  };

  return {
    user,
    appUser,
    authLoading,
    userLoading,
    subscriptionBlocked,
    loginScreenStatus,
    loginFormProps,
    handleLogout,
  };
}
