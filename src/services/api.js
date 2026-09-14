import axios from "axios";

/**
 * API Configuration
 * Base URL defaults to localhost:8000 for local development.
 * VITE_API_BASE_URL should be set in .env.production for deployment.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Server root URL (without /api) — used for image URLs, etc.
export const API_SERVER_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 120000,
  withCredentials: true,
});

// ─── Axios Interceptor: Attach JWT token to every request ───
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("qsl_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ═══════════════════════════════════════════════════════
// AUTH APIs
// ═══════════════════════════════════════════════════════

export async function loginUser(username, password) {
  const response = await apiClient.post("/auth/login", { username, password });
  return response.data;
}

export async function registerUser(userData) {
  const response = await apiClient.post("/auth/register", userData);
  return response.data;
}

export async function googleLoginUser(token, os) {
  const response = await apiClient.post("/auth/google-login", { token, os });
  return response.data;
}

export async function getCurrentUser(token) {
  const response = await apiClient.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════
// ALGORITHM APIs
// ═══════════════════════════════════════════════════════

export async function getAlgorithms() {
  const response = await apiClient.get("/algorithms");
  return response.data;
}

export async function getAlgorithmById(id) {
  const response = await apiClient.get(`/algorithms/${id}`);
  return response.data;
}

export async function runAlgorithm(algorithmId, parameters) {
  const response = await apiClient.post("/run", { algorithmId, parameters });
  return response.data;
}

// ─── Admin CRUD ─────────────────────────────────────

export async function createAlgorithm(data) {
  const response = await apiClient.post("/algorithms", data);
  return response.data;
}

export async function updateAlgorithm(id, data) {
  const response = await apiClient.put(`/algorithms/${id}`, data);
  return response.data;
}

export async function deleteAlgorithm(id) {
  const response = await apiClient.delete(`/algorithms/${id}`);
  return response.data;
}

// ═══════════════════════════════════════════════════════
// EDUCATIONAL CONTENT APIs
// ═══════════════════════════════════════════════════════

export async function getEducationalContent(algorithmId) {
  const response = await apiClient.get(`/educational/${algorithmId}`);
  return response.data;
}

export async function updateEducationalContent(algorithmId, data) {
  const response = await apiClient.put(`/educational/${algorithmId}`, data);
  return response.data;
}

// ═══════════════════════════════════════════════════════
// SANDBOX APIs
// ═══════════════════════════════════════════════════════

export async function runSandboxCode(payload) {
  const body = typeof payload === "string" ? { code: payload } : payload;
  const response = await apiClient.post("/sandbox/run", body);
  return response.data;
}

export async function installSandboxPackages(packages) {
  const response = await apiClient.post("/sandbox/install", { packages });
  return response.data;
}

// ═══════════════════════════════════════════════════════
// CMS (Content Management) APIs
// ═══════════════════════════════════════════════════════

// --- Docs ---
export async function getDocs() {
  const res = await apiClient.get("/docs");
  return res.data;
}
export async function createDoc(data) {
  const res = await apiClient.post("/docs", data);
  return res.data;
}
export async function reorderDocs(updates) {
  const res = await apiClient.put("/docs/reorder", { updates });
  return res.data;
}
export async function updateDoc(id, data) {
  const res = await apiClient.put(`/docs/${id}`, data);
  return res.data;
}
export async function deleteDoc(id) {
  const res = await apiClient.delete(`/docs/${id}`);
  return res.data;
}

// --- Blogs ---
export async function getBlogs(page = 1, limit = 0, search = "") {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  if (search) params.append("search", search);
  const res = await apiClient.get(`/blogs?${params.toString()}`);
  return res.data;
}
export async function createBlog(data) {
  const res = await apiClient.post("/blogs", data);
  return res.data;
}
export async function updateBlog(id, data) {
  const res = await apiClient.put(`/blogs/${id}`, data);
  return res.data;
}
export async function deleteBlog(id) {
  const res = await apiClient.delete(`/blogs/${id}`);
  return res.data;
}

export async function likeBlog(id) {
  const res = await apiClient.post(`/blogs/${id}/like`);
  return res.data;
}

export async function commentBlog(id, text) {
  const res = await apiClient.post(`/blogs/${id}/comment`, { text });
  return res.data;
}

// --- News ---
export async function getNews(page = 1, limit = 0, search = "") {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  if (search) params.append("search", search);
  const res = await apiClient.get(`/news?${params.toString()}`);
  return res.data;
}
export async function createNews(data) {
  const res = await apiClient.post("/news", data);
  return res.data;
}
export async function updateNews(id, data) {
  const res = await apiClient.put(`/news/${id}`, data);
  return res.data;
}
export async function deleteNews(id) {
  const res = await apiClient.delete(`/news/${id}`);
  return res.data;
}

// --- GNews (Live External News) ---
export async function searchGNews(query = "quantum computing", page = 1, max = 10) {
  const params = new URLSearchParams();
  params.append("q", query);
  params.append("page", page);
  params.append("max", max);
  const res = await apiClient.get(`/gnews/search?${params.toString()}`);
  return res.data;
}

export async function getGNewsHeadlines(topic = "technology", max = 10) {
  const params = new URLSearchParams();
  params.append("topic", topic);
  params.append("max", max);
  const res = await apiClient.get(`/gnews/top-headlines?${params.toString()}`);
  return res.data;
}

// ═══════════════════════════════════════════════════════
// UPLOAD APIs
// ═══════════════════════════════════════════════════════

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await apiClient.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

// ═══════════════════════════════════════════════════════
// CHALLENGES APIs
// ═══════════════════════════════════════════════════════

export async function runChallengeCircuit(numQubits, gates, targetState, challengeId) {
  const response = await apiClient.post("/challenge/run", { numQubits, gates, targetState, challengeId });
  return response.data;
}

export async function getChallenges() {
  const response = await apiClient.get("/challenges");
  return response.data;
}

export async function createChallenge(data) {
  const response = await apiClient.post("/admin/challenges", data);
  return response.data;
}

export async function updateChallenge(id, data) {
  const response = await apiClient.put(`/admin/challenges/${id}`, data);
  return response.data;
}

export async function deleteChallenge(id) {
  const response = await apiClient.delete(`/admin/challenges/${id}`);
  return response.data;
}

// ----------------------------------------------------
// Courses API (Phase 5)
// ----------------------------------------------------
export const getCourses = async () => {
  const res = await apiClient.get("/courses");
  return res.data;
};

export const getCourseById = async (id) => {
  const res = await apiClient.get(`/courses/${id}`);
  return res.data;
};

export const createCourse = async (data) => {
  const res = await apiClient.post("/courses", data);
  return res.data;
};

export const updateCourse = async (id, data) => {
  const res = await apiClient.put(`/courses/${id}`, data);
  return res.data;
};

export const deleteCourse = async (id) => {
  const res = await apiClient.delete(`/courses/${id}`);
  return res.data;
};

// ═══════════════════════════════════════════════════════
// AI TUTOR APIs (P5)
// ═══════════════════════════════════════════════════════

export async function chatWithTutor(message, history = [], context = {}) {
  const res = await apiClient.post("/ai/chat", { message, history, context });
  
  return res.data;
}

export async function explainConcept(concept) {
  const res = await apiClient.post("/ai/explain", { concept });
  return res.data;
}

export async function analyzeCircuit(payload) {
  const res = await apiClient.post("/ai/analyze-circuit", payload);
  return res.data;
}

export async function getRecommendations() {
  const res = await apiClient.get("/ai/recommend");
  return res.data;
}

// ═══════════════════════════════════════════════════════
// PROGRESS APIs (P6)
// ═══════════════════════════════════════════════════════

export async function getMyProgress() {
  const res = await apiClient.get("/progress/me");
  return res.data;
}

export async function updateMicroModuleProgress(moduleId, status) {
  const res = await apiClient.put(`/progress/micro-module/${moduleId}`, { status });
  return res.data;
}

export async function bookmarkMicroModule(moduleId) {
  const res = await apiClient.post(`/progress/micro-module/${moduleId}/bookmark`);
  return res.data;
}

export async function unbookmarkMicroModule(moduleId) {
  const res = await apiClient.delete(`/progress/micro-module/${moduleId}/bookmark`);
  return res.data;
}

export async function getBookmarkedMicroModules() {
  const res = await apiClient.get("/progress/micro-modules/bookmarks");
  return res.data;
}

export async function bookmarkAlgorithm(algorithmId) {
  const res = await apiClient.post(`/progress/algorithm/${algorithmId}/bookmark`);
  return res.data;
}

export async function unbookmarkAlgorithm(algorithmId) {
  const res = await apiClient.delete(`/progress/algorithm/${algorithmId}/bookmark`);
  return res.data;
}

export async function getBookmarkedAlgorithms() {
  const res = await apiClient.get("/progress/algorithms/bookmarks");
  return res.data;
}

export async function getMicroModules(track = "foundations") {
  const res = await apiClient.get(`/micro-modules?track=${track}`);
  return res.data;
}

export async function getMicroModuleById(moduleId) {
  const res = await apiClient.get(`/micro-modules/${moduleId}`);
  return res.data;
}

export async function updateLearningProfile(profileData) {
  const res = await apiClient.put("/auth/learning-profile", profileData);
  return res.data;
}

export async function markLectureComplete(courseId, lectureIndex) {
  const res = await apiClient.post(`/progress/course/${courseId}/lecture/${lectureIndex}`);
  return res.data;
}

export async function recordAlgorithmRun(algorithmId) {
  const res = await apiClient.post(`/progress/algorithm/${algorithmId}`);
  return res.data;
}

export async function getCohortProgress() {
  const res = await apiClient.get("/progress/cohort");
  return res.data;
}

// ═══════════════════════════════════════════════════════
// CERTIFICATE APIs
// ═══════════════════════════════════════════════════════

export async function getMyCertificates() {
  const res = await apiClient.get("/certificates/me");
  return res.data;
}

export async function getCertificateForCourse(courseId) {
  const res = await apiClient.get(`/certificates/course/${courseId}`);
  return res.data;
}

export async function verifyCertificate(certificateId) {
  const res = await apiClient.get(`/certificates/verify/${certificateId}`);
  return res.data;
}

export async function downloadCertificate(certificateId, filename) {
  const res = await apiClient.get(`/certificates/${certificateId}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || `Certificate-${certificateId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════
// CIRCUIT INTEROP APIs (P8 — OpenQASM)
// ═══════════════════════════════════════════════════════

export async function exportCircuitToQasm(numQubits, gates) {
  const res = await apiClient.post("/circuit/export-qasm", { numQubits, gates });
  return res.data;
}

export async function importCircuitFromQasm(qasm) {
  const res = await apiClient.post("/circuit/import-qasm", { qasm });
  return res.data;
}

/**
 * Evaluates a circuit step-by-step for the Quantum Circuit Time Machine.
 * POST /api/circuit/timeline
 * @param {Object} circuitPayload - { numQubits: number, gates: Array<{ type, wire, target? }> }
 */
export async function runCircuitTimeline(circuitPayload) {
  const payload = (circuitPayload && circuitPayload.numQubits !== undefined)
    ? circuitPayload
    : { numQubits: arguments[0], gates: arguments[1] };
  const res = await apiClient.post("/circuit/timeline", payload);
  return res.data;
}

/**
 * Requests an AI-grounded pedagogical explanation for a specific step transition.
 * POST /api/ai/explain-transition
 * Uses unguessable bearer capability timelineId; server retrieves verified Stage 4 facts.
 * @param {Object} params - { timelineId: string, stepIndex: number, learnerQuestion?: string, explanationMode?: string }
 */
export async function explainCircuitTransition({ timelineId, stepIndex, learnerQuestion = "", explanationMode = "standard" }) {
  const res = await apiClient.post("/ai/explain-transition", {
    timelineId,
    stepIndex,
    learnerQuestion,
    explanationMode,
  });
  return res.data;
}

/**
 * Evaluates a noisy circuit timeline against a verified ideal timeline (Stage 6 Noise Lab).
 * POST /api/circuit/noisy-timeline
 * @param {Object} params - { timelineId: string, noiseModel: string, noiseStrength: number }
 */
export async function runNoisyCircuitTimeline({ timelineId, noiseModel, noiseStrength }) {
  const res = await apiClient.post("/circuit/noisy-timeline", {
    timelineId,
    noiseModel,
    noiseStrength,
  });
  return res.data;
}

/**
 * Requests an AI-grounded pedagogical explanation of noise-induced trajectory divergence (Stage 6).
 * POST /api/ai/explain-noise
 * @param {Object} params - { timelineId: string, noisyTimelineId: string, stepIndex: number, learnerQuestion?: string }
 */
export async function explainNoiseDivergence({ timelineId, noisyTimelineId, stepIndex, learnerQuestion = "" }) {
  const res = await apiClient.post("/ai/explain-noise", {
    timelineId,
    noisyTimelineId,
    stepIndex,
    learnerQuestion,
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════
// TOPIC NAVIGATOR APIs (Phase 7F)
// ═══════════════════════════════════════════════════════

export async function getTopics() {
  const res = await apiClient.get("/topics");
  return res.data;
}

export async function getTopicById(topicId) {
  const res = await apiClient.get(`/topics/${encodeURIComponent(topicId)}`);
  return res.data;
}

export async function getTopicByResource(resourceType, resourceId) {
  const res = await apiClient.get(`/topics/by-resource/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}`);
  return res.data;
}

// ═══════════════════════════════════════════════════════
// USER-GENERATED INTERACTIVE LESSONS (Phase 7H)
// ═══════════════════════════════════════════════════════

export async function generatePersonalLesson({ topic, topicDescription = "", learnerLevel = "intermediate", forceAlternative = false }) {
  const res = await apiClient.post("/generated-lessons/generate", {
    topic,
    topicDescription,
    learnerLevel,
    forceAlternative,
  });
  return res.data;
}

export async function getMyGeneratedLessons() {
  const res = await apiClient.get("/generated-lessons");
  return res.data;
}

export async function getMyBookmarkedGeneratedLessons() {
  const res = await apiClient.get("/generated-lessons/bookmarks");
  return res.data;
}

export async function getGeneratedLessonById(lessonId) {
  const res = await apiClient.get(`/generated-lessons/${encodeURIComponent(lessonId)}`);
  return res.data;
}

export async function deleteGeneratedLesson(lessonId) {
  const res = await apiClient.delete(`/generated-lessons/${encodeURIComponent(lessonId)}`);
  return res.data;
}

export async function bookmarkGeneratedLesson(lessonId) {
  const res = await apiClient.post(`/generated-lessons/${encodeURIComponent(lessonId)}/bookmark`);
  return res.data;
}

export async function unbookmarkGeneratedLesson(lessonId) {
  const res = await apiClient.delete(`/generated-lessons/${encodeURIComponent(lessonId)}/bookmark`);
  return res.data;
}

export default apiClient;


