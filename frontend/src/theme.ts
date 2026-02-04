import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00bcd4', // Cyan
    },
    secondary: {
      main: '#4caf50', // Green
    },
    background: {
      default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paper: 'rgba(255, 255, 255, 0.1)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#ffffff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          color: '#ffffff',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #00bcd4 0%, #4caf50 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #0097a7 0%, #388e3c 100%)',
          },
          '&.MuiButton-colorError': {
            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
            color: '#ffffff',
            '&:hover': {
              background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        },
        colorError: {
          background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
          color: '#ffffff',
          border: '1px solid rgba(244, 67, 54, 0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#ffffff',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00bcd4',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#ffffff',
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: '#ffffff',
          textAlign: 'center',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: '#ffffff',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          justifyContent: 'center',
          padding: '16px 24px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          '& .MuiBreadcrumbs-separator': {
            color: '#ffffff',
          },
          '& .MuiLink-root': {
            color: '#ffffff',
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      },
    },
  },
});

export default theme;