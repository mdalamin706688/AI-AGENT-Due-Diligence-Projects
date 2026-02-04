import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

interface Project {
  id: string;
  name: string;
  status: string;
  scope: string;
  questions?: any[];
  answers?: any[];
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [questionnaire, setQuestionnaire] = useState('ILPA_Due_Diligence_Questionnaire_v1.2.pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    fetch('http://localhost:8000/projects')
      .then(res => res.json())
      .then(setProjects)
      .catch(err => {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects');
      });
  };

  const createProject = async () => {
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:8000/create-project-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          questionnaire_file: questionnaire,
          scope: 'ALL_DOCS'
        })
      });

      const result = await response.json();
      if (result.request_id) {
        setSuccess('Project creation started...');
        pollRequestStatus(result.request_id);
      } else {
        setError('Failed to create project');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project');
      setLoading(false);
    }
  };

  const pollRequestStatus = (requestId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/requests/${requestId}`);
        const status = await response.json();

        if (status.status === 'COMPLETED') {
          setLoading(false);
          setSuccess('Project created successfully!');
          fetchProjects();
          setTimeout(() => setSuccess(null), 3000);
        } else if (status.status === 'FAILED') {
          setLoading(false);
          setError('Project creation failed: ' + status.error);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setLoading(false);
        setError('Failed to check project status');
      }
    };
    poll();
  };

  const updateProject = async (projectId: string) => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:8000/update-project-async?project_id=${projectId}`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.request_id) {
        setSuccess('Document indexing started...');
        pollRequestStatus(result.request_id);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Failed to start document indexing');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return 'success';
      case 'INDEXING': return 'warning';
      case 'CREATED': return 'info';
      default: return 'error';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY': return '✅';
      case 'INDEXING': return '🔄';
      case 'CREATED': return '📁';
      default: return '❌';
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        Due Diligence Projects
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AddIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Create New Project
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
                placeholder="Enter project name"
              />

              <TextField
                fullWidth
                label="Questionnaire File"
                value={questionnaire}
                onChange={(e) => setQuestionnaire(e.target.value)}
                variant="outlined"
                sx={{ mb: 3 }}
                placeholder="ILPA_Due_Diligence_Questionnaire_v1.2.pdf"
              />

              <Button
                fullWidth
                variant="contained"
                onClick={createProject}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                size="large"
              >
                {loading ? 'Creating Project...' : 'Create Project'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center">
                <FolderIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Existing Projects
                </Typography>
              </Box>
              <Tooltip title="Refresh projects">
                <IconButton onClick={fetchProjects} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {projects.length === 0 ? (
              <Box textAlign="center" py={6}>
                <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No projects yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your first due diligence project to get started
                </Typography>
              </Box>
            ) : (
              <List>
                {projects.map((project, index) => (
                  <React.Fragment key={project.id}>
                    <ListItem
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        mb: 2,
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" component="span">
                              {project.name}
                            </Typography>
                            <Chip
                              label={`${getStatusIcon(project.status)} ${project.status}`}
                              color={getStatusColor(project.status) as any}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Typography variant="body2" color="text.secondary" component="div">
                              {project.questions && `Questions: ${project.questions.length} • `}
                              {project.answers && `Answers: ${project.answers.length}`}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1}>
                          {project.status === 'CREATED' && (
                            <Tooltip title="Index documents">
                              <IconButton
                                onClick={() => updateProject(project.id)}
                                color="primary"
                                size="small"
                              >
                                <PlayArrowIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View project">
                            <IconButton
                              component={Link}
                              to={`/project/${project.id}`}
                              color="primary"
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < projects.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}