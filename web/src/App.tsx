import { useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from './lib/supabase/client'
import { calculateWeightedAverage } from './domain/services/average-calculator'

const modules = [
  { key: 'students', name: 'Élèves', description: 'Créer, modifier et suivre les profils élèves.' },
  { key: 'classes', name: 'Classes', description: 'Gérer les classes, niveaux et année scolaire.' },
  { key: 'subjects', name: 'Matières', description: 'Configurer les matières et leurs coefficients.' },
  { key: 'grades', name: 'Notes', description: 'Saisir les évaluations et notes par période.' },
]

type ClassAverageRow = {
  class_id: string
  period: string
  class_average: number
}

type Tab = 'classes' | 'students' | 'subjects' | 'grades'

type ClassItem = {
  id: string
  name: string
  level: string
}

type StudentItem = {
  id: string
  firstName: string
  lastName: string
  classId: string
}

type SubjectItem = {
  id: string
  name: string
  coefficient: number
}

type GradeItem = {
  id: string
  studentId: string
  subjectId: string
  period: string
  grade: number | null
}

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

function App() {
  const [classAverages, setClassAverages] = useState<ClassAverageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('classes')

  const [classes, setClasses] = useState<ClassItem[]>(demoClasses)
  const [students, setStudents] = useState<StudentItem[]>(demoStudents)
  const [subjects, setSubjects] = useState<SubjectItem[]>(demoSubjects)
  const [grades, setGrades] = useState<GradeItem[]>(demoGrades)

  const [newClassName, setNewClassName] = useState('')
  const [newClassLevel, setNewClassLevel] = useState('')

  const [newStudentFirstName, setNewStudentFirstName] = useState('')
  const [newStudentLastName, setNewStudentLastName] = useState('')
  const [newStudentClassId, setNewStudentClassId] = useState('cls-1')

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectCoefficient, setNewSubjectCoefficient] = useState('1')

  const [newGradeStudentId, setNewGradeStudentId] = useState('std-1')
  const [newGradeSubjectId, setNewGradeSubjectId] = useState('sub-1')
  const [newGradeValue, setNewGradeValue] = useState('10')
  const [newGradeMissing, setNewGradeMissing] = useState(false)

  useEffect(() => {
    async function loadClassAverages() {
      if (!hasSupabaseConfig || !supabase) {
        setLoading(false)
        setErrorMessage(
          'Supabase non configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans web/.env.local.',
        )
        return
      }

      const { data, error } = await supabase
        .from('v_class_averages')
        .select('class_id, period, class_average')
        .eq('period', 'T1')
        .order('class_average', { ascending: false })
        .limit(5)

      if (error) {
        setErrorMessage(`Erreur Supabase: ${error.message}`)
        setLoading(false)
        return
      }

      setClassAverages((data ?? []) as ClassAverageRow[])
      setLoading(false)
    }

    loadClassAverages()
  }, [])

  useEffect(() => {
    if (classes.length > 0 && !classes.some((item) => item.id === newStudentClassId)) {
      setNewStudentClassId(classes[0].id)
    }
  }, [classes, newStudentClassId])

  useEffect(() => {
    if (students.length > 0 && !students.some((item) => item.id === newGradeStudentId)) {
      setNewGradeStudentId(students[0].id)
    }
  }, [students, newGradeStudentId])

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((item) => item.id === newGradeSubjectId)) {
      setNewGradeSubjectId(subjects[0].id)
    }
  }, [subjects, newGradeSubjectId])

  const localClassAverages = useMemo(() => {
    const rows = classes
      .map((classItem) => {
        const classStudents = students.filter((student) => student.classId === classItem.id)
        const studentAverages = classStudents
          .map((student) => {
            const inputs = grades
              .filter((grade) => grade.studentId === student.id && grade.period === 'T1')
              .map((grade) => {
                const subject = subjects.find((item) => item.id === grade.subjectId)
                return { grade: grade.grade, coefficient: subject?.coefficient ?? 1 }
              })

            return calculateWeightedAverage(inputs, 'ignore')
          })
          .filter((value): value is number => value !== null)

        if (studentAverages.length === 0) return null

        const sum = studentAverages.reduce((acc, value) => acc + value, 0)
        return {
          class_id: classItem.id,
          period: 'T1',
          class_average: Number((sum / studentAverages.length).toFixed(2)),
        }
      })
      .filter((value): value is ClassAverageRow => value !== null)
      .sort((a, b) => b.class_average - a.class_average)

    return rows
  }, [classes, students, subjects, grades])

  const displayedClassAverages = classAverages.length > 0 ? classAverages : localClassAverages

  const headlineAverage = useMemo(() => {
    if (displayedClassAverages.length === 0) return '-- / 20'
    return `${displayedClassAverages[0].class_average.toFixed(2)} / 20`
  }, [displayedClassAverages])

  function addClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newClassName.trim() || !newClassLevel.trim()) return

    setClasses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newClassName.trim(),
        level: newClassLevel.trim(),
      },
    ])

    setNewClassName('')
    setNewClassLevel('')
  }

  function addStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newStudentFirstName.trim() || !newStudentLastName.trim() || !newStudentClassId) return

    setStudents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        firstName: newStudentFirstName.trim(),
        lastName: newStudentLastName.trim(),
        classId: newStudentClassId,
      },
    ])

    setNewStudentFirstName('')
    setNewStudentLastName('')
  }

  function addSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coefficient = Number(newSubjectCoefficient)
    if (!newSubjectName.trim() || Number.isNaN(coefficient) || coefficient <= 0) return

    setSubjects((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newSubjectName.trim(),
        coefficient,
      },
    ])

    setNewSubjectName('')
    setNewSubjectCoefficient('1')
  }

  function addGrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newGradeStudentId || !newGradeSubjectId) return

    const numericValue = Number(newGradeValue)
    const isValidGrade = newGradeMissing || (!Number.isNaN(numericValue) && numericValue >= 0 && numericValue <= 20)
    if (!isValidGrade) return

    setGrades((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        studentId: newGradeStudentId,
        subjectId: newGradeSubjectId,
        period: 'T1',
        grade: newGradeMissing ? null : numericValue,
      },
    ])

    setNewGradeValue('10')
    setNewGradeMissing(false)
  }

  const totalMissingGrades = grades.filter((item) => item.grade === null).length

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-wide text-slate-300">Secondaire</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Gestion des moyennes scolaires
        </h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Prototype web (React + Tailwind). La base de données Supabase est déjà
          prévue avec calcul de moyenne pondérée, moyenne de classe et classement.
        </p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Meilleure moyenne classe (T1)"
          value={loading && displayedClassAverages.length === 0 ? 'Chargement...' : headlineAverage}
        />
        <StatCard
          label="Classes chargées (T1)"
          value={loading && displayedClassAverages.length === 0 ? '...' : String(displayedClassAverages.length)}
        />
        <StatCard
          label="Source"
          value={classAverages.length > 0 ? 'Supabase' : hasSupabaseConfig ? 'Fallback local' : 'Mode local'}
        />
        <StatCard
          label="Notes manquantes"
          value={String(totalMissingGrades)}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Modules CRUD</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <article key={module.key} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{module.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{module.description}</p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                onClick={() => setActiveTab(module.key as Tab)}
              >
                Ouvrir
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Espace de saisie interactif</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton label="Classes" isActive={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />
          <TabButton label="Élèves" isActive={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <TabButton label="Matières" isActive={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
          <TabButton label="Notes" isActive={activeTab === 'grades'} onClick={() => setActiveTab('grades')} />
        </div>

        {activeTab === 'classes' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-3" onSubmit={addClass}>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Nom de classe (ex: 1ère C)"
                value={newClassName}
                onChange={(event) => setNewClassName(event.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Niveau"
                value={newClassLevel}
                onChange={(event) => setNewClassLevel(event.target.value)}
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Ajouter classe</button>
            </form>
            <EntityList
              items={classes.map((item) => `${item.name} (${item.level})`)}
              onDelete={(index) => {
                const removed = classes[index]
                setClasses((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                setStudents((prev) => prev.filter((student) => student.classId !== removed.id))
              }}
            />
          </div>
        )}

        {activeTab === 'students' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-4" onSubmit={addStudent}>
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
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Ajouter élève</button>
            </form>
            <EntityList
              items={students.map((item) => {
                const classLabel = classes.find((classItem) => classItem.id === item.classId)?.name ?? 'Sans classe'
                return `${item.firstName} ${item.lastName} - ${classLabel}`
              })}
              onDelete={(index) => {
                const removed = students[index]
                setStudents((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                setGrades((prev) => prev.filter((grade) => grade.studentId !== removed.id))
              }}
            />
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-3" onSubmit={addSubject}>
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
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Ajouter matière</button>
            </form>
            <EntityList
              items={subjects.map((item) => `${item.name} (coef ${item.coefficient})`)}
              onDelete={(index) => {
                const removed = subjects[index]
                setSubjects((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                setGrades((prev) => prev.filter((grade) => grade.subjectId !== removed.id))
              }}
            />
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-5" onSubmit={addGrade}>
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
                Note manquante
              </label>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Ajouter note</button>
            </form>
            <EntityList
              items={grades.map((item) => {
                const studentName =
                  students.find((student) => student.id === item.studentId)?.firstName ?? 'Élève supprimé'
                const subjectName =
                  subjects.find((subject) => subject.id === item.subjectId)?.name ?? 'Matière supprimée'
                const value = item.grade === null ? 'Absente' : `${item.grade}/20`
                return `${studentName} - ${subjectName} - ${value}`
              })}
              onDelete={(index) => {
                setGrades((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
              }}
            />
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Moyennes de classe (T1)</h2>
        {errorMessage && classAverages.length === 0 ? (
          <p className="mt-2 text-sm text-amber-700">
            {errorMessage} Les statistiques affichent les données locales.
          </p>
        ) : loading && classAverages.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Chargement des données...</p>
        ) : displayedClassAverages.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Aucune donnée trouvée. Vérifie que la vue v_class_averages contient des lignes.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">#</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Classe ID</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Période</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedClassAverages.map((row, index) => (
                  <tr key={`${row.class_id}-${row.period}-${index}`}>
                    <td className="px-3 py-2 text-slate-600">{index + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.class_id}</td>
                    <td className="px-3 py-2 text-slate-700">{row.period}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {row.class_average.toFixed(2)} / 20
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Prochaine étape</h2>
        <p className="mt-2 text-slate-600">
          Compléter le CRUD persistant Supabase (insert/update/delete) puis afficher les résultats des vues :
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">v_student_averages</code>,
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">v_class_averages</code> et
          <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">v_student_ranking</code>.
        </p>
      </section>
    </main>
  )
}

type StatCardProps = {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  )
}

type TabButtonProps = {
  label: string
  isActive: boolean
  onClick: () => void
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  )
}

type EntityListProps = {
  items: string[]
  onDelete: (index: number) => void
}

function EntityList({ items, onDelete }: EntityListProps) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">Aucune donnée.</p>
  }

  return (
    <ul className="mt-4 space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <span>{item}</span>
          <button
            type="button"
            onClick={() => onDelete(index)}
            className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Supprimer
          </button>
        </li>
      ))}
    </ul>
  )
}

export default App
