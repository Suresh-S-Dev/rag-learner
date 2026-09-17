import type { Lesson } from '../types'

export const RAG_LESSONS: Lesson[] = [
  {
    section: 'Fundamentals',
    title: 'What is RAG?',
    body: 'RAG (Retrieval-Augmented Generation) is a pattern where a system first retrieves relevant external documents for a query, then conditions an LLM on those documents to generate an answer.',
  },
  {
    section: 'Fundamentals',
    title: 'Why use RAG instead of only fine-tuning?',
    body: 'RAG keeps knowledge external and updatable, supports citations, and reduces hallucinations by grounding answers in retrieved evidence, while fine-tuning mainly changes behavior and style.',
  },
  {
    section: 'Fundamentals',
    title: 'What are the main components of a RAG system?',
    body: 'Data ingestion, document parsing, chunking, embedding generation, vector database, retriever, optional reranker, LLM, prompt orchestration, and monitoring/evaluation.',
  },
  {
    section: 'Fundamentals',
    title: 'What is the difference between dense and sparse retrieval?',
    body: 'Dense retrieval uses embeddings and semantic similarity; sparse retrieval uses keyword methods like BM25/TF-IDF based on exact token overlap.',
  },
  {
    section: 'Fundamentals',
    title: 'What is a vector database?',
    body: 'A database optimized to store embeddings and perform fast nearest-neighbor search to find similar vectors for a query.',
  },
  {
    section: 'Fundamentals',
    title: 'What is chunking and why does it matter?',
    body: 'Chunking splits documents into smaller pieces before embedding; good chunking improves retrieval precision and prevents mixing unrelated topics in one vector.',
  },
  {
    section: 'Fundamentals',
    title: 'What is a reranker in RAG?',
    body: 'A model that re-scores retrieved candidates after initial retrieval to improve the relevance of the top-k chunks sent to the LLM.',
  },
  {
    section: 'Basic RAG Types',
    title: 'What is Naive (Basic) RAG?',
    body: 'The simplest RAG: chunk documents, embed them, retrieve top-k chunks once for a query, and send them to the LLM for generation.',
  },
  {
    section: 'Basic RAG Types',
    title: 'What is Conversational RAG?',
    body: 'RAG that incorporates session history or memory so retrieval and generation can use prior turns, not just the current query.',
  },
  {
    section: 'Basic RAG Types',
    title: 'What is Hybrid RAG?',
    body: 'RAG that combines multiple retrieval methods, typically dense vector search plus sparse keyword search (BM25), often with fusion/reranking, to improve recall and precision.',
  },
  {
    section: 'Basic RAG Types',
    title: 'What is Reranking RAG?',
    body: 'A RAG variant that adds a reranking step after initial retrieval to select higher-quality chunks before passing them to the LLM.',
  },
  {
    section: 'Basic RAG Types',
    title: 'What is Multi-Query RAG?',
    body: 'The system generates multiple reformulations of the user query, retrieves for each, and merges results to improve coverage and recall.',
  },
  {
    section: 'Basic RAG Types',
    title: 'What is HyDE (Hypothetical Document Embeddings) RAG?',
    body: 'The model first generates a hypothetical answer, embeds that synthetic text, and uses it for retrieval to better match the style of relevant documents.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Adaptive RAG?',
    body: 'A RAG architecture that dynamically decides whether to retrieve, where to retrieve from, and how many times, based on query complexity or confidence signals.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Corrective RAG (CRAG)?',
    body: 'RAG that adds validation after generation, checking confidence or consistency, and may trigger additional retrieval or correction if the answer looks unreliable.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Self-RAG?',
    body: 'A RAG approach where the model reflects on its own output, evaluates whether evidence supports it, and can revise or refuse answers when support is weak.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Graph RAG?',
    body: 'RAG that uses a knowledge graph or entity-relationship structure, retrieving entities and relationships instead of only text chunks, to support reasoning over connections.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Multi-Hop RAG?',
    body: 'RAG that performs multiple retrieval steps, using intermediate results to ask follow-up retrieval queries and connect information across sources.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Multimodal RAG?',
    body: 'RAG that retrieves and grounds answers using multiple modalities such as text, tables, images, audio, or video, not just text passages.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Memory-Augmented RAG?',
    body: 'RAG with persistent memory across sessions, allowing the system to recall user preferences, prior decisions, or long-term facts in addition to document retrieval.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Context-Aware RAG?',
    body: 'RAG that conditions retrieval and generation on extra signals like user role, location, time, device, permissions, and application state, not just the raw query.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Speculative RAG?',
    body: 'A low-latency RAG pattern where the model starts generating before retrieval finishes, then refines or corrects the output once evidence arrives.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is RL-RAG?',
    body: 'RAG where retrieval and generation strategies are optimized using reinforcement learning rather than fixed heuristics.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Sparse RAG?',
    body: 'RAG that primarily relies on sparse retrieval methods like BM25/TF-IDF and inverted indexes instead of dense embeddings.',
  },
  {
    section: 'Advanced RAG Variants',
    title: 'What is Modular RAG?',
    body: 'A design that splits retrieval into independent, swappable components (query rewriting, retrieval, reranking, fusion) so each can be improved separately.',
  },
  {
    section: 'Agentic and Multi-Agent RAG',
    title: 'What is Agentic RAG?',
    body: 'RAG where an agent loop plans tasks, selects tools, performs iterative retrieval, verifies results, and may take actions beyond answering, instead of a single linear pipeline.',
  },
  {
    section: 'Agentic and Multi-Agent RAG',
    title: 'What is Multi-Agent RAG?',
    body: 'A system with multiple specialized agents (e.g., retriever agent, reasoner agent, verifier agent) that collaborate, each handling part of the RAG workflow.',
  },
  {
    section: 'Agentic and Multi-Agent RAG',
    title: 'How is Agentic RAG different from basic RAG?',
    body: 'Basic RAG is a single pass: retrieve once, then generate. Agentic RAG can plan, call tools, retrieve multiple times, check consistency, and iterate before finalizing an answer.',
  },
  {
    section: 'Domain-Specific and Specialized RAG',
    title: 'What is Domain-Specific RAG?',
    body: 'RAG tuned for a particular domain (e.g., AWS, medical, legal) with curated corpora, specialized chunking, and possibly fine-tuned or RAFT-trained models.',
  },
  {
    section: 'Domain-Specific and Specialized RAG',
    title: 'What is RAFT (Retrieval-Augmented Fine-Tuning)?',
    body: 'A training recipe that fine-tunes an LLM on RAG-style examples with relevant and distractor documents so it learns to use retrieved context better in a domain.',
  },
  {
    section: 'Domain-Specific and Specialized RAG',
    title: 'What is Federated RAG?',
    body: 'RAG that retrieves from multiple independent data sources or tenants while respecting access controls and data boundaries, often in multi-organization settings.',
  },
  {
    section: 'Domain-Specific and Specialized RAG',
    title: 'What is Security-Focused RAG?',
    body: 'RAG designed with explicit access control, redaction, and policy checks so users only see information they are authorized to access.',
  },
  {
    section: 'Domain-Specific and Specialized RAG',
    title: 'What is Multilingual RAG?',
    body: 'RAG that supports queries and documents in multiple languages, often using multilingual embeddings and cross-lingual retrieval.',
  },
  {
    section: 'Domain-Specific and Specialized RAG',
    title: 'What is Structured RAG?',
    body: 'RAG that heavily uses structured data (tables, schemas, APIs, knowledge graphs) alongside unstructured text for retrieval and reasoning.',
  },
  {
    section: 'Evaluation and Practical Concerns',
    title: 'How do you evaluate a RAG system?',
    body: 'Common metrics include retrieval recall/precision, answer correctness, faithfulness/groundedness, citation accuracy, latency, and cost, often measured on a golden test set.',
  },
  {
    section: 'Evaluation and Practical Concerns',
    title: 'What is faithfulness in RAG?',
    body: 'Faithfulness measures whether the generated answer is supported by the retrieved evidence and does not introduce unsupported claims.',
  },
  {
    section: 'Evaluation and Practical Concerns',
    title: 'What are common failure modes of RAG?',
    body: 'Poor retrieval (wrong chunks), bad chunking, noisy or contradictory context, over-reliance on distractors, hallucinated citations, and latency/cost issues.',
  },
  {
    section: 'Evaluation and Practical Concerns',
    title: 'When should you choose Hybrid RAG over pure dense RAG?',
    body: 'When exact terms, codes, IDs, or product names matter and keyword match improves recall, or when dense alone misses important lexical matches.',
  },
  {
    section: 'Evaluation and Practical Concerns',
    title: 'When is Graph RAG preferable to standard RAG?',
    body: 'When questions depend on relationships between entities, multi-hop reasoning, or corpus-wide patterns that are hard to capture with isolated chunks.',
  },
  {
    section: 'Evaluation and Practical Concerns',
    title: 'When is Agentic RAG worth the complexity?',
    body: 'For complex, multi-step tasks that require planning, tool use, iterative retrieval, verification, or actions beyond simple Q&A.',
  },
  {
    section: 'Architecture-Level Questions',
    title: 'What is the difference between Standard, Advanced, and Modular RAG?',
    body: 'Standard RAG is the basic retrieve-then-generate pipeline. Advanced RAG adds techniques like hybrid search, reranking, and multi-hop. Modular RAG explicitly separates components so they can be swapped and improved independently.',
  },
  {
    section: 'Architecture-Level Questions',
    title: 'What is Branched RAG?',
    body: 'A pattern where the system routes queries to multiple domain-specific data sources and retrieves in parallel from several branches before fusing results.',
  },
  {
    section: 'Architecture-Level Questions',
    title: 'What is Multi-Vector RAG?',
    body: 'RAG that uses multiple embedding types or representations (dense, sparse, metadata, multi-vector per chunk) to improve retrieval flexibility and accuracy.',
  },
  {
    section: 'Architecture-Level Questions',
    title: 'What is the role of query rewriting in RAG?',
    body: 'Query rewriting transforms the user’s raw query into forms better suited for retrieval, improving recall and handling ambiguity or conversational references.',
  },
  {
    section: 'Architecture-Level Questions',
    title: 'What is the difference between RAG and traditional search?',
    body: 'Traditional search returns documents or snippets; RAG uses retrieved content as context for an LLM to synthesize a direct, grounded answer.',
  },
]
