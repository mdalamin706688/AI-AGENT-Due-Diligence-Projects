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
  LinearProgress,
  Avatar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Fade,
  Grow,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Update as UpdateIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

interface Project {
  id: string;
  name: string;
  status: string;
  scope: string;
  questions?: any[];
  answers?: any[];
  created_at?: string;
  updated_at?: string;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [questionnaireFile, setQuestionnaireFile] = useState<File | null>(null);
  const [scope, setScope] = useState('ALL_DOCS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [indexingProjectId, setIndexingProjectId] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [nameFieldFocused, setNameFieldFocused] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  const fetchProjects = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('http://localhost:8000/projects');
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setRefreshing(false);
    }
  };

  const createProject = async () => {
    if (!name.trim()) {
      setError('Please enter a project name');
      return;
    }

    if (!questionnaireFile) {
      setError('Please select a questionnaire file to upload');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Always use file upload endpoint
      const formData = new FormData();
      formData.append('name', name);
      formData.append('scope', scope);
      formData.append('questionnaire_file', questionnaireFile);

      const response = await fetch('http://localhost:8000/create-project-with-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.project_id) {
        setSuccess('Project created successfully!');
        
        // Fetch updated project list
        fetchProjects();
        
        setCreateDialogOpen(false);
        setName('');
        setQuestionnaireFile(null);
        setScope('ALL_DOCS');
      } else {
        setError('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const indexProject = async (projectId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setIndexingProjectId(projectId);
    setIndexingProgress(0); // Start with indeterminate

    // Update project status to PROCESSING
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === projectId
          ? { ...project, status: 'PROCESSING' }
          : project
      )
    );

    try {
      const response = await fetch(`http://localhost:8000/update-project-async?project_id=${projectId}`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.request_id) {
        setSuccess('Document indexing started...');
        pollRequestStatus(result.request_id, 'indexing');
      } else {
        setError('Failed to start document indexing');
        setIndexingProjectId(null);
        // Revert status back if failed
        setProjects(prevProjects =>
          prevProjects.map(project =>
            project.id === projectId
              ? { ...project, status: project.status === 'PROCESSING' ? 'CREATED' : project.status }
              : project
          )
        );
      }
    } catch (error) {
      console.error('Error indexing project:', error);
      setError('Failed to start document indexing');
      setIndexingProjectId(null);
      // Revert status back if failed
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId
            ? { ...project, status: project.status === 'PROCESSING' ? 'CREATED' : project.status }
            : project
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const generateAllAnswers = async (projectId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGenerationProgress(0);

    // Update project status to PROCESSING
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === projectId
          ? { ...project, status: 'PROCESSING' }
          : project
      )
    );

    try {
      const eventSource = new EventSource(`http://localhost:8000/stream-answers/${projectId}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setGenerationProgress(data.progress);
          setSuccess(`Generating answers... ${data.current}/${data.total} completed`);
        } else if (data.type === 'answer') {
          // Update the project with the new answer
          setProjects(prevProjects =>
            prevProjects.map(project =>
              project.id === projectId
                ? {
                    ...project,
                    answers: project.answers ? [...project.answers, data.answer] : [data.answer]
                  }
                : project
            )
          );
        } else if (data.type === 'completed') {
          setSuccess('Answer generation completed!');
          setGenerationProgress(100);
          setProjects(prevProjects =>
            prevProjects.map(project =>
              project.id === projectId
                ? { ...project, status: 'COMPLETED' }
                : project
            )
          );
          eventSource.close();
          setTimeout(() => {
            setSuccess(null);
            setGenerationProgress(0);
          }, 3000);
        } else if (data.type === 'error') {
          setError(data.message || 'Failed to generate answers');
          setProjects(prevProjects =>
            prevProjects.map(project =>
              project.id === projectId
                ? { ...project, status: 'INDEXED' }
                : project
            )
          );
          eventSource.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('Connection lost during answer generation');
        setProjects(prevProjects =>
          prevProjects.map(project =>
            project.id === projectId
              ? { ...project, status: 'INDEXED' }
              : project
          )
        );
        eventSource.close();
      };

    } catch (error) {
      console.error('Error generating answers:', error);
      setError('Failed to start answer generation');
      // Revert status back if failed
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === projectId
            ? { ...project, status: project.status === 'PROCESSING' ? 'INDEXED' : project.status }
            : project
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const pollRequestStatus = (requestId: string, type: string = 'create') => {
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/requests/${requestId}`);
        const result = await response.json();

        if (result.status === 'completed') {
          if (type === 'indexing') {
            setSuccess('Document indexing completed!');
            setIndexingProjectId(null);
            setIndexingProgress(100);
            setTimeout(() => {
              setIndexingProgress(0);
              setSuccess(null);
            }, 3000);
          } else if (type === 'generate') {
            setSuccess('Answer generation completed!');
            setTimeout(() => setSuccess(null), 3000);
          } else {
            // Project creation completed
            setSuccess('Project created successfully!');
            setTimeout(() => setSuccess(null), 3000);
            
            // If we have a project_id, replace the temporary project
            if (result.project_id) {
              // Remove the temporary project and fetch the real projects
              setProjects(prev => prev.filter(p => p.id !== requestId));
            }
          }
          fetchProjects();
        } else if (result.status === 'failed') {
          if (type === 'indexing') {
            setError('Document indexing failed');
            setIndexingProjectId(null);
            setIndexingProgress(0);
          } else if (type === 'generate') {
            setError('Answer generation failed');
          } else {
            setError('Project creation failed');
          }
          setLoading(false);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Error polling request status:', error);
        setError('Failed to check project status');
        setLoading(false);
        setIndexingProjectId(null);
        setIndexingProgress(0);
      }
    };
    
    poll();
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CREATED': return '📋';
      case 'INDEXED': return '📚';
      case 'ANSWERED': return '✅';
      case 'PROCESSING': return '⚡';
      case 'READY': return '⏳';
      case 'OUTDATED': return '🔄';
      case 'COMPLETED': return '✅';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CREATED': return 'warning';
      case 'INDEXED': return 'info';
      case 'ANSWERED': return 'success';
      case 'PROCESSING': return 'secondary';
      case 'READY': return 'primary';
      case 'OUTDATED': return 'error';
      case 'COMPLETED': return 'success';
      default: return 'default';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CREATED': return 25;
      case 'INDEXED': return 50;
      case 'ANSWERED': return 100;
      case 'PROCESSING': return 75;
      case 'READY': return 60;
      case 'OUTDATED': return 80;
      case 'COMPLETED': return 100;
      default: return 10;
    }
  };

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'ANSWERED').length,
    processing: projects.filter(p => p.status === 'PROCESSING').length,
    created: projects.filter(p => p.status === 'CREATED').length,
    outdated: projects.filter(p => p.status === 'OUTDATED').length,
  };

  return (
    <Fade in={true} timeout={600}>
      <Box>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff', mb: 1 }}>
                Due Diligence Projects
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Manage and monitor your due diligence questionnaire projects
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 3,
                fontSize: '0.9rem',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  borderRadius: 'inherit',
                  pointerEvents: 'none',
                },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
                  '&::before': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  }
                },
                '&:not(:hover)': {
                  transform: 'translateY(0)',
                }
              }}
            >
              New Project
            </Button>
          </Box>

<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 3, mb: 4 }}>
            <Card sx={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#ffffff',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
              },
              '& .MuiTypography-root': {
                color: '#ffffff',
              },
              '& .MuiSvgIcon-root': {
                color: '#ffffff',
                opacity: 0.9,
              },
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: '2rem', color: '#ffffff' }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, color: '#ffffff' }}>
                      Total Projects
                    </Typography>
                  </Box>
                  <BusinessIcon sx={{ fontSize: 48, opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#ffffff',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
              },
              '& .MuiTypography-root': {
                color: '#ffffff',
              },
              '& .MuiSvgIcon-root': {
                color: '#ffffff',
                opacity: 0.9,
              },
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: '2rem', color: '#ffffff' }}>
                      {stats.completed}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, color: '#ffffff' }}>
                      Completed
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#ffffff',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
              },
              '& .MuiTypography-root': {
                color: '#ffffff',
              },
              '& .MuiSvgIcon-root': {
                color: '#ffffff',
                opacity: 0.9,
              },
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: '2rem', color: '#ffffff' }}>
                      {stats.processing}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, color: '#ffffff' }}>
                      Processing
                    </Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 48, opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#ffffff',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
              },
              '& .MuiTypography-root': {
                color: '#ffffff',
              },
              '& .MuiSvgIcon-root': {
                color: '#ffffff',
                opacity: 0.9,
              },
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: '2rem', color: '#ffffff' }}>
                      {stats.created}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, color: '#ffffff' }}>
                      Created
                    </Typography>
                  </Box>
                  <DescriptionIcon sx={{ fontSize: 48, opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
                </Box>
              </CardContent>
            </Card>

            <Card sx={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#ffffff',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
              },
              '& .MuiTypography-root': {
                color: '#ffffff',
              },
              '& .MuiSvgIcon-root': {
                color: '#ffffff',
                opacity: 0.9,
              },
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, fontSize: '2rem', color: '#ffffff' }}>
                      {stats.outdated}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, color: '#ffffff' }}>
                      Outdated
                    </Typography>
                  </Box>
                  <UpdateIcon sx={{ fontSize: 48, opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Search and Actions */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <TextField
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#ffffff', opacity: 0.8 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                maxWidth: 400,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#ffffff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  },
                  '&.Mui-focused': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                  },
                  '& fieldset': {
                    border: 'none',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: '#ffffff',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.6)',
                      opacity: 1,
                    },
                  },
                },
              }}
            />
            <IconButton
              onClick={fetchProjects}
              disabled={refreshing}
              sx={{
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 3,
                p: 1.5,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  borderRadius: 'inherit',
                  pointerEvents: 'none',
                },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.2)',
                  '&::before': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  }
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transform: 'none',
                  boxShadow: 'none',
                  '&::before': {
                    display: 'none',
                  }
                }
              }}
            >
              <RefreshIcon sx={{
                fontSize: 20,
                color: '#ffffff',
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                }
              }} />
            </IconButton>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Grow in={true}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          </Grow>
        )}

        {success && (
          <Grow in={true}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          </Grow>
        )}

        {/* Projects List */}
        {filteredProjects.length === 0 && !refreshing ? (
          <Card sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 3,
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
              borderRadius: 'inherit',
              pointerEvents: 'none',
            }
          }}>
            <FolderIcon sx={{ fontSize: 80, color: '#ffffff', mb: 3, opacity: 0.8 }} />
            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
              {searchTerm ? 'No projects found' : 'No projects yet'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first due diligence project to get started'
              }
            </Typography>
            {!searchTerm && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  position: 'relative',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                  },
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
                    '&::before': {
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                    }
                  },
                  '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transform: 'none',
                    boxShadow: 'none',
                    '&::before': {
                      display: 'none',
                    }
                  },
                  '& .MuiButton-startIcon': {
                    color: '#ffffff',
                    opacity: 0.9,
                  }
                }}
              >
                Create Project
              </Button>
            )}
          </Card>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)'
            },
            gap: 3
          }}>
            {filteredProjects.map((project, index) => (
              <Grow in={true} timeout={300 + index * 100} key={project.id}>
                <Card sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '20px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    boxShadow: '0 20px 60px rgba(59, 130, 246, 0.3)',
                  },
                  '& .MuiTypography-root': {
                    color: '#ffffff',
                  },
                  '& .MuiChip-root': {
                    color: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#ffffff',
                  },
                }}>
                  <CardContent sx={{ flex: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Avatar sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        width: 56,
                        height: 56,
                        mb: 2,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>
                        <BusinessIcon sx={{ fontSize: 28, color: '#ffffff' }} />
                      </Avatar>
                      <Chip
                        label={`${getStatusIcon(project.status)} ${project.status === 'OUTDATED' ? 'OUTDATED - Re-index needed' : project.status}`}
                        color={getStatusColor(project.status) as any}
                        size="small"
                        variant="filled"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em',
                          borderRadius: 2,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          '& .MuiChip-label': {
                            px: 1.5,
                            py: 0.5,
                          }
                        }}
                      />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                      {project.name}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {project.scope || 'Full due diligence assessment'}
                    </Typography>

                    {project.status === 'OUTDATED' && (
                      <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: '0.75rem' }}>
                        ⚠️ New documents added - re-indexing required for latest answers
                      </Alert>
                    )}

                    <Box sx={{ mb: 2 }}>
                      {indexingProjectId === project.id ? (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                            {indexingProgress === 100 ? 'Indexing completed!' : 'Indexing documents...'}
                          </Typography>
                          <LinearProgress
                            variant={indexingProgress === 100 ? "determinate" : "indeterminate"}
                            value={indexingProgress === 100 ? 100 : undefined}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: indexingProgress === 100 
                                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                              }
                            }}
                          />
                        </Box>
                      ) : project.status === 'PROCESSING' && generationProgress > 0 ? (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                            Generating answers...
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={generationProgress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                              }
                            }}
                          />
                        </Box>
                      ) : (
                        <LinearProgress
                          variant="determinate"
                          value={getStatusProgress(project.status)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 3,
                              background: `linear-gradient(90deg, ${
                                project.status === 'ANSWERED' ? '#10b981' :
                                project.status === 'INDEXED' ? '#3b82f6' :
                                project.status === 'PROCESSING' ? '#f59e0b' : '#64748b'
                              } 0%, ${
                                project.status === 'ANSWERED' ? '#059669' :
                                project.status === 'INDEXED' ? '#2563eb' :
                                project.status === 'PROCESSING' ? '#d97706' : '#475569'
                              } 100%)`,
                            }
                          }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary' }}>
                      <Typography variant="caption" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AssessmentIcon sx={{ fontSize: 16 }} />
                        {project.questions?.length || 0} Questions
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DescriptionIcon sx={{ fontSize: 16 }} />
                        {project.answers?.length || 0} Answers
                      </Typography>
                    </Box>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ p: 3, pt: 2, justifyContent: 'space-between' }}>
                    <Button
                      component={Link}
                      to={`/project/${project.id}`}
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      sx={{
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#ffffff',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        position: 'relative',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
                          borderRadius: 'inherit',
                          pointerEvents: 'none',
                        },
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'rgba(59, 130, 246, 0.5)',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                          color: '#ffffff',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(59, 130, 246, 0.2)',
                          '&::before': {
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                          }
                        },
                        '&:not(:hover)': {
                          transform: 'translateY(0)',
                        }
                      }}
                    >
                      View Details
                    </Button>

                    {(project.status === 'CREATED' || project.status === 'READY' || project.status === 'OUTDATED') && project.scope === 'ALL_DOCS' && (
                      <Tooltip title={project.status === 'OUTDATED' ? "Re-index all documents (new documents added)" : "Index all documents"}>
                        <IconButton
                          onClick={() => indexProject(project.id)}
                          disabled={loading}
                          sx={{
                            background: project.status === 'OUTDATED' 
                              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            borderRadius: 3,
                            boxShadow: project.status === 'OUTDATED'
                              ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                              : '0 4px 12px rgba(59, 130, 246, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              background: project.status === 'OUTDATED'
                                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                                : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                              transform: 'translateY(-2px)',
                              boxShadow: project.status === 'OUTDATED'
                                ? '0 8px 25px rgba(239, 68, 68, 0.4)'
                                : '0 8px 25px rgba(59, 130, 246, 0.4)',
                            },
                            '&:not(:hover)': {
                              transform: 'translateY(0)',
                            },
                            '&:disabled': {
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.5)',
                            }
                          }}
                        >
                          <UpdateIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    {project.status === 'INDEXED' && (
                      <Tooltip title="Generate answers">
                        <IconButton
                          onClick={() => generateAllAnswers(project.id)}
                          disabled={loading}
                          sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            borderRadius: 3,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                            },
                            '&:not(:hover)': {
                              transform: 'translateY(0)',
                            },
                            '&:disabled': {
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.5)',
                            }
                          }}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grow>
            ))}
          </Box>
        )}

        {/* Create Project Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
            }
          }}
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              zIndex: 1300,
            }
          }}
          sx={{
            '& .MuiBackdrop-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.5) !important',
              backdropFilter: 'blur(8px) !important',
            }
          }}
        >
          <DialogTitle sx={{ pb: 2, textAlign: 'center' }}>
            <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#ffffff', mb: 1 }}>
              Create New Project
            </Typography>
            <Typography variant="body2" component="div" sx={{ color: '#ffffff', opacity: 0.8 }}>
              Start a new due diligence assessment project
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ pt: 1, px: 3 }}>
            <Box sx={{ mb: 3 }}>
              <TextField
                autoFocus
                label={nameFieldFocused ? "" : "Project Name"}
                placeholder="Enter project name..."
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFieldFocused(true)}
                onBlur={() => setNameFieldFocused(false)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#ffffff',
                    transition: 'all 0.3s ease',
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    },
                    '&.Mui-focused': {
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#3b82f6',
                    }
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                    mt: 1,
                  }
                }}
                helperText="Enter a descriptive name for your due diligence project"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontWeight: 600,
                mb: 2,
                fontSize: '1.1rem'
              }}>
                Questionnaire File
              </Typography>
              
              <Box>
                <input
                  accept=".pdf,.txt"
                  style={{ display: 'none' }}
                  id="questionnaire-upload"
                  type="file"
                  onChange={(e) => setQuestionnaireFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="questionnaire-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      py: 3,
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'action.hover',
                      }
                    }}
                  >
                    {questionnaireFile ? `Selected: ${questionnaireFile.name}` : 'Choose Questionnaire (PDF/TXT)'}
                  </Button>
                </label>
                <Typography variant="body2" sx={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  mt: 1,
                  textAlign: 'center'
                }}>
                  Upload a PDF or TXT questionnaire file to create your project
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 1 }}>
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <FormLabel component="legend" sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontWeight: 600,
                  mb: 2,
                  '&.Mui-focused': {
                    color: '#3b82f6',
                  }
                }}>
                  Project Scope
                </FormLabel>
                <RadioGroup
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  sx={{
                    '& .MuiFormControlLabel-root': {
                      color: 'rgba(255, 255, 255, 0.8)',
                      '& .MuiRadio-root': {
                        color: 'rgba(255, 255, 255, 0.6)',
                        '&.Mui-checked': {
                          color: '#3b82f6',
                        }
                      }
                    }
                  }}
                >
                  <FormControlLabel 
                    value="ALL_DOCS" 
                    control={<Radio />} 
                    label="All Documents - Index all available reference documents" 
                  />
                  <FormControlLabel 
                    value="SPECIFIC" 
                    control={<Radio />} 
                    label="Specific Documents - Select specific documents to index" 
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'flex-end', gap: 2 }}>
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                setName('');
                setQuestionnaireFile(null);
                setScope('ALL_DOCS');
              }}
              variant="outlined"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                minWidth: 100,
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createProject}
              variant="contained"
              disabled={loading || !name.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                letterSpacing: '0.02em',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                minWidth: 140,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  borderRadius: 'inherit',
                  pointerEvents: 'none',
                },
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.2)',
                  '&::before': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  },
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transform: 'none',
                  boxShadow: 'none',
                  '&::before': {
                    display: 'none',
                  },
                }
              }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button for Mobile */}
        <Fab
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'flex', md: 'none' },
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
              borderRadius: 'inherit',
              pointerEvents: 'none',
            },
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
              boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
              '&::before': {
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
              }
            }
          }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      </Box>
    </Fade>
  );
}