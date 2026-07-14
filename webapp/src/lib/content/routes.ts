export const contentRoute = {
  vocabulary: "/vocabulary",
  vocabularyList: (category: string) => `/vocabulary/${category}`,
  vocabularyEntry: (id: string) => `/vocabulary/entry/${encodeURIComponent(id)}`,
  grammar: "/grammar",
  grammarList: (category: string) => `/grammar/${category}`,
  grammarEntry: (slug: string) => `/grammar/entry/${slug}`,
  kana: "/kana",
  review: "/review",
  sources: "/sources",
} as const;
