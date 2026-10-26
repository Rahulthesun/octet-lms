import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/landing/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service — Chemistry@OCTET',
  description: 'Terms for using the Chemistry@OCTET website and student learning portal.',
}

const CONTACT = 'hello@chemistryoctet.in'

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="26 October 2026">
      <LegalSection title="Using the portal">
        <p>
          The Chemistry@OCTET learning portal is provided to enrolled students and our teaching staff. By signing in you
          agree to these terms. Your account is personal: do not share your login, and tell us straight away if you
          think someone else has used it.
        </p>
      </LegalSection>

      <LegalSection title="Course material">
        <p>
          Videos, notes, tests and other material in the portal belong to Chemistry@OCTET and are for your own study
          only. Do not copy, record, download, share or sell them. Material is watermarked, and misuse can lead to your
          access being suspended.
        </p>
      </LegalSection>

      <LegalSection title="Tests, attendance and documents">
        <p>
          Take tests honestly and on your own. Attendance is recorded by scanning the class QR code yourself or, for
          online classes, from Google Meet participation. Documents you upload, such as hall tickets and marksheets,
          must be genuine.
        </p>
      </LegalSection>

      <LegalSection title="Google sign-in">
        <p>
          Linking a Google account is optional and is used only as described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>. You can unlink it at any time.
        </p>
      </LegalSection>

      <LegalSection title="Access ending">
        <p>
          Portal access normally ends when you graduate or leave the course. We may suspend access for misuse of the
          portal or of course material.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms; the date above shows the latest version. Questions:{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
