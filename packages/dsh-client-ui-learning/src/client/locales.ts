/** Locale dictionaries for the learning-space UI (zh primary). */

export const NS = 'learning-space'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  cardChapter: '打开章节',
  cardQuiz: '打开测验',
  cardBaseline: '打开测评',
  cardPlan: '打开总目录',
  cardOpen: '在学习空间中打开',
  cardExternal: '在外部打开',
  back: '返回 dsh',
  title: '学习空间',
  loading: '加载中…',
  noWorkspace: '当前会话目录没有学习工作区',
  connectFailed: '学习空间服务尚未连接',
  treePlan: '总目录',
  treeChapters: '章节',
  treeQuizzes: '测验',
  treeEmpty: '（空）',
  viewerFailed: '无法加载该文件',
  viewerTruncated: '文件已截断至 2 MB',
  viewerPick: '在左侧选择一个章节或测验',
  notes: '笔记',
  notesHint: '笔记会自动保存到工作区的笔记目录',
  notesEmpty: '本章还没有笔记，开始记录吧。',
  saving: '保存中…',
  saved: '已保存',
  saveFailed: '保存失败',
  workspace: '工作区',
  noteUl: '• 列表',
  noteOl: '1. 列表',
  noteCode: '代码',
  noteQuote: '引用',
  noteClear: '清除格式',
  noteBranchMain: '主笔记',
  noteBranchNew: '新建分支',
  noteBranchNamePlaceholder: '分支名…',
  quizSubmitted: '已交卷：答案已保存到工作区',
}

/** Union of this namespace's dictionary keys. */
export type LearningSpaceKey = keyof typeof zh

/** English dictionary (same key set). */
export const en: Record<LearningSpaceKey, string> = {
  cardChapter: 'Open chapter',
  cardQuiz: 'Open quiz',
  cardBaseline: 'Open assessment',
  cardPlan: 'Open master plan',
  cardOpen: 'Open in learning space',
  cardExternal: 'Open externally',
  back: 'Back to dsh',
  title: 'Learning space',
  loading: 'Loading…',
  noWorkspace: 'No learning workspace found in this session directory',
  connectFailed: 'Learning space service is not connected yet',
  treePlan: 'Plan',
  treeChapters: 'Chapters',
  treeQuizzes: 'Quizzes',
  treeEmpty: '(empty)',
  viewerFailed: 'Failed to load this file',
  viewerTruncated: 'File truncated to 2 MB',
  viewerPick: 'Pick a chapter or quiz on the left',
  notes: 'Notes',
  notesHint: 'Notes are saved automatically to the workspace notes folder',
  notesEmpty: 'This chapter has no note yet — start typing.',
  saving: 'Saving…',
  saved: 'Saved',
  saveFailed: 'Save failed',
  workspace: 'Workspace',
  noteUl: '• List',
  noteOl: '1. List',
  noteCode: 'Code',
  noteQuote: 'Quote',
  noteClear: 'Clear format',
  noteBranchMain: 'Main note',
  noteBranchNew: 'New branch',
  noteBranchNamePlaceholder: 'Branch name…',
  quizSubmitted: 'Submitted: answers saved to the workspace',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'learning-space': LearningSpaceKey
  }
}
