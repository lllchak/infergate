import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const ModelCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const ModelManager = () => {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    model_file: null,
    model_type: 'sklearn'
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/models/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Ошибка при загрузке моделей');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleOpen = () => {
    if (user?.credits < 1) {
      setError('Для публикации модели необходимо пополнить счет');
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: '',
      description: '',
      version: '',
      model_file: null,
      model_type: 'sklearn'
    });
    setError('');
    setEstimatedCost(null);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем расширение файла
    if (!file.name.endsWith('.joblib') && !file.name.endsWith('.pkl')) {
      setError('Поддерживаются только файлы .joblib или .pkl');
      return;
    }

    setFormData({
      ...formData,
      model_file: file,
    });

    const tempFormData = new FormData();
    tempFormData.append('model_file', file);
    tempFormData.append('model_type', 'sklearn');

    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:8000/api/v1/models/estimate-cost', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: tempFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось оценить стоимость модели');
      }

      const data = await response.json();
      setEstimatedCost(data.cost_per_prediction);
    } catch (error) {
      setError(error.message);
      setEstimatedCost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (user?.credits < 1) {
      setError('Для добавления модели необходимо пополнить счет');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('version', formData.version);
    formDataToSend.append('model_file', formData.model_file);
    formDataToSend.append('model_type', formData.model_type);

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/models/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при создании модели');
      }

      await fetchModels();
      handleClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async (modelId) => {
    try {
      setLoading(true);
      setError('');

      const inputData = {
        features: [1, 2, 3, 4, 5]
      };

      const response = await fetch(`http://localhost:8000/api/v1/models/${modelId}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ input_data: inputData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при выполнении предсказания');
      }

      const result = await response.json();
      alert(`Результат предсказания: ${JSON.stringify(result.prediction_result)}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledBox>
      <Typography variant="h4" gutterBottom>
        Управление моделями
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        В настоящее время система поддерживает только модели в формате scikit-learn (sklearn).
        Убедитесь, что ваша модель сохранена в этом формате перед загрузкой.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleOpen}
        sx={{ mb: 3 }}
        disabled={user?.credits < 1}
      >
        Добавить модель
      </Button>

      {user?.credits < 1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Для добавления модели необходимо пополнить счет. Ваш текущий баланс: {user?.credits} кредитов
        </Alert>
      )}

      <Grid container spacing={2}>
        {models.map((model) => (
          <Grid item xs={12} md={6} key={model.id}>
            <ModelCard>
              <CardContent>
                <Typography variant="h6">{model.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Версия: {model.version}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Стоимость предсказания: {model.cost_per_prediction} кредитов
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Автор: {model.owner.full_name}
                </Typography>
                <Typography variant="body2">{model.description}</Typography>
              </CardContent>
            </ModelCard>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить новую модель</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              required
            />
            <TextField
              fullWidth
              label="Версия"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              margin="normal"
              required
            />
            <Button
              variant="contained"
              component="label"
              fullWidth
              sx={{ mt: 2 }}
            >
              Загрузить модель
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept=".joblib,.pkl"
              />
            </Button>
            {formData.model_file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Выбран файл: {formData.model_file.name}
              </Typography>
            )}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {estimatedCost !== null && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Ориентировочная стоимость предсказания: {estimatedCost} кредитов
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading || !formData.model_file}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </StyledBox>
  );
};

export default ModelManager; 