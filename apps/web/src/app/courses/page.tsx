"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Difficulty = "beginner" | "intermediate" | "advanced";
type Category = "preflop" | "postflop" | "icm" | "exploits" | "tournament";

interface ApiLesson {
  id: string;
  title: string;
  content: string | null;
  content_type: string;
  duration_minutes: number;
  order_index: number;
  is_preview: boolean;
}

interface ApiCourseDetail {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  difficulty: Difficulty;
  category: string;
  duration_minutes: number;
  lesson_count: number;
  is_featured: boolean;
  tags: string[];
  author: string;
  lessons: ApiLesson[];
}

interface ApiCourse {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  difficulty: Difficulty;
  category: string;
  duration_minutes: number;
  lesson_count: number;
  is_featured: boolean;
  tags: string[];
  author: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string;
  lessons: number;
  duration: string;
  progress: number;
  image: string;
  author: string;
}

interface CourseDetail extends Course {
  lessonsList: ApiLesson[];
  loadingLessons: boolean;
  lessonsError: string | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-[var(--green-dim)] text-[var(--green)] border-[var(--green)]/40",
  intermediate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/10 text-red-400 border-red-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  preflop: "Preflop",
  postflop: "Postflop",
  icm: "ICM",
  exploits: "Exploits",
  tournament: "Tournament",
};

const DIFFICULTY_ICONS: Record<string, string> = {
  beginner: "🎯",
  intermediate: "📊",
  advanced: "🏆",
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  text: "📝",
  video: "🎬",
  quiz: "🧠",
  interactive: "🎮",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function durationToMinutes(durationStr: string): number {
  // Parse strings like "3h", "30m", "3h 30m" back to minutes
  const hMatch = durationStr.match(/(\d+)h/);
  const mMatch = durationStr.match(/(\d+)m/);
  const h = hMatch ? parseInt(hMatch[1]) * 60 : 0;
  const m = mMatch ? parseInt(mMatch[1]) : 0;
  return h + m;
}

function apiToCourse(api: ApiCourse): Course {
  return {
    id: api.id,
    title: api.title,
    description: api.description || api.short_description || "",
    difficulty: api.difficulty,
    category: api.category,
    lessons: api.lesson_count || 0,
    duration: formatDuration(api.duration_minutes || 0),
    progress: 0,
    image: DIFFICULTY_ICONS[api.difficulty] || "📚",
    author: api.author || "GTO Wizard",
  };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>(["preflop", "postflop", "icm", "exploits", "tournament"]);

  useEffect(() => {
    fetch("/api/v1/courses")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const mapped = (data.courses || []).map(apiToCourse);
        setCourses(mapped);

        // Gather unique categories from the API response
        const cats = new Set<string>();
        (data.courses || []).forEach((c: ApiCourse) => {
          if (c.category) cats.add(c.category);
        });
        if (cats.size > 0) {
          setAvailableCategories(Array.from(cats).sort());
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch courses:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const fetchCourseDetail = useCallback(async (course: Course) => {
    setSelectedCourse({
      ...course,
      lessonsList: [],
      loadingLessons: true,
      lessonsError: null,
    });

    try {
      const res = await fetch(`/api/v1/courses/${course.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ApiCourseDetail = await res.json();
      const lessonsList = (data.lessons || []).sort(
        (a, b) => a.order_index - b.order_index
      );

      setSelectedCourse((prev) =>
        prev && prev.id === course.id
          ? {
              ...prev,
              lessonsList,
              loadingLessons: false,
              lessonsError: null,
              duration: formatDuration(
                lessonsList.reduce((sum, l) => sum + l.duration_minutes, 0)
              ),
              lessons: lessonsList.length,
            }
          : prev
      );
    } catch (err: any) {
      setSelectedCourse((prev) =>
        prev && prev.id === course.id
          ? {
              ...prev,
              lessonsList: [],
              loadingLessons: false,
              lessonsError: err.message || "Failed to load lessons",
            }
          : prev
      );
    }
  }, []);

  const handleSelectCourse = useCallback(
    (course: Course) => {
      if (selectedCourse?.id === course.id) return;
      setExpandedLesson(null);
      fetchCourseDetail(course);
    },
    [selectedCourse, fetchCourseDetail]
  );

  const filteredCourses = courses.filter((course) => {
    if (filterDifficulty !== "all" && course.difficulty !== filterDifficulty) return false;
    if (filterCategory !== "all" && course.category !== filterCategory) return false;
    return true;
  });

  const totalLessons = courses.reduce((sum, c) => sum + c.lessons, 0);
  const totalDurationMinutes = courses.reduce(
    (sum, c) => sum + durationToMinutes(c.duration),
    0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--green)]">Pre-Built Courses</h1>
          <p className="text-[var(--muted)] mt-1">Structured learning paths to master GTO poker</p>
        </div>
        <Link
          href="/train"
          className="px-4 py-2 bg-poker-gold text-gray-900 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Continue Training
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text)]">{courses.length}</div>
          <div className="text-sm text-[var(--muted)]">Available Courses</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--green)]">{totalLessons}</div>
          <div className="text-sm text-[var(--muted)]">Total Lessons</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text)]">
            {formatDuration(totalDurationMinutes)}
          </div>
          <div className="text-sm text-[var(--muted)]">Total Content</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[var(--green)]">0%</div>
          <div className="text-sm text-[var(--muted)]">Overall Progress</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-[var(--panel)] border border-[var(--border)] rounded-xl">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Difficulty</label>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | "all")}
            className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] text-sm"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📚</div>
          <p className="text-[var(--muted)]">Loading courses...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-[var(--border)] rounded-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400">Failed to load courses: {error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Available Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCourses.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-[var(--muted)]">
                  No courses match your filters.
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className={cn(
                      "flex gap-4 p-4 rounded-xl border bg-[var(--panel)] text-left transition-all hover:shadow-md hover:shadow-black/10 hover:scale-[1.02]",
                      selectedCourse?.id === course.id
                        ? "border-[var(--green)] ring-2 ring-[var(--green)]/30"
                        : "border-[var(--border)] hover:border-[var(--border-light)]"
                    )}
                  >
                    {/* Thumbnail / Icon area */}
                    <div className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-2xl",
                      course.difficulty === "beginner" ? "bg-[var(--green-dim)]" :
                      course.difficulty === "intermediate" ? "bg-yellow-500/10" :
                      "bg-red-500/10"
                    )}>
                      {course.image}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text)] truncate">{course.title}</h3>
                      <p className="text-sm text-[var(--muted)] mt-0.5 line-clamp-2">{course.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                            DIFFICULTY_COLORS[course.difficulty]
                          )}
                        >
                          {course.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)]">
                          {CATEGORY_LABELS[course.category] || course.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-[var(--muted)]">
                        <span>{course.lessons} lessons · {course.duration}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--green)] rounded-full"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                          <span className="font-medium text-[var(--muted)]">{course.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Course Detail */}
          <div className="space-y-6">
            {selectedCourse ? (
              <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-4xl">{selectedCourse.image}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedCourse.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">by {selectedCourse.author}</p>
                  </div>
                </div>

                <p className="text-gray-300 mb-4">{selectedCourse.description}</p>

                <div className="flex items-center gap-3 mb-6">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs border capitalize",
                      DIFFICULTY_COLORS[selectedCourse.difficulty]
                    )}
                  >
                    {selectedCourse.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                    {CATEGORY_LABELS[selectedCourse.category] || selectedCourse.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">
                      {selectedCourse.loadingLessons
                        ? "..."
                        : selectedCourse.lessons}
                    </div>
                    <div className="text-gray-400">Lessons</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">
                      {selectedCourse.duration}
                    </div>
                    <div className="text-gray-400">Duration</div>
                  </div>
                </div>

                {/* Lessons Section */}
                {selectedCourse.loadingLessons ? (
                  <div className="py-4 text-center text-sm text-gray-400 animate-pulse">
                    Loading lessons...
                  </div>
                ) : selectedCourse.lessonsError ? (
                  <div className="py-4 text-center text-sm text-red-400">
                    Failed to load lessons: {selectedCourse.lessonsError}
                  </div>
                ) : selectedCourse.lessonsList.length > 0 ? (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                      Lessons ({selectedCourse.lessonsList.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedCourse.lessonsList.map((lesson, idx) => (
                        <div key={lesson.id} className="border border-gray-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              setExpandedLesson(
                                expandedLesson === lesson.id ? null : lesson.id
                              )
                            }
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 text-xs flex items-center justify-center text-gray-300 font-medium">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-sm text-gray-200 font-medium">
                              {lesson.title}
                            </span>
                            <div className="flex items-center gap-2">
                              {lesson.is_preview && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-poker-gold/20 text-poker-gold uppercase font-semibold">
                                  Preview
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {CONTENT_TYPE_ICONS[lesson.content_type] || "📄"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDuration(lesson.duration_minutes)}
                              </span>
                            </div>
                          </button>
                          {expandedLesson === lesson.id && lesson.content && (
                            <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/30 text-sm text-gray-300 leading-relaxed max-h-60 overflow-y-auto">
                              <div className="prose prose-invert prose-sm max-w-none">
                                {lesson.content.split("\n").map((line, i) => {
                                  // Simple markdown-like rendering
                                  if (line.startsWith("# ")) {
                                    return (
                                      <h1 key={i} className="text-lg font-bold text-white mt-2 mb-1">
                                        {line.replace("# ", "")}
                                      </h1>
                                    );
                                  }
                                  if (line.startsWith("## ")) {
                                    return (
                                      <h2 key={i} className="text-base font-semibold text-gray-100 mt-3 mb-1">
                                        {line.replace("## ", "")}
                                      </h2>
                                    );
                                  }
                                  if (line.startsWith("### ")) {
                                    return (
                                      <h3 key={i} className="text-sm font-semibold text-gray-200 mt-2 mb-1">
                                        {line.replace("### ", "")}
                                      </h3>
                                    );
                                  }
                                  if (line.startsWith("- **") && line.endsWith("**")) {
                                    return (
                                      <p key={i} className="text-gray-300 ml-4">
                                        • <strong>{line.replace("- **", "").replace("**", "")}</strong>
                                      </p>
                                    );
                                  }
                                  if (line.startsWith("- ")) {
                                    return (
                                      <li key={i} className="text-gray-300 ml-4 list-disc">
                                        {line.replace("- ", "")}
                                      </li>
                                    );
                                  }
                                  if (line.startsWith("|") && line.includes("---")) {
                                    return null;
                                  }
                                  if (line.startsWith("|")) {
                                    return (
                                      <p key={i} className="text-gray-300 text-xs font-mono">
                                        {line}
                                      </p>
                                    );
                                  }
                                  if (line.trim() === "") {
                                    return <div key={i} className="h-2" />;
                                  }
                                  return (
                                    <p key={i} className="text-gray-300 mb-1">
                                      {line}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    if (selectedCourse.lessonsList.length > 0) {
                      setExpandedLesson(
                        expandedLesson === selectedCourse.lessonsList[0].id
                          ? null
                          : selectedCourse.lessonsList[0].id
                      );
                    }
                  }}
                  className="w-full py-3 px-4 rounded-lg font-semibold bg-[var(--green)] text-black hover:opacity-90 transition-all"
                >
                  {selectedCourse.lessonsList.length > 0
                    ? "Start Course"
                    : "Loading..."}
                </button>
              </div>
            ) : (
              <div className="border border-[var(--border)] rounded-lg p-8 text-center bg-[var(--panel)]">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-[var(--muted)]">Select a course to view details</p>
              </div>
            )}

            <div className="border border-[var(--border)] rounded-lg bg-[var(--panel)] p-6">
              <h4 className="text-lg font-semibold text-[var(--text)] mb-4">Quick Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Courses Available</span>
                  <span className="font-medium text-[var(--text)]">{courses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Total Lessons</span>
                  <span className="font-medium text-[var(--text)]">{totalLessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Started</span>
                  <span className="font-medium text-[var(--text)]">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
