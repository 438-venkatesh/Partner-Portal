import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enablementApi } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

function CourseEditorDialog({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [questions, setQuestions] = useState<Array<{ questionText: string; options: string[]; correctOptionIndex: number }> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['training-course', courseId],
    queryFn: () => enablementApi.getCourseWithContent(courseId),
  });

  const editableQuestions =
    questions ??
    (data?.questions ?? []).map((q) => ({
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex ?? 0,
    }));

  const addLessonMutation = useMutation({
    mutationFn: () => enablementApi.addLesson(courseId, { title: lessonTitle, content: lessonContent || undefined }),
    onSuccess: () => {
      toast({ title: 'Lesson added' });
      queryClient.invalidateQueries({ queryKey: ['training-course', courseId] });
      setLessonTitle('');
      setLessonContent('');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => enablementApi.deleteLesson(lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-course', courseId] }),
  });

  const saveQuizMutation = useMutation({
    mutationFn: () => enablementApi.setQuizQuestions(courseId, editableQuestions),
    onSuccess: () => {
      toast({ title: 'Quiz saved' });
      queryClient.invalidateQueries({ queryKey: ['training-course', courseId] });
      setQuestions(null);
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

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
            <div>
              <h4 className="mb-2 font-medium">Lessons</h4>
              <div className="space-y-2">
                {(data?.lessons ?? []).map((lesson) => (
                  <div key={lesson.lessonId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{lesson.title}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteLessonMutation.mutate(lesson.lessonId)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border p-3">
                <FormInput label="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
                <FormTextarea label="Content" value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={3} />
                <Button
                  size="sm"
                  disabled={!lessonTitle.trim() || addLessonMutation.isPending}
                  onClick={() => addLessonMutation.mutate()}
                >
                  Add lesson
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Quiz questions</h4>
              <div className="space-y-3">
                {editableQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="space-y-2 rounded-md border p-3">
                    <FormInput
                      label="Question"
                      value={q.questionText}
                      onChange={(e) => {
                        const next = [...editableQuestions];
                        next[qIdx] = { ...next[qIdx], questionText: e.target.value };
                        setQuestions(next);
                      }}
                    />
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={q.correctOptionIndex === optIdx}
                          onChange={() => {
                            const next = [...editableQuestions];
                            next[qIdx] = { ...next[qIdx], correctOptionIndex: optIdx };
                            setQuestions(next);
                          }}
                        />
                        <div className="flex-1">
                          <FormInput
                            label={`Option ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const next = [...editableQuestions];
                              const nextOptions = [...next[qIdx].options];
                              nextOptions[optIdx] = e.target.value;
                              next[qIdx] = { ...next[qIdx], options: nextOptions };
                              setQuestions(next);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = [...editableQuestions];
                          next[qIdx] = { ...next[qIdx], options: [...next[qIdx].options, ''] };
                          setQuestions(next);
                        }}
                      >
                        Add option
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuestions(editableQuestions.filter((_, i) => i !== qIdx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setQuestions([...editableQuestions, { questionText: '', options: ['', ''], correctOptionIndex: 0 }])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add question
                </Button>
              </div>
              <Button className="mt-3" onClick={() => saveQuizMutation.mutate()} disabled={saveQuizMutation.isPending}>
                Save quiz
              </Button>
            </div>
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

function CoursesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', estimatedMinutes: '' });

  const { data: courses, isLoading } = useQuery({ queryKey: ['training-courses'], queryFn: enablementApi.listCourses });

  const createMutation = useMutation({
    mutationFn: () =>
      enablementApi.createCourse({
        title: form.title,
        description: form.description || undefined,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Course created' });
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      setCreating(false);
      setForm({ title: '', description: '', estimatedMinutes: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => enablementApi.deleteCourse(courseId),
    onSuccess: () => {
      toast({ title: 'Course deleted' });
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Courses</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New course
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
            <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <FormInput
              label="Estimated minutes"
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
            />
            <div className="col-span-2">
              <FormTextarea
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button disabled={!form.title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          (courses ?? []).map((course) => (
            <div key={course.courseId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-muted-foreground">
                  {course.estimatedMinutes ? `${course.estimatedMinutes} min` : 'No estimate'} · Pass at{' '}
                  {course.passingScorePercent}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingCourseId(course.courseId)}>
                  Edit content
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(course.courseId)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {editingCourseId && <CourseEditorDialog courseId={editingCourseId} onClose={() => setEditingCourseId(null)} />}
    </Card>
  );
}

function LearningPathsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [courseIds, setCourseIds] = useState<string[]>([]);

  const { data: courses } = useQuery({ queryKey: ['training-courses'], queryFn: enablementApi.listCourses });
  const { data: paths, isLoading } = useQuery({ queryKey: ['learning-paths'], queryFn: enablementApi.listLearningPaths });

  const createMutation = useMutation({
    mutationFn: () => enablementApi.createLearningPath({ name, courseIds }),
    onSuccess: () => {
      toast({ title: 'Learning path created' });
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      setCreating(false);
      setName('');
      setCourseIds([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pathId: string) => enablementApi.deleteLearningPath(pathId),
    onSuccess: () => {
      toast({ title: 'Learning path deleted' });
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
    },
  });

  const courseOptions = (courses ?? []).map((c) => ({ value: c.courseId, label: c.title }));
  const courseTitleById = new Map((courses ?? []).map((c) => [c.courseId, c.title]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Learning paths</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New path
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="space-y-3 rounded-md border p-3">
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <MultiSelectCombobox options={courseOptions} value={courseIds} onChange={setCourseIds} placeholder="Select courses" />
            <div className="flex gap-2">
              <Button disabled={!name.trim() || courseIds.length === 0 || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          (paths ?? []).map((path) => (
            <div key={path.pathId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{path.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {path.courseIds.map((cid) => (
                    <Badge key={cid} variant="outline">
                      {courseTitleById.get(cid) ?? cid}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(path.pathId)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function TrainingAdminPage() {
  return (
    <div className="space-y-6">
      <CoursesPanel />
      <LearningPathsPanel />
    </div>
  );
}
