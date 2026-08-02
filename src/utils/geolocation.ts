export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function getCurrentGeoPosition(options?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
}): Promise<GeoPosition> {
  const timeoutMs = options?.timeoutMs ?? 12_000;
  const maximumAgeMs = options?.maximumAgeMs ?? 5_000;

  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error("geolocation_unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("location_permission_denied"));
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new Error("location_timeout"));
          return;
        }
        reject(new Error("location_unavailable"));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    );
  });
}

export function formatGeolocationError(code: string, isArabic: boolean): string {
  const map: Record<string, [string, string]> = {
    geolocation_unsupported: [
      "المتصفح لا يدعم تحديد الموقع",
      "Geolocation is not supported in this browser",
    ],
    location_permission_denied: [
      "تم رفض إذن الموقع — فعّله من إعدادات المتصفح",
      "Location permission denied — enable it in browser settings",
    ],
    location_timeout: [
      "انتهت مهلة تحديد الموقع — حاول مرة أخرى في مكان مفتوح",
      "Location request timed out — try again with clear sky view",
    ],
    location_unavailable: [
      "تعذر قراءة الموقع — تأكد من تفعيل GPS",
      "Could not read location — ensure GPS is enabled",
    ],
  };
  const pair = map[code];
  if (pair) return isArabic ? pair[0] : pair[1];
  return code;
}
