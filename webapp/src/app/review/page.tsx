import { ReviewExperience } from "@/components/review-experience";
import { isAuthConfigured } from "@/lib/auth/enabled";

export default function ReviewPage() {
  return (
    <main className="page shell">
      <p className="eyebrow">今天的复习</p>
      <h1 className="page-title">复习</h1>
      <p className="lede">不用追赶进度。回到今天刚好需要再见一面的内容。</p>
      <ReviewExperience authEnabled={isAuthConfigured()} />
    </main>
  );
}
