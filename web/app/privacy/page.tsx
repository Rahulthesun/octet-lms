import type { Metadata } from 'next'
import LegalPage, { LegalSection } from '@/components/landing/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy — Chemistry@OCTET',
  description: 'How the Chemistry@OCTET learning portal collects, uses and protects your information.',
}

const CONTACT = 'hello@chemistryoctet.in'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="26 October 2026">
      <LegalSection title="Who we are">
        <p>
          Chemistry@OCTET (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs this website and the student learning portal used by
          students enrolled in our chemistry classes, and by our teaching staff. This policy explains what information
          the portal collects, why, and what control you have over it.
        </p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <ul>
          <li>
            <strong>Admission details</strong> you give us when you apply: name, email, phone number, date of birth,
            school and class details, parent or guardian contact details, and any documents you upload.
          </li>
          <li>
            <strong>Learning records</strong> created while you use the portal: attendance, test answers and marks,
            which lessons and notes you open, and exam documents (hall tickets, marksheets) you upload.
          </li>
          <li>
            <strong>Account and device information</strong> needed to keep your account secure, such as sign-in times.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Google account data">
        <p>The portal offers two optional &ldquo;Sign in with Google&rdquo; connections:</p>
        <ul>
          <li>
            <strong>Students — link your Google account.</strong> We request only your basic Google identity (the
            <code> openid</code> and <code>email</code> permissions). We store your Google account ID and email address
            so that when you join an online class on Google Meet, your attendance is recorded against your student
            account. We do not store any Google access token and we never access your Gmail, Drive, Calendar or
            contacts. You can unlink your Google account at any time from your Profile page.
          </li>
          <li>
            <strong>Teaching staff — connect a Google account to run online classes.</strong> With the
            <code> calendar.events</code> permission we create, update and cancel the class events (with their Google
            Meet links) that staff schedule in the portal. With the <code>meetings.space.readonly</code> permission we
            read the participant list and join/leave times of those class meetings to calculate attendance. Access
            tokens are stored encrypted on our server and are never shared with students or third parties.
          </li>
        </ul>
        <p>
          Our use of information received from Google APIs adheres to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Google data is used only to provide the features described above,
          is not used for advertising, is not sold, and is not used to train AI models.
        </p>
      </LegalSection>

      <LegalSection title="How we use your information">
        <ul>
          <li>To run classes, tests, attendance and online lessons for enrolled students.</li>
          <li>To send you notices about classes, tests, results and documents by email and in the portal.</li>
          <li>To share progress and attendance reports with your parent or guardian.</li>
          <li>To keep the portal secure and prevent misuse of course material.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>
          We do not sell your information. It is shared only with the service providers that host and operate the
          portal on our behalf (database hosting, file storage, email delivery and Google for online classes), and only
          as far as needed to provide the service, or where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="Retention and your choices">
        <p>
          We keep student records while you are enrolled and for as long as needed for academic records afterwards.
          You can ask to see, correct or delete your information, or unlink your Google account, by writing to{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Removing Google access is also possible at any time from{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            your Google account permissions
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
