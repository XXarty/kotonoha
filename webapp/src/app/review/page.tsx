import { ReviewExperience } from "@/components/review-experience";
import { isAuthConfigured } from "@/lib/auth/enabled";

export default function ReviewPage() {
  return (
    <main className="page shell">
      <p className="eyebrow">Review queue</p>
      <h1 className="page-title">复习</h1>
      <ReviewExperience authEnabled={isAuthConfigured()} />
    </main>
  );
}
