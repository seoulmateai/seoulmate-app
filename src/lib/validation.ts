// Copied from seoulmate/lib/validation/onboarding.ts and inquiry.ts.
import { z } from "zod";

function todayKst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "Please enter a nickname.")
  .max(30, "Nickname must be 30 characters or fewer.");

export const onboardingSchema = z.object({
  nickname: nicknameSchema,
  birthDate: z
    .iso.date("Please enter your date of birth.")
    .refine((date) => date >= "1900-01-01" && date <= todayKst(), "Please enter a valid date of birth."),
  termsAgreed: z.boolean().refine((value) => value, "You must agree to the Terms of Service."),
  privacyAgreed: z.boolean().refine((value) => value, "You must agree to the Privacy Policy."),
  marketingAgreed: z.boolean(),
});

export type OnboardingValues = z.output<typeof onboardingSchema>;

export const INQUIRY_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "ACCOUNT", label: "Account" },
  { value: "BUG", label: "Bug report" },
  { value: "CHARACTER", label: "Characters" },
  { value: "SUGGESTION", label: "Suggestion" },
  { value: "OTHER", label: "Other" },
] as const;

export const inquirySchema = z.object({
  email: z.email("Please enter a valid email.").max(255),
  category: z.enum(INQUIRY_CATEGORIES.map((category) => category.value)),
  title: z.string().trim().min(1, "Please enter a title.").max(100, "Title must be 100 characters or fewer."),
  content: z
    .string()
    .trim()
    .min(1, "Please describe your inquiry.")
    .max(3000, "Message must be 3000 characters or fewer."),
});

export type InquiryValues = z.infer<typeof inquirySchema>;
