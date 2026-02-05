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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface EvaluationResult {
  id: string;
  project_id: string;
  question_id: string;
  ai_answer: string;
  ground_truth_answer: string;
  accuracy_score: number;
  citation_quality_score: number;
  confidence_correlation_score: number;
  overall_score: number;
  evaluation_details: any;
}

interface EvaluationSummary {
  total_questions: number;
  evaluated_questions: number;
  average_accuracy: number;
  average_citation_quality: number;
  average_confidence_correlation: number;
  average_overall_score: number;
}

interface Question {
  id: string;
  text: string;
  section: string;
  order: number;
}

export default function EvaluationResults() {
  const { projectId } = useParams<{ projectId: string }>();
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadEvaluationResults();
      loadProjectQuestions();
    }
  }, [projectId]);

  const loadEvaluationResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/evaluation-results/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to load evaluation results');
      }
      const data = await response.json();
      setEvaluationResults(data.evaluation_results || []);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectQuestions = async () => {
    try {
      const response = await fetch(`http://localhost:8000/get-project-info?project_id=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to load project questions');
      }
      const project = await response.json();
      setQuestions(project.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const runEvaluation = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/evaluate-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!response.ok) {
        throw new Error('Failed to run evaluation');
      }
      await loadEvaluationResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionText = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    return question ? question.text : 'Question not found';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircleIcon color="success" />;
    if (score >= 0.6) return <InfoIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  if (loading && !evaluationResults.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton component={Link} to={`/project/${projectId}`} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <AssessmentIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Evaluation Results
        </Typography>
        <Box flexGrow={1} />
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={runEvaluation}
          disabled={loading}
        >
          Run Evaluation
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Questions
                </Typography>
                <Typography variant="h4">
                  {summary.total_questions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Accuracy
                </Typography>
                <Typography variant="h4" color={getScoreColor(summary.average_accuracy)}>
                  {(summary.average_accuracy * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Citation Quality
                </Typography>
                <Typography variant="h4" color={getScoreColor(summary.average_citation_quality)}>
                  {(summary.average_citation_quality * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Overall Score
                </Typography>
                <Typography variant="h4" color={getScoreColor(summary.average_overall_score)}>
                  {(summary.average_overall_score * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Detailed Results */}
      <Typography variant="h6" gutterBottom>
        Detailed Evaluation Results
      </Typography>

      {evaluationResults.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No evaluation results available
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Run evaluation to compare AI answers against ground truth answers.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Question</TableCell>
                <TableCell>Accuracy</TableCell>
                <TableCell>Citation Quality</TableCell>
                <TableCell>Confidence Correlation</TableCell>
                <TableCell>Overall Score</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evaluationResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                      {getQuestionText(result.question_id).substring(0, 100)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {getScoreIcon(result.accuracy_score)}
                      <Typography sx={{ ml: 1 }}>
                        {(result.accuracy_score * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {(result.citation_quality_score * 100).toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {(result.confidence_correlation_score * 100).toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${(result.overall_score * 100).toFixed(1)}%`}
                      color={getScoreColor(result.overall_score)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2">View Details</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="subtitle2" gutterBottom>
                          AI Answer:
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                          {result.ai_answer}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                          Ground Truth Answer:
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                          {result.ground_truth_answer}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                          Evaluation Details:
                        </Typography>
                        <Typography variant="body2">
                          Similarity Method: {result.evaluation_details?.similarity_method}<br/>
                          Confidence-Accuracy Correlation: {result.evaluation_details?.confidence_accuracy_correlation?.toFixed(3)}<br/>
                          AI Answer Length: {result.evaluation_details?.ai_answer_length} chars<br/>
                          Ground Truth Length: {result.evaluation_details?.ground_truth_length} chars
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}