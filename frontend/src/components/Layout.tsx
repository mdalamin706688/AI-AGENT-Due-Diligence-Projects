import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Breadcrumbs,
  Link as MuiLink,
  useTheme,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    if (pathnames.length === 0) {
      return [{ label: 'Projects', href: '/' }];
    }

    const breadcrumbs = [{ label: 'Projects', href: '/' }];

    if (pathnames[0] === 'project' && pathnames[1]) {
      breadcrumbs.push({ label: 'Project Details', href: `/project/${pathnames[1]}` });
    }

    if (pathnames[0] === 'review' && pathnames[1] && pathnames[2]) {
      breadcrumbs.push(
        { label: 'Project Details', href: `/project/${pathnames[1]}` },
        { label: 'Question Review', href: `/review/${pathnames[1]}/${pathnames[2]}` }
      );
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box sx={{
      flexGrow: 1,
      minHeight: '100vh',
      position: 'relative',
      background: '#0f172a',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(34, 197, 94, 0.02) 50%, rgba(59, 130, 246, 0.03) 100%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }
    }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: 'rgba(15, 15, 35, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          color: '#ffffff'
        }}
      >
        <Toolbar sx={{
          justifyContent: 'space-between',
          minHeight: 80,
          px: { xs: 2, md: 4 }
        }}>
          {/* Logo and Brand Section */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3
          }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                color: '#ffffff',
                position: 'relative',
              }}
            >
              <Box sx={{
                position: 'relative',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #10b981, #059669, #047857, #10b981)',
                  backgroundSize: '300% 300%',
                  animation: 'rotate 3s linear infinite',
                  zIndex: -1,
                  opacity: 0.3,
                },
                '@keyframes rotate': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                }
              }}>
                <BusinessIcon sx={{
                  fontSize: 24,
                  color: '#ffffff',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.1,
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  color: '#ffffff',
                }}>
                  Due Diligence
                </Typography>
                <Typography variant="overline" sx={{
                  fontWeight: 700,
                  fontSize: '0.55rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  opacity: 0.8,
                  mt: 0.25,
                  color: 'rgba(255, 255, 255, 0.7)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                }}>
                  Professional Agent
                </Typography>
              </Box>
            </Box>

            {/* Status Indicator */}
            <Box sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1.5,
              px: 2.5,
              py: 1.5,
              borderRadius: 3,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              backdropFilter: 'blur(10px)',
            }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.7, transform: 'scale(1.2)' },
                  '100%': { opacity: 1, transform: 'scale(1)' },
                }
              }} />
              <Typography variant="body2" sx={{
                fontWeight: 600,
                fontSize: '0.8rem',
                color: '#10b981',
                letterSpacing: '0.025em',
              }}>
                System Online
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notification Button */}
            <IconButton
              size="medium"
              sx={{
                width: 44,
                height: 44,
                color: 'rgba(255, 255, 255, 0.7)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <NotificationsIcon sx={{ fontSize: 20 }} />
            </IconButton>

            {/* User Profile */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
              }}
              onClick={handleMenu}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                JD
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#ffffff',
                  lineHeight: 1.2,
                }}>
                  John Doe
                </Typography>
                <Typography variant="caption" sx={{
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  letterSpacing: '0.025em',
                }}>
                  Administrator
                </Typography>
              </Box>
            </Box>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  minWidth: 180,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                }
              }}
            >
              <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                <AccountCircleIcon sx={{ mr: 2, fontSize: 20 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                <SettingsIcon sx={{ mr: 2, fontSize: 20 }} />
                Settings
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        {breadcrumbs.length > 1 && (
          <Box sx={{ mb: 4 }}>
            <Breadcrumbs
              sx={{
                '& .MuiBreadcrumbs-separator': {
                  color: '#ffffff'
                }
              }}
            >
              {breadcrumbs.map((crumb, index) => (
                <MuiLink
                  key={index}
                  component={Link}
                  to={crumb.href}
                  underline="none"
                  sx={{
                    color: '#ffffff',
                    fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                    fontSize: '0.875rem',
                    '&:hover': {
                      color: '#ffffff',
                      opacity: 0.8,
                    },
                    pointerEvents: index === breadcrumbs.length - 1 ? 'none' : 'auto',
                  }}
                >
                  {crumb.label}
                </MuiLink>
              ))}
            </Breadcrumbs>
          </Box>
        )}

        {children}
      </Container>
    </Box>
  );
}