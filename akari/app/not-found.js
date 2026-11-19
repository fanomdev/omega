import Link from "next/link";
import TopBar from "@/components/TopBar";

export default function NotFound() {
  return (
    <main className="page">
      <TopBar />
      <div className="error-box">
        <b>404 — this page wandered off panel</b>
        The page you’re looking for doesn’t exist or was moved.
        <div style={{ marginTop: 16 }}><Link href="/" className="hero-cta">Back to suggestions</Link></div>
      </div>
    </main>
  );
}
