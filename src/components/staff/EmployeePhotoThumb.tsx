type EmployeePhotoThumbProps = {
  photoBase64?: string;
  name: string;
  variant?: "table" | "form";
};

export function EmployeePhotoThumb({
  photoBase64,
  name,
  variant = "table",
}: EmployeePhotoThumbProps) {
  const className =
    variant === "form" ? "employeePhotoThumb employeePhotoThumbForm" : "employeePhotoThumb";
  const placeholderClassName =
    variant === "form"
      ? "employeePhotoPlaceholder employeePhotoPlaceholderForm"
      : "employeePhotoPlaceholder";

  if (photoBase64) {
    return <img src={photoBase64} alt="" className={className} />;
  }
  const initial = name.trim().charAt(0) || "?";
  return <span className={placeholderClassName}>{initial}</span>;
}

export function readEmployeePhotoFile(
  file: File | null,
  isArabic: boolean,
  onLoad: (dataUrl: string) => void,
) {
  if (!file) return;
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    alert(
      isArabic ? "يرجى اختيار صورة PNG أو JPG أو WebP" : "Please choose a PNG, JPG, or WebP image",
    );
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert(
      isArabic
        ? "حجم الصورة كبير. الحد الأقصى 2 ميجابايت"
        : "Image is too large. Maximum size is 2 MB",
    );
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result || ""));
  reader.onerror = () => alert(isArabic ? "تعذر قراءة الصورة" : "Could not read the image");
  reader.readAsDataURL(file);
}
