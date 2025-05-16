import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const Profile = () => {
  const { user, refreshUserData } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchPredictions();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        email: user.email || '',
        password: '',
      });
    }
  }, [user]);

  const fetchPredictions = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get('http://localhost:8000/api/v1/predictions/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setPredictions(response.data);
    } catch (error) {
      setError('Ошибка при загрузке истории предсказаний');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/v1/predictions/file/${filename}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Ошибка при скачивании файла');
    }
  };

  const handleAddCredits = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Пожалуйста, введите корректную сумму');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.put(
        'http://localhost:8000/api/v1/users/me/credits',
        { amount: parseFloat(amount) },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      await refreshUserData();
      setOpenDialog(false);
      setAmount('');
    } catch (error) {
      setError('Ошибка при пополнении баланса');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const updateData = {};
      if (editForm.full_name !== user.full_name) {
        updateData.full_name = editForm.full_name;
      }
      if (editForm.email !== user.email) {
        updateData.email = editForm.email;
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      if (Object.keys(updateData).length === 0) {
        setError('Нет изменений для сохранения');
        setLoading(false);
        return;
      }

      await axios.put(
        'http://localhost:8000/api/v1/users/me',
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      await refreshUserData();
      setOpenEditDialog(false);
      setEditForm({ ...editForm, password: '' });
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Профиль пользователя
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">
                <strong>Имя:</strong> {user?.full_name}
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {user?.email}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Кредиты:</strong> {user?.credits}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => setOpenEditDialog(true)}
                fullWidth
                sx={{ mb: 2 }}
              >
                Редактировать профиль
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                fullWidth
              >
                Пополнить баланс
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              История предсказаний
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {loadingHistory ? (
              <Box display="flex" justifyContent="center" my={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Модель</TableCell>
                      <TableCell>Входные данные</TableCell>
                      <TableCell>Результат</TableCell>
                      <TableCell>Стоимость</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {predictions.map((prediction) => (
                      <TableRow key={prediction.id}>
                        <TableCell>{formatDate(prediction.created_at)}</TableCell>
                        <TableCell>{prediction.model.name}</TableCell>
                        <TableCell>
                          {prediction.input_file_path ? (
                            <Tooltip title="Скачать входной файл">
                              <IconButton
                                color="primary"
                                onClick={() => handleDownload(prediction.input_file_path.split('/').pop())}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            Array.isArray(prediction.input_data) 
                              ? prediction.input_data.join(', ')
                              : prediction.input_data
                          )}
                        </TableCell>
                        <TableCell>
                          {prediction.result_file_path ? (
                            <Tooltip title="Скачать результаты">
                              <IconButton
                                color="primary"
                                onClick={() => handleDownload(prediction.result_file_path.split('/').pop())}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            typeof prediction.prediction_result === 'object'
                              ? JSON.stringify(prediction.prediction_result)
                              : String(prediction.prediction_result)
                          )}
                        </TableCell>
                        <TableCell>{prediction.cost}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Диалоговое окно редактирования профиля */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Редактирование профиля</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Имя"
            fullWidth
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Новый пароль"
            type="password"
            fullWidth
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            helperText="Оставьте пустым, если не хотите менять пароль"
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Отмена</Button>
          <Button
            onClick={handleEditProfile}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалоговое окно пополнения баланса */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Пополнение баланса</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Сумма"
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button
            onClick={handleAddCredits}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Пополнить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile; 