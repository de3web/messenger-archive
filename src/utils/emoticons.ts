// MSN Messenger emoticon codes → modern emoji
// Longer/more specific codes must come first to avoid partial matches

export const EMOTICON_MAP: [string, string][] = [
  // Colon codes — specific first
  [":'(", '😢'],
  [':D',  '😄'],
  ['=D',  '😄'],
  [':P',  '😛'],
  ['=P',  '😛'],
  [';)',  '😉'],
  [':O',  '😮'],
  [':o',  '😮'],
  [':S',  '😕'],
  [':s',  '😕'],
  [":')", '😂'],
  [':$',  '😳'],
  [':*',  '😘'],
  [':|',  '😐'],
  ['8o|', '😠'],
  ['8-|', '😐'],
  ['8-)', '😎'],
  ['8)',  '😎'],
  ['^o)', '😏'],
  [':)',  '🙂'],
  ['=)',  '🙂'],
  [':(',  '😟'],
  ['=(',  '😟'],

  // Letter codes (case-insensitive pairs)
  ['(A)',  '😇'],
  ['(a)',  '😇'],
  ['(6)',  '😈'],
  ['(L)',  '❤️'],
  ['(l)',  '❤️'],
  ['(U)',  '💔'],
  ['(u)',  '💔'],
  ['(K)',  '💋'],
  ['(k)',  '💋'],
  ['(H)',  '😎'],
  ['(h)',  '😎'],
  ['(Y)',  '👍'],
  ['(y)',  '👍'],
  ['(N)',  '👎'],
  ['(n)',  '👎'],
  ['(})',  '🫂'],
  ['({)',  '🫂'],
  ['(F)',  '🌹'],
  ['(f)',  '🌹'],
  ['(W)',  '🥀'],
  ['(w)',  '🥀'],
  ['(B)',  '🍺'],
  ['(b)',  '🍺'],
  ['(D)',  '🍸'],
  ['(d)',  '🍸'],
  ['(C)',  '☕'],
  ['(c)',  '☕'],
  ['(G)',  '🎁'],
  ['(g)',  '🎁'],
  ['(P)',  '📷'],
  ['(p)',  '📷'],
  ['(T)',  '📞'],
  ['(t)',  '📞'],
  ['(I)',  '💡'],
  ['(i)',  '💡'],
  ['(S)',  '🌙'],
  ['(s)',  '🌙'],
  ['(8)',  '🎵'],
  ['(*)',  '⭐'],
  ['(^)',  '🎂'],
  ['(O)',  '🕐'],
  ['(o)',  '🕐'],
  ['(R)',  '🌈'],
  ['(r)',  '🌈'],
  ['(@)',  '🐱'],
  ['(&)',  '🐶'],
  ['(E)',  '✉️'],
  ['(e)',  '✉️'],
  ['(M)',  '🦋'],
  ['(m)',  '🦋'],
  ['(~)',  '🎬'],
  ['(Z)',  '😴'],
  ['(z)',  '😴'],
  ['(X)',  '👧'],
  ['(x)',  '👧'],
  ['(Q)',  '⚽'],
  ['(q)',  '⚽'],
  ['(!)',  '⚡'],
  ['(J)',  '🎮'],
  ['(j)',  '🎮'],
]

export type TextSegment =
  | { type: 'text';     value: string }
  | { type: 'emoticon'; code: string; emoji: string }

// Build the regex once at module load
const _escaped = EMOTICON_MAP.map(([code]) =>
  code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
)
const _pattern = new RegExp(`(${_escaped.join('|')})`, 'g')

export function parseEmoticons(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(_pattern)) {
    if (match.index! > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    const entry = EMOTICON_MAP.find(([code]) => code === match[0])
    segments.push({ type: 'emoticon', code: match[0], emoji: entry?.[1] ?? match[0] })
    lastIndex = match.index! + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments.length ? segments : [{ type: 'text', value: text }]
}
