import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import QuestionReview from './pages/QuestionReview';
import EvaluationResults from './pages/EvaluationResults';
import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}>
        <Layout>
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/review/:projectId/:questionId" element={<QuestionReview />} />
            <Route path="/evaluation/:projectId" element={<EvaluationResults />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}
