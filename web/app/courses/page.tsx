'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { IconCheck } from '@/components/ui/SvgIcons'
import { AtomSVG, FlaskSVG, BeakerSVG, CompoundSVG } from '@/components/ui/PencilSVGs'

// ─── Types ────────────────────────────────────────────────────────────────────

type Chapter = {
  number: number
  title: string
  topics: string[]
  domain?: string
}

type Course = {
  id: string
  navLabel: string
  label: string
  tagline: string
  description: string
  boards: string
  accentBg: string
  accentBorder: string
  stats: { value: string; label: string }[]
  chapters: Chapter[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const courses: Course[] = [
  {
    id: 'grade-11',
    navLabel: '11th Grade',
    label: '11th Grade Chemistry',
    tagline: 'Build the foundation that makes everything else click.',
    description:
      'Covers all NCERT and state board chapters — from atomic structure and chemical bonding to organic chemistry fundamentals. Every concept is taught with clarity before moving to application.',
    boards: 'CBSE · TN State Board',
    accentBg: '#d4c5e2',
    accentBorder: '#c0afd4',
    stats: [
      { value: '14', label: 'Chapters' },
      { value: '80+', label: 'Topics' },
      { value: '2', label: 'Terms' },
    ],
    chapters: [
      { number: 1, title: 'Some Basic Concepts of Chemistry', topics: ['Laws of chemical combination', 'Mole concept and molar mass', 'Stoichiometry and percentage composition', 'Empirical and molecular formula', 'Concentration calculations'] },
      { number: 2, title: 'Structure of Atom', topics: ['Discovery of subatomic particles', 'Atomic models — Thomson, Rutherford, Bohr', 'Quantum mechanical model of the atom', 'Quantum numbers and shapes of orbitals', 'Electronic configuration and Aufbau principle'] },
      { number: 3, title: 'Classification of Elements & Periodicity', topics: ['Modern periodic law and the long form table', 'Electronic configuration and block classification', 'Periodic trends: atomic radius, ionisation enthalpy', 'Electron gain enthalpy and electronegativity'] },
      { number: 4, title: 'Chemical Bonding and Molecular Structure', topics: ['Ionic and covalent bonds, formal charge', 'Hybridisation (sp, sp², sp³) and geometry', 'VSEPR theory and molecular shapes', 'Molecular Orbital Theory — bond order', 'Polarity, dipole moment and hydrogen bonding'] },
      { number: 5, title: 'States of Matter: Gases and Liquids', topics: ['Gas laws — Boyle\'s, Charles\', Gay-Lussac\'s', 'Ideal gas equation and kinetic molecular theory', 'Real gases and van der Waals equation', 'Viscosity, surface tension and liquid properties'] },
      { number: 6, title: 'Chemical Thermodynamics', topics: ['Laws of thermodynamics and internal energy', 'Enthalpy, heat capacity and Hess\'s law', 'Bond enthalpy calculations', 'Entropy and spontaneity', 'Gibbs free energy and equilibrium'] },
      { number: 7, title: 'Equilibrium', topics: ['Dynamic equilibrium and Le Chatelier\'s principle', 'Kc and Kp expressions and relationship', 'Factors affecting equilibrium', 'Ionic equilibrium and pH', 'Buffer solutions and solubility product'] },
      { number: 8, title: 'Redox Reactions', topics: ['Oxidation number rules', 'Identifying oxidising and reducing agents', 'Balancing redox equations by ion-electron method', 'Electrochemical series applications'] },
      { number: 9, title: 'Hydrogen', topics: ['Position in the periodic table', 'Preparation and properties of dihydrogen', 'Hydrides — ionic, covalent, metallic', 'Water: structure, properties and anomalies', 'Hydrogen peroxide — preparation and uses'] },
      { number: 10, title: 'The s-Block Elements', topics: ['Group 1 and 2 general characteristics', 'Anomalous behaviour of Li and Be', 'Important compounds: NaOH, Na₂CO₃, CaCO₃', 'Biological importance of Na, K, Mg, Ca'] },
      { number: 11, title: 'The p-Block Elements (Group 13–14)', topics: ['Boron family — properties and compounds', 'Carbon allotropes: graphite, diamond, fullerenes', 'Silicon and silicates', 'Oxides and hydrides of Group 13 and 14'] },
      { number: 12, title: 'Organic Chemistry: Principles & Techniques', topics: ['IUPAC nomenclature and isomerism', 'Purification methods: crystallisation, distillation', 'Qualitative analysis (Lassaigne\'s test)', 'Quantitative analysis: Dumas and Kjeldahl', 'Electronic effects: inductive, resonance, hyperconjugation'] },
      { number: 13, title: 'Hydrocarbons', topics: ['Alkanes: nomenclature, conformations and reactions', 'Alkenes: addition reactions and Markovnikov\'s rule', 'Alkynes: acidic character and reactions', 'Benzene structure and EAS mechanism', 'Geometrical isomerism and carcinogenicity'] },
      { number: 14, title: 'Environmental Chemistry', topics: ['Atmospheric pollution: smog, acid rain, ozone depletion', 'Water pollution and soil pollution', 'Industrial waste management', 'Green chemistry principles'] },
    ],
  },
  {
    id: 'grade-12',
    navLabel: '12th Grade',
    label: '12th Grade Chemistry',
    tagline: 'Deepen your understanding and master exam-level chemistry.',
    description:
      'Builds on 11th grade foundations — covering electrochemistry, coordination chemistry, and all functional groups of organic chemistry. Every topic is tied directly to board and competitive exam patterns.',
    boards: 'CBSE · TN State Board',
    accentBg: '#daeae4',
    accentBorder: '#b8d4cc',
    stats: [
      { value: '16', label: 'Chapters' },
      { value: '110+', label: 'Topics' },
      { value: '2', label: 'Terms' },
    ],
    chapters: [
      { number: 1, title: 'The Solid State', topics: ['Crystal lattices and unit cells', 'Packing efficiency and voids', 'Imperfections in solids — point defects', 'Electrical and magnetic properties of solids'] },
      { number: 2, title: 'Solutions', topics: ['Concentration terms: molarity, molality, mole fraction', 'Raoult\'s law and vapour pressure lowering', 'Colligative properties — elevation of boiling point', 'Osmosis, osmotic pressure and Van\'t Hoff factor'] },
      { number: 3, title: 'Electrochemistry', topics: ['Galvanic cells and electrode potentials', 'Nernst equation and EMF calculations', 'Conductance, molar conductivity and Kohlrausch\'s law', 'Electrolysis and Faraday\'s laws', 'Batteries, fuel cells and corrosion'] },
      { number: 4, title: 'Chemical Kinetics', topics: ['Rate of reaction and rate laws', 'Order and molecularity of reactions', 'Integrated rate equations — zero, first, second order', 'Arrhenius equation and activation energy', 'Collision theory and reaction mechanisms'] },
      { number: 5, title: 'Surface Chemistry', topics: ['Adsorption: physisorption and chemisorption', 'Freundlich and Langmuir isotherms', 'Catalysis: homogeneous and heterogeneous', 'Colloids — types, preparation, properties, coagulation'] },
      { number: 6, title: 'General Principles of Isolation of Elements', topics: ['Concentration methods for ores', 'Extraction by reduction: pyrometallurgy', 'Hydrometallurgy and electrometallurgy', 'Thermodynamic principles and Ellingham diagrams', 'Refining and purification of metals'] },
      { number: 7, title: 'The p-Block Elements (Group 15–18)', topics: ['Nitrogen family — oxides and oxoacids of phosphorus', 'Oxygen family — allotropes of sulphur, H₂S, SO₂', 'Halogens and interhalogen compounds', 'Noble gases and xenon compounds'] },
      { number: 8, title: 'The d- and f-Block Elements', topics: ['Transition metals — electronic configuration and colour', 'Variable oxidation states and catalytic activity', 'Important compounds: K₂Cr₂O₇ and KMnO₄', 'Lanthanoids and actinoids: general characteristics'] },
      { number: 9, title: 'Coordination Compounds', topics: ['Werner\'s theory, ligands and coordination number', 'IUPAC nomenclature of coordination compounds', 'Isomerism — structural and stereo', 'Valence Bond Theory and Crystal Field Theory', 'Stability of complexes and biological importance'] },
      { number: 10, title: 'Haloalkanes and Haloarenes', topics: ['Classification and IUPAC nomenclature', 'Methods of preparation', 'SN1 and SN2 mechanisms and stereochemistry', 'Elimination reactions E1 and E2', 'Uses and environmental effects'] },
      { number: 11, title: 'Alcohols, Phenols and Ethers', topics: ['Preparation and physical properties', 'Chemical reactions of alcohols and phenols', 'Acidity of alcohols vs phenols', 'Ether synthesis and reactions', 'Industrial importance of ethanol and phenol'] },
      { number: 12, title: 'Aldehydes, Ketones and Carboxylic Acids', topics: ['Nucleophilic addition to carbonyl group', 'Oxidation, reduction and condensation reactions', 'Named reactions: Aldol, Cannizzaro, Clemmensen', 'Carboxylic acids — preparation, acidity and derivatives'] },
      { number: 13, title: 'Amines', topics: ['Classification and preparation of amines', 'Basicity of amines — comparison and factors', 'Chemical reactions of primary, secondary, tertiary amines', 'Diazonium salts and coupling reactions'] },
      { number: 14, title: 'Biomolecules', topics: ['Carbohydrates: mono, di and polysaccharides', 'Proteins: amino acids, peptide bonds, denaturation', 'Enzymes: nature and mechanism', 'Nucleic acids: DNA and RNA structure', 'Vitamins and hormones (overview)'] },
      { number: 15, title: 'Polymers', topics: ['Addition and condensation polymerisation', 'Natural and synthetic rubber', 'Thermoplastics vs thermosetting polymers', 'Biodegradable and non-biodegradable polymers'] },
      { number: 16, title: 'Chemistry in Everyday Life', topics: ['Drugs and medicines: classification and mechanism of action', 'Chemicals in food: preservatives, antioxidants, artificial sweeteners', 'Cleansing agents: soaps and detergents'] },
    ],
  },
  {
    id: 'jee',
    navLabel: 'JEE Chemistry',
    label: 'JEE Chemistry',
    tagline: 'Rigorous, conceptual preparation for JEE Mains and Advanced.',
    description:
      'Covers all three domains — Physical, Organic and Inorganic — with emphasis on conceptual depth, multi-step numerical problems and the higher-order reasoning that JEE Advanced demands.',
    boards: 'JEE Mains · JEE Advanced',
    accentBg: '#e9deb5',
    accentBorder: '#d4c890',
    stats: [
      { value: '17+', label: 'Topics' },
      { value: '~30%', label: 'Exam Weightage' },
      { value: '3', label: 'Domains' },
    ],
    chapters: [
      { number: 1, title: 'Mole Concept & Stoichiometry', domain: 'Physical Chemistry', topics: ['Mole, Avogadro number and molar calculations', 'Laws of chemical combination', 'Limiting reagent, percentage yield and purity', 'Concentration terms and solution preparation'] },
      { number: 2, title: 'Atomic Structure', domain: 'Physical Chemistry', topics: ['Bohr model and its failures', 'Quantum numbers and orbital shapes', 'Electronic configuration — exceptions (Cr, Cu etc.)', 'Photoelectric effect and de Broglie wavelength'] },
      { number: 3, title: 'Chemical Bonding', domain: 'Physical Chemistry', topics: ['VBT, hybridisation and VSEPR theory', 'MO theory: bond order, O₂ paramagnetism', 'Resonance, formal charge and bent\'s rule', 'Dipole moment and polarity of molecules'] },
      { number: 4, title: 'Thermodynamics & Thermochemistry', domain: 'Physical Chemistry', topics: ['First and second laws, internal energy and enthalpy', 'Hess\'s law, bond enthalpy and Kirchhoff\'s law', 'Gibbs free energy, spontaneity and equilibrium', 'Entropy changes in chemical processes'] },
      { number: 5, title: 'Chemical & Ionic Equilibrium', domain: 'Physical Chemistry', topics: ['Kc, Kp, Kx and their interconversion', 'Le Chatelier\'s principle — applications in industry', 'Degree of dissociation calculations', 'Buffer pH, Henderson-Hasselbalch equation', 'Ksp, common ion effect and precipitation'] },
      { number: 6, title: 'Electrochemistry', domain: 'Physical Chemistry', topics: ['Electrode potentials, SHE and EMF of cells', 'Nernst equation — numerical applications', 'Faraday\'s laws of electrolysis — calculations', 'Conductance and Kohlrausch\'s law'] },
      { number: 7, title: 'Chemical Kinetics', domain: 'Physical Chemistry', topics: ['Rate laws, order and molecularity', 'Integrated rate equations — zero, first, second order', 'Arrhenius equation — Ea calculations', 'Parallel and consecutive reactions, rate-determining step'] },
      { number: 8, title: 'States of Matter & Solutions', domain: 'Physical Chemistry', topics: ['Real gases and van der Waals equation', 'KMT and Maxwell-Boltzmann distributions', 'Raoult\'s law and colligative properties — numericals', 'Abnormal molar masses and Van\'t Hoff factor'] },
      { number: 9, title: 'General Organic Chemistry (GOC)', domain: 'Organic Chemistry', topics: ['Hybridisation, resonance and aromaticity (Hückel)', 'Inductive, mesomeric and hyperconjugation effects', 'Reactive intermediates: carbocations, carbanions, radicals', 'Mechanisms: SN1, SN2, E1, E2 — stereochemistry'] },
      { number: 10, title: 'Hydrocarbons & Arenes', domain: 'Organic Chemistry', topics: ['Alkane, alkene, alkyne reactions and mechanisms', 'Markovnikov, anti-Markovnikov, peroxide effect', 'Benzene — EAS mechanism and directing effects', 'Conformational analysis of alkanes and cyclohexane'] },
      { number: 11, title: 'Haloalkanes, Grignard & Stereochemistry', domain: 'Organic Chemistry', topics: ['SN1 vs SN2 — rate, stereochemistry and conditions', 'Grignard reagents — synthesis applications', 'Optical activity — chirality, inversion, racemisation', 'Geometrical isomerism and designation (E/Z, R/S)'] },
      { number: 12, title: 'Carbonyl & Oxygen Compounds', domain: 'Organic Chemistry', topics: ['Alcohols, phenols, ethers — reactivity comparison', 'Nucleophilic addition to aldehydes and ketones', 'Named reactions: Aldol, Cannizzaro, Claisen Schmidt', 'Carboxylic acids — acidity and derivatives'] },
      { number: 13, title: 'Nitrogen Compounds, Polymers & Practical Organic', domain: 'Organic Chemistry', topics: ['Amine basicity — comparison and factors', 'Diazonium salts and synthetic applications', 'Polymers for JEE — condensation and addition types', 'Practical organic: tests, identification of functional groups'] },
      { number: 14, title: 'Periodic Properties & s-Block', domain: 'Inorganic Chemistry', topics: ['Trends across periods and groups — exceptions', 'Anomalous properties of Period 2 elements', 'Diagonal relationship (Li-Mg, Be-Al, B-Si)', 'Alkali and alkaline earth metal compounds for JEE'] },
      { number: 15, title: 'p-Block Elements', domain: 'Inorganic Chemistry', topics: ['Groups 13–18 key compounds and reactions', 'Oxoacids of P, S, N, Cl — structures and oxidation states', 'Interhalogen compounds and pseudo-halogens', 'Noble gas compounds of xenon'] },
      { number: 16, title: 'd & f Block + Coordination Chemistry', domain: 'Inorganic Chemistry', topics: ['Variable oxidation states, colour, magnetism of transition metals', 'Crystal Field Theory, CFSE and crystal field splitting', 'IUPAC nomenclature and types of isomerism in complexes', 'K₂Cr₂O₇ and KMnO₄ — reactions in acidic and alkaline media'] },
      { number: 17, title: 'Metallurgy & Qualitative Analysis', domain: 'Inorganic Chemistry', topics: ['Extraction of Fe, Cu, Zn and Al — processes', 'Ellingham diagrams and thermodynamic basis', 'Systematic cation and anion identification', 'Common salt analysis reactions for JEE'] },
    ],
  },
  {
    id: 'neet',
    navLabel: 'NEET Chemistry',
    label: 'NEET Chemistry',
    tagline: 'NCERT-anchored preparation with MCQ speed strategies.',
    description:
      'Covers all chapters from 11th and 12th NCERT — the primary source for NEET questions. Conceptual clarity first, then MCQ speed and accuracy training using past-year pattern analysis.',
    boards: 'NEET UG',
    accentBg: '#c8e0da',
    accentBorder: '#a0c4ba',
    stats: [
      { value: '45', label: 'Qs per Paper' },
      { value: '25%', label: 'Chemistry Weightage' },
      { value: '30+', label: 'Chapters' },
    ],
    chapters: [
      { number: 1, title: 'Basic Concepts & Atomic Structure', domain: 'Class 11 — Physical', topics: ['Mole concept MCQ types and traps', 'Atomic structure high-yield topics', 'Quantum numbers — frequently tested patterns', 'Periodic properties — NEET question analysis'] },
      { number: 2, title: 'Chemical Bonding & States of Matter', domain: 'Class 11 — Physical', topics: ['VSEPR — bond angles and shapes for NEET', 'MO theory: O₂, N₂, F₂ bond order questions', 'Real gas deviations — MCQ types', 'KMT and velocity distribution concepts'] },
      { number: 3, title: 'Thermodynamics & Equilibrium', domain: 'Class 11 — Physical', topics: ['Hess\'s law numerical problems', 'Gibbs free energy and Kp relationship', 'Le Chatelier\'s principle — MCQ applications', 'Buffer solutions and pH calculations'] },
      { number: 4, title: 'Hydrogen, s-Block & p-Block (11th)', domain: 'Class 11 — Inorganic', topics: ['Anomalous properties of Li and Be for NEET', 'Compounds of Na and Ca — industrial and biological', 'Allotropes of P and S — structure and properties', 'Oxoacids — acid strength comparison MCQs'] },
      { number: 5, title: 'Organic Chemistry Basics & Hydrocarbons', domain: 'Class 11 — Organic', topics: ['IUPAC nomenclature practice for NEET', 'Electronic effects and reaction mechanism MCQs', 'Aromatic hydrocarbons — EAS and properties', 'Structural and stereoisomerism identification'] },
      { number: 6, title: 'Solid State & Solutions', domain: 'Class 12 — Physical', topics: ['Unit cell calculations and number of atoms', 'Types of defects — MCQ patterns', 'Colligative property numericals', 'Abnormal molar masses and Van\'t Hoff factor'] },
      { number: 7, title: 'Electrochemistry & Chemical Kinetics', domain: 'Class 12 — Physical', topics: ['Cell EMF, standard potentials — NEET questions', 'Faraday\'s laws numerical problems', 'First-order kinetics and half-life calculations', 'Arrhenius equation MCQ types'] },
      { number: 8, title: 'Surface Chemistry & Metallurgy', domain: 'Class 12 — Physical/Inorganic', topics: ['Adsorption isotherms — MCQ patterns', 'Colloids: types, properties and coagulation', 'Refining processes for NEET', 'Thermodynamic principles in metallurgy'] },
      { number: 9, title: 'p-Block (12th), d-Block & Coordination', domain: 'Class 12 — Inorganic', topics: ['Group 15–18 reactions — high-yield NEET topics', 'Transition metal properties — colour and magnetism', 'CFSE and crystal field splitting', 'Werner\'s theory and coordination nomenclature'] },
      { number: 10, title: 'Haloalkanes, Alcohols & Ethers', domain: 'Class 12 — Organic', topics: ['SN1, SN2, E1, E2 — NEET MCQ patterns', 'Lucas test and Victor Meyer\'s test', 'Ether synthesis, cleavage reactions', 'Industrial preparation and uses of ethanol'] },
      { number: 11, title: 'Aldehydes, Ketones & Carboxylic Acids', domain: 'Class 12 — Organic', topics: ['Nucleophilic addition — MCQ types', 'Aldol condensation and Cannizzaro reaction', 'Carboxylic acid derivatives for NEET', 'Acidity comparison MCQs'] },
      { number: 12, title: 'Amines & Biomolecules', domain: 'Class 12 — Organic', topics: ['Basicity of amines — comparison MCQs', 'Diazonium reactions — product identification', 'Reducing vs non-reducing sugars', 'Proteins, nucleic acids — NEET conceptual questions'] },
      { number: 13, title: 'Polymers & Everyday Chemistry', domain: 'Class 12 — Applied', topics: ['Biodegradable vs non-biodegradable polymers', 'Drugs for NEET: tranquillisers, analgesics, antibiotics', 'Antioxidants and food preservatives', 'Soaps vs detergents — MCQ types'] },
    ],
  },
]

// ─── Helper: Group by Domain ───────────────────────────────────────────────────

type DomainGroup = {
  domain: string | null
  items: { chapter: Chapter; idx: number }[]
}

function groupByDomain(chapters: Chapter[]): DomainGroup[] {
  const groups: DomainGroup[] = []
  let currentDomain: string | null = null
  let currentItems: { chapter: Chapter; idx: number }[] = []

  chapters.forEach((ch, i) => {
    const domain = ch.domain ?? null
    if (domain !== currentDomain) {
      if (currentItems.length > 0) {
        groups.push({ domain: currentDomain, items: currentItems })
      }
      currentDomain = domain
      currentItems = [{ chapter: ch, idx: i }]
    } else {
      currentItems.push({ chapter: ch, idx: i })
    }
  })
  if (currentItems.length > 0) {
    groups.push({ domain: currentDomain, items: currentItems })
  }
  return groups
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────

function ChapterCard({
  chapter,
  index,
  isOpen,
  onToggle,
}: {
  chapter: Chapter
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.15) }}
      className="bg-white border border-accent3/60 rounded-2xl overflow-hidden hover:shadow-[0_4px_20px_rgba(94,64,117,0.08)] transition-shadow duration-300"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center gap-4 text-left"
      >
        <span className="w-10 h-10 rounded-full bg-bg border border-accent3 text-primary text-[14px] flex items-center justify-center shrink-0 font-mono">
          {String(chapter.number).padStart(2, '0')}
        </span>
        <span className="flex-1 text-base text-primary">{chapter.title}</span>
        <span className="text-[14px] text-muted hidden sm:block mr-2 shrink-0">
          {chapter.topics.length} topics
        </span>
        <svg
          className={`w-5 h-5 text-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M 4,7 L 10,13 L 16,7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-accent1/60">
              <div className="pt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {chapter.topics.map((topic, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-muted shrink-0">
                      <IconCheck className="w-4 h-4" />
                    </span>
                    <span className="text-[15px] text-muted leading-snug">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Chapter List ─────────────────────────────────────────────────────────────

function ChapterList({
  course,
  openChapter,
  toggleChapter,
}: {
  course: Course
  openChapter: number | null
  toggleChapter: (idx: number) => void
}) {
  const hasDomains = course.chapters.some((c) => c.domain)
  const groups = groupByDomain(course.chapters)

  if (!hasDomains) {
    return (
      <div className="space-y-3">
        {course.chapters.map((ch, i) => (
          <ChapterCard
            key={ch.number}
            chapter={ch}
            index={i}
            isOpen={openChapter === i}
            onToggle={() => toggleChapter(i)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.domain ?? 'ungrouped'}>
          {group.domain && (
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-full bg-accent1 text-[14px] tracking-[0.08em] text-primary whitespace-nowrap">
                {group.domain}
              </span>
              <div className="flex-1 h-px bg-accent3" />
            </div>
          )}
          <div className="space-y-3">
            {group.items.map(({ chapter, idx }) => (
              <ChapterCard
                key={chapter.number}
                chapter={chapter}
                index={idx}
                isOpen={openChapter === idx}
                onToggle={() => toggleChapter(idx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Banner Decorations ───────────────────────────────────────────────────────

const bannerDecorations: Record<string, React.ReactNode> = {
  'grade-11': <AtomSVG width={160} height={160} color="#5e4075" />,
  'grade-12': <FlaskSVG width={160} height={160} color="#5e4075" />,
  'jee':      <CompoundSVG width={160} height={160} color="#5e4075" />,
  'neet':     <BeakerSVG width={160} height={160} color="#5e4075" />,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState<string>('grade-11')
  const [openChapter, setOpenChapter] = useState<number | null>(null)

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace('#', '')
      if (courses.some((c) => c.id === hash)) {
        setActiveTab(hash)
        setOpenChapter(null)
        document.getElementById('tab-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const activeCourse = courses.find((c) => c.id === activeTab)!

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    setOpenChapter(null)
  }

  return (
    <main className="bg-bg min-h-screen">
      <Navbar />

      {/* ── Tabs + Content ───────────────────────────────────── */}
      <section id="tab-section" className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Tab Pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5 }}
            className="flex flex-wrap gap-2.5 mb-10 justify-center"
          >
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => handleTabChange(course.id)}
                className={`px-6 py-3 rounded-full text-base transition-all duration-200 ${
                  activeTab === course.id
                    ? 'bg-primary text-white shadow-[0_2px_12px_rgba(94,64,117,0.25)]'
                    : 'bg-white border border-accent3 text-muted hover:border-primary/40 hover:text-primary'
                }`}
              >
                {course.navLabel}
              </button>
            ))}
          </motion.div>

          {/* Animated Content Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Overview Banner */}
              <div
                className="rounded-2xl p-8 md:p-10 mb-8 relative overflow-hidden"
                style={{
                  backgroundColor: activeCourse.accentBg,
                  border: `1px solid ${activeCourse.accentBorder}`,
                }}
              >
                <div className="absolute right-4 top-4 opacity-[0.12] pointer-events-none">
                  {bannerDecorations[activeCourse.id]}
                </div>
                <div className="relative max-w-3xl">
                  <p className="text-[14px] tracking-[0.2em] text-muted uppercase mb-2">
                    {activeCourse.boards}
                  </p>
                  <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-3">
                    {activeCourse.label}
                  </h2>
                  <p className="text-base text-primary/70 leading-relaxed mb-7 max-w-2xl">
                    {activeCourse.description}
                  </p>
                  <div className="flex flex-wrap gap-10">
                    {activeCourse.stats.map((s) => (
                      <div key={s.label}>
                        <div className="text-2xl text-primary">{s.value}</div>
                        <div className="text-[14px] text-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chapter Accordion */}
              <ChapterList
                course={activeCourse}
                openChapter={openChapter}
                toggleChapter={(idx) => setOpenChapter(openChapter === idx ? null : idx)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── Enroll CTA ────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center bg-accent1/30 border border-accent1 rounded-3xl p-12 relative overflow-hidden"
        >
          <div className="absolute top-4 right-6 opacity-[0.08] pointer-events-none">
            <FlaskSVG width={120} height={120} color="#5e4075" />
          </div>
          <h2 className="text-3xl md:text-4xl text-primary mb-4 relative">
            Ready to Begin?
          </h2>
          <p className="text-base text-muted mb-8 relative">
            Join Chemistry@OCTET and get access to all courses, live sessions and study resources.
          </p>
          <div className="flex flex-wrap gap-4 justify-center relative">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-primary text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_2px_12px_rgba(94,64,117,0.25)] hover:shadow-[0_4px_20px_rgba(94,64,117,0.35)] hover:-translate-y-0.5"
            >
              Enroll Now
            </Link>
            <Link
              href="/learn"
              className="px-8 py-3 border border-primary/30 text-primary text-base rounded-xl hover:border-primary/60 transition-all duration-200"
            >
              How We Teach
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  )
}
