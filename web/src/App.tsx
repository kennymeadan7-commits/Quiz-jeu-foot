import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'
import { type MissingGradePolicy } from './domain/services/average-calculator'
import { generateBulletinPdf } from './lib/pdf/bulletin-generator'
import {
  calculerMoyenneGenerale,
  calculerMoyenneMatiere,
  type MoyenneMatiere,
  type Note,
} from './utils/grades'

type Tab = 'dashboard' | 'classes' | 'students' | 'subjects' | 'grades' | 'reports'
type Period = 'S1' | 'S2' | 'Annuel'
type AssessmentType = 'Interrogation' | 'Devoir'

type ClassItem = { id: string; name: string; level: string }
type StudentItem = { id: string; firstName: string; lastName: string; classId: string }
type SubjectItem = { id: string; name: string; coefficient: number }
type GradeItem = {
  id: string
  studentId: string
  subjectId: string
  period: string
  assessmentType: AssessmentType
  grade: number | null
}
type ClassTemplate = { value: string; name: string; level: string }
type ClassAverageRow = { class_id: string; period: string; class_average: number }
type StudentAverageRow = { student_id: string; class_id: string; period: string; weighted_average: number }
type StudentRankingRow = {
  class_id: string
  period: string
  student_id: string
  weighted_average: number
  rank_in_class: number
}
type StudentSourceTable = 'eleves' | 'students'
type SemesterReportLine = {
  subject: string
  coefficient: number
  interroAverage: number | null
  devoir1: number | null
  devoir2: number | null
  composition: number | null
  subjectAverage: number | null
  total: number | null
  rank: string
  appreciation: string
  visa: string
}

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: 'S1', label: 'Semestre 1' },
  { value: 'S2', label: 'Semestre 2' },
  { value: 'Annuel', label: 'Annuel' },
]
const assessmentTypeOptions: AssessmentType[] = ['Interrogation', 'Devoir']

const modules: { key: Tab; name: string }[] = [
  { key: 'dashboard', name: 'Tableau de bord' },
  { key: 'classes', name: 'Classes' },
  { key: 'students', name: 'Élèves' },
  { key: 'subjects', name: 'Matières' },
  { key: 'grades', name: 'Notes' },
  { key: 'reports', name: 'Bulletins PDF' },
]

const tabRoutes: Record<Tab, string> = {
  dashboard: '/',
  classes: '/classes',
  students: '/eleves',
  subjects: '/matieres',
  grades: '/notes',
  reports: '/bulletins',
}

const schoolName = 'CEG 5 DOGBO'
const schoolYear = '2025-2026'
const formControlClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
const primaryButtonClass =
  'rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60'

const classTemplates: ClassTemplate[] = [
  { value: '6e-a', name: '6e A', level: '6e' },
  { value: '6e-b', name: '6e B', level: '6e' },
  { value: '5e-a', name: '5e A', level: '5e' },
  { value: '5e-b', name: '5e B', level: '5e' },
  { value: '4e-a', name: '4e A', level: '4e' },
  { value: '4e-b', name: '4e B', level: '4e' },
  { value: '3e-a', name: '3e A', level: '3e' },
  { value: '3e-b', name: '3e B', level: '3e' },
]

const demoClasses: ClassItem[] = [
  { id: 'cls-1', name: '4e A', level: '4e' },
  { id: 'cls-2', name: '3e B', level: '3e' },
]
const demoStudents: StudentItem[] = [
  { id: 'std-1', firstName: 'Aïcha', lastName: 'Diallo', classId: 'cls-1' },
  { id: 'std-2', firstName: 'Moussa', lastName: 'Camara', classId: 'cls-1' },
]
const demoSubjects: SubjectItem[] = [
  { id: 'sub-1', name: 'Mathématiques', coefficient: 4 },
  { id: 'sub-2', name: 'Français', coefficient: 3 },
]
const demoGrades: GradeItem[] = [
  { id: 'grd-1', studentId: 'std-1', subjectId: 'sub-1', period: 'S1', assessmentType: 'Interrogation', grade: 14 },
  { id: 'grd-2', studentId: 'std-1', subjectId: 'sub-2', period: 'S1', assessmentType: 'Devoir', grade: 12 },
  { id: 'grd-3', studentId: 'std-2', subjectId: 'sub-1', period: 'S1', assessmentType: 'Interrogation', grade: 10 },
  { id: 'grd-4', studentId: 'std-2', subjectId: 'sub-2', period: 'S1', assessmentType: 'Devoir', grade: 11 },
]

function normalizeAssessmentType(value: string | null | undefined): AssessmentType {
  return value?.toLowerCase() === 'devoir' ? 'Devoir' : 'Interrogation'
}

function getPeriodLabel(period: Period | string): string {
  if (period === 'S1') return 'Semestre 1'
  if (period === 'S2') return 'Semestre 2'
  if (period === 'Annuel') return 'Annuel'
  return period
}

function getTabFromPath(pathname: string): Tab {
  const normalizedPath = pathname.toLowerCase()
  const entry = Object.entries(tabRoutes).find(([, route]) => route === normalizedPath)
  return (entry?.[0] as Tab | undefined) ?? 'dashboard'
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: unknown }).message
    if (typeof msg === 'string' && msg.length > 0) return msg
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Erreur inconnue'
  }
}

function rankRows(rows: StudentAverageRow[]): StudentRankingRow[] {
  const grouped = new Map<string, StudentAverageRow[]>()
  for (const row of rows) {
    const key = `${row.class_id}::${row.period}`
    const list = grouped.get(key) ?? []
    list.push(row)
    grouped.set(key, list)
  }

  const ranking: StudentRankingRow[] = []
  for (const [key, list] of grouped) {
    const [classId, period] = key.split('::')
    const sorted = [...list].sort((a, b) => b.weighted_average - a.weighted_average)
    let previousAverage: number | null = null
    let rank = 0
    sorted.forEach((item, index) => {
      if (previousAverage === null || item.weighted_average !== previousAverage) rank = index + 1
      previousAverage = item.weighted_average
      ranking.push({
        class_id: classId,
        period,
        student_id: item.student_id,
        weighted_average: item.weighted_average,
        rank_in_class: rank,
      })
    })
  }
  return ranking
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [studentSourceTable, setStudentSourceTable] = useState<StudentSourceTable>('eleves')

  const activeTab = useMemo(() => getTabFromPath(location.pathname), [location.pathname])
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('S1')
  const [missingPolicy, setMissingPolicy] = useState<MissingGradePolicy>('ignore')

  const [classes, setClasses] = useState<ClassItem[]>(demoClasses)
  const [students, setStudents] = useState<StudentItem[]>(demoStudents)
  const [subjects, setSubjects] = useState<SubjectItem[]>(demoSubjects)
  const [grades, setGrades] = useState<GradeItem[]>(demoGrades)

  const [classAveragesView, setClassAveragesView] = useState<ClassAverageRow[]>([])
  const [studentAveragesView, setStudentAveragesView] = useState<StudentAverageRow[]>([])
  const [rankingView, setRankingView] = useState<StudentRankingRow[]>([])

  const [selectedClassTemplate, setSelectedClassTemplate] = useState(classTemplates[0].value)

  const [newStudentFirstName, setNewStudentFirstName] = useState('')
  const [newStudentLastName, setNewStudentLastName] = useState('')
  const [newStudentClassId, setNewStudentClassId] = useState('cls-1')

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectCoefficient, setNewSubjectCoefficient] = useState('1')

  const [newGradeStudentId, setNewGradeStudentId] = useState('std-1')
  const [newGradeSubjectId, setNewGradeSubjectId] = useState('sub-1')
  const [newGradePeriod, setNewGradePeriod] = useState<Period>('S1')
  const [newGradeAssessmentType, setNewGradeAssessmentType] = useState<AssessmentType>('Interrogation')
  const [newGradeValue, setNewGradeValue] = useState('10')
  const [newGradeMissing, setNewGradeMissing] = useState(false)
  const [massEntryMode, setMassEntryMode] = useState(false)
  const [massClassId, setMassClassId] = useState('cls-1')
  const [massSubjectId, setMassSubjectId] = useState('sub-1')
  const [massPeriod, setMassPeriod] = useState<Period>('S1')
  const [massAssessmentType, setMassAssessmentType] = useState<AssessmentType>('Interrogation')
  const [massGrades, setMassGrades] = useState<Record<string, string>>({})
  const massInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const [reportStudentId, setReportStudentId] = useState('std-1')
  const [reportPeriod, setReportPeriod] = useState<Period>('S1')
  const [reportSignerFullName, setReportSignerFullName] = useState('')

  const [editingClass, setEditingClass] = useState<Record<string, { name: string; level: string }>>({})
  const [editingStudent, setEditingStudent] = useState<
    Record<string, { firstName: string; lastName: string; classId: string }>
  >({})
  const [editingSubject, setEditingSubject] = useState<Record<string, { name: string; coefficient: string }>>({})
  const [editingGrade, setEditingGrade] = useState<
    Record<
      string,
      {
        studentId: string
        subjectId: string
        period: string
        assessmentType: AssessmentType
        grade: string
        missing: boolean
      }
    >
  >({})

  const isLoading = loading
  const error = errorMessage

  useEffect(() => {
    const knownRoutes = new Set(Object.values(tabRoutes))
    if (!knownRoutes.has(location.pathname.toLowerCase())) {
      navigate('/', { replace: true })
    }
  }, [location.pathname, navigate])

  async function fetchStudentsFromSupabase(): Promise<{
    sourceTable: StudentSourceTable
    rows: StudentItem[]
  }> {
    if (!supabase) return { sourceTable: 'eleves', rows: [] }

    const elevesRes = await supabase.from('eleves').select('*').order('nom')
    if (!elevesRes.error) {
      const rows = (elevesRes.data ?? []).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id ?? ''),
          firstName: String(r.prenom ?? r.first_name ?? r.firstname ?? ''),
          lastName: String(r.nom ?? r.last_name ?? r.lastname ?? ''),
          classId: String(r.classe_id ?? r.class_id ?? ''),
        } satisfies StudentItem
      })
      return { sourceTable: 'eleves', rows }
    }

    const studentsRes = await supabase.from('students').select('*').order('last_name')
    if (studentsRes.error) throw studentsRes.error
    const rows = (studentsRes.data ?? []).map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: String(r.id ?? ''),
        firstName: String(r.first_name ?? r.prenom ?? r.firstname ?? ''),
        lastName: String(r.last_name ?? r.nom ?? r.lastname ?? ''),
        classId: String(r.class_id ?? r.classe_id ?? ''),
      } satisfies StudentItem
    })
    return { sourceTable: 'students', rows }
  }

  async function loadRemoteData(period: Period) {
    if (!supabase) return
    setLoading(true)
    setErrorMessage(null)

    const studentsPromise = fetchStudentsFromSupabase()
    const [classesRes, studentsData, subjectsRes, classSubjectsRes, gradesRes, settingsRes, classAvgRes, studentAvgRes, rankingRes] =
      await Promise.all([
        supabase.from('classes').select('id, name, level').order('name'),
        studentsPromise,
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('class_subjects').select('subject_id, coefficient'),
        supabase
          .from('grades')
          .select('id, student_id, subject_id, period, assessment_label, grade')
          .order('created_at'),
        supabase.from('app_settings').select('missing_grade_policy').eq('id', true).maybeSingle(),
        supabase.from('v_class_averages').select('class_id, period, class_average').eq('period', period),
        supabase.from('v_student_averages').select('student_id, class_id, period, weighted_average').eq('period', period),
        supabase
          .from('v_student_ranking')
          .select('class_id, period, student_id, weighted_average, rank_in_class')
          .eq('period', period),
      ])

    if (classesRes.error) throw classesRes.error
    if (subjectsRes.error) throw subjectsRes.error
    if (classSubjectsRes.error) throw classSubjectsRes.error
    if (gradesRes.error) throw gradesRes.error
    if (settingsRes.error) throw settingsRes.error
    if (classAvgRes.error) throw classAvgRes.error
    if (studentAvgRes.error) throw studentAvgRes.error
    if (rankingRes.error) throw rankingRes.error

    const coefficientBySubject = new Map<string, number>()
    for (const row of classSubjectsRes.data ?? []) {
      if (!coefficientBySubject.has(row.subject_id)) coefficientBySubject.set(row.subject_id, Number(row.coefficient))
    }

    setClasses(
      (classesRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        level: row.level ?? '-',
      })),
    )
    setStudentSourceTable(studentsData.sourceTable)
    setStudents(studentsData.rows)
    setSubjects(
      (subjectsRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        coefficient: coefficientBySubject.get(row.id) ?? 1,
      })),
    )
    setGrades(
      (gradesRes.data ?? []).map((row) => ({
        id: row.id,
        studentId: row.student_id,
        subjectId: row.subject_id,
        period: row.period,
        assessmentType: normalizeAssessmentType(row.assessment_label),
        grade: row.grade === null ? null : Number(row.grade),
      })),
    )

    if (settingsRes.data?.missing_grade_policy === 'zero' || settingsRes.data?.missing_grade_policy === 'ignore') {
      setMissingPolicy(settingsRes.data.missing_grade_policy)
    }

    setClassAveragesView(
      (classAvgRes.data ?? []).map((row) => ({
        class_id: row.class_id,
        period: row.period,
        class_average: Number(row.class_average),
      })),
    )
    setStudentAveragesView(
      (studentAvgRes.data ?? []).map((row) => ({
        student_id: row.student_id,
        class_id: row.class_id,
        period: row.period,
        weighted_average: Number(row.weighted_average),
      })),
    )
    setRankingView(
      (rankingRes.data ?? []).map((row) => ({
        class_id: row.class_id,
        period: row.period,
        student_id: row.student_id,
        weighted_average: Number(row.weighted_average),
        rank_in_class: Number(row.rank_in_class),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    async function bootstrap() {
      if (!isRemoteMode) {
        setLoading(false)
        setErrorMessage('Supabase non configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
        return
      }
      try {
        await loadRemoteData(selectedPeriod)
      } catch (error) {
        setErrorMessage(`Erreur Supabase: ${getErrorMessage(error)}`)
        setLoading(false)
      }
    }
    void bootstrap()
  }, [isRemoteMode, selectedPeriod])

  useEffect(() => {
    if (classes.length > 0 && !classes.some((item) => item.id === newStudentClassId)) {
      setNewStudentClassId(classes[0].id)
    }
  }, [classes, newStudentClassId])

  useEffect(() => {
    if (students.length > 0 && !students.some((item) => item.id === newGradeStudentId)) {
      setNewGradeStudentId(students[0].id)
      setReportStudentId(students[0].id)
    }
  }, [students, newGradeStudentId])

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((item) => item.id === newGradeSubjectId)) {
      setNewGradeSubjectId(subjects[0].id)
    }
  }, [subjects, newGradeSubjectId])

  const localStudentAverages = useMemo(() => {
    const rows: StudentAverageRow[] = []
    students.forEach((student) => {
      const moyennesParMatiere: MoyenneMatiere[] = subjects.map((subject) => {
        const notesMatiere: Note[] = grades
          .filter(
            (grade) =>
              grade.studentId === student.id &&
              grade.period === selectedPeriod &&
              grade.subjectId === subject.id,
          )
          .flatMap((grade) => {
            if (grade.grade === null) {
              if (missingPolicy === 'zero') {
                return [
                  {
                    valeur: 0,
                    type: grade.assessmentType === 'Interrogation' ? 'interro' : 'devoir',
                  } satisfies Note,
                ]
              }
              return []
            }
            return [
              {
                valeur: grade.grade,
                type: grade.assessmentType === 'Interrogation' ? 'interro' : 'devoir',
              } satisfies Note,
            ]
          })

        return {
          moyenne: calculerMoyenneMatiere(notesMatiere),
          coefficient: subject.coefficient,
        }
      })

      const avg = calculerMoyenneGenerale(moyennesParMatiere)
      if (avg === null) return
      rows.push({
        student_id: student.id,
        class_id: student.classId,
        period: selectedPeriod,
        weighted_average: avg,
      })
    })
    return rows
  }, [students, grades, subjects, selectedPeriod, missingPolicy])

  const localClassAverages = useMemo(() => {
    const rows: ClassAverageRow[] = []
    classes.forEach((classItem) => {
      const classRows = localStudentAverages.filter((row) => row.class_id === classItem.id)
      if (classRows.length === 0) return
      const avg = classRows.reduce((acc, row) => acc + row.weighted_average, 0) / classRows.length
      rows.push({
        class_id: classItem.id,
        period: selectedPeriod,
        class_average: Number(avg.toFixed(2)),
      })
    })
    return rows
  }, [classes, localStudentAverages, selectedPeriod])

  const localRanking = useMemo(() => rankRows(localStudentAverages), [localStudentAverages])

  const dashboardClassAverages: ClassAverageRow[] = isRemoteMode ? classAveragesView : localClassAverages
  const dashboardStudentAverages: StudentAverageRow[] = isRemoteMode
    ? studentAveragesView
    : localStudentAverages
  const dashboardRanking: StudentRankingRow[] = isRemoteMode ? rankingView : localRanking

  const headlineAverage = dashboardClassAverages.length > 0 ? `${dashboardClassAverages[0].class_average.toFixed(2)} / 20` : '-- / 20'
  const missingNotesCount = grades.filter((grade) => grade.grade === null).length

  function buildSemesterReportLines(studentId: string, period: Period): SemesterReportLine[] {
    const lines = subjects.map((subject) => {
      const subjectGrades = grades.filter(
        (row) => row.studentId === studentId && row.period === period && row.subjectId === subject.id,
      )

      const normalized = subjectGrades
        .map((row) => {
          if (row.grade === null) {
            if (missingPolicy === 'zero') return { type: row.assessmentType, value: 0 }
            return null
          }
          return { type: row.assessmentType, value: row.grade }
        })
        .filter((entry): entry is { type: AssessmentType; value: number } => entry !== null)

      const interroValues = normalized
        .filter((entry) => entry.type === 'Interrogation')
        .map((entry) => entry.value)
      const devoirValues = normalized
        .filter((entry) => entry.type === 'Devoir')
        .map((entry) => entry.value)

      const interroAverage =
        interroValues.length > 0
          ? roundToTwo(interroValues.reduce((acc, value) => acc + value, 0) / interroValues.length)
          : null

      const devoir1 = devoirValues[0] ?? null
      const devoir2 = devoirValues[1] ?? null

      // Synthèse composition: moyenne des devoirs disponibles.
      const composition =
        devoirValues.length > 0
          ? roundToTwo(devoirValues.reduce((acc, value) => acc + value, 0) / devoirValues.length)
          : null

      let subjectAverage: number | null = null
      if (interroAverage !== null && composition !== null) {
        subjectAverage = roundToTwo((interroAverage + 2 * composition) / 3)
      } else if (interroAverage !== null) {
        subjectAverage = interroAverage
      } else if (composition !== null) {
        subjectAverage = composition
      }

      const total = subjectAverage === null ? null : roundToTwo(subjectAverage * subject.coefficient)

      return {
        subject: subject.name,
        coefficient: subject.coefficient,
        interroAverage,
        devoir1,
        devoir2,
        composition,
        subjectAverage,
        total,
        rank: '-',
        appreciation: subjectAverage === null ? '' : subjectAverage >= 14 ? 'Très bien' : subjectAverage >= 10 ? 'Assez bien' : 'Insuff.',
        visa: '',
      }
    })

    const ranked = lines.filter((line) => line.total !== null).sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    let currentRank = 0
    let previousTotal: number | null = null
    ranked.forEach((line, index) => {
      if (previousTotal === null || line.total !== previousTotal) currentRank = index + 1
      previousTotal = line.total
      line.rank = String(currentRank)
    })

    return lines
  }

  function classLabel(classId: string): string {
    const c = classes.find((item) => item.id === classId)
    return c ? `${c.name} (${c.level})` : classId
  }

  function studentLabel(studentId: string): string {
    const s = students.find((item) => item.id === studentId)
    return s ? `${s.firstName} ${s.lastName}` : studentId
  }

  const reportStudent = useMemo(
    () => students.find((item) => item.id === reportStudentId) ?? null,
    [students, reportStudentId],
  )
  const reportClass = useMemo(
    () => classes.find((item) => item.id === reportStudent?.classId) ?? null,
    [classes, reportStudent],
  )
  const reportLines = useMemo(
    () => (reportStudent ? buildSemesterReportLines(reportStudent.id, reportPeriod) : []),
    [reportStudent, reportPeriod, subjects, grades, missingPolicy],
  )
  const reportAverage = useMemo(() => {
    const valid = reportLines.filter((line) => line.subjectAverage !== null)
    const coefSum = valid.reduce((sum, line) => sum + line.coefficient, 0)
    if (coefSum === 0) return null
    const total = valid.reduce((sum, line) => sum + (line.total ?? 0), 0)
    return roundToTwo(total / coefSum)
  }, [reportLines])
  const reportRank = useMemo(() => {
    if (!reportStudent) return null
    const rankRow = dashboardRanking.find(
      (row) => row.student_id === reportStudent.id && row.period === reportPeriod,
    )
    return rankRow?.rank_in_class ?? null
  }, [dashboardRanking, reportPeriod, reportStudent])
  const reportClassStudents = useMemo(
    () => (reportClass ? students.filter((item) => item.classId === reportClass.id) : []),
    [reportClass, students],
  )
  const reportClassRows = useMemo(
    () =>
      reportClass
        ? dashboardStudentAverages.filter(
            (row) => row.class_id === reportClass.id && row.period === reportPeriod,
          )
        : [],
    [dashboardStudentAverages, reportClass, reportPeriod],
  )
  const classAverageForPeriod = useMemo(() => {
    if (!reportClass) return null
    const row = dashboardClassAverages.find(
      (item) => item.class_id === reportClass.id && item.period === reportPeriod,
    )
    return row?.class_average ?? null
  }, [dashboardClassAverages, reportClass, reportPeriod])
  const classBestAverage = useMemo(() => {
    if (reportClassRows.length === 0) return null
    return Math.max(...reportClassRows.map((row) => row.weighted_average))
  }, [reportClassRows])
  const classWeakAverage = useMemo(() => {
    if (reportClassRows.length === 0) return null
    return Math.min(...reportClassRows.map((row) => row.weighted_average))
  }, [reportClassRows])
  const classAboveAverageCount = useMemo(
    () => reportClassRows.filter((row) => row.weighted_average >= 10).length,
    [reportClassRows],
  )
  const reportAbsences = useMemo(
    () =>
      reportStudent
        ? grades.filter(
            (row) => row.studentId === reportStudent.id && row.period === reportPeriod && row.grade === null,
          ).length
        : 0,
    [grades, reportPeriod, reportStudent],
  )
  const recapSem1 = useMemo(() => {
    if (!reportStudent) return null
    const row = dashboardStudentAverages.find((item) => item.student_id === reportStudent.id && item.period === 'S1')
    return row?.weighted_average ?? null
  }, [dashboardStudentAverages, reportStudent])
  const recapSem2 = useMemo(() => {
    if (!reportStudent) return null
    const row = dashboardStudentAverages.find((item) => item.student_id === reportStudent.id && item.period === 'S2')
    return row?.weighted_average ?? null
  }, [dashboardStudentAverages, reportStudent])
  const recapAnnuel = useMemo(() => {
    if (!reportStudent) return null
    const row = dashboardStudentAverages.find(
      (item) => item.student_id === reportStudent.id && item.period === 'Annuel',
    )
    if (row) return row.weighted_average
    if (recapSem1 !== null && recapSem2 !== null) return roundToTwo((recapSem1 + recapSem2) / 2)
    return null
  }, [dashboardStudentAverages, recapSem1, recapSem2, reportStudent])
  const massStudents = useMemo(
    () => students.filter((student) => student.classId === massClassId),
    [students, massClassId],
  )

  useEffect(() => {
    if (classes.length > 0 && !classes.some((item) => item.id === massClassId)) {
      setMassClassId(classes[0].id)
    }
  }, [classes, massClassId])

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((item) => item.id === massSubjectId)) {
      setMassSubjectId(subjects[0].id)
    }
  }, [subjects, massSubjectId])

  useEffect(() => {
    if (!massClassId || !massSubjectId) return
    const nextGrades: Record<string, string> = {}
    massStudents.forEach((student) => {
      const existing = grades.find(
        (row) =>
          row.studentId === student.id &&
          row.subjectId === massSubjectId &&
          row.period === massPeriod &&
          row.assessmentType === massAssessmentType,
      )
      nextGrades[student.id] = existing?.grade === null || existing?.grade === undefined ? '' : String(existing.grade)
    })
    massInputRefs.current = []
    setMassGrades(nextGrades)
  }, [grades, massAssessmentType, massClassId, massPeriod, massStudents, massSubjectId])

  async function addClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const template = classTemplates.find((item) => item.value === selectedClassTemplate)
    if (!template) return
    if (classes.some((item) => item.name === template.name && item.level === template.level)) {
      setActionMessage('Cette classe existe déjà.')
      return
    }

    if (!supabase) return
    setSubmitting(true)
    setActionMessage(null)
    try {
      const year = new Date().getFullYear()
      const code = `CLS-${template.name.toUpperCase().replaceAll(' ', '-')}-${Date.now().toString().slice(-4)}`
      const { data, error } = await supabase
        .from('classes')
        .insert({
          code,
          name: template.name,
          level: template.level,
          academic_year: `${year}-${year + 1}`,
        })
        .select('id')
        .single()
      if (error) throw error

      if (data && subjects.length > 0) {
        const payload = subjects.map((subject) => ({
          class_id: data.id,
          subject_id: subject.id,
          coefficient: subject.coefficient,
        }))
        const { error: relationError } = await supabase.from('class_subjects').insert(payload)
        if (relationError) throw relationError
      }
      await loadRemoteData(selectedPeriod)
      setActionMessage('Classe ajoutée.')
    } catch (error) {
      setActionMessage(`Erreur ajout classe: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateClass(classId: string) {
    const row = editingClass[classId]
    if (!row || !supabase) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('classes').update({ name: row.name, level: row.level }).eq('id', classId)
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Classe modifiée.')
      setEditingClass((prev) => {
        const next = { ...prev }
        delete next[classId]
        return next
      })
    } catch (error) {
      setActionMessage(`Erreur modification classe: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteClass(classId: string) {
    if (!supabase) return
    setSubmitting(true)
    try {
      const studentIds = students.filter((s) => s.classId === classId).map((s) => s.id)
      if (studentIds.length > 0) {
        const { error: gradesErr } = await supabase.from('grades').delete().in('student_id', studentIds)
        if (gradesErr) throw gradesErr
      }
      const studentClassColumn = studentSourceTable === 'eleves' ? 'classe_id' : 'class_id'
      const { error: studentsErr } = await supabase
        .from(studentSourceTable)
        .delete()
        .eq(studentClassColumn, classId)
      if (studentsErr) throw studentsErr
      const { error: relErr } = await supabase.from('class_subjects').delete().eq('class_id', classId)
      if (relErr) throw relErr
      const { error: classErr } = await supabase.from('classes').delete().eq('id', classId)
      if (classErr) throw classErr
      await loadRemoteData(selectedPeriod)
      setActionMessage('Classe supprimée.')
    } catch (error) {
      setActionMessage(`Erreur suppression classe: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newStudentFirstName.trim() || !newStudentLastName.trim() || !newStudentClassId || !supabase) return
    setSubmitting(true)
    try {
      if (studentSourceTable === 'eleves') {
        const { error } = await supabase.from('eleves').insert({
          prenom: newStudentFirstName.trim(),
          nom: newStudentLastName.trim(),
          classe_id: newStudentClassId,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('students').insert({
          first_name: newStudentFirstName.trim(),
          last_name: newStudentLastName.trim(),
          class_id: newStudentClassId,
        })
        if (error) throw error
      }
      await loadRemoteData(selectedPeriod)
      setNewStudentFirstName('')
      setNewStudentLastName('')
      setActionMessage('Élève ajouté.')
    } catch (error) {
      setActionMessage(`Erreur ajout élève: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStudent(studentId: string) {
    const row = editingStudent[studentId]
    if (!row || !supabase) return
    setSubmitting(true)
    try {
      if (studentSourceTable === 'eleves') {
        const { error } = await supabase
          .from('eleves')
          .update({
            prenom: row.firstName,
            nom: row.lastName,
            classe_id: row.classId,
          })
          .eq('id', studentId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('students')
          .update({
            first_name: row.firstName,
            last_name: row.lastName,
            class_id: row.classId,
          })
          .eq('id', studentId)
        if (error) throw error
      }
      await loadRemoteData(selectedPeriod)
      setActionMessage('Élève modifié.')
      setEditingStudent((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
    } catch (error) {
      setActionMessage(`Erreur modification élève: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteStudent(studentId: string) {
    if (!supabase) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from(studentSourceTable).delete().eq('id', studentId)
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Élève supprimé.')
    } catch (error) {
      setActionMessage(`Erreur suppression élève: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coefficient = Number(newSubjectCoefficient)
    if (!newSubjectName.trim() || Number.isNaN(coefficient) || coefficient <= 0 || !supabase) return
    setSubmitting(true)
    try {
      const code = `SUB-${newSubjectName.trim().toUpperCase().replaceAll(' ', '-')}-${Date.now().toString().slice(-4)}`
      const { data, error } = await supabase.from('subjects').insert({ code, name: newSubjectName.trim() }).select('id').single()
      if (error) throw error

      if (data && classes.length > 0) {
        const payload = classes.map((classItem) => ({
          class_id: classItem.id,
          subject_id: data.id,
          coefficient,
        }))
        const { error: relErr } = await supabase.from('class_subjects').insert(payload)
        if (relErr) throw relErr
      }
      await loadRemoteData(selectedPeriod)
      setNewSubjectName('')
      setNewSubjectCoefficient('1')
      setActionMessage('Matière ajoutée.')
    } catch (error) {
      setActionMessage(`Erreur ajout matière: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateSubject(subjectId: string) {
    const row = editingSubject[subjectId]
    if (!row || !supabase) return
    const coefficient = Number(row.coefficient)
    if (Number.isNaN(coefficient) || coefficient <= 0) {
      setActionMessage('Coefficient invalide.')
      return
    }
    setSubmitting(true)
    try {
      const { error: subjectErr } = await supabase.from('subjects').update({ name: row.name }).eq('id', subjectId)
      if (subjectErr) throw subjectErr
      const { error: relErr } = await supabase.from('class_subjects').update({ coefficient }).eq('subject_id', subjectId)
      if (relErr) throw relErr
      await loadRemoteData(selectedPeriod)
      setActionMessage('Matière modifiée.')
      setEditingSubject((prev) => {
        const next = { ...prev }
        delete next[subjectId]
        return next
      })
    } catch (error) {
      setActionMessage(`Erreur modification matière: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSubject(subjectId: string) {
    if (!supabase) return
    setSubmitting(true)
    try {
      const { error: gradesErr } = await supabase.from('grades').delete().eq('subject_id', subjectId)
      if (gradesErr) throw gradesErr
      const { error: relErr } = await supabase.from('class_subjects').delete().eq('subject_id', subjectId)
      if (relErr) throw relErr
      const { error: subjectErr } = await supabase.from('subjects').delete().eq('id', subjectId)
      if (subjectErr) throw subjectErr
      await loadRemoteData(selectedPeriod)
      setActionMessage('Matière supprimée.')
    } catch (error) {
      setActionMessage(`Erreur suppression matière: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  function handleMassCellNavigation(event: KeyboardEvent<HTMLInputElement>, rowIndex: number): void {
    if (event.key !== 'Enter' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const direction = event.key === 'ArrowUp' ? -1 : 1
    const nextIndex = rowIndex + direction
    if (nextIndex < 0 || nextIndex >= massStudents.length) return
    massInputRefs.current[nextIndex]?.focus()
    massInputRefs.current[nextIndex]?.select()
  }

  async function saveMassEntry(): Promise<void> {
    if (!supabase || !massClassId || !massSubjectId) return
    const client = supabase
    if (massStudents.length === 0) {
      setActionMessage('Aucun élève dans cette classe.')
      return
    }

    const updates: Array<{ id: string; grade: number | null }> = []
    const inserts: Array<{
      student_id: string
      subject_id: string
      period: Period
      assessment_label: AssessmentType
      grade: number | null
    }> = []

    for (const student of massStudents) {
      const raw = (massGrades[student.id] ?? '').trim()
      const parsed = raw === '' ? null : Number(raw)
      if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 20)) {
        setActionMessage(`Note invalide pour ${student.firstName} ${student.lastName}. Utilise une valeur entre 0 et 20.`)
        return
      }

      const existing = grades.find(
        (row) =>
          row.studentId === student.id &&
          row.subjectId === massSubjectId &&
          row.period === massPeriod &&
          row.assessmentType === massAssessmentType,
      )

      if (existing) {
        updates.push({ id: existing.id, grade: parsed })
      } else {
        inserts.push({
          student_id: student.id,
          subject_id: massSubjectId,
          period: massPeriod,
          assessment_label: massAssessmentType,
          grade: parsed,
        })
      }
    }

    setSubmitting(true)
    try {
      if (updates.length > 0) {
        await Promise.all(
          updates.map(async (item) => {
            const { error } = await client.from('grades').update({ grade: item.grade }).eq('id', item.id)
            if (error) throw error
          }),
        )
      }

      if (inserts.length > 0) {
        const { error } = await client.from('grades').insert(inserts)
        if (error) throw error
      }

      await loadRemoteData(selectedPeriod)
      setActionMessage(`Saisie de masse enregistrée (${massStudents.length} élèves).`)
    } catch (error) {
      setActionMessage(`Erreur saisie de masse: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function addGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newGradeStudentId || !newGradeSubjectId || !supabase) return
    const numericValue = Number(newGradeValue)
    const isValid = newGradeMissing || (!Number.isNaN(numericValue) && numericValue >= 0 && numericValue <= 20)
    if (!isValid) {
      setActionMessage('La note doit être entre 0 et 20.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('grades').insert({
        student_id: newGradeStudentId,
        subject_id: newGradeSubjectId,
        period: newGradePeriod,
        assessment_label: newGradeAssessmentType,
        grade: newGradeMissing ? null : numericValue,
      })
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Note ajoutée.')
      setNewGradeValue('10')
      setNewGradeMissing(false)
      setNewGradeAssessmentType('Interrogation')
    } catch (error) {
      setActionMessage(`Erreur ajout note: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateGrade(gradeId: string) {
    const row = editingGrade[gradeId]
    if (!row || !supabase) return
    const numericValue = Number(row.grade)
    const isValid = row.missing || (!Number.isNaN(numericValue) && numericValue >= 0 && numericValue <= 20)
    if (!isValid) {
      setActionMessage('La note doit être entre 0 et 20.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('grades')
        .update({
          student_id: row.studentId,
          subject_id: row.subjectId,
          period: row.period,
          assessment_label: row.assessmentType,
          grade: row.missing ? null : numericValue,
        })
        .eq('id', gradeId)
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Note modifiée.')
      setEditingGrade((prev) => {
        const next = { ...prev }
        delete next[gradeId]
        return next
      })
    } catch (error) {
      setActionMessage(`Erreur modification note: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteGrade(gradeId: string) {
    if (!supabase) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('grades').delete().eq('id', gradeId)
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Note supprimée.')
    } catch (error) {
      setActionMessage(`Erreur suppression note: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateMissingPolicy(policy: MissingGradePolicy) {
    setMissingPolicy(policy)
    if (!supabase) return
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: true, missing_grade_policy: policy }, { onConflict: 'id' })
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Politique de note manquante mise à jour.')
    } catch (error) {
      setActionMessage(`Erreur mise à jour politique: ${getErrorMessage(error)}`)
    }
  }

  function exportBulletin() {
    const student = students.find((item) => item.id === reportStudentId)
    if (!student) {
      setActionMessage('Choisis un élève pour exporter le bulletin.')
      return
    }
    const studentClass = classes.find((item) => item.id === student.classId)
    const lines = buildSemesterReportLines(student.id, reportPeriod)
    const validLines = lines.filter((line) => line.subjectAverage !== null)
    const coefSum = validLines.reduce((sum, line) => sum + line.coefficient, 0)
    const calculatedAverage =
      coefSum === 0 ? null : roundToTwo(validLines.reduce((sum, line) => sum + (line.total ?? 0), 0) / coefSum)
    const rankRow = dashboardRanking.find((row) => row.student_id === student.id && row.period === reportPeriod)

    generateBulletinPdf({
      studentFullName: `${student.firstName} ${student.lastName}`,
      className: studentClass ? `${studentClass.name} (${studentClass.level})` : 'N/A',
      period: getPeriodLabel(reportPeriod),
      schoolYear,
      average: calculatedAverage,
      rank: rankRow?.rank_in_class ?? null,
      missingPolicy,
      signerFullName: reportSignerFullName.trim(),
      lines,
    })
    setActionMessage('Bulletin exporté en PDF.')
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-7 text-white shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wider text-slate-100">
            {schoolName}
          </p>
          <BeninFlagBadge />
        </div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Gestion des moyennes scolaires - {schoolName}</h1>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meilleure moyenne classe" value={isLoading ? '...' : headlineAverage} />
        <StatCard label="Élèves" value={String(students.length)} />
        <StatCard label="Notes manquantes" value={String(missingNotesCount)} />
        <StatCard label="Source" value={isRemoteMode ? 'Supabase' : 'Local'} />
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur lg:sticky lg:top-6 lg:h-fit">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Menu latéral</h2>
          <nav className="space-y-2">
            {modules.map((module) => (
              <button
                key={module.key}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  activeTab === module.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => navigate(tabRoutes[module.key])}
              >
                <span>{module.name}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-slate-200 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Semestre</span>
                <select
                  className={formControlClass}
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value as Period)}
                >
                  {periodOptions.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Note manquante</span>
                <select
                  className={formControlClass}
                  value={missingPolicy}
                  onChange={(event) => void updateMissingPolicy(event.target.value as MissingGradePolicy)}
                >
                  <option value="ignore">ignore</option>
                  <option value="zero">zero</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl bg-white/95 p-5 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {actionMessage ? <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{actionMessage}</p> : null}
        {error ? <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</p> : null}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
            <SimpleTable
              title={`Moyennes de classe (${getPeriodLabel(selectedPeriod)})`}
              headers={['Classe', 'Moyenne']}
              rows={dashboardClassAverages.map((row) => [classLabel(row.class_id), `${row.class_average.toFixed(2)} / 20`])}
              emptyText="Aucune moyenne de classe disponible."
            />

            <SimpleTable
              title={`Moyennes élèves (${getPeriodLabel(selectedPeriod)})`}
              headers={['Élève', 'Classe', 'Moyenne']}
              rows={dashboardStudentAverages.map((row) => [
                studentLabel(row.student_id),
                classLabel(row.class_id),
                `${row.weighted_average.toFixed(2)} / 20`,
              ])}
              emptyText="Aucune moyenne élève disponible."
            />

            <SimpleTable
              title={`Classement (${getPeriodLabel(selectedPeriod)})`}
              headers={['Rang', 'Élève', 'Classe', 'Moyenne']}
              rows={dashboardRanking
                .sort((a, b) => a.rank_in_class - b.rank_in_class)
                .map((row) => [
                  String(row.rank_in_class),
                  studentLabel(row.student_id),
                  classLabel(row.class_id),
                  `${row.weighted_average.toFixed(2)} / 20`,
                ])}
              emptyText="Aucun classement disponible."
            />
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">CRUD Classes</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void addClass(event)}>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={selectedClassTemplate}
                onChange={(event) => setSelectedClassTemplate(event.target.value)}
              >
                {classTemplates.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.name} ({item.level})
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>
                {submitting ? 'Traitement...' : 'Ajouter classe'}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Niveau</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {classes.map((row) => {
                    const edit = editingClass[row.id] ?? { name: row.name, level: row.level }
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            value={edit.name}
                            onChange={(event) =>
                              setEditingClass((prev) => ({ ...prev, [row.id]: { ...edit, name: event.target.value } }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            value={edit.level}
                            onChange={(event) =>
                              setEditingClass((prev) => ({ ...prev, [row.id]: { ...edit, level: event.target.value } }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button type="button" className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-500" onClick={() => void updateClass(row.id)}>
                            Enregistrer
                          </button>
                          <button type="button" className="rounded-md bg-rose-600 px-2.5 py-1.5 text-white hover:bg-rose-500" onClick={() => void deleteClass(row.id)}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">CRUD Élèves</h2>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => void addStudent(event)}>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Prénom"
                value={newStudentFirstName}
                onChange={(event) => setNewStudentFirstName(event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Nom"
                value={newStudentLastName}
                onChange={(event) => setNewStudentLastName(event.target.value)}
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={newStudentClassId}
                onChange={(event) => setNewStudentClassId(event.target.value)}
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>
                {submitting ? 'Traitement...' : 'Ajouter élève'}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Prénom</th>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Classe</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students.map((row) => {
                    const edit = editingStudent[row.id] ?? {
                      firstName: row.firstName,
                      lastName: row.lastName,
                      classId: row.classId,
                    }
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            value={edit.firstName}
                            onChange={(event) =>
                              setEditingStudent((prev) => ({ ...prev, [row.id]: { ...edit, firstName: event.target.value } }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            value={edit.lastName}
                            onChange={(event) =>
                              setEditingStudent((prev) => ({ ...prev, [row.id]: { ...edit, lastName: event.target.value } }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            value={edit.classId}
                            onChange={(event) =>
                              setEditingStudent((prev) => ({ ...prev, [row.id]: { ...edit, classId: event.target.value } }))
                            }
                          >
                            {classes.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button type="button" className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-500" onClick={() => void updateStudent(row.id)}>
                            Enregistrer
                          </button>
                          <button type="button" className="rounded-md bg-rose-600 px-2.5 py-1.5 text-white hover:bg-rose-500" onClick={() => void deleteStudent(row.id)}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">CRUD Matières</h2>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => void addSubject(event)}>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Matière"
                value={newSubjectName}
                onChange={(event) => setNewSubjectName(event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                type="number"
                min="0.5"
                step="0.5"
                placeholder="Coefficient"
                value={newSubjectCoefficient}
                onChange={(event) => setNewSubjectCoefficient(event.target.value)}
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>
                {submitting ? 'Traitement...' : 'Ajouter matière'}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Matière</th>
                    <th className="px-3 py-2">Coefficient</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {subjects.map((row) => {
                    const edit = editingSubject[row.id] ?? { name: row.name, coefficient: String(row.coefficient) }
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            value={edit.name}
                            onChange={(event) =>
                              setEditingSubject((prev) => ({ ...prev, [row.id]: { ...edit, name: event.target.value } }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1"
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={edit.coefficient}
                            onChange={(event) =>
                              setEditingSubject((prev) => ({ ...prev, [row.id]: { ...edit, coefficient: event.target.value } }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button type="button" className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-500" onClick={() => void updateSubject(row.id)}>
                            Enregistrer
                          </button>
                          <button type="button" className="rounded-md bg-rose-600 px-2.5 py-1.5 text-white hover:bg-rose-500" onClick={() => void deleteSubject(row.id)}>
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Notes</h2>
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  massEntryMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
                onClick={() => setMassEntryMode((prev) => !prev)}
              >
                {massEntryMode ? 'Mass Entry Mode: Activé' : 'Activer Mass Entry Mode'}
              </button>
            </div>

            {!massEntryMode && (
              <>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Saisie individuelle</h3>
                <form
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-4"
                  onSubmit={(event) => void addGrade(event)}
                >
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Élève</span>
                <select
                  className={formControlClass}
                  value={newGradeStudentId}
                  onChange={(event) => setNewGradeStudentId(event.target.value)}
                >
                  {students.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.firstName} {item.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Matière</span>
                <select
                  className={formControlClass}
                  value={newGradeSubjectId}
                  onChange={(event) => setNewGradeSubjectId(event.target.value)}
                >
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Semestre</span>
                <select
                  className={formControlClass}
                  value={newGradePeriod}
                  onChange={(event) => setNewGradePeriod(event.target.value as Period)}
                >
                  {periodOptions.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</span>
                <select
                  className={formControlClass}
                  value={newGradeAssessmentType}
                  onChange={(event) => setNewGradeAssessmentType(event.target.value as AssessmentType)}
                >
                  {assessmentTypeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Note /20</span>
                <input
                  className={formControlClass}
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  placeholder="Ex: 14.5"
                  value={newGradeValue}
                  onChange={(event) => setNewGradeValue(event.target.value)}
                  disabled={newGradeMissing}
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  type="checkbox"
                  checked={newGradeMissing}
                  onChange={(event) => setNewGradeMissing(event.target.checked)}
                />
                Absente
              </label>
              <div className="xl:col-span-2 xl:flex xl:items-end">
                <button className={`${primaryButtonClass} w-full xl:w-auto`} disabled={submitting}>
                  {submitting ? 'Traitement...' : 'Ajouter note'}
                </button>
              </div>
                </form>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-3 py-2">Élève</th>
                        <th className="px-3 py-2">Matière</th>
                        <th className="px-3 py-2">Semestre</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Note</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {grades.map((row) => {
                        const edit = editingGrade[row.id] ?? {
                          studentId: row.studentId,
                          subjectId: row.subjectId,
                          period: row.period,
                          assessmentType: row.assessmentType,
                          grade: row.grade?.toString() ?? '',
                          missing: row.grade === null,
                        }

                        return (
                          <tr key={row.id}>
                            <td className="px-3 py-2">
                              <select
                                className="w-full rounded border border-slate-300 px-2 py-1"
                                value={edit.studentId}
                                onChange={(event) =>
                                  setEditingGrade((prev) => ({ ...prev, [row.id]: { ...edit, studentId: event.target.value } }))
                                }
                              >
                                {students.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.firstName} {item.lastName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full rounded border border-slate-300 px-2 py-1"
                                value={edit.subjectId}
                                onChange={(event) =>
                                  setEditingGrade((prev) => ({ ...prev, [row.id]: { ...edit, subjectId: event.target.value } }))
                                }
                              >
                                {subjects.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full rounded border border-slate-300 px-2 py-1"
                                value={edit.period}
                                onChange={(event) =>
                                  setEditingGrade((prev) => ({ ...prev, [row.id]: { ...edit, period: event.target.value } }))
                                }
                              >
                                {periodOptions.map((period) => (
                                  <option key={period.value} value={period.value}>
                                    {period.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full rounded border border-slate-300 px-2 py-1"
                                value={edit.assessmentType}
                                onChange={(event) =>
                                  setEditingGrade((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...edit,
                                      assessmentType: event.target.value as AssessmentType,
                                    },
                                  }))
                                }
                              >
                                {assessmentTypeOptions.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <input
                                  className="w-full rounded border border-slate-300 px-2 py-1"
                                  type="number"
                                  min="0"
                                  max="20"
                                  step="0.25"
                                  value={edit.grade}
                                  disabled={edit.missing}
                                  onChange={(event) =>
                                    setEditingGrade((prev) => ({ ...prev, [row.id]: { ...edit, grade: event.target.value } }))
                                  }
                                />
                                <label className="text-xs">
                                  <input
                                    className="mr-1"
                                    type="checkbox"
                                    checked={edit.missing}
                                    onChange={(event) =>
                                      setEditingGrade((prev) => ({
                                        ...prev,
                                        [row.id]: { ...edit, missing: event.target.checked },
                                      }))
                                    }
                                  />
                                  Abs
                                </label>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                                <button type="button" className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500" onClick={() => void updateGrade(row.id)}>
                                  Enregistrer
                                </button>
                                <button type="button" className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500" onClick={() => void deleteGrade(row.id)}>
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {massEntryMode && (
              <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
                <p className="text-sm font-medium text-indigo-900">
                  Mode saisie de masse (clavier): Entrée/Flèche bas = ligne suivante, Flèche haut = ligne précédente.
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Classe</span>
                    <select className={formControlClass} value={massClassId} onChange={(event) => setMassClassId(event.target.value)}>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Matière</span>
                    <select className={formControlClass} value={massSubjectId} onChange={(event) => setMassSubjectId(event.target.value)}>
                      {subjects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Semestre</span>
                    <select className={formControlClass} value={massPeriod} onChange={(event) => setMassPeriod(event.target.value as Period)}>
                      {periodOptions.map((period) => (
                        <option key={period.value} value={period.value}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</span>
                    <select
                      className={formControlClass}
                      value={massAssessmentType}
                      onChange={(event) => setMassAssessmentType(event.target.value as AssessmentType)}
                    >
                      {assessmentTypeOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  className="overflow-x-auto rounded-xl border border-slate-300 bg-white"
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                      event.preventDefault()
                      void saveMassEntry()
                    }
                  }}
                >
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-left">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Élève</th>
                        <th className="px-3 py-2">Note /20</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {massStudents.map((student, index) => (
                        <tr key={student.id} className="odd:bg-white even:bg-slate-50/70">
                          <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              ref={(element) => {
                                massInputRefs.current[index] = element
                              }}
                              className={`${formControlClass} max-w-[140px]`}
                              type="text"
                              inputMode="decimal"
                              placeholder="vide = abs"
                              value={massGrades[student.id] ?? ''}
                              onChange={(event) =>
                                setMassGrades((prev) => ({ ...prev, [student.id]: event.target.value }))
                              }
                              onFocus={(event) => event.currentTarget.select()}
                              onKeyDown={(event) => handleMassCellNavigation(event, index)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={primaryButtonClass} onClick={() => void saveMassEntry()} disabled={submitting}>
                    {submitting ? 'Enregistrement...' : 'Enregistrer toute la grille'}
                  </button>
                  <span className="text-xs text-slate-500">Astuce: Ctrl+S pour sauvegarder rapidement.</span>
                </div>
              </div>
            )}
          </div>
        )}

            {activeTab === 'reports' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Bulletin officiel</h2>
                <div className="grid gap-3 print:hidden md:grid-cols-4">
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    value={reportStudentId}
                    onChange={(event) => setReportStudentId(event.target.value)}
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    value={reportPeriod}
                    onChange={(event) => setReportPeriod(event.target.value as Period)}
                  >
                    {periodOptions.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Nom et prénom du signataire"
                    value={reportSignerFullName}
                    onChange={(event) => setReportSignerFullName(event.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
                      onClick={exportBulletin}
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
                      onClick={() => window.print()}
                    >
                      Imprimer
                    </button>
                  </div>
                </div>

                <article className="mx-auto w-full max-w-[210mm] border border-gray-800 bg-white p-4 text-[11px] leading-tight text-gray-900 shadow-md [font-family:'Times_New_Roman',serif] print:min-h-[297mm] print:rounded-none print:border-gray-900 print:p-3 print:shadow-none">
                  <header className="grid grid-cols-2 border border-gray-800">
                    <div className="border-r border-gray-800 p-2">
                      <p className="font-semibold uppercase">République du Bénin</p>
                      <p className="uppercase">Ministère des Enseignements Secondaires</p>
                      <p className="uppercase">{schoolName}</p>
                      <p>Année scolaire : {schoolYear}</p>
                    </div>
                    <div className="p-2 text-right">
                      <p className="text-[18px] font-bold uppercase">Bulletin de Notes</p>
                      <p className="uppercase">{getPeriodLabel(reportPeriod)}</p>
                    </div>
                  </header>

                  <section className="mt-1 grid grid-cols-12 border border-gray-800">
                    <div className="col-span-5 border-r border-gray-800 p-2">
                      <p className="mb-1 border-b border-gray-800 font-semibold uppercase">Identité de l'élève</p>
                      <p>
                        <span className="font-semibold">Nom & Prénoms :</span>{' '}
                        {reportStudent ? `${reportStudent.firstName} ${reportStudent.lastName}` : 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Classe :</span>{' '}
                        {reportClass ? `${reportClass.name} (${reportClass.level})` : 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Période :</span> {getPeriodLabel(reportPeriod)}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-center justify-center border-r border-gray-800 p-2">
                      <span className="relative block h-16 w-20 overflow-hidden border border-gray-800">
                        <span className="absolute inset-y-0 left-0 w-2/5 bg-[#008751]" />
                        <span className="absolute inset-y-0 right-0 w-3/5">
                          <span className="block h-1/2 w-full bg-[#FCD116]" />
                          <span className="block h-1/2 w-full bg-[#E8112D]" />
                        </span>
                      </span>
                    </div>
                    <div className="col-span-5 p-2">
                      <p className="mb-1 border-b border-gray-800 font-semibold uppercase">Situation de la classe</p>
                      <p>
                        <span className="font-semibold">Effectif :</span> {reportClassStudents.length}
                      </p>
                      <p>
                        <span className="font-semibold">Moyenne classe :</span>{' '}
                        {classAverageForPeriod === null ? '-' : classAverageForPeriod.toFixed(2)}
                      </p>
                      <p>
                        <span className="font-semibold">Élèves ≥ 10 :</span> {classAboveAverageCount}
                      </p>
                    </div>
                  </section>

                  <section className="mt-1 overflow-x-auto border border-gray-800">
                    <table className="min-w-full border-collapse text-[10.5px]">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-800 px-1 py-1 text-left font-semibold">Matière</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Moy Inter</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Dév1</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Dév2</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Moi/20</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Coef.</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Moy. Coeff</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Rang</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Appréc.</th>
                          <th className="border border-gray-800 px-1 py-1 text-center font-semibold">Visa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportLines.map((line, index) => (
                          <tr key={line.subject} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-800 px-1 py-1">{line.subject}</td>
                            <td className="border border-gray-800 px-1 py-1 text-center">
                              {line.interroAverage === null ? '-' : line.interroAverage.toFixed(2)}
                            </td>
                            <td className="border border-gray-800 px-1 py-1 text-center">
                              {line.devoir1 === null ? '-' : line.devoir1.toFixed(2)}
                            </td>
                            <td className="border border-gray-800 px-1 py-1 text-center">
                              {line.devoir2 === null ? '-' : line.devoir2.toFixed(2)}
                            </td>
                            <td className="border border-gray-800 px-1 py-1 text-center">
                              {line.subjectAverage === null ? '-' : line.subjectAverage.toFixed(2)}
                            </td>
                            <td className="border border-gray-800 px-1 py-1 text-center">{line.coefficient.toFixed(1)}</td>
                            <td className="border border-gray-800 px-1 py-1 text-center">
                              {line.total === null ? '-' : line.total.toFixed(2)}
                            </td>
                            <td className="border border-gray-800 px-1 py-1 text-center">{line.rank}</td>
                            <td className="border border-gray-800 px-1 py-1 text-center">{line.appreciation}</td>
                            <td className="border border-gray-800 px-1 py-1 text-center">{line.visa}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border border-gray-800 px-1 py-1">TOTAL</td>
                          <td className="border border-gray-800 px-1 py-1" />
                          <td className="border border-gray-800 px-1 py-1" />
                          <td className="border border-gray-800 px-1 py-1" />
                          <td className="border border-gray-800 px-1 py-1 text-center" />
                          <td className="border border-gray-800 px-1 py-1 text-center" />
                          <td className="border border-gray-800 px-1 py-1 text-center">
                            {reportLines.reduce((sum, line) => sum + (line.total ?? 0), 0).toFixed(2)}
                          </td>
                          <td colSpan={3} className="px-0 py-0" />
                        </tr>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border border-gray-800 px-1 py-1">MOYENNE</td>
                          <td className="border border-gray-800 px-1 py-1" />
                          <td className="border border-gray-800 px-1 py-1" />
                          <td className="border border-gray-800 px-1 py-1" />
                          <td className="border border-gray-800 px-1 py-1 text-center" />
                          <td className="border border-gray-800 px-1 py-1 text-center" />
                          <td className="border border-gray-800 px-1 py-1 text-center">
                            {reportAverage === null ? '-' : reportAverage.toFixed(2)}
                          </td>
                          <td colSpan={3} className="px-0 py-0" />
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  <section className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                    <div className="border border-gray-800 p-2">
                      <p className="mb-1 border-b border-gray-800 font-semibold uppercase">Profil de la classe</p>
                      <p>Effectif : {reportClassStudents.length}</p>
                      <p>Moy. Classe : {classAverageForPeriod === null ? '-' : classAverageForPeriod.toFixed(2)}</p>
                      <p>Meilleure : {classBestAverage === null ? '-' : classBestAverage.toFixed(2)}</p>
                      <p>Plus faible : {classWeakAverage === null ? '-' : classWeakAverage.toFixed(2)}</p>
                    </div>
                    <div className="border border-gray-800 p-2">
                      <p className="mb-1 border-b border-gray-800 font-semibold uppercase">Discipline</p>
                      <p>Absences : {reportAbsences}</p>
                      <p>Retards : 0</p>
                    </div>
                    <div className="border border-gray-800 p-2">
                      <p className="mb-1 border-b border-gray-800 font-semibold uppercase">Résultats de l'élève</p>
                      <p>Moyenne : {reportAverage === null ? '-' : `${reportAverage.toFixed(2)} / 20`}</p>
                      <p>Rang : {reportRank ?? '-'}</p>
                      <p>Appréciation générale : {reportAverage !== null && reportAverage >= 10 ? 'Admis' : 'À renforcer'}</p>
                    </div>
                  </section>

                  <section className="mt-1 border border-gray-800 p-2 text-[10px]">
                    <p className="mb-1 font-semibold uppercase">Décisions des conseils de classe et de discipline</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" readOnly /> Passage en classe supérieure</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" readOnly /> Redoublement</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" readOnly /> Exclusion temporaire</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" readOnly /> Avertissement conduite</label>
                    </div>
                  </section>

                  <footer className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
                    <div className="border border-gray-800 p-2">
                      <p className="mb-1 font-semibold uppercase">Récap des résultats</p>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="border border-gray-800 px-2 py-1">Moy. Sem1</td>
                            <td className="border border-gray-800 px-2 py-1 text-right">{recapSem1 === null ? '-' : recapSem1.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-800 px-2 py-1">Moy. Sem2</td>
                            <td className="border border-gray-800 px-2 py-1 text-right">{recapSem2 === null ? '-' : recapSem2.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-800 px-2 py-1">Moy. Annuelle</td>
                            <td className="border border-gray-800 px-2 py-1 text-right">{recapAnnuel === null ? '-' : recapAnnuel.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-gray-800 p-2">
                      <p className="mb-1 font-semibold uppercase">Visa du chef d'établissement</p>
                      <p>Nom et prénom : {reportSignerFullName || '................................'}</p>
                      <div className="mt-6 border-t border-gray-800 pt-6 text-right">Signature et cachet</div>
                    </div>
                  </footer>
                </article>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

type StatCardProps = { label: string; value: string }
function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  )
}

type SimpleTableProps = {
  title: string
  headers: string[]
  rows: string[][]
  emptyText: string
}
function SimpleTable({ title, headers, rows, emptyText }: SimpleTableProps) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-semibold text-slate-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="hover:bg-slate-50">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BeninFlagBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs text-slate-100 ring-1 ring-white/20">
      <span className="sr-only">Drapeau du Bénin</span>
      <span className="relative block h-4 w-6 overflow-hidden rounded-sm ring-1 ring-black/20">
        <span className="absolute inset-y-0 left-0 w-2/5 bg-[#008751]" />
        <span className="absolute inset-y-0 right-0 w-3/5">
          <span className="block h-1/2 w-full bg-[#FCD116]" />
          <span className="block h-1/2 w-full bg-[#E8112D]" />
        </span>
      </span>
      <span className="font-medium">République du Bénin</span>
    </div>
  )
}

export default App
