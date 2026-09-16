import type { Lesson } from '../types'

export const RAG_LESSONS: Lesson[] = [
  {
    title: 'What problem does RAG solve?',
    body: 'A language model only knows what it was trained on. Retrieval-Augmented Generation looks up your notes first, then asks the model to answer using that retrieved context, so answers can stay grounded in documents you uploaded.',
  },
  {
    title: 'What is a document chunk?',
    body: 'A chunk is a small slice of a document. Models and embedding APIs work best with limited text, so this app splits notes into overlapping windows before embedding them.',
  },
  {
    title: 'What is an embedding?',
    body: 'An embedding is a list of numbers that represents meaning. Similar sentences land close together in that space, which lets the app find notes that match a question without keyword search alone.',
  },
  {
    title: 'How does similarity search work?',
    body: 'The question is embedded with the same model as the chunks. Cosine similarity scores how aligned two vectors are. The top matches become the context sent to Bedrock.',
  },
  {
    title: 'Why retrieval quality matters',
    body: 'If the wrong chunks are retrieved, the model will still write a fluent answer, just not from the right notes. Chunk size, overlap, and the embedding model all change what gets found.',
  },
  {
    title: 'How Amazon Bedrock generates the answer',
    body: 'Retrieved chunks are placed in a prompt with your question. Bedrock Converse then generates an answer. This project uses that step last, after ingest, chunk, embed, and retrieve are done by hand.',
  },
  {
    title: 'The pipeline in this app',
    body: 'Upload notes, split them, embed with Titan, store vectors in SQLite, retrieve with numpy cosine search, then generate with Bedrock. No LangChain or LlamaIndex on purpose, so each stage stays visible.',
  },
]
