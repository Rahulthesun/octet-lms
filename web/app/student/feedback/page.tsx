"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChemistryOctetLogo from "@/components/ui/ChemistryOctetLogo";
import { supabase } from "@/lib/supabase/client";

export default function FeedbackPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"bug" | "suggestion">("bug");
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
    if (!details.trim()) {
      setError("Please describe your feedback.");
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: userId,
      type: feedbackType,
      area: "pdf",
      details: details.trim(),
    });

    if (insertError) {
      console.error(insertError);
      setError("Failed to submit. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#4B2D8F]/30 border-t-[#4B2D8F] rounded-full animate-spin" />
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
              <p className="text-gray-500 mt-1 text-center">We’ve received your feedback on the PDF notes.</p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setDetails("");
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
              <p className="text-gray-500 text-sm mb-6">PDF notes only – let us know what you think.</p>

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

                {/* Type toggle - simplified two buttons (no emojis removed? Actually they are still there; we'll remove emojis as requested earlier but user didn't repeat. Keep as is or remove? I'll remove emojis per previous instruction) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Type</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFeedbackType("bug")}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                        feedbackType === "bug"
                          ? "bg-[#4B2D8F] text-white border-[#4B2D8F]"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Bug
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType("suggestion")}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                        feedbackType === "suggestion"
                          ? "bg-[#4B2D8F] text-white border-[#4B2D8F]"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Suggestion
                    </button>
                  </div>
                </div>

                {/* Details textarea */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Details</label>
                  <textarea
                    required
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={feedbackType === "bug" ? "What went wrong with the PDF?" : "How can we improve the PDF notes?"}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#4B2D8F] focus:ring-1 focus:ring-[#4B2D8F] resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#4B2D8F] text-white font-semibold rounded-lg hover:bg-[#3d2475] transition disabled:opacity-60"
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