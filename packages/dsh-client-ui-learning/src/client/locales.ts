/** Locale dictionaries for the learning-space UI (zh primary). */

export const NS = 'learning-space'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  cardChapter: '打开章节',
  cardQuiz: '打开测验',
  cardBaseline: '打开测评',
  cardPlan: '打开总目录',
  cardOpen: '在学习空间中打开',
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
  noteBranchInvalid: '分支名无效或已存在：仅限中英文、数字、- _，且不能与现有分支重复。',
  excerptToNotes: '摘录到笔记',
  excerptDone: '已加入笔记 ✓',
  excerptFail: '该文档暂不支持笔记',
  notesMapView: '总览',
  notesEditView: '编辑',
  notesMapEmpty: '暂无锚点关联——在章节中选中文字即可摘录到笔记',
  notesMapAnchorUnit: '条锚点',
  notesMapCoverLabel: '覆盖',
  notesMapSectionUnit: '个小节',
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
  noteBranchInvalid: 'Invalid or duplicate branch name: letters/digits/zh/-/_ only, and it must be new.',
  excerptToNotes: 'Excerpt to note',
  excerptDone: 'Added to note ✓',
  excerptFail: 'No note target for this document',
  notesMapView: 'Map',
  notesEditView: 'Edit',
  notesMapEmpty: 'No anchors yet — select text in the chapter to excerpt it into the note',
  notesMapAnchorUnit: 'anchors',
  notesMapCoverLabel: 'covering',
  notesMapSectionUnit: 'sections',
  quizSubmitted: 'Submitted: answers saved to the workspace',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'learning-space': LearningSpaceKey
  }
}
