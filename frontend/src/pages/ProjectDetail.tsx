import React, { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  IconButton,
  Input,
  Pagination,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

interface Question {
  id: string;
  text: string;
  section: string;
  order: number;
}

interface Citation {
  document_id: string;
  chunk_id: string;
  text: string;
  page?: number;
}

interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  citations: Citation[];
  confidence_score: number;
  status: string;
  manual_answer?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  questions: Question[];
  answers: Answer[];
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [reindexing, setReindexing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 1;

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    // Reset to first page when project changes
    setCurrentPage(1);
  }, [project?.id]);

  const fetchProject = () => {
    fetch(`http://localhost:8000/get-project-info?project_id=${id}`)
      .then(res => res.json())
      .then(setProject)
      .catch(err => {
        console.error('Error fetching project:', err);
        setError('Failed to load project details');
      });
  };

  const generateAllAnswers = async () => {
    if (!project) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`http://localhost:8000/generate-all-answers?project_id=${project.id}`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.request_id) {
        setSuccess('Answer generation started...');
        pollRequestStatus(result.request_id);
      } else {
        setError('Failed to start answer generation');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error generating answers:', error);
      setError('Failed to generate answers');
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
          setSuccess('Answers generated successfully!');
          fetchProject();
          setTimeout(() => setSuccess(null), 3000);
        } else if (status.status === 'FAILED') {
          setLoading(false);
          setError('Answer generation failed: ' + status.error);
        } else {
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setLoading(false);
        setError('Failed to check generation status');
      }
    };
    poll();
  };

  const uploadDocument = async () => {
    if (!selectedFile || !project) return;

    setUploading(true);
    setIndexingProgress(0); // Start with indeterminate progress
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/index-document-async', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.request_id) {
        setSuccess('Document upload started...');
        pollUploadStatus(result.request_id);
      } else {
        setError('Failed to start document upload');
        setUploading(false);
        setIndexingProgress(0);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document');
      setUploading(false);
      setIndexingProgress(0);
    }
  };

  const pollUploadStatus = (requestId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/requests/${requestId}`);
        const status = await response.json();

        if (status.status === 'COMPLETED') {
          setUploading(false);
          setIndexingProgress(100);
          setSuccess('Document indexed successfully!');
          setSelectedFile(null);
          // After successful upload, trigger project update to re-index
          updateProjectAsync();
          setTimeout(() => {
            setSuccess(null);
            setIndexingProgress(0);
          }, 3000);
        } else if (status.status === 'FAILED') {
          setUploading(false);
          setIndexingProgress(0);
          setError('Document indexing failed: ' + status.error);
        } else {
          // Update progress based on status
          if (status.status === 'IN_PROGRESS') {
            setIndexingProgress(50); // Show some progress
          }
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Error polling upload status:', error);
        setUploading(false);
        setIndexingProgress(0);
        setError('Failed to check upload status');
      }
    };
    poll();
  };

  const updateProjectAsync = async () => {
    if (!project) return;

    setReindexing(true);

    try {
      const response = await fetch(`http://localhost:8000/update-project-async?project_id=${project.id}`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.request_id) {
        pollUpdateStatus(result.request_id);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setReindexing(false);
    }
  };

  const pollUpdateStatus = (requestId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:8000/requests/${requestId}`);
        const status = await response.json();

        if (status.status === 'COMPLETED') {
          setReindexing(false);
          fetchProject(); // Refresh project data
        } else if (status.status === 'FAILED') {
          console.error('Project update failed:', status.error);
          setReindexing(false);
        } else {
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Error polling update status:', error);
        setReindexing(false);
      }
    };
    poll();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GENERATED': return 'success';
      case 'CONFIRMED': return 'primary';
      case 'REJECTED': return 'error';
      case 'MANUAL_UPDATED': return 'warning';
      case 'MISSING_DATA': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'GENERATED': return <CheckCircleIcon />;
      case 'CONFIRMED': return <CheckCircleIcon />;
      case 'REJECTED': return <ErrorIcon />;
      case 'MANUAL_UPDATED': return <EditIcon />;
      case 'MISSING_DATA': return <InfoIcon />;
      default: return <InfoIcon />;
    }
  };

  if (!project) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading project details...</Typography>
      </Box>
    );
  }

  // Group questions by section
  const questionsBySection = project.questions.reduce((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  // Create answer map
  const answerMap = project.answers.reduce((acc, a) => {
    acc[a.question_id] = a;
    return acc;
  }, {} as Record<string, Answer>);

  const answeredQuestions = project.questions.filter(q => answerMap[q.id]).length;
  const totalQuestions = project.questions.length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton component={Link} to="/" sx={{
            mr: 2,
            color: '#ffffff',
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
            }
          }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 1, color: '#ffffff' }}>
              {project.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={project.status}
                color={project.status === 'READY' ? 'success' : 'warning'}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                {answeredQuestions} of {totalQuestions} questions answered
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <Box sx={{ position: 'relative' }}>
            <input
              accept=".pdf"
              style={{ display: 'none' }}
              id="document-upload"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="document-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  py: 3,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  minWidth: 250,
                  '&:hover': {
                    borderColor: 'primary.dark',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.2)',
                  },
                  '& .MuiButton-startIcon': {
                    color: '#ffffff',
                    opacity: 0.9,
                  }
                }}
              >
                {selectedFile ? `Selected: ${selectedFile.name.length > 25 ? selectedFile.name.substring(0, 25) + '...' : selectedFile.name}` : 'Choose Document PDF'}
              </Button>
            </label>
          </Box>

          {uploading && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                {indexingProgress === 100 ? 'Indexing completed!' : 'Indexing document...'}
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
          )}

          {reindexing && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                Re-indexing all documents...
              </Typography>
              <LinearProgress
                variant="indeterminate"
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
          )}

          <Button
            variant="contained"
            onClick={uploadDocument}
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <AssessmentIcon />}
            size="large"
            sx={{
              background: 'linear-gradient(135deg, rgba(132, 204, 22, 0.2) 0%, rgba(132, 204, 22, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              border: '1px solid rgba(132, 204, 22, 0.3)',
              borderRadius: 3,
              px: 3,
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
                background: 'linear-gradient(135deg, rgba(132, 204, 22, 0.4) 0%, rgba(132, 204, 22, 0.3) 100%)',
                borderRadius: 'inherit',
                pointerEvents: 'none',
              },
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                background: 'linear-gradient(135deg, rgba(132, 204, 22, 0.25) 0%, rgba(132, 204, 22, 0.15) 100%)',
                boxShadow: '0 12px 40px rgba(132, 204, 22, 0.3)',
                '&::before': {
                  background: 'linear-gradient(135deg, rgba(132, 204, 22, 0.5) 0%, rgba(132, 204, 22, 0.4) 100%)',
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
            {uploading ? 'Indexing...' : 'Index Document'}
          </Button>

          <Button
            variant="contained"
            onClick={generateAllAnswers}
            disabled={loading || project.status !== 'READY'}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            size="large"
            sx={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 3,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              fontSize: '0.95rem',
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.2) 100%)',
                borderRadius: 'inherit',
                pointerEvents: 'none',
              },
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)',
                boxShadow: '0 12px 40px rgba(34, 197, 94, 0.2)',
                '&::before': {
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.3) 100%)',
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
            {loading ? 'Generating Answers...' : 'Generate All Answers'}
          </Button>
        </Box>
      </Box>

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

      <Card sx={{
        mb: 3,
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        color: '#ffffff',
        '& .MuiTypography-root': {
          color: '#ffffff',
        },
        '& .MuiLinearProgress-root': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
          }
        },
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progress Overview
          </Typography>
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {progress.toFixed(1)}% complete • {answeredQuestions} answered • {totalQuestions - answeredQuestions} remaining
          </Typography>
        </CardContent>
      </Card>

      {/* Questions with Pagination */}
      <Card sx={{
        mb: 3,
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        color: '#ffffff',
        '& .MuiTypography-root': {
          color: '#ffffff',
        },
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Questions ({totalQuestions})
          </Typography>

          {/* Questions List with Pagination */}
          <Box>
            {(() => {
              // Flatten all questions and sort by order
              const allQuestions = Object.values(questionsBySection)
                .flat()
                .sort((a, b) => a.order - b.order);

              // Calculate pagination
              const totalPages = Math.ceil(allQuestions.length / questionsPerPage);
              const startIndex = (currentPage - 1) * questionsPerPage;
              const endIndex = startIndex + questionsPerPage;
              const currentQuestions = allQuestions.slice(startIndex, endIndex);

              return (
                <>
                  {currentQuestions.map((question) => {
                    const answer = answerMap[question.id];

                    return (
                      <Card key={question.id} sx={{
                        mb: 2,
                        '&:last-child': { mb: 0 },
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#ffffff',
                        '& .MuiTypography-root': {
                          color: '#ffffff',
                        },
                        '& .MuiChip-root': {
                          color: '#ffffff',
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '& .MuiAlert-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          '& .MuiAlert-icon': {
                            color: '#ffffff',
                          },
                        },
                      }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box flex={1}>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Chip
                                  label={question.section}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                <Typography variant="h6">
                                  Q{question.order}: {question.text}
                                </Typography>
                              </Box>

                              {answer ? (
                                <Box>
                                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <Chip
                                      icon={getStatusIcon(answer.status)}
                                      label={answer.status}
                                      color={getStatusColor(answer.status) as any}
                                      size="small"
                                    />
                                    {answer.confidence_score && (
                                      <Tooltip title={`Confidence: ${(answer.confidence_score * 100).toFixed(1)}%`}>
                                        <Chip
                                          label={`${(answer.confidence_score * 100).toFixed(1)}%`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      </Tooltip>
                                    )}
                                  </Box>

                                  <Paper sx={{
                                    p: 2,
                                    mb: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff',
                                    '& .MuiTypography-root': {
                                      color: '#ffffff',
                                    },
                                  }}>
                                    <Typography variant="body1">
                                      {answer.manual_answer || answer.answer_text}
                                    </Typography>
                                  </Paper>

                                  {answer.citations && answer.citations.length > 0 && (
                                    <Box>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Citations ({answer.citations.length})
                                      </Typography>
                                      <Box>
                                        {answer.citations.map((citation, idx) => (
                                          <Paper key={idx} sx={{
                                            p: 2,
                                            mb: 1,
                                            borderLeft: 4,
                                            borderColor: 'rgba(59, 130, 246, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            backdropFilter: 'blur(10px)',
                                            color: '#ffffff',
                                            '& .MuiTypography-root': {
                                              color: '#ffffff !important',
                                            },
                                          }}>
                                            <Typography variant="body2">
                                              "{citation.text.substring(0, 200)}..."
                                              {citation.page && (
                                                <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                                                  (Page {citation.page})
                                                </Typography>
                                              )}
                                            </Typography>
                                          </Paper>
                                        ))}
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              ) : (
                                <Alert severity="info" sx={{ mt: 1 }}>
                                  No answer generated yet
                                </Alert>
                              )}
                            </Box>

                            <Box ml={2}>
                              {answer && (
                                <Button
                                  component={Link}
                                  to={`/review/${project.id}/${question.id}`}
                                  variant="outlined"
                                  startIcon={<EditIcon />}
                                  sx={{
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#ffffff',
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    px: 2,
                                    py: 1,
                                    fontWeight: 500,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                      borderColor: 'rgba(59, 130, 246, 0.5)',
                                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                      transform: 'translateY(-1px)',
                                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                                    },
                                    '& .MuiButton-startIcon': {
                                      color: '#ffffff',
                                      opacity: 0.9,
                                    }
                                  }}
                                >
                                  Review
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Premium Pagination */}
                  {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" mt={4}>
                      <Stack spacing={2}>
                        <Pagination
                          count={totalPages}
                          page={currentPage}
                          onChange={(event, page) => setCurrentPage(page)}
                          color="primary"
                          size="large"
                          showFirstButton
                          showLastButton
                          sx={{
                            '& .MuiPaginationItem-root': {
                              color: '#ffffff',
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                              },
                              '&.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: '#ffffff',
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                },
                              },
                            },
                          }}
                        />
                      </Stack>
                    </Box>
                  )}
                </>
              );
            })()}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}