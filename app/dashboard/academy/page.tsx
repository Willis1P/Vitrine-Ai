"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase, Course, CourseLesson } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GraduationCap,
  Play,
  Clock,
  CheckCircle2,
  Lock,
  Crown,
  BookOpen,
  Users,
} from 'lucide-react'

const MARKETPLACE_FOCUS = [
  { id: 'all', label: 'Todos' },
  { id: 'shopee', label: 'Shopee' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'mercadolivre', label: 'Mercado Livre' },
  { id: 'general', label: 'Geral' },
]

export default function AcademyPage() {
  const { user, profile } = useAuth()
  const [courses, setCourses] = useState<(Course & { lessons?: CourseLesson[], progress?: any })[]>([])
  const [selectedFocus, setSelectedFocus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourses()
  }, [user])

  const fetchCourses = async () => {
    try {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*, lessons:course_lessons(*)')
        .eq('is_published', true)
        .order('sort_order')

      if (coursesData) {
        let coursesWithProgress = coursesData as any[]

        if (user) {
          const { data: progressData } = await supabase
            .from('user_course_progress')
            .select('*')
            .eq('user_id', user.id)

          if (progressData) {
            coursesWithProgress = coursesWithProgress.map((course) => {
              const progress = progressData.find((p) => p.course_id === course.id)
              return { ...course, progress }
            })
          }
        }

        setCourses(coursesWithProgress)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter((course) =>
    selectedFocus === 'all' || course.marketplace_focus === selectedFocus
  )

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          Academia de Vendas
        </h1>
        <p className="text-slate-400 mt-1">Aprenda a vender mais nos principais marketplaces</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {MARKETPLACE_FOCUS.map((focus) => (
          <Button
            key={focus.id}
            variant={selectedFocus === focus.id ? 'default' : 'outline'}
            className={selectedFocus === focus.id ? 'bg-blue-500 hover:bg-blue-600' : 'border-slate-700 text-slate-300'}
            onClick={() => setSelectedFocus(focus.id)}
          >
            {focus.label}
          </Button>
        ))}
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isPremium = course.is_premium
            const hasAccess = !isPremium || profile?.role === 'admin'
            const progressPercent = course.progress?.progress_percent || 0
            const isCompleted = course.progress?.completed_at

            return (
              <Card key={course.id} className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all overflow-hidden">
                <div className="aspect-video relative overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      {hasAccess ? (
                        <Play className="w-7 h-7 text-white" />
                      ) : (
                        <Lock className="w-7 h-7 text-white" />
                      )}
                    </div>
                  </div>
                  {isPremium && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500/90 text-amber-900">
                        <Crown className="w-3 h-3 mr-1" /> Premium
                      </Badge>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-500/90 text-emerald-900">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Concluido
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-3">{course.description}</p>

                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(course.duration_minutes)}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.lessons?.length || 0} aulas
                    </div>
                  </div>

                  {course.instructor && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                        <Users className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-xs text-slate-400">{course.instructor}</span>
                    </div>
                  )}

                  {hasAccess && progressPercent > 0 && (
                    <div className="mb-3">
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

                  <Button
                    className="w-full"
                    variant={hasAccess ? 'default' : 'outline'}
                    disabled={!hasAccess}
                  >
                    {hasAccess ? (
                      progressPercent > 0 ? 'Continuar' : 'Comecar Curso'
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Desbloquear
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredCourses.length === 0 && !loading && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum curso encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
