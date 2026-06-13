
import Link from 'next/link'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'

function YouTubeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.6 7.2c-.3-1-1-1.7-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4c-1 .3-1.7 1-2 2C2 9 2 12 2 12s0 3 .4 4.8c.3 1 1 1.7 2 2 1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4c1-.3 1.7-1 2-2C22 15 22 12 22 12s0-3-.4-4.8zM10 15V9l5.2 3L10 15z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22 11 13 2 9z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l1.5-5.5A9 9 0 1 1 8.5 19.5Z" />
      <path d="M9.5 10.5q1 2 3.5 3" />
    </svg>
  )
}

const socialLinks = [
  { label: 'YouTube', Icon: YouTubeIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Telegram', Icon: TelegramIcon },
  { label: 'WhatsApp', Icon: WhatsAppIcon },
]

export default function Footer() {
  return (
    <footer id="footer" className="relative bg-primary text-bg overflow-hidden">
      {/* Logo watermark — swap src to actual logo once available */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="w-[55vw] md:w-[38vw] opacity-[0.05]"
        >
          <circle cx="18" cy="18" r="16" stroke="#f8f9ed" strokeWidth="1.2" />
          <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#f8f9ed" strokeWidth="1" transform="rotate(60 18 18)" />
          <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#f8f9ed" strokeWidth="1" transform="rotate(-60 18 18)" />
          <circle cx="18" cy="18" r="3" fill="#f8f9ed" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-12 pt-20 pb-12">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-14 border-b border-white/10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-20 h-20 shrink-0">
                <ChemistryOctetLogo size={80} />
              </div>
              <span className="text-bg text-lg tracking-wide">
                Chemistry<span className="text-border">@</span>OCTET
              </span>
            </div>
            <p className="text-border text-[15px] leading-relaxed mb-7">
              Where curiosity meets chemistry. We make 11th and 12th grade chemistry the subject your child masters.
            </p>
            <p className="text-accent1 text-[14px] tracking-[0.2em] uppercase">✦ Spread True Science ✦</p>
          </div>

          {/* Courses */}
          <div>
            <h4 className="text-bg text-base tracking-wider uppercase mb-7">Courses</h4>
            <ul className="space-y-4">
              {['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry', 'JEE Preparation', 'NEET Preparation', 'Board Excellence'].map((c) => (
                <li key={c}>
                  <a href="#courses" className="text-border text-[15px] hover:text-bg transition-colors duration-150">
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-bg text-base tracking-wider uppercase mb-7">Quick Links</h4>
            <ul className="space-y-4">
              {[
                { label: 'About Us', href: '#about' },
                { label: 'Our Results', href: '#reviews' },
                { label: 'Demo Video', href: '#video' },
                { label: 'Student Login', href: '/login' },
                { label: 'Register', href: '/register' },
                { label: 'Admin Login', href: '/admin' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-border text-[15px] hover:text-bg transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-bg text-base tracking-wider uppercase mb-7">Connect</h4>
            <ul className="space-y-5 mb-9">
              <li className="flex items-center gap-3.5 text-border text-[15px]">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 16 16" fill="none">
                  <path d="M 2,4 Q 8,9 14,4 M 2,4 L 2,13 L 14,13 L 14,4 Z" stroke="#c8b8d8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                hello@chemistryoctet.in
              </li>
              <li className="flex items-center gap-3.5 text-border text-[15px]">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 16 16" fill="none">
                  <path d="M 5,2 Q 3,2 2,4 Q 1,6 2,8 Q 4,12 8,14 Q 10,15 12,14 Q 14,13 14,11 Q 14,10 12,9 L 10,8 Q 9,8 9,9 Q 9,10 8,10 Q 5,9 6,6 Q 6,5 7,5 Q 8,5 8,4 L 7,2 Z" stroke="#c8b8d8" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                +91 98765 43210
              </li>
            </ul>

            <h4 className="text-bg text-base tracking-wider uppercase mb-5">Follow Us</h4>
            <div className="flex gap-3 flex-wrap">
              {socialLinks.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#footer"
                  aria-label={label}
                  className="w-12 h-12 rounded-xl border border-white/15 flex items-center justify-center text-border hover:bg-white/10 hover:text-bg transition-colors duration-200"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 pt-10">
          <p className="text-muted text-[14px]">
            © 2024 Chemistry@OCTET. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map((link) => (
              <a key={link} href="#footer" className="text-muted text-[14px] hover:text-bg transition-colors duration-150">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
