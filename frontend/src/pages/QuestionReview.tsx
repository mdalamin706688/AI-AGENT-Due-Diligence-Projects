import React, { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';

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

interface Question {
  id: string;
  text: string;
  section: string;
  order: number;
}

interface Project {
  id: string;
  name: string;
  questions: Question[];
  answers: Answer[];
}

export default function QuestionReview() {
  const { projectId, questionId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [manualAnswer, setManualAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = () => {
    fetch(`http://localhost:8000/get-project-info?project_id=${projectId}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        // Find the current answer and set manual answer if it exists
        const answer = data.answers.find((a: Answer) => a.question_id === questionId);
        if (answer && answer.manual_answer) {
          setManualAnswer(answer.manual_answer);
        }
      })
      .catch(err => {
        console.error('Error fetching project:', err);
        setError('Failed to load question details');
      });
  };

  const updateAnswer = async (status: string, manualAnswerText?: string) => {
    if (!project) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const answer = project.answers.find(a => a.question_id === questionId);
      if (!answer) {
        setError('Answer not found');
        return;
      }

      const response = await fetch('http://localhost:8000/update-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          answer_id: answer.id,
          status: status,
          manual_answer: manualAnswerText || null
        })
      });

      if (response.ok) {
        setSuccess('Answer updated successfully!');
        setTimeout(() => navigate(`/project/${projectId}`), 1500);
      } else {
        setError('Failed to update answer');
      }
    } catch (error) {
      console.error('Error updating answer:', error);
      setError('Error updating answer');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading question details...</Typography>
      </Box>
    );
  }

  const question = project.questions.find(q => q.id === questionId);
  const answer = project.answers.find(a => a.question_id === questionId);

  if (!question || !answer) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Question or answer not found
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(`/project/${projectId}`)} sx={{
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
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#ffffff' }}>
            Review Answer
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {question.section} - Question {question.order}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card elevation={2} sx={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          color: '#ffffff',
          '& .MuiTypography-root': {
            color: '#ffffff',
          },
          '& .MuiSvgIcon-root': {
            color: '#ffffff',
          },
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <DescriptionIcon sx={{ mr: 1, color: '#ffffff' }} />
              <Typography variant="h6">Question</Typography>
            </Box>
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              {question.text}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2} sx={{
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
          '& .MuiSvgIcon-root': {
            color: '#ffffff',
          },
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center">
                <LightbulbIcon sx={{ mr: 1, color: '#ffffff' }} />
                <Typography variant="h6">AI Generated Answer</Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Chip
                  label={answer.status}
                  color={answer.status === 'GENERATED' ? 'success' :
                         answer.status === 'CONFIRMED' ? 'primary' : 'error'}
                  size="small"
                />
                <Chip
                  label={`${(answer.confidence_score * 100).toFixed(1)}% confidence`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>

            <Paper sx={{
              p: 2,
              mb: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              '& .MuiTypography-root': {
                color: '#ffffff',
              },
            }}>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {answer.answer_text}
              </Typography>
            </Paper>

            {answer.citations && answer.citations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
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
                      <Typography variant="body2" sx={{ lineHeight: 1.5, mb: 1 }}>
                        "{citation.text}"
                      </Typography>
                      {citation.page && (
                        <Typography variant="caption">
                          Page {citation.page}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card elevation={2} sx={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          color: '#ffffff',
          '& .MuiTypography-root': {
            color: '#ffffff',
          },
          '& .MuiTextField-root .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
              color: '#3b82f6',
            },
          },
          '& .MuiSvgIcon-root': {
            color: '#ffffff',
          },
          '& .MuiDivider-root': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <EditIcon sx={{ mr: 1, color: '#ffffff' }} />
              <Typography variant="h6">Manual Review</Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Manual Answer (optional)"
              value={manualAnswer}
              onChange={(e) => setManualAnswer(e.target.value)}
              placeholder="Enter a corrected or improved answer..."
              variant="outlined"
              sx={{ mb: 3 }}
            />

            <Divider sx={{ mb: 3 }} />

            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => updateAnswer('CONFIRMED')}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
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
                {loading ? 'Updating...' : 'Confirm AI Answer'}
              </Button>

              <Button
                variant="contained"
                onClick={() => updateAnswer('MANUAL_UPDATED', manualAnswer)}
                disabled={loading || !manualAnswer.trim()}
                startIcon={<EditIcon />}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
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
                {loading ? 'Updating...' : 'Use Manual Answer'}
              </Button>

              <Button
                variant="contained"
                onClick={() => updateAnswer('REJECTED')}
                disabled={loading}
                startIcon={<CancelIcon />}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  backdropFilter: 'blur(10px)',
                  color: '#ffffff',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
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
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.2) 100%)',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                  },
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%)',
                    boxShadow: '0 12px 40px rgba(239, 68, 68, 0.2)',
                    '&::before': {
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.3) 100%)',
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
                {loading ? 'Updating...' : 'Reject Answer'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}