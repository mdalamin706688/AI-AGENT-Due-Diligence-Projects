const API_BASE = 'http://localhost:8000';

export const api = {
  getProjects: () => fetch(`${API_BASE}/projects`).then(res => res.json()),
  getProject: (id: string) => fetch(`${API_BASE}/get-project-info?project_id=${id}`).then(res => res.json()),
  // Add more
};