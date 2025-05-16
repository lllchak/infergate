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
  Divider,
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
import DownloadIcon from '@mui/icons-material/Download';

const Predictions = () => {
  const { user, refreshUserData } = useAuth();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [inputData, setInputData] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileResult, setFileResult] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchModels = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/models/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.data && Array.isArray(response.data)) {
        setModels(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setError('Неверный формат данных от сервера');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Не удалось загрузить модели');
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(
        `http://localhost:8000/api/v1/models/${selectedModel}/predict`,
        {
          input_data: inputData
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setResult(response.data);
      setSuccess('Предсказание успешно выполнено');
      await refreshUserData(); // Обновляем данные пользователя
      fetchPredictions(); // Обновляем историю после нового предсказания
    } catch (error) {
      console.error('Error making prediction:', error);
      const errorMessage = error.response?.data?.detail || 'Не удалось выполнить предсказание';
      setError(errorMessage);
      if (errorMessage.includes('удалена')) {
        // Если модель была удалена, обновляем список моделей
        fetchModels();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedModel) return;

    setFileLoading(true);
    setError('');
    setFileResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('model_id', selectedModel);

      const response = await axios.post(
        'http://localhost:8000/api/v1/predictions/file',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setFileResult(response.data);
      await refreshUserData(); // Обновляем данные пользователя
      fetchPredictions(); // Обновляем историю после нового предсказания
    } catch (error) {
      let errorMessage = 'Ошибка при обработке файла';

      if (error.response?.data) {
        if (Array.isArray(error.response.data)) {
          errorMessage = error.response.data.map(err => 
            `${err.loc.join('.')}: ${err.msg}`
          ).join('\n');
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setFileLoading(false);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Создание предсказания
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Выберите модель"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                required
              >
                <MenuItem value="">
                  <em>Выберите модель</em>
                </MenuItem>
                {models.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name} ({model.model_type})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Инструкция по вводу данных:
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  1. Введите все значения признаков через пробел или запятую
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  2. Все значения должны быть числами
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  3. Примеры валидного ввода:
                </Typography>
                <Box component="pre" sx={{ 
                  bgcolor: 'grey.100', 
                  p: 1, 
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  mb: 2
                }}>
                  {`2.03, 0.1, 0.52, -6.47, -0.86`}
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Значения признаков"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="Введите значения через пробел или запятую"
                required
                error={!!error}
                helperText={error}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !selectedModel || !inputData.trim()}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Сделать предсказание'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {result && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Результат предсказания:
            </Typography>
            <Typography variant="body1">
              {String(result.prediction_result)}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          Предсказание из файла
        </Typography>

        <Box component="form" onSubmit={handleFileSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                {selectedFile ? selectedFile.name : 'Выберите CSV файл'}
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={fileLoading || !selectedFile || !selectedModel}
                fullWidth
              >
                {fileLoading ? <CircularProgress size={24} /> : 'Обработать файл'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {fileResult && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Файл обработан успешно
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Количество предсказаний: {fileResult.predictions.length}
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload(fileResult.file_path.split('/').pop())}
              fullWidth
            >
              Скачать результаты
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          История предсказаний
        </Typography>

        {loadingHistory ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
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
    </Container>
  );
};

export default Predictions; 