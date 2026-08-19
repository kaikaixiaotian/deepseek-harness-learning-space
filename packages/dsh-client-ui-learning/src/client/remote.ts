/**
 * Hand-written Typert Remote contribution for the host 'learning' namespace.
 * Value-free: only type imports and a plain descriptor object, so the
 * client bundle inlines nothing beyond itself.
 */

import type {
  InvocationDescriptor,
  InvocationParameterDescriptor,
  RemoteResult,
  TypertCodec,
  TypertRemoteContribution,
  TypertRemoteNamespace,
} from '@deepseek-ai/dsh-typert-protocol'

/** Pass-through strict codec: the host is source-mode (no generated schema). */
const PASSTHROUGH: TypertCodec = {
  mode: 'strict',
  typeSymbol: 'learning/json',
  schema: { parse: (value: unknown) => value },
}

function parameter(name: string, acceptsUndefined = false): InvocationParameterDescriptor {
  return {
    name,
    wire: name,
    source: 'json',
    codec: PASSTHROUGH,
    ...(acceptsUndefined ? { acceptsUndefined: true as const } : {}),
  }
}

function descriptor(id: string, method: string, parameters: readonly string[], acceptsUndefined: readonly number[] = []): InvocationDescriptor {
  return {
    id,
    service: 'learning',
    namespace: 'learning',
    method,
    invocation: { kind: 'direct' },
    parameters: parameters.map((name, index) => parameter(name, acceptsUndefined.includes(index))),
    result: PASSTHROUGH,
  }
}

/** The contribution mounted at client-plugin apply time. */
export const learningContribution: TypertRemoteContribution = {
  package: 'dsh-learning',
  descriptors: [
    descriptor('dsh-learning#describe', 'describe', ['sessionId']),
    descriptor('dsh-learning#listDir', 'listDir', ['sessionId', 'root', 'path']),
    descriptor('dsh-learning#readFile', 'readFile', ['sessionId', 'root', 'path']),
    descriptor('dsh-learning#readNote', 'readNote', ['sessionId', 'root', 'chapterKey', 'branch'], [3]),
    descriptor('dsh-learning#writeNote', 'writeNote', ['sessionId', 'root', 'chapterKey', 'content', 'branch'], [4]),
    descriptor('dsh-learning#saveQuizAnswers', 'saveQuizAnswers', ['sessionId', 'root', 'quizPath', 'json']),
  ],
}

// - wire shapes -------------------------------------------------------------

export interface LearningWorkspaceDirs {
  readonly plan: string
  readonly chapters: string
  readonly quizzes: string
  readonly wiki: string
  readonly notes: string
}

export interface LearningWorkspaceView {
  readonly root: string
  readonly title: string
  readonly locale: string
  readonly dirs: LearningWorkspaceDirs
}

export interface LearningEntry {
  readonly name: string
  readonly path: string
  readonly kind: 'dir' | 'file'
}

/** Typed namespace face matching the host service method by method. */
export interface LearningNamespaceFace {
  describe(sessionId: string): Promise<RemoteResult<{ workspaces: LearningWorkspaceView[] }>>
  listDir(sessionId: string, root: string, path: string): Promise<RemoteResult<{ path: string; entries: LearningEntry[] }>>
  readFile(sessionId: string, root: string, path: string): Promise<RemoteResult<{ content: string; truncated: boolean }>>
  readNote(sessionId: string, root: string, chapterKey: string, branch?: string): Promise<RemoteResult<{ content: string }>>
  writeNote(sessionId: string, root: string, chapterKey: string, content: string, branch?: string): Promise<RemoteResult<{ saved: true }>>
  saveQuizAnswers(sessionId: string, root: string, quizPath: string, json: string): Promise<RemoteResult<{ saved: true; answersPath: string }>>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
    'learning/describe': LearningNamespaceFace['describe']
    'learning/listDir': LearningNamespaceFace['listDir']
    'learning/readFile': LearningNamespaceFace['readFile']
    'learning/readNote': LearningNamespaceFace['readNote']
    'learning/writeNote': LearningNamespaceFace['writeNote']
    'learning/saveQuizAnswers': LearningNamespaceFace['saveQuizAnswers']
  }
  interface TypertRemoteNamespaceMap {
    learning: TypertRemoteNamespace<'learning'>
  }
}

/** Unwrap a RemoteResult into its value, throwing a friendly Error. */
export async function unwrap<T>(result: RemoteResult<T>, what: string): Promise<T> {
  if (result.ok) return result.value
  throw new Error(what + ': ' + result.error.message)
}

// - mounted-face holder -------------------------------------------------------
// The shell.overlay slot does not support slot inject, so the namespace face
// is published through this module-level holder once $mount resolves.

let face: LearningNamespaceFace | null = null
const faceListeners = new Set<() => void>()

export function setLearningFace(next: LearningNamespaceFace | null): void {
  face = next
  for (const listener of [...faceListeners]) listener()
}

export function getLearningFace(): LearningNamespaceFace | null {
  return face
}

export function subscribeLearningFace(listener: () => void): () => void {
  faceListeners.add(listener)
  return () => { faceListeners.delete(listener) }
}
