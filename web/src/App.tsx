import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, hasFirebaseConfig } from './lib/firebase/client'
import { calculateWeightedAverage } from './domain/services/average-calculator'

type Tab = 'classes' | 'students' | 'subjects' | 'grades'
type ClassTemplate = { value: string; name: string; level: string }
type ClassItem = { id: string; name: string; level: string }
type StudentItem = { id: string; firstName: string; lastName: string; classId: string }
type SubjectItem = { id: string; name: string; coefficient: number }
type GradeItem = { id: string; studentId: string; subjectId: string; period: string; grade: number | null }
type ClassAverageRow = { class_id: string; period: string; class_average: number }

const modules: { key: Tab; name: string; description: string }[] = [
  { key: 'students', name: 'Élèves', description: 'Créer, modifier et suivre les profils élèves.' },
  { key: 'classes', name: 'Classes', description: 'Gérer les classes, niveaux et année scolaire.' },
  { key: 'subjects', name: 'Matières', description: 'Configurer les matières et leurs coefficients.' },
  { key: 'grades', name: 'Notes', description: 'Saisir les évaluations et notes par période.' },
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return 'Erreur inconnue'
  }
}

function App() {
  const isRemoteMode = hasFirebaseConfig && Boolean(db)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('classes')

  const [classes, setClasses] = useState<ClassItem[]>(demoClasses)
  const [students, setStudents] = useState<StudentItem[]>(demoStudents)
  const [subjects, setSubjects] = useState<SubjectItem[]>(demoSubjects)
  const [grades, setGrades] = useState<GradeItem[]>(demoGrades)

  const [selectedClassTemplate, setSelectedClassTemplate] = useState(classTemplates[0].value)
  const [newStudentFirstName, setNewStudentFirstName] = useState('')
  const [newStudentLastName, setNewStudentLastName] = useState('')
  const [newStudentClassId, setNewStudentClassId] = useState('cls-1')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectCoefficient, setNewSubjectCoefficient] = useState('1')
  const [newGradeStudentId, setNewGradeStudentId] = useState('std-1')
  const [newGradeSubjectId, setNewGradeSubjectId] = useState('sub-1')
  const [newGradeValue, setNewGradeValue] = useState('10')
  const [newGradeMissing, setNewGradeMissing] = useState(false)

  async function loadRemoteData() {
    if (!db) return
    setLoading(true)
    setErrorMessage(null)

    const [classSnap, studentSnap, subjectSnap, gradeSnap] = await Promise.all([
      getDocs(collection(db, 'classes')),
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'grades')),
    ])

    setClasses(classSnap.docs.map((d) => ({ id: d.id, name: d.data().name ?? 'Classe', level: d.data().level ?? '-' })))
    setStudents(
      studentSnap.docs.map((d) => ({
        id: d.id,
        firstName: d.data().firstName ?? '',
        lastName: d.data().lastName ?? '',
        classId: d.data().classId ?? '',
      })),
    )
    setSubjects(
      subjectSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? '',
        coefficient: Number(d.data().coefficient ?? 1),
      })),
    )
    setGrades(
      gradeSnap.docs.map((d) => ({
        id: d.id,
        studentId: d.data().studentId ?? '',
        subjectId: d.data().subjectId ?? '',
        period: d.data().period ?? 'T1',
        grade: d.data().grade === null || d.data().grade === undefined ? null : Number(d.data().grade),
      })),
    )

    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      if (!isRemoteMode) {
        setLoading(false)
        setErrorMessage('Firebase non configuré. Renseigne les variables VITE_FIREBASE_* dans web/.env.local.')
        return
      }
      try {
        await loadRemoteData()
      } catch (error) {
        setErrorMessage(`Erreur Firebase: ${getErrorMessage(error)}`)
        setLoading(false)
      }
    }
    void init()
  }, [isRemoteMode])

  useEffect(() => {
    if (classes.length > 0 && !classes.some((item) => item.id === newStudentClassId)) setNewStudentClassId(classes[0].id)
  }, [classes, newStudentClassId])
  useEffect(() => {
    if (students.length > 0 && !students.some((item) => item.id === newGradeStudentId)) setNewGradeStudentId(students[0].id)
  }, [students, newGradeStudentId])
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((item) => item.id === newGradeSubjectId)) setNewGradeSubjectId(subjects[0].id)
  }, [subjects, newGradeSubjectId])

  const classAverages = useMemo(() => {
    return classes
      .map((classItem) => {
        const classStudents = students.filter((s) => s.classId === classItem.id)
        const studentAverages = classStudents
          .map((student) => {
            const weighted = grades
              .filter((grade) => grade.studentId === student.id && grade.period === 'T1')
              .map((grade) => ({
                grade: grade.grade,
                coefficient: subjects.find((subject) => subject.id === grade.subjectId)?.coefficient ?? 1,
              }))
            return calculateWeightedAverage(weighted, 'ignore')
          })
          .filter((value): value is number => value !== null)

        if (studentAverages.length === 0) return null
        const sum = studentAverages.reduce((acc, val) => acc + val, 0)
        return { class_id: classItem.id, period: 'T1', class_average: Number((sum / studentAverages.length).toFixed(2)) }
      })
      .filter((value): value is ClassAverageRow => value !== null)
      .sort((a, b) => b.class_average - a.class_average)
  }, [classes, students, grades, subjects])

  const headlineAverage = classAverages.length === 0 ? '-- / 20' : `${classAverages[0].class_average.toFixed(2)} / 20`
  const totalMissingGrades = grades.filter((item) => item.grade === null).length

  async function addClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const template = classTemplates.find((item) => item.value === selectedClassTemplate)
    if (!template) return
    if (classes.some((item) => item.name === template.name && item.level === template.level)) {
      setActionMessage('Cette classe existe déjà.')
      return
    }

    if (!isRemoteMode || !db) {
      setClasses((prev) => [...prev, { id: crypto.randomUUID(), name: template.name, level: template.level }])
      setActionMessage('Classe ajoutée (local).')
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      await addDoc(collection(firestore, 'classes'), { name: template.name, level: template.level, createdAt: Date.now() })
      await loadRemoteData()
      setActionMessage('Classe ajoutée dans Firebase.')
    } catch (error) {
      setActionMessage(`Erreur ajout classe: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteClass(index: number) {
    const removed = classes[index]
    if (!removed) return

    if (!isRemoteMode || !db) {
      setClasses((prev) => prev.filter((_, i) => i !== index))
      setStudents((prev) => prev.filter((student) => student.classId !== removed.id))
      setGrades((prev) => prev.filter((grade) => {
        const student = students.find((s) => s.id === grade.studentId)
        return student?.classId !== removed.id
      }))
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      const batch = writeBatch(firestore)
      const linkedStudents = await getDocs(query(collection(firestore, 'students'), where('classId', '==', removed.id)))
      for (const studentDoc of linkedStudents.docs) {
        const linkedGrades = await getDocs(query(collection(firestore, 'grades'), where('studentId', '==', studentDoc.id)))
        linkedGrades.docs.forEach((gradeDoc) => batch.delete(doc(firestore, 'grades', gradeDoc.id)))
        batch.delete(doc(firestore, 'students', studentDoc.id))
      }
      batch.delete(doc(firestore, 'classes', removed.id))
      await batch.commit()
      await loadRemoteData()
      setActionMessage('Classe supprimée dans Firebase.')
    } catch (error) {
      setActionMessage(`Erreur suppression classe: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newStudentFirstName.trim() || !newStudentLastName.trim() || !newStudentClassId) return

    if (!isRemoteMode || !db) {
      setStudents((prev) => [...prev, { id: crypto.randomUUID(), firstName: newStudentFirstName.trim(), lastName: newStudentLastName.trim(), classId: newStudentClassId }])
      setNewStudentFirstName('')
      setNewStudentLastName('')
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      await addDoc(collection(firestore, 'students'), {
        firstName: newStudentFirstName.trim(),
        lastName: newStudentLastName.trim(),
        classId: newStudentClassId,
        createdAt: Date.now(),
      })
      await loadRemoteData()
      setActionMessage('Élève ajouté dans Firebase.')
      setNewStudentFirstName('')
      setNewStudentLastName('')
    } catch (error) {
      setActionMessage(`Erreur ajout élève: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteStudent(index: number) {
    const removed = students[index]
    if (!removed) return
    if (!isRemoteMode || !db) {
      setStudents((prev) => prev.filter((_, i) => i !== index))
      setGrades((prev) => prev.filter((grade) => grade.studentId !== removed.id))
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      const batch = writeBatch(firestore)
      const linkedGrades = await getDocs(query(collection(firestore, 'grades'), where('studentId', '==', removed.id)))
      linkedGrades.docs.forEach((gradeDoc) => batch.delete(doc(firestore, 'grades', gradeDoc.id)))
      batch.delete(doc(firestore, 'students', removed.id))
      await batch.commit()
      await loadRemoteData()
      setActionMessage('Élève supprimé dans Firebase.')
    } catch (error) {
      setActionMessage(`Erreur suppression élève: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coefficient = Number(newSubjectCoefficient)
    if (!newSubjectName.trim() || Number.isNaN(coefficient) || coefficient <= 0) return

    if (!isRemoteMode || !db) {
      setSubjects((prev) => [...prev, { id: crypto.randomUUID(), name: newSubjectName.trim(), coefficient }])
      setNewSubjectName('')
      setNewSubjectCoefficient('1')
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      await addDoc(collection(firestore, 'subjects'), { name: newSubjectName.trim(), coefficient, createdAt: Date.now() })
      await loadRemoteData()
      setActionMessage('Matière ajoutée dans Firebase.')
      setNewSubjectName('')
      setNewSubjectCoefficient('1')
    } catch (error) {
      setActionMessage(`Erreur ajout matière: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSubject(index: number) {
    const removed = subjects[index]
    if (!removed) return
    if (!isRemoteMode || !db) {
      setSubjects((prev) => prev.filter((_, i) => i !== index))
      setGrades((prev) => prev.filter((grade) => grade.subjectId !== removed.id))
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      const batch = writeBatch(firestore)
      const linkedGrades = await getDocs(query(collection(firestore, 'grades'), where('subjectId', '==', removed.id)))
      linkedGrades.docs.forEach((gradeDoc) => batch.delete(doc(firestore, 'grades', gradeDoc.id)))
      batch.delete(doc(firestore, 'subjects', removed.id))
      await batch.commit()
      await loadRemoteData()
      setActionMessage('Matière supprimée dans Firebase.')
    } catch (error) {
      setActionMessage(`Erreur suppression matière: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function addGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newGradeStudentId || !newGradeSubjectId) return
    const numericValue = Number(newGradeValue)
    const valid = newGradeMissing || (!Number.isNaN(numericValue) && numericValue >= 0 && numericValue <= 20)
    if (!valid) return

    if (!isRemoteMode || !db) {
      setGrades((prev) => [...prev, { id: crypto.randomUUID(), studentId: newGradeStudentId, subjectId: newGradeSubjectId, period: 'T1', grade: newGradeMissing ? null : numericValue }])
      setNewGradeValue('10')
      setNewGradeMissing(false)
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      await addDoc(collection(firestore, 'grades'), {
        studentId: newGradeStudentId,
        subjectId: newGradeSubjectId,
        period: 'T1',
        grade: newGradeMissing ? null : numericValue,
        createdAt: Date.now(),
      })
      await loadRemoteData()
      setActionMessage('Note ajoutée dans Firebase.')
      setNewGradeValue('10')
      setNewGradeMissing(false)
    } catch (error) {
      setActionMessage(`Erreur ajout note: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteGrade(index: number) {
    const removed = grades[index]
    if (!removed) return
    if (!isRemoteMode || !db) {
      setGrades((prev) => prev.filter((_, i) => i !== index))
      return
    }
    const firestore = db

    setSubmitting(true)
    try {
      await deleteDoc(doc(firestore, 'grades', removed.id))
      await loadRemoteData()
      setActionMessage('Note supprimée dans Firebase.')
    } catch (error) {
      setActionMessage(`Erreur suppression note: ${getErrorMessage(error)}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-wide text-slate-300">Secondaire</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Gestion des moyennes scolaires</h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Version Firebase (Firestore) avec CRUD persistant et calcul local des moyennes pondérées.
        </p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meilleure moyenne classe (T1)" value={loading && classAverages.length === 0 ? 'Chargement...' : headlineAverage} />
        <StatCard label="Classes actives" value={loading && classAverages.length === 0 ? '...' : String(classes.length)} />
        <StatCard label="Source" value={isRemoteMode ? 'Firebase' : 'Mode local'} />
        <StatCard label="Notes manquantes" value={String(totalMissingGrades)} />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Modules CRUD</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <article key={module.key} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{module.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{module.description}</p>
              <button type="button" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={() => setActiveTab(module.key)}>
                Ouvrir
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Espace de saisie interactif</h2>
        {actionMessage ? <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{actionMessage}</p> : null}
        {errorMessage ? <p className="mt-2 text-sm text-amber-700">{errorMessage}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton label="Classes" isActive={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />
          <TabButton label="Élèves" isActive={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <TabButton label="Matières" isActive={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
          <TabButton label="Notes" isActive={activeTab === 'grades'} onClick={() => setActiveTab('grades')} />
        </div>

        {activeTab === 'classes' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-3" onSubmit={addClass}>
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={selectedClassTemplate} onChange={(event) => setSelectedClassTemplate(event.target.value)}>
                {classTemplates.map((item) => (
                  <option key={item.value} value={item.value}>{item.name} ({item.level})</option>
                ))}
              </select>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Choisis une classe dans la liste puis clique sur « Ajouter classe ».</p>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>{submitting ? 'Traitement...' : 'Ajouter classe'}</button>
            </form>
            <EntityList items={classes.map((item) => `${item.name} (${item.level})`)} onDelete={deleteClass} />
          </div>
        )}

        {activeTab === 'students' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-4" onSubmit={addStudent}>
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Prénom" value={newStudentFirstName} onChange={(event) => setNewStudentFirstName(event.target.value)} />
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nom" value={newStudentLastName} onChange={(event) => setNewStudentLastName(event.target.value)} />
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={newStudentClassId} onChange={(event) => setNewStudentClassId(event.target.value)}>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>{submitting ? 'Traitement...' : 'Ajouter élève'}</button>
            </form>
            <EntityList items={students.map((item) => `${item.firstName} ${item.lastName} - ${classes.find((c) => c.id === item.classId)?.name ?? 'Sans classe'}`)} onDelete={deleteStudent} />
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-3" onSubmit={addSubject}>
              <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Matière" value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} />
              <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min="0.5" step="0.5" placeholder="Coefficient" value={newSubjectCoefficient} onChange={(event) => setNewSubjectCoefficient(event.target.value)} />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>{submitting ? 'Traitement...' : 'Ajouter matière'}</button>
            </form>
            <EntityList items={subjects.map((item) => `${item.name} (coef ${item.coefficient})`)} onDelete={deleteSubject} />
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="mt-4">
            <form className="grid gap-3 md:grid-cols-5" onSubmit={addGrade}>
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={newGradeStudentId} onChange={(event) => setNewGradeStudentId(event.target.value)}>
                {students.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
              </select>
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={newGradeSubjectId} onChange={(event) => setNewGradeSubjectId(event.target.value)}>
                {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" max="20" step="0.25" placeholder="Note /20" value={newGradeValue} onChange={(event) => setNewGradeValue(event.target.value)} disabled={newGradeMissing} />
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <input type="checkbox" checked={newGradeMissing} onChange={(event) => setNewGradeMissing(event.target.checked)} />
                Note manquante
              </label>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={submitting}>{submitting ? 'Traitement...' : 'Ajouter note'}</button>
            </form>
            <EntityList items={grades.map((item) => `${students.find((s) => s.id === item.studentId)?.firstName ?? 'Élève'} - ${subjects.find((s) => s.id === item.subjectId)?.name ?? 'Matière'} - ${item.grade === null ? 'Absente' : `${item.grade}/20`}`)} onDelete={deleteGrade} />
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Moyennes de classe (T1)</h2>
        {loading && classAverages.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Chargement des données...</p>
        ) : classAverages.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Aucune donnée pour calculer les moyennes.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">#</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Classe</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Période</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Moyenne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classAverages.map((row, index) => (
                  <tr key={`${row.class_id}-${row.period}-${index}`}>
                    <td className="px-3 py-2 text-slate-600">{index + 1}</td>
                    <td className="px-3 py-2 text-slate-700">{classes.find((item) => item.id === row.class_id)?.name ?? row.class_id}</td>
                    <td className="px-3 py-2 text-slate-700">{row.period}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.class_average.toFixed(2)} / 20</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

type StatCardProps = { label: string; value: string }
function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  )
}

type TabButtonProps = { label: string; isActive: boolean; onClick: () => void }
function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
      {label}
    </button>
  )
}

type EntityListProps = { items: string[]; onDelete: (index: number) => void }
function EntityList({ items, onDelete }: EntityListProps) {
  if (items.length === 0) return <p className="mt-4 text-sm text-slate-500">Aucune donnée.</p>
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <span>{item}</span>
          <button type="button" onClick={() => onDelete(index)} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100">
            Supprimer
          </button>
        </li>
      ))}
    </ul>
  )
}

export default App
