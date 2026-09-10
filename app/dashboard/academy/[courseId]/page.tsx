"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { supabase, Course, CourseLesson } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Play,
  Clock,
  CheckCircle2,
  BookOpen,
  Crown,
  FileText,
  Users,
} from 'lucide-react'
import Link from 'next/link'

export default function CoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courseId = params.courseId as string
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null)
  const [completedSet, setCompletedSet] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      const { data: lessonsData } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('sort_order')

      if (courseData) {
        setCourse(courseData)
        if (lessonsData && lessonsData.length > 0) {
          setLessons(lessonsData)
          setActiveLesson(lessonsData[0])
        }
      }

      if (user) {
        const { data: progressData } = await supabase
          .from('user_course_progress')
          .select('completed_lessons')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle()

        if (progressData?.completed_lessons) {
          setCompletedSet(new Set(progressData.completed_lessons))
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const markLessonComplete = async (lessonIndex: number) => {
    if (!user || completedSet.has(lessonIndex)) return
    const next = new Set(completedSet)
    next.add(lessonIndex)
    setCompletedSet(next)

    const percent = Math.round((next.size / lessons.length) * 100)
    const completedArr = Array.from(next).sort((a, b) => a - b)

    await supabase.from('user_course_progress').upsert({
      user_id: user.id,
      course_id: courseId,
      completed_lessons: completedArr,
      progress_percent: percent,
      last_watched_at: new Date().toISOString(),
      ...(percent >= 100 ? { completed_at: new Date().toISOString() } : {}),
    }, { onConflict: 'user_id,course_id' })
  }

  const handleLessonClick = (lesson: CourseLesson, index: number) => {
    setActiveLesson(lesson)
    markLessonComplete(index)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-slate-800 animate-pulse" />
        <div className="aspect-video rounded-xl bg-slate-800 animate-pulse" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Curso nao encontrado</h2>
        <Link href="/dashboard/academy">
          <Button variant="outline" className="mt-4 border-slate-700 text-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    )
  }

  const totalLessons = lessons.length
  const totalDuration = lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0)
  const progressPercent = totalLessons > 0 ? Math.round((completedSet.size / totalLessons) * 100) : 0

  return (
    <div className="space-y-6">
      <Link href="/dashboard/academy" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        Voltar para a Academia
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {activeLesson?.video_url ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <iframe
                src={activeLesson.video_url}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 flex items-center justify-center">
              {activeLesson ? (
                <div className="text-center p-8 max-w-2xl">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
                    <Play className="w-8 h-8 text-emerald-400 ml-1" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{activeLesson.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{activeLesson.description}</p>
                  <Badge className="mt-4 bg-slate-800 border-slate-700 text-slate-400">
                    <FileText className="w-3 h-3 mr-1" /> Conteudo em texto
                  </Badge>
                </div>
              ) : (
                <div className="text-center p-8">
                  <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhuma aula disponivel</p>
                </div>
              )}
            </div>
          )}

          {activeLesson && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{activeLesson.title}</h2>
              <p className="text-slate-400">{activeLesson.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {activeLesson.duration_minutes}min
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:w-96 space-y-4">
          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
            {course.thumbnail_url && (
              <div className="aspect-video relative">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h1 className="font-bold text-white line-clamp-2">{course.title}</h1>
                </div>
              </div>
            )}
            <CardContent className="p-4 space-y-3">
              {!course.thumbnail_url && (
                <h1 className="font-bold text-white">{course.title}</h1>
              )}
              {course.description && (
                <p className="text-sm text-slate-400 line-clamp-2">{course.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {totalLessons} aulas
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(totalDuration)}
                </div>
              </div>

              {course.instructor && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                    <Users className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-slate-400">{course.instructor}</span>
                </div>
              )}

              {progressPercent > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Progresso</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {course.is_premium && (
                <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-400 w-fit">
                  <Crown className="w-3 h-3 mr-1" /> Premium
                </Badge>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400 px-1">Aulas do Curso</h3>
            {lessons.map((lesson, index) => {
              const isActive = activeLesson?.id === lesson.id
              const isDone = completedSet.has(index)
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson, index)}
                  className={`w-full text-left p-3 rounded-lg transition-all flex items-start gap-3 ${
                    isActive
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-slate-900/30 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Play className="w-4 h-4 ml-0.5" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-emerald-400' : isDone ? 'text-emerald-300' : 'text-white'}`}>
                      {lesson.title}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {lesson.duration_minutes}min
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
