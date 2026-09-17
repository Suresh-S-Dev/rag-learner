export type RagModeId =
  | 'basic'
  | 'sparse'
  | 'hybrid'
  | 'hyde'
  | 'multi_query'
  | 'conversational'
  | 'rerank'
  | 'adaptive'
  | 'corrective'
  | 'self'
  | 'multi_hop'
  | 'agentic'
  | 'multi_agent'
  | 'graph'
  | 'branched'
  | 'memory'

export type RagModeInfo = {
  id: RagModeId
  label: string
  group: string
  summary: string
  waiting: string
}

export const RAG_MODES: RagModeInfo[] = [
  {
    id: 'basic',
    label: 'Basic RAG',
    group: 'Core',
    summary: 'Embed the question once, take the closest chunks, then generate. This is the simple retrieve-then-generate path.',
    waiting: 'Retrieving with embeddings…',
  },
  {
    id: 'sparse',
    label: 'Sparse RAG',
    group: 'Core',
    summary: 'Keyword search with BM25. Good when exact names, IDs, or product codes matter.',
    waiting: 'Searching with keywords…',
  },
  {
    id: 'hybrid',
    label: 'Hybrid RAG',
    group: 'Core',
    summary: 'Fuses dense embeddings and BM25 so meaning and exact words both count.',
    waiting: 'Fusing keyword and vector hits…',
  },
  {
    id: 'hyde',
    label: 'HyDE',
    group: 'Query tricks',
    summary: 'The model writes a hypothetical answer first, embeds that text, and retrieves with it.',
    waiting: 'Writing a hypothetical answer…',
  },
  {
    id: 'multi_query',
    label: 'Multi-Query RAG',
    group: 'Query tricks',
    summary: 'Rewrites the question a few ways, retrieves for each, then merges the hits.',
    waiting: 'Rewriting the question…',
  },
  {
    id: 'conversational',
    label: 'Conversational RAG',
    group: 'Query tricks',
    summary: 'Turns follow-up chat into a standalone search query using recent turns.',
    waiting: 'Using chat history to rewrite the query…',
  },
  {
    id: 'rerank',
    label: 'Reranking RAG',
    group: 'Quality',
    summary: 'Pulls a wider set of chunks, then asks the model to pick the best ones.',
    waiting: 'Reranking retrieved chunks…',
  },
  {
    id: 'adaptive',
    label: 'Adaptive RAG',
    group: 'Quality',
    summary: 'Skips retrieval for small talk and retrieves when the question looks like a notes query.',
    waiting: 'Deciding whether to retrieve…',
  },
  {
    id: 'corrective',
    label: 'Corrective RAG',
    group: 'Quality',
    summary: 'Answers once, checks if the notes support it, and retrieves again if they do not.',
    waiting: 'Checking and correcting the answer…',
  },
  {
    id: 'self',
    label: 'Self-RAG',
    group: 'Quality',
    summary: 'The model judges whether evidence is enough and can refuse if support is weak.',
    waiting: 'Reflecting on evidence…',
  },
  {
    id: 'multi_hop',
    label: 'Multi-Hop RAG',
    group: 'Multi-step',
    summary: 'Retrieves, asks a follow-up search question, retrieves again, then answers.',
    waiting: 'Running a second retrieval hop…',
  },
  {
    id: 'agentic',
    label: 'Agentic RAG',
    group: 'Multi-step',
    summary: 'An agent loop can retrieve more than once, then answer from what it gathered.',
    waiting: 'Agent is planning retrieval…',
  },
  {
    id: 'multi_agent',
    label: 'Multi-Agent RAG',
    group: 'Multi-step',
    summary: 'A retriever gathers chunks, a reasoner drafts, and a verifier checks the draft.',
    waiting: 'Retriever, reasoner, and verifier are working…',
  },
  {
    id: 'graph',
    label: 'Graph RAG',
    group: 'Structure',
    summary: 'Scores chunks by shared terms and entities, not only vector distance.',
    waiting: 'Walking term links between chunks…',
  },
  {
    id: 'branched',
    label: 'Branched RAG',
    group: 'Structure',
    summary: 'Retrieves from each document on its own, then fuses the branches.',
    waiting: 'Retrieving from each document…',
  },
  {
    id: 'memory',
    label: 'Memory RAG',
    group: 'Structure',
    summary: 'Adds recent Q&A as memory, then retrieves notes as usual.',
    waiting: 'Loading memory and retrieving…',
  },
]

export const RAG_MODE_GROUPS = ['Core', 'Query tricks', 'Quality', 'Multi-step', 'Structure']

export function ragModeById(id: string | null | undefined) {
  return RAG_MODES.find((item) => item.id === id) ?? RAG_MODES[0]
}

export function isRagMode(value: string): value is RagModeId {
  return RAG_MODES.some((item) => item.id === value)
}