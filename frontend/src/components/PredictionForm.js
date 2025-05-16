import React, { useState } from 'react';
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
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const PredictionForm = ({ model, onClose }) => {
  const { user } = useAuth();
  const [inputData, setInputData] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    setInputData(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Преобразуем строку ввода в массив чисел
      const values = inputData
        .split(/[\s,]+/) // Разделяем по пробелам или запятым
        .map(v => v.trim())
        .filter(v => v !== '')
        .map(v => parseFloat(v));

      if (values.some(isNaN)) {
        throw new Error('Все значения должны быть числами');
      }

      const response = await fetch(`http://localhost:8000/api/v1/models/${model.id}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          input_data: values,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при выполнении предсказания');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Произошла ошибка при выполнении предсказания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Предсказание с помощью {model.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Стоимость предсказания: {model.cost_per_prediction} кредитов
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Ваш баланс: {user?.credits || 0} кредитов
        </Typography>

        <Box sx={{ mt: 2, mb: 2 }}>
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
            {/* Пример с 3 признаками */}
            1.23 4.56 7.89
            {/* или */}
            1.23, 4.56, 7.89
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Значения признаков"
            value={inputData}
            onChange={handleInputChange}
            placeholder="Введите значения через пробел или запятую"
            required
            error={!!error}
            helperText={error}
          />
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress />
          </Box>
        )}

        {result && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Результат предсказания:
            </Typography>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '4px'
            }}>
              {JSON.stringify(result.prediction_result, null, 2)}
            </pre>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PredictionForm; 