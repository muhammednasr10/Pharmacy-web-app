import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import { TRIAL_SUBSCRIPTION_DAYS } from "../config/subscription";
import { branchPreferenceStorageKey } from "../constants/branches";
import { clearSessionNavigationState } from "../utils/sessionNavigation";
import { formatUserCreationError } from "../utils/userCreationErrors";
import { isAccountant, isOrgPharmacyAdmin, isSuperAdmin } from "../utils/roles";
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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerName, setRegisterName] = useState("");
  const [registerPharmacyName, setRegisterPharmacyName] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registering, setRegistering] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState("");
  const accessRevokedRef = useRef(false);

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
        setUserLoading(true);
        setSubscriptionBlocked("");
        let data = await pharmacyService.getAppUserByUid(currentUser.uid);

        if (!data) {
          const provisioned = await pharmacyService.ensureTrialPharmacyFromAuth(authUser);
          if (provisioned) {
            data = await pharmacyService.getAppUserByUid(currentUser.uid);
          }
        }

        if (!data && pharmacyService.getAuthProvider(authUser) === "google") {
          data = await pharmacyService.ensureGoogleAppUser(authUser);
        }

        if (!data) {
          setAppUser(null);
          pharmacyService.setCurrentAppUser(null);
          await pharmacyService.signOutUser();
          alert(
            isArabic
              ? "هذا المستخدم غير مسجل في نظام الصيدلية"
              : "This user is not registered in the pharmacy system",
          );
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
            await pharmacyService.signOutUser();
            const msg = isArabic
              ? "الصيدلية غير نشطة أو انتهت الفترة التجريبية/الاشتراك. تواصل مع الدعم أو جدّد الاشتراك."
              : "Pharmacy is inactive or the trial/subscription has ended. Contact support or renew.";
            setSubscriptionBlocked(msg);
            alert(msg);
            return;
          }
        }

        const linkedUser = await pharmacyService.ensureAppUserEmployeeLink(data);
        pharmacyService.setCurrentAppUser(linkedUser);
        setAppUser(linkedUser);
        void pharmacyService.recordLastLogin(data.uid);

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
      } catch (error) {
        console.error("[Auth] error loading app user", error);
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
      void processSession(session);
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
        isArabic
          ? "تم إنهاء جلستك من قبل مدير النظام"
          : "Your session was ended by the system owner",
      );
    };

    const unsubscribe = pharmacyService.subscribeUserAccessRevocation(uid, () => {
      void forceLogout();
    });

    const interval = window.setInterval(() => {
      void pharmacyService.isAppUserStillActive(uid).then((active) => {
        if (!active) void forceLogout();
      });
    }, 5000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [appUser?.uid, isArabic]);

  const handleGoogleSignIn = useCallback(async () => {
    setLoginError("");
    setRegisterSuccess("");
    setGoogleLoading(true);

    try {
      const { error } = await pharmacyService.signInWithGoogle();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(error);
      setGoogleLoading(false);
      setLoginError(
        isArabic
          ? "تعذر الدخول عبر Google. تأكد من تفعيل Google في Supabase → Authentication → Providers."
          : "Google sign-in failed. Enable Google in Supabase → Authentication → Providers.",
      );
    }
  }, [isArabic]);

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
              ? `تم إنشاء الحساب. أكّد بريدك ثم سجّل الدخول لتفعيل التجربة المجانية ${TRIAL_SUBSCRIPTION_DAYS} يوماً.`
              : `Account created. Confirm your email, then sign in to start your ${TRIAL_SUBSCRIPTION_DAYS}-day free trial.`,
          );
          setAuthMode("login");
          setLoginPassword("");
          return;
        }

        setRegisterSuccess(
          isArabic
            ? `تم إنشاء الصيدلية والتجربة ${TRIAL_SUBSCRIPTION_DAYS} يوماً — جاري الدخول...`
            : `Pharmacy and ${TRIAL_SUBSCRIPTION_DAYS}-day free trial created — signing in...`,
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
    authLoading || userLoading ? "loading" : !user ? "login" : !appUser ? "denied" : null;

  const loginFormProps = {
    authMode,
    loginEmail,
    loginPassword,
    registerName,
    registerPharmacyName,
    loginError,
    registerSuccess,
    registering,
    googleLoading,
    onEmailChange: setLoginEmail,
    onPasswordChange: setLoginPassword,
    onRegisterNameChange: setRegisterName,
    onRegisterPharmacyNameChange: setRegisterPharmacyName,
    onAuthModeChange: switchAuthMode,
    onSubmit: handleLogin,
    onRegisterSubmit: handleRegister,
    onGoogleSignIn: () => void handleGoogleSignIn(),
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
