import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

const BalanceManager = () => {
  const { user, updateCredits } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setAmount('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Введите положительное число');
      return;
    }

    try {
      await updateCredits(amountNum);
      handleClose();
    } catch (err) {
      setError(err.message || 'Ошибка при пополнении баланса');
    }
  };

  return (
    <StyledBox>
      <Typography variant="h6" gutterBottom>
        Баланс: {user?.credits || 0} кредитов
      </Typography>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Пополнить баланс
      </Button>

      <Dialog open={open} onClose={handleClose}>
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
          <Button onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit} color="primary">
            Пополнить
          </Button>
        </DialogActions>
      </Dialog>
    </StyledBox>
  );
};

export default BalanceManager; 