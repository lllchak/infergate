# API Documentation

## Аутентификация

### Регистрация нового пользователя
```http
POST /api/v1/auth/register
```

#### Request Body
```json
{
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe"
}
```

#### Response
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
}
```

### Вход в систему
```http
POST /api/v1/auth/login
```

#### Request Body (form-data)
```
username: user@example.com
password: password123
```

#### Response
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
}
```

## Пользователи

### Получение информации о текущем пользователе
```http
GET /api/v1/users/me
```

#### Headers
```
Authorization: Bearer <token>
```

#### Response
```json
{
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "credits": 100.0,
    "is_active": true
}
```

### Обновление информации о пользователе
```http
PUT /api/v1/users/me
```

#### Headers
```
Authorization: Bearer <token>
```

#### Request Body
```json
{
    "email": "newemail@example.com",
    "full_name": "New Name",
    "password": "newpassword123"
}
```

#### Response
```json
{
    "id": 1,
    "email": "newemail@example.com",
    "full_name": "New Name",
    "credits": 100.0,
    "is_active": true
}
```

### Пополнение кредитов
```http
PUT /api/v1/users/me/credits
```

#### Headers
```
Authorization: Bearer <token>
```

#### Request Body
```json
{
    "amount": 50.0
}
```

#### Response
```json
{
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "credits": 150.0,
    "is_active": true
}
```

## Модели

### Создание новой модели
```http
POST /api/v1/models/
```

#### Headers
```
Authorization: Bearer <token>
```

#### Request Body (multipart/form-data)
```
name: My Model
description: Model description
version: 1.0
model_type: regression
model_file: <file>
```

#### Response
```json
{
    "id": 1,
    "name": "My Model",
    "description": "Model description",
    "version": "1.0",
    "model_type": "regression",
    "cost_per_prediction": 0.1,
    "owner_id": 1,
    "is_active": true,
    "is_deleted": false
}
```

### Получение списка моделей
```http
GET /api/v1/models/
```

#### Response
```json
[
    {
        "id": 1,
        "name": "My Model",
        "description": "Model description",
        "version": "1.0",
        "model_type": "regression",
        "cost_per_prediction": 0.1,
        "owner_id": 1,
        "is_active": true,
        "is_deleted": false
    }
]
```

### Получение информации о конкретной модели
```http
GET /api/v1/models/{model_id}
```

#### Response
```json
{
    "id": 1,
    "name": "My Model",
    "description": "Model description",
    "version": "1.0",
    "model_type": "regression",
    "cost_per_prediction": 0.1,
    "owner_id": 1,
    "is_active": true,
    "is_deleted": false
}
```

### Выполнение предсказания
```http
POST /api/v1/models/{model_id}/predict
```

#### Headers
```
Authorization: Bearer <token>
```

#### Request Body
```json
{
    "input_data": [1.0, 2.0, 3.0]
}
```

#### Response
```json
{
    "id": 1,
    "model_id": 1,
    "user_id": 1,
    "input_data": [1.0, 2.0, 3.0],
    "prediction_result": 4.5,
    "cost": 0.1,
    "created_at": "2024-01-01T12:00:00"
}
```

### Удаление модели
```http
DELETE /api/v1/models/{model_id}
```

#### Headers
```
Authorization: Bearer <token>
```

#### Response
```json
{
    "id": 1,
    "name": "My Model",
    "description": "Model description",
    "version": "1.0",
    "model_type": "regression",
    "cost_per_prediction": 0.1,
    "owner_id": 1,
    "is_active": false,
    "is_deleted": true
}
```

### Оценка стоимости модели
```http
POST /api/v1/models/estimate-cost
```

#### Request Body (multipart/form-data)
```
model_file: <file>
```

#### Response
```json
{
    "cost_per_prediction": 0.1
}
```

## Предсказания

### Создание предсказания
```http
POST /api/v1/predictions/
```

#### Headers
```
Authorization: Bearer <token>
```

#### Request Body
```json
{
    "model_id": 1,
    "input_data": [1.0, 2.0, 3.0]
}
```

#### Response
```json
{
    "id": 1,
    "model_id": 1,
    "user_id": 1,
    "input_data": [1.0, 2.0, 3.0],
    "prediction_result": 4.5,
    "cost": 0.1,
    "created_at": "2024-01-01T12:00:00"
}
```

### Получение списка предсказаний
```http
GET /api/v1/predictions/
```

#### Headers
```
Authorization: Bearer <token>
```

#### Response
```json
[
    {
        "id": 1,
        "model_id": 1,
        "user_id": 1,
        "input_data": [1.0, 2.0, 3.0],
        "prediction_result": 4.5,
        "cost": 0.1,
        "created_at": "2024-01-01T12:00:00"
    }
]
```

### Получение информации о предсказании
```http
GET /api/v1/predictions/{prediction_id}
```

#### Headers
```
Authorization: Bearer <token>
```

#### Response
```json
{
    "id": 1,
    "model_id": 1,
    "user_id": 1,
    "input_data": [1.0, 2.0, 3.0],
    "prediction_result": 4.5,
    "cost": 0.1,
    "created_at": "2024-01-01T12:00:00"
}
```

### Создание предсказаний из файла
```http
POST /api/v1/predictions/file
```

#### Headers
```
Authorization: Bearer <token>
```

#### Request Body (multipart/form-data)
```
file: <csv_file>
model_id: 1
```

#### Response
```json
{
    "predictions": [4.5, 5.6, 6.7],
    "file_path": "results/predictions_20240101_120000.csv"
}
```

### Скачивание файла с результатами
```http
GET /api/v1/predictions/file/{filename}
```

#### Headers
```
Authorization: Bearer <token>
```

#### Response
```
Content-Type: text/csv
Content-Disposition: attachment; filename="predictions_20240101_120000.csv"

feature1,feature2,feature3,prediction
1.0,2.0,3.0,4.5
4.0,5.0,6.0,5.6
7.0,8.0,9.0,6.7
```

## Ограничения

- Максимальный размер файла модели: 100MB
- Максимальный размер входного файла для предсказаний: 10MB
- Максимальное количество записей в одном файле для предсказаний: 10000
- Минимальное количество кредитов для публикации модели: 1
- Максимальная длина имени модели: 100 символов
- Максимальная длина описания модели: 500 символов
