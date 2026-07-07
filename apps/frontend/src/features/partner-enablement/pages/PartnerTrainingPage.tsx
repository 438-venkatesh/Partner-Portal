import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enablementApi } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { CheckCircle2, GraduationCap } from 'lucide-react';

function CourseDialog({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ scorePercent: number; passed: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['partner-training-course', courseId],
    queryFn: () => enablementApi.getCourseForPartner(courseId),
  });
  const { data: progress } = useQuery({ queryKey: ['partner-training-progress'], queryFn: enablementApi.getMyProgress });

  const enrollment = progress?.find((e) => e.courseId === courseId);
  const completedLessonIds = new Set(enrollment?.completedLessonIds ?? []);

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) => enablementApi.completeLesson(courseId, lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partner-training-progress'] }),
  });

  const submitQuizMutation = useMutation({
    mutationFn: () => {
      const ordered = (data?.questions ?? []).map((_, idx) => answers[idx] ?? -1);
      return enablementApi.submitQuiz(courseId, ordered);
    },
    onSuccess: (res) => {
      setResult({ scorePercent: res.scorePercent, passed: res.passed });
      queryClient.invalidateQueries({ queryKey: ['partner-training-progress'] });
      if (res.passed) toast({ title: 'Certificate earned!', description: `You scored ${res.scorePercent}%.` });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const allLessonsComplete =
    (data?.lessons.length ?? 0) === 0 || (data?.lessons ?? []).every((l) => completedLessonIds.has(l.lessonId));
  const allAnswered = (data?.questions ?? []).every((_, idx) => answers[idx] !== undefined);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.course.title ?? 'Course'}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">{data?.course.description}</p>

            <div>
              <h4 className="mb-2 font-medium">Lessons</h4>
              <div className="space-y-2">
                {(data?.lessons ?? []).map((lesson) => {
                  const done = completedLessonIds.has(lesson.lessonId);
                  return (
                    <div key={lesson.lessonId} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{lesson.title}</span>
                        {done ? (
                          <Badge variant="success">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Complete
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => completeLessonMutation.mutate(lesson.lessonId)}>
                            Mark complete
                          </Button>
                        )}
                      </div>
                      {lesson.content && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{lesson.content}</p>}
                      {lesson.videoUrl && (
                        <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="mt-1 block text-primary underline">
                          Watch video
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {(data?.questions.length ?? 0) > 0 && (
              <div>
                <h4 className="mb-2 font-medium">Certification quiz</h4>
                {!allLessonsComplete && (
                  <p className="mb-2 text-sm text-muted-foreground">Complete all lessons before taking the quiz.</p>
                )}
                <div className="space-y-3">
                  {(data?.questions ?? []).map((q, qIdx) => (
                    <div key={q.questionId} className="rounded-md border p-3 text-sm">
                      <p className="mb-2 font-medium">{q.questionText}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, optIdx) => (
                          <label key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q-${qIdx}`}
                              checked={answers[qIdx] === optIdx}
                              onChange={() => setAnswers({ ...answers, [qIdx]: optIdx })}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {result && (
                  <p className={`mt-3 font-medium ${result.passed ? 'text-green-600' : 'text-destructive'}`}>
                    Score: {result.scorePercent}% — {result.passed ? 'Passed' : 'Not passed, try again'}
                  </p>
                )}
                <Button
                  className="mt-3"
                  disabled={!allLessonsComplete || !allAnswered || submitQuizMutation.isPending}
                  onClick={() => submitQuizMutation.mutate()}
                >
                  Submit quiz
                </Button>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerTrainingPage() {
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  const { data: available, isLoading } = useQuery({ queryKey: ['partner-training-available'], queryFn: enablementApi.listAvailableTraining });
  const { data: progress } = useQuery({ queryKey: ['partner-training-progress'], queryFn: enablementApi.getMyProgress });

  const progressByCourse = new Map((progress ?? []).map((p) => [p.courseId, p]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My certificates &amp; progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(progress ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses started yet.</p>
          ) : (
            (progress ?? []).map((p) => (
              <div key={p.enrollmentId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{p.course?.title ?? p.courseId}</p>
                  {p.status === 'completed' ? (
                    <Badge variant="success" className="mt-1">
                      <GraduationCap className="mr-1 h-3 w-3" />
                      Certified · {p.quizScorePercent}%
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 capitalize">
                      {p.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenCourseId(p.courseId)}>
                  Continue
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            (available?.courses ?? []).map((course) => {
              const enrollment = progressByCourse.get(course.courseId);
              return (
                <div key={course.courseId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{course.title}</p>
                    <p className="text-muted-foreground">{course.description}</p>
                    {enrollment && enrollment.status !== 'completed' && (
                      <Progress value={enrollment.completedLessonIds.length > 0 ? 50 : 0} className="mt-2 h-2 w-40" />
                    )}
                  </div>
                  <Button size="sm" onClick={() => setOpenCourseId(course.courseId)}>
                    {enrollment ? 'Continue' : 'Start'}
                  </Button>
                </div>
              );
            })
          )}
          {(available?.courses ?? []).length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">No training assigned yet.</p>
          )}
        </CardContent>
      </Card>

      {openCourseId && <CourseDialog courseId={openCourseId} onClose={() => setOpenCourseId(null)} />}
    </div>
  );
}
