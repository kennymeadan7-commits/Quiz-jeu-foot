import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'
import { calculateWeightedAverage, type MissingGradePolicy } from './domain/services/average-calculator'
import { generateBulletinPdf } from './lib/pdf/bulletin-generator'

type Tab = 'dashboard' | 'classes' | 'students' | 'subjects' | 'grades' | 'reports'
type Period = 'T1' | 'T2' | 'T3' | 'S1' | 'S2' | 'Annuel'

type ClassItem = { id: string; name: string; level: string }
type StudentItem = { id: string; firstName: string; lastName: string; classId: string }
type SubjectItem = { id: string; name: string; coefficient: number }
type GradeItem = { id: string; studentId: string; subjectId: string; period: string; grade: number | null }
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

const periodOptions: Period[] = ['T1', 'T2', 'T3', 'S1', 'S2', 'Annuel']

const modules: { key: Tab; name: string; description: string }[] = [
  { key: 'dashboard', name: 'Dashboard', description: 'Vue globale avec moyennes et classement.' },
  { key: 'classes', name: 'Classes', description: 'CRUD classes avec liste prédéfinie.' },
  { key: 'students', name: 'Élèves', description: 'CRUD élèves (classe associée).' },
  { key: 'subjects', name: 'Matières', description: 'CRUD matières et coefficients.' },
  { key: 'grades', name: 'Notes', description: 'CRUD notes avec gestion des absences.' },
  { key: 'reports', name: 'Bulletins PDF', description: 'Export PDF par élève et période.' },
]

const classTemplates: ClassTemplate[] = [
  { value: '6e-a', name: '6e A', level: '6e' },
  { value: '6e-b', name: '6e B', level: '6e' },
  { value: '5e-a', name: '5e A', level: '5e' },
  { value: '5e-b', name: '5e B', level: '5e' },
  { value: '4e-a', name: '4e A', level: '4e' },
  { value: '4e-b', name: '4e B', level: '4e' },
  { value: '3e-a', name: '3e A', level: '3e' },
  { value: '3e-b', name: '3e B', level: '3e' },
  { value: '2nde-a', name: '2nde A', level: '2nde' },
  { value: '2nde-b', name: '2nde B', level: '2nde' },
  { value: '1ere-a', name: '1ère A', level: '1ère' },
  { value: '1ere-b', name: '1ère B', level: '1ère' },
  { value: 'terminale-a', name: 'Terminale A', level: 'Terminale' },
  { value: 'terminale-b', name: 'Terminale B', level: 'Terminale' },
]

const demoClasses: ClassItem[] = [
  { id: 'cls-1', name: '2nde A', level: '2nde' },
  { id: 'cls-2', name: '2nde B', level: '2nde' },
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
  { id: 'grd-1', studentId: 'std-1', subjectId: 'sub-1', period: 'T1', grade: 14 },
  { id: 'grd-2', studentId: 'std-1', subjectId: 'sub-2', period: 'T1', grade: 12 },
  { id: 'grd-3', studentId: 'std-2', subjectId: 'sub-1', period: 'T1', grade: 10 },
  { id: 'grd-4', studentId: 'std-2', subjectId: 'sub-2', period: 'T1', grade: 11 },
]

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
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('T1')
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
  const [newGradePeriod, setNewGradePeriod] = useState<Period>('T1')
  const [newGradeValue, setNewGradeValue] = useState('10')
  const [newGradeMissing, setNewGradeMissing] = useState(false)

  const [reportStudentId, setReportStudentId] = useState('std-1')
  const [reportPeriod, setReportPeriod] = useState<Period>('T1')

  const [editingClass, setEditingClass] = useState<Record<string, { name: string; level: string }>>({})
  const [editingStudent, setEditingStudent] = useState<
    Record<string, { firstName: string; lastName: string; classId: string }>
  >({})
  const [editingSubject, setEditingSubject] = useState<Record<string, { name: string; coefficient: string }>>({})
  const [editingGrade, setEditingGrade] = useState<
    Record<string, { studentId: string; subjectId: string; period: string; grade: string; missing: boolean }>
  >({})

  async function loadRemoteData(period: Period) {
    if (!supabase) return
    setLoading(true)
    setErrorMessage(null)

    const [classesRes, studentsRes, subjectsRes, classSubjectsRes, gradesRes, settingsRes, classAvgRes, studentAvgRes, rankingRes] =
      await Promise.all([
        supabase.from('classes').select('id, name, level').order('name'),
        supabase.from('students').select('id, first_name, last_name, class_id').order('last_name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('class_subjects').select('subject_id, coefficient'),
        supabase.from('grades').select('id, student_id, subject_id, period, grade').order('created_at'),
        supabase.from('app_settings').select('missing_grade_policy').eq('id', true).maybeSingle(),
        supabase.from('v_class_averages').select('class_id, period, class_average').eq('period', period),
        supabase.from('v_student_averages').select('student_id, class_id, period, weighted_average').eq('period', period),
        supabase
          .from('v_student_ranking')
          .select('class_id, period, student_id, weighted_average, rank_in_class')
          .eq('period', period),
      ])

    if (classesRes.error) throw classesRes.error
    if (studentsRes.error) throw studentsRes.error
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
    setStudents(
      (studentsRes.data ?? []).map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        classId: row.class_id,
      })),
    )
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
      const weighted = grades
        .filter((grade) => grade.studentId === student.id && grade.period === selectedPeriod)
        .map((grade) => ({
          grade: grade.grade,
          coefficient: subjects.find((subject) => subject.id === grade.subjectId)?.coefficient ?? 1,
        }))

      const avg = calculateWeightedAverage(weighted, missingPolicy)
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

  const dashboardClassAverages: ClassAverageRow[] =
    classAveragesView.length > 0 ? classAveragesView : localClassAverages
  const dashboardStudentAverages: StudentAverageRow[] =
    studentAveragesView.length > 0 ? studentAveragesView : localStudentAverages
  const dashboardRanking: StudentRankingRow[] = rankingView.length > 0 ? rankingView : localRanking

  const headlineAverage = dashboardClassAverages.length > 0 ? `${dashboardClassAverages[0].class_average.toFixed(2)} / 20` : '-- / 20'
  const missingNotesCount = grades.filter((grade) => grade.grade === null).length

  function classLabel(classId: string): string {
    const c = classes.find((item) => item.id === classId)
    return c ? `${c.name} (${c.level})` : classId
  }

  function studentLabel(studentId: string): string {
    const s = students.find((item) => item.id === studentId)
    return s ? `${s.firstName} ${s.lastName}` : studentId
  }

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
      const { error: studentsErr } = await supabase.from('students').delete().eq('class_id', classId)
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
      const { error } = await supabase.from('students').insert({
        first_name: newStudentFirstName.trim(),
        last_name: newStudentLastName.trim(),
        class_id: newStudentClassId,
      })
      if (error) throw error
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
      const { error } = await supabase
        .from('students')
        .update({
          first_name: row.firstName,
          last_name: row.lastName,
          class_id: row.classId,
        })
        .eq('id', studentId)
      if (error) throw error
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
      const { error } = await supabase.from('students').delete().eq('id', studentId)
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
        grade: newGradeMissing ? null : numericValue,
      })
      if (error) throw error
      await loadRemoteData(selectedPeriod)
      setActionMessage('Note ajoutée.')
      setNewGradeValue('10')
      setNewGradeMissing(false)
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
    const lines = subjects.map((subject) => {
      const grade = grades.find(
        (row) =>
          row.studentId === student.id &&
          row.subjectId === subject.id &&
          row.period === reportPeriod,
      )
      return {
        subject: subject.name,
        coefficient: subject.coefficient,
        grade: grade?.grade ?? null,
      }
    })

    const avgRow = dashboardStudentAverages.find(
      (row) => row.student_id === student.id && row.period === reportPeriod,
    )
    const rankRow = dashboardRanking.find(
      (row) => row.student_id === student.id && row.period === reportPeriod,
    )

    generateBulletinPdf({
      studentFullName: `${student.firstName} ${student.lastName}`,
      className: studentClass ? `${studentClass.name} (${studentClass.level})` : 'N/A',
      period: reportPeriod,
      average: avgRow?.weighted_average ?? null,
      rank: rankRow?.rank_in_class ?? null,
      missingPolicy,
      lines,
    })
    setActionMessage('Bulletin exporté en PDF.')
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 p-7 text-white shadow-2xl ring-1 ring-white/10">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wider text-slate-100">
          Secondaire
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Gestion des moyennes scolaires</h1>
        <p className="mt-3 max-w-3xl text-slate-200/95">
          Application complète : CRUD, moyennes pondérées, classement, configuration métier et export PDF.
        </p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meilleure moyenne classe" value={loading ? '...' : headlineAverage} />
        <StatCard label="Élèves" value={String(students.length)} />
        <StatCard label="Notes manquantes" value={String(missingNotesCount)} />
        <StatCard label="Source" value={isRemoteMode ? 'Supabase' : 'Local'} />
      </section>

      <section className="mb-6 rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Période :</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value as Period)}
          >
            {periodOptions.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>

          <label className="ml-2 text-sm font-medium text-slate-700">Note manquante :</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={missingPolicy}
            onChange={(event) => void updateMissingPolicy(event.target.value as MissingGradePolicy)}
          >
            <option value="ignore">ignore</option>
            <option value="zero">zero</option>
          </select>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <article
            key={module.key}
            className={`rounded-2xl p-5 shadow-md ring-1 transition ${
              activeTab === module.key
                ? 'bg-indigo-50 ring-indigo-300 shadow-indigo-100'
                : 'bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow-lg'
            }`}
          >
            <h3 className="text-lg font-semibold text-slate-900">{module.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{module.description}</p>
            <button
              type="button"
              className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white ${
                activeTab === module.key ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-900 hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab(module.key)}
            >
              Ouvrir
            </button>
          </article>
        ))}
      </section>

      <section className="mb-8 rounded-2xl bg-white/95 p-5 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {actionMessage ? <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{actionMessage}</p> : null}
        {errorMessage ? <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{errorMessage}</p> : null}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
            <SimpleTable
              title={`Moyennes de classe (${selectedPeriod})`}
              headers={['Classe', 'Moyenne']}
              rows={dashboardClassAverages.map((row) => [classLabel(row.class_id), `${row.class_average.toFixed(2)} / 20`])}
              emptyText="Aucune moyenne de classe disponible."
            />

            <SimpleTable
              title={`Moyennes élèves (${selectedPeriod})`}
              headers={['Élève', 'Classe', 'Moyenne']}
              rows={dashboardStudentAverages.map((row) => [
                studentLabel(row.student_id),
                classLabel(row.class_id),
                `${row.weighted_average.toFixed(2)} / 20`,
              ])}
              emptyText="Aucune moyenne élève disponible."
            />

            <SimpleTable
              title={`Classement (${selectedPeriod})`}
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
            <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => void addClass(event)}>
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
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Sélectionne une classe puis clique sur Ajouter.
              </p>
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
            <h2 className="text-xl font-semibold text-slate-900">CRUD Notes</h2>
            <form className="grid gap-3 md:grid-cols-6" onSubmit={(event) => void addGrade(event)}>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={newGradeStudentId}
                onChange={(event) => setNewGradeStudentId(event.target.value)}
              >
                {students.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.firstName} {item.lastName}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={newGradeSubjectId}
                onChange={(event) => setNewGradeSubjectId(event.target.value)}
              >
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={newGradePeriod}
                onChange={(event) => setNewGradePeriod(event.target.value as Period)}
              >
                {periodOptions.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                type="number"
                min="0"
                max="20"
                step="0.25"
                placeholder="Note /20"
                value={newGradeValue}
                onChange={(event) => setNewGradeValue(event.target.value)}
                disabled={newGradeMissing}
              />
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={newGradeMissing}
                  onChange={(event) => setNewGradeMissing(event.target.checked)}
                />
                Absente
              </label>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>
                {submitting ? 'Traitement...' : 'Ajouter note'}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2">Élève</th>
                    <th className="px-3 py-2">Matière</th>
                    <th className="px-3 py-2">Période</th>
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
                              <option key={period} value={period}>
                                {period}
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
                        <td className="px-3 py-2 space-x-2">
                          <button type="button" className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-white hover:bg-emerald-500" onClick={() => void updateGrade(row.id)}>
                            Enregistrer
                          </button>
                          <button type="button" className="rounded-md bg-rose-600 px-2.5 py-1.5 text-white hover:bg-rose-500" onClick={() => void deleteGrade(row.id)}>
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

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Export Bulletin PDF</h2>
            <div className="grid gap-3 md:grid-cols-3">
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
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500" onClick={exportBulletin}>
                Exporter PDF
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Le bulletin inclut : notes par matière, coefficients, moyenne pondérée et rang de classe.
            </p>
          </div>
        )}
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

export default App
