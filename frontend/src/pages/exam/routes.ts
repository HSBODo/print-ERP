import type { FC } from 'react'
import { ExamListPage } from './ExamListPage'
import { CataractExamListPage } from './CataractExamListPage'
import { AllExamListPage } from './AllExamListPage'
import { ExaminationPage } from './ExaminationPage'
import { ProcedureExamPage } from './ProcedureExamPage'
import { OverallExamPage } from './OverallExamPage'
import { OverallExamWeeklyPage } from './OverallExamWeeklyPage'

/** 검사(exam) 도메인 페이지 레지스트리 */
export const examPageRoutes: Record<string, FC> = {
  'exam-list': ExamListPage,
  'cataract-exam-list': CataractExamListPage,
  'all-exam-list': AllExamListPage,
  'examination': ExaminationPage,
  'procedure-exam': ProcedureExamPage,
  'overall-exam': OverallExamPage,
  'overall-exam-weekly': OverallExamWeeklyPage,
}
