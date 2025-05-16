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
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

const Models = () => {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    model_type: 'classification',
  });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/models/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Не удалось загрузить модели');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !formData.name || !formData.description || !formData.version) {
      setError('Пожалуйста, заполните все поля и выберите файл модели');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('version', formData.version);
      formDataToSend.append('model_type', formData.model_type);
      formDataToSend.append('model_file', selectedFile);

      await axios.post(
        'http://localhost:8000/api/v1/models/',
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Очищаем форму
      setFormData({
        name: '',
        description: '',
        version: '',
        model_type: 'classification',
      });
      setSelectedFile(null);
      
      // Обновляем список моделей
      fetchModels();
    } catch (error) {
      let errorMessage = 'Ошибка при создании модели';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modelId) => {
    try {
      await axios.delete(`http://localhost:8000/api/v1/models/${modelId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setModels(models.filter(model => model.id !== modelId));
      setSuccess('Модель успешно удалена');
    } catch (error) {
      console.error('Error deleting model:', error);
      setError('Не удалось удалить модель');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Добавить новую модель
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Название модели"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Описание"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Версия"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Тип модели"
                    name="model_type"
                    value={formData.model_type}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="classification">Классификация</MenuItem>
                    <MenuItem value="regression">Регрессия</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                  >
                    {selectedFile ? selectedFile.name : 'Выберите файл модели (.joblib или .pkl)'}
                    <input
                      type="file"
                      hidden
                      accept=".joblib,.pkl"
                      onChange={handleFileChange}
                    />
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || !selectedFile}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : 'Добавить модель'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Мои модели
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" my={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Версия</TableCell>
                      <TableCell>Тип</TableCell>
                      <TableCell>Стоимость</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>{model.name}</TableCell>
                        <TableCell>{model.description}</TableCell>
                        <TableCell>{model.version}</TableCell>
                        <TableCell>
                          {model.model_type === 'classification' ? 'Классификация' : 'Регрессия'}
                        </TableCell>
                        <TableCell>{model.cost_per_prediction}</TableCell>
                        <TableCell>
                          <Tooltip title="Удалить модель">
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(model.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Models; 