"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChemistryOctetLogo from "@/components/ui/ChemistryOctetLogo";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/apiClient";
import StarRating from "@/components/shared/StarRating";

type FeedbackType = "bug" | "suggestion" | "general";

const TYPE_COPY: Record<FeedbackType, { subtitle: string; placeholder: string; thanks: string }> = {
  bug: {
    subtitle: "Spotted a problem in the PDF notes? Tell us what went wrong.",
    placeholder: "What went wrong with the PDF?",
    thanks: "We’ve received your bug report on the PDF notes.",
  },
  suggestion: {
    subtitle: "Have an idea to make the PDF notes better? We’re listening.",
    placeholder: "How can we improve the PDF notes?",
    thanks: "We’ve received your suggestion for the PDF notes.",
  },
  general: {
    subtitle: "Rate your experience and share anything about classes, teaching or the app.",
    placeholder: "Share your comments about classes, teaching, doubts sessions, the app…",
    thanks: "Your feedback and rating have been sent to your teacher.",
  },
};

export default function FeedbackPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [rating, setRating] = useState<number | null>(null);
  const [details, setDetails] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.replace("/login");
        return;
      }
      const user = session.user;
      setUserId(user.id);
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Student";
      setUserName(name);
      setIsLoadingUser(false);
    };
    fetchUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!userId) {
      setError("You must be logged in.");
      setIsSubmitting(false);
      return;
    }
    if (feedbackType === "general" && !rating) {
      setError("Please give a star rating.");
      setIsSubmitting(false);
      return;
    }
    if (!details.trim()) {
      setError("Please describe your feedback.");
      setIsSubmitting(false);
      return;
    }

    try {
      await authedFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          type: feedbackType,
          details: details.trim(),
          rating: feedbackType === "general" ? rating : undefined,
        }),
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#5e4075]/30 border-t-[#5e4075] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f0f2f5] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT: Animated Logo + Text */}
        <div className="w-full md:w-2/5 bg-white flex flex-col items-center justify-center p-8">
          <div className="animate-pulse-slow">
            <ChemistryOctetLogo size={180} background="transparent" />
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-bold text-gray-800 tracking-tight">
              Chemistry<span className="font-light text-gray-500">@</span>OCTET
            </p>
            <p className="text-sm text-gray-500 mt-1">Spread True Science</p>
          </div>
        </div>

        {/* RIGHT: Simple Form */}
        <div className="w-full md:w-3/5 p-8 bg-white">
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Thank you!</h3>
              <p className="text-gray-500 mt-1 text-center">{TYPE_COPY[feedbackType].thanks}</p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setDetails("");
                  setRating(null);
                  setFeedbackType("bug");
                  setError(null);
                }}
                className="mt-6 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Feedback</h2>
              <p className="text-gray-500 text-sm mb-6">{TYPE_COPY[feedbackType].subtitle}</p>

              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name - disabled auto-filled */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</label>
                  <input
                    type="text"
                    value={userName}
                    disabled
                    className="w-full mt-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Type toggle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "bug", label: "Bug" },
                      { value: "suggestion", label: "Suggestion" },
                      { value: "general", label: "General" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setFeedbackType(opt.value); setError(null); }}
                        aria-pressed={feedbackType === opt.value}
                        className={`py-2 rounded-lg border text-sm font-medium transition ${
                          feedbackType === opt.value
                            ? "bg-[#5e4075] text-white border-[#5e4075]"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating — General feedback only */}
                {feedbackType === "general" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Your rating</label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <StarRating value={rating} onChange={setRating} size={28} showLabel />
                    </div>
                  </div>
                )}

                {/* Details textarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{feedbackType === "general" ? "Comments" : "Details"}</label>
                  <textarea
                    required
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={TYPE_COPY[feedbackType].placeholder}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5e4075] focus:ring-1 focus:ring-[#5e4075] resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#5e4075] text-white font-semibold rounded-lg hover:bg-[#4b3260] transition disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Send feedback"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}