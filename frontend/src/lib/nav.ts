import {
  BrainCircuit,
  CircleQuestionMark,
  Funnel,
  HeartPulse,
  KeyRound,
  Languages,
  LayoutDashboard,
  ListChecks,
  Settings,
  Shapes,
  Tags,
  TextQuote,
  type LucideIcon,
} from 'lucide-react'

export type PageId =
  | 'overview'
  | 'preprocessing'
  | 'linguistics'
  | 'entities'
  | 'keywords'
  | 'phrases'
  | 'language-model'
  | 'topics'
  | 'sentiment'
  | 'aspects'
  | 'settings'
  | 'help'

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
  /** What the page shows, used in its empty state until the page is built. */
  description: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Analysis',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Corpus size, review lengths and rating distribution.' },
      { id: 'topics', label: 'Topics', icon: Shapes, description: 'LDA topics and the words that define them.' },
      { id: 'sentiment', label: 'Sentiment & Emotion', icon: HeartPulse, description: 'Lexicon and transformer sentiment, and emotion counts.' },
      { id: 'aspects', label: 'Aspects', icon: ListChecks, description: 'Sentiment for food, service, ambience, price and cleanliness.' },
    ],
  },
  {
    label: 'Language',
    items: [
      { id: 'preprocessing', label: 'Preprocessing', icon: Funnel, description: 'Each cleaning step applied to a single review.' },
      { id: 'linguistics', label: 'Linguistics', icon: Languages, description: 'Part-of-speech tags and Word2Vec neighbours.' },
      { id: 'entities', label: 'Entities', icon: Tags, description: 'Named entities and the dishes reviewers mention.' },
      { id: 'keywords', label: 'Keywords', icon: KeyRound, description: 'The highest-scoring TF-IDF terms.' },
      { id: 'phrases', label: 'Phrases', icon: TextQuote, description: 'The most frequent bigrams and trigrams.' },
      { id: 'language-model', label: 'Language Model', icon: BrainCircuit, description: 'Bigram probabilities for a sentence you enter.' },
    ],
  },
]

export const footerNav: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferences for analyses and display.' },
  { id: 'help', label: 'Get Help', icon: CircleQuestionMark, description: 'How each analysis works and how to read it.' },
]

export const allNavItems: NavItem[] = [...navGroups.flatMap((group) => group.items), ...footerNav]

export function findNavItem(id: string): NavItem | undefined {
  return allNavItems.find((item) => item.id === id)
}
