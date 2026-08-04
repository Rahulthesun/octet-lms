'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AtomSVG, CompoundSVG } from '@/components/ui/PencilSVGs'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [marksheet, setMarksheet] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 7;

  const [form, setForm] = useState({
    // Student
    name: '',
    email: '',
    date_of_birth: '',
    mobile: '',
    whatsapp_number: '',
    telegram_number: '',

    // Academic
    tenth_school: '',
    tenth_score: '',
    grade: '',
    school_college: '',
    subjects: '',
    maths_tuition: '',
    physics_tuition: '',
    other_tuition: '',
    neet_jee_details: '',
    future_plan: '',

    batch: '',
    learning_mode: '',

    // Father
    father_name: '',
    father_mobile: '',
    father_whatsapp: '',
    father_telegram: '',
    father_email: '',
    father_profession: '',

    // Mother
    mother_name: '',
    mother_mobile: '',
    mother_whatsapp: '',
    mother_telegram: '',
    mother_email: '',
    mother_profession: '',

    // Address
    address: '',
    landmark: '',
    city: '',
    pincode: '',

    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (form.password !== form.confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      if (!form.batch) {
        alert("Please select a batch");
        return;
      }

      if (!form.learning_mode) {
        alert("Please select a learning mode");
        return;
      }
      if (!idCard) {
        alert("Please upload your 10th ID Card");
        return;
      }

      if (!marksheet) {
        alert("Please upload your 10th Marksheet");
        return;
      }

      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("email", form.email);

      formData.append("date_of_birth", form.date_of_birth);

      formData.append("mobile_number", form.mobile);
      formData.append("whatsapp_number", form.whatsapp_number);
      formData.append("telegram_number", form.telegram_number);

      formData.append("tenth_school", form.tenth_school);
      formData.append("tenth_score", form.tenth_score);

      formData.append("class_grade", form.grade);
      formData.append("school_college", form.school_college);

      formData.append("subjects", form.subjects);

      formData.append("maths_tuition", form.maths_tuition);
      formData.append("physics_tuition", form.physics_tuition);
      formData.append("other_tuition", form.other_tuition);

      formData.append("neet_jee_details", form.neet_jee_details);

      formData.append("future_plan", form.future_plan);

      formData.append("preferred_batch", form.batch);
      formData.append("learning_mode", form.learning_mode);

      formData.append("father_name", form.father_name);
      formData.append("father_mobile", form.father_mobile);
      formData.append("father_whatsapp", form.father_whatsapp);
      formData.append("father_telegram", form.father_telegram);
      formData.append("father_email", form.father_email);
      formData.append("father_profession", form.father_profession);

      formData.append("mother_name", form.mother_name);
      formData.append("mother_mobile", form.mother_mobile);
      formData.append("mother_whatsapp", form.mother_whatsapp);
      formData.append("mother_telegram", form.mother_telegram);
      formData.append("mother_email", form.mother_email);
      formData.append("mother_profession", form.mother_profession);

      formData.append("address", form.address);
      formData.append("landmark", form.landmark);
      formData.append("city", form.city);
      formData.append("pincode", form.pincode);

      // Required documents
      formData.append("id_card", idCard!);
      formData.append("marksheet", marksheet!);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/students`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      alert("Application submitted successfully!");

      router.push("/login");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#c8b8d8] bg-[#fdfcf8] text-[#5e4075] text-base placeholder:text-[#c8b8d8] focus:outline-none focus:border-[#5e4075]/60 focus:ring-2 focus:ring-[#5e4075]/10 transition-all duration-200"

  const goNext = (validate?: () => string | null) => {
    if (validate) {
      const error = validate();
      if (error) {
        alert(error);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* Left panel — single pastel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden"
        style={{ backgroundColor: '#d4c5e2' }}
      >
        <div className="absolute top-8 left-8 opacity-15">
          <CompoundSVG width={220} height={160} color="#5e4075" />
        </div>
        <div className="absolute bottom-8 right-8 opacity-15">
          <AtomSVG width={180} height={180} color="#5e4075" />
        </div>

        <div className="relative z-10 max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-8 flex items-center justify-center">
            <svg className="w-12 h-12 opacity-25" viewBox="0 0 48 48" fill="none">
              <path d="M 8,32 Q 6,20 16,14 Q 20,12 22,14 L 20,20 Q 16,22 16,28 L 22,28 L 22,40 L 8,40 Z" fill="#5e4075" />
              <path d="M 28,32 Q 26,20 36,14 Q 40,12 42,14 L 40,20 Q 36,22 36,28 L 42,28 L 42,40 L 28,40 Z" fill="#5e4075" />
            </svg>
          </div>
          <blockquote className="text-primary text-xl md:text-2xl leading-relaxed mb-6">
            Chemistry isn&apos;t just a subject — it&apos;s the language the universe whispers its secrets in.
          </blockquote>
          <p className="text-muted text-base tracking-wider">— Chemistry@OCTET</p>
          <div className="mt-8 grid grid-cols-3 gap-5 pt-8 border-t border-primary/10">
            {[
              { num: '500+', label: 'Video Lectures' },
              { num: '2000+', label: 'Students' },
              { num: '92%', label: 'Score 85+' },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <p className="text-primary text-xl font-mono">{num}</p>
                <p className="text-muted text-[14px] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right panel — register form */}
      <div className="w-full lg:w-1/2 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-3.5 border-b border-accent1 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-11 h-11 shrink-0">
              <ChemistryOctetLogo size={44} />
            </div>
            <span className="text-primary text-base">Chemistry<span className="text-muted">@</span>OCTET</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-muted text-base hover:text-primary transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-7">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-xl text-primary">Create your account</h1>
                <span className="text-muted text-[13px]">Step {step} of {TOTAL_STEPS}</span>
              </div>
              <p className="text-muted text-[15px] mb-3">Start your chemistry journey today</p>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-accent3/40 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                />
              </div>

              <form onSubmit={handleRegister} className="space-y-4">

                {/* ---------------- STEP 1 : Student basics ---------------- */}
                {step === 1 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">Student Details</h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Full Name</label>
                      <input
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Arjun Sharma"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Email Address</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@email.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Date of Birth</label>
                      <input
                        name="date_of_birth"
                        type="date"
                        value={form.date_of_birth}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mobile Number</label>
                      <input
                        name="mobile"
                        type="tel"
                        value={form.mobile}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">WhatsApp Number</label>
                      <input
                        name="whatsapp_number"
                        type="tel"
                        value={form.whatsapp_number}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Telegram Number</label>
                      <input
                        name="telegram_number"
                        type="tel"
                        value={form.telegram_number}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        goNext(() => {
                          if (!form.name) return "Enter your name";
                          if (!form.email) return "Enter your email";
                          if (!form.mobile) return "Enter your mobile number";
                          return null;
                        })
                      }
                      className="w-full py-3 bg-primary text-white rounded-xl"
                    >
                      Next →
                    </button>
                  </>
                )}

                {/* ---------------- STEP 2 : Academic ---------------- */}
                {step === 2 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">Academic Details</h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">10th School</label>
                      <input
                        name="tenth_school"
                        type="text"
                        value={form.tenth_school}
                        onChange={handleChange}
                        placeholder="School name"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">10th Score (%)</label>
                      <input
                        name="tenth_score"
                        type="text"
                        value={form.tenth_score}
                        onChange={handleChange}
                        placeholder="e.g. 92%"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Current Grade</label>
                      <select
                        name="grade"
                        value={form.grade}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">Select your grade</option>
                        <option value="11">11th Grade</option>
                        <option value="12">12th Grade</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Current School</label>
                      <input
                        name="school_college"
                        type="text"
                        value={form.school_college}
                        onChange={handleChange}
                        placeholder="School"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Subjects</label>
                      <input
                        name="subjects"
                        type="text"
                        value={form.subjects}
                        onChange={handleChange}
                        placeholder="Physics, Chemistry, Maths..."
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Future Plan</label>
                      <input
                        name="future_plan"
                        type="text"
                        value={form.future_plan}
                        onChange={handleChange}
                        placeholder="e.g. Engineering, Medicine..."
                        className={inputClass}
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-1/2 py-3 border border-primary rounded-xl text-primary"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          goNext(() => {
                            if (!form.grade) return "Select your grade";
                            return null;
                          })
                        }
                        className="w-1/2 py-3 bg-primary text-white rounded-xl"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 3 : Tuition / Batch ---------------- */}
                {step === 3 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">Tuition & Batch Preference</h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Math Tuition</label>
                      <input
                        name="maths_tuition"
                        type="text"
                        value={form.maths_tuition}
                        onChange={handleChange}
                        placeholder="Tutor / institute name (if any)"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Physics Tuition</label>
                      <input
                        name="physics_tuition"
                        type="text"
                        value={form.physics_tuition}
                        onChange={handleChange}
                        placeholder="Tutor / institute name (if any)"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Other Tuition</label>
                      <input
                        name="other_tuition"
                        type="text"
                        value={form.other_tuition}
                        onChange={handleChange}
                        placeholder="Any other tuition"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">NEET / JEE Details</label>
                      <input
                        name="neet_jee_details"
                        type="text"
                        value={form.neet_jee_details}
                        onChange={handleChange}
                        placeholder="Target exam / attempt year"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Preferred Batch</label>
                      <select
                        name="batch"
                        value={form.batch}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">Select Batch</option>
                        <option value="MORNING">Morning</option>
                        <option value="EVENING">Evening</option>
                        <option value="NIGHT">Night</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Learning Mode</label>
                      <select
                        name="learning_mode"
                        value={form.learning_mode}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">Select Mode</option>
                        <option value="OFFLINE">Offline</option>
                        <option value="ONLINE">Online</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-1/2 py-3 border border-primary rounded-xl text-primary"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          goNext(() => {
                            if (!form.batch) return "Select your batch";
                            if (!form.learning_mode) return "Select learning mode";
                            return null;
                          })
                        }
                        className="w-1/2 py-3 bg-primary text-white rounded-xl"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 4 : Father ---------------- */}
                {step === 4 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">Father&apos;s Details</h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Father&apos;s Name</label>
                      <input
                        name="father_name"
                        type="text"
                        value={form.father_name}
                        onChange={handleChange}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Father&apos;s Mobile</label>
                      <input
                        name="father_mobile"
                        type="tel"
                        value={form.father_mobile}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Father&apos;s WhatsApp</label>
                      <input
                        name="father_whatsapp"
                        type="tel"
                        value={form.father_whatsapp}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Father&apos;s Telegram</label>
                      <input
                        name="father_telegram"
                        type="tel"
                        value={form.father_telegram}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Father&apos;s Email</label>
                      <input
                        name="father_email"
                        type="email"
                        value={form.father_email}
                        onChange={handleChange}
                        placeholder="father@email.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Father&apos;s Profession</label>
                      <input
                        name="father_profession"
                        type="text"
                        value={form.father_profession}
                        onChange={handleChange}
                        placeholder="Occupation"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-1/2 py-3 border border-primary rounded-xl text-primary"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => goNext()}
                        className="w-1/2 py-3 bg-primary text-white rounded-xl"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 5 : Mother ---------------- */}
                {step === 5 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">Mother&apos;s Details</h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mother&apos;s Name</label>
                      <input
                        name="mother_name"
                        type="text"
                        value={form.mother_name}
                        onChange={handleChange}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mother&apos;s Mobile</label>
                      <input
                        name="mother_mobile"
                        type="tel"
                        value={form.mother_mobile}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mother&apos;s WhatsApp</label>
                      <input
                        name="mother_whatsapp"
                        type="tel"
                        value={form.mother_whatsapp}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mother&apos;s Telegram</label>
                      <input
                        name="mother_telegram"
                        type="tel"
                        value={form.mother_telegram}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mother&apos;s Email</label>
                      <input
                        name="mother_email"
                        type="email"
                        value={form.mother_email}
                        onChange={handleChange}
                        placeholder="mother@email.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Mother&apos;s Profession</label>
                      <input
                        name="mother_profession"
                        type="text"
                        value={form.mother_profession}
                        onChange={handleChange}
                        placeholder="Occupation"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-1/2 py-3 border border-primary rounded-xl text-primary"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => goNext()}
                        className="w-1/2 py-3 bg-primary text-white rounded-xl"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 6 : Address + Password ---------------- */}
                {step === 6 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">Address & Account Security</h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Address</label>
                      <input
                        name="address"
                        type="text"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="House no, street, area"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Landmark</label>
                      <input
                        name="landmark"
                        type="text"
                        value={form.landmark}
                        onChange={handleChange}
                        placeholder="Nearby landmark"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">City</label>
                      <input
                        name="city"
                        type="text"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="City"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">Pincode</label>
                      <input
                        name="pincode"
                        type="text"
                        value={form.pincode}
                        onChange={handleChange}
                        placeholder="600001"
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-primary text-[15px] mb-1">Password</label>
                        <input
                          name="password"
                          type="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-primary text-[15px] mb-1">Confirm</label>
                        <input
                          name="confirmPassword"
                          type="password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-1/2 py-3 border border-primary rounded-xl text-primary"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          goNext(() => {
                            if (!form.password) return "Enter password";
                            if (form.password !== form.confirmPassword)
                              return "Passwords do not match";
                            return null;
                          })
                        }
                        className="w-1/2 py-3 bg-primary text-white rounded-xl"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* ---------------- STEP 7 : Documents ---------------- */}
                {step === 7 && (
                  <>
                    <h2 className="text-lg font-semibold text-primary">
                      Upload Required Documents
                    </h2>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">
                        10th ID Card *
                      </label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setIdCard(e.target.files?.[0] || null)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-primary text-[15px] mb-1">
                        10th Marksheet *
                      </label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setMarksheet(e.target.files?.[0] || null)}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-1/2 py-3 border border-primary rounded-xl text-primary"
                      >
                        ← Back
                      </button>

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileTap={{ scale: 0.98 }}
                        className="w-1/2 py-3 bg-primary text-white rounded-xl"
                      >
                        {loading ? "Submitting..." : "Submit Application"}
                      </motion.button>
                    </div>
                  </>
                )}

              </form>

              <p className="text-muted text-[15px] text-center mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}