import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BalanceManager from '../components/BalanceManager';
import ModelManager from '../components/ModelManager';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalPredictions: 0,
    totalCost: 0,
    predictionsByModel: [],
    predictionsByType: [],
    recentPredictions: [],
  });

  // Константы для типов моделей
  const MODEL_TYPES = {
    classification: 'Классификация',
    regression: 'Регрессия'
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [predictionsResponse, modelsResponse] = await Promise.all([
        axios.get('http://localhost:8000/api/v1/predictions/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get('http://localhost:8000/api/v1/models/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const predictions = predictionsResponse.data || [];
      const models = modelsResponse.data || [];

      console.log('Models:', models);
      console.log('Predictions:', predictions);

      // Подсчет статистики по моделям
      const modelStats = {};
      const typeStats = { classification: 0, regression: 0 };

      predictions.forEach(prediction => {
        const model = models.find(m => m.id === prediction.model_id);
        if (model) {
          const modelName = model.is_deleted ? `${model.name} (удалена)` : model.name;
          modelStats[modelName] = (modelStats[modelName] || 0) + 1;
          if (model.model_type) {
            const modelType = model.model_type.toLowerCase();
            if (modelType in MODEL_TYPES) {
              typeStats[modelType]++;
            }
          }
        }
      });

      console.log('Type stats:', typeStats);

      const predictionsByModel = Object.entries(modelStats).map(([name, count]) => ({
        name,
        count,
      }));

      const predictionsByType = Object.entries(typeStats)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({
          name: MODEL_TYPES[type],
          value: count,
        }));

      console.log('Predictions by type:', predictionsByType);

      setStats({
        totalPredictions: predictions.length,
        totalCost: predictions.reduce((sum, p) => sum + (p.cost || 0), 0),
        predictionsByModel,
        predictionsByType,
        recentPredictions: predictions.slice(0, 5).map(prediction => ({
          ...prediction,
          model_name: models.find(m => m.id === prediction.model_id)?.name 
            ? `${models.find(m => m.id === prediction.model_id).name}${models.find(m => m.id === prediction.model_id).is_deleted ? ' (удалена)' : ''}`
            : 'Удаленная модель'
        })),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Ошибка при загрузке статистики');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        {/* Общая статистика */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Общая статистика
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Всего предсказаний
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalPredictions}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Общая стоимость
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalCost.toFixed(1)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Распределение по типам моделей */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Распределение по типам моделей
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.predictionsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.predictionsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Статистика по моделям */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Статистика по моделям
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.predictionsByModel}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="count" name="Количество предсказаний" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Последние предсказания */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Последние предсказания
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Модель</TableCell>
                    <TableCell>Стоимость</TableCell>
                    <TableCell>Результат</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentPredictions.map((prediction) => (
                    <TableRow key={prediction.id}>
                      <TableCell>
                        {new Date(prediction.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{prediction.model_name}</TableCell>
                      <TableCell>{prediction.cost}</TableCell>
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
                          Array.isArray(prediction.prediction_result)
                            ? prediction.prediction_result.join(', ')
                            : prediction.prediction_result
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 