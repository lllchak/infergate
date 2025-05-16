# Infergate

Сервис инференса и хранения моделей машинного обучения с подсистемой биллинга

## Структура проекта

```
.
├── app/                   # Backend приложение
│   ├── api/               # API endpoints
│   ├── core/              # Основные настройки
│   ├── crud/              # CRUD операции
│   ├── db/                # Настройки базы данных
│   ├── models/            # SQLAlchemy модели
│   ├── schemas/           # Pydantic схемы
│   ├── services/          # Бизнес-логика
│   └── tests/             # Тесты
├── frontend/              # Frontend приложение
├── prometheus/            # Конфигурация Prometheus
├── grafana/               # Конфигурация Grafana
├── ml_examples/           # Вспомогательные файлы для работы с МЛ моделями/данными
├── .env.example           # Пример конфига окружения
├── requirements.txt       # Зависимости бекенда
├── docker-compose.yml     # Docker Compose конфигурация
└── Dockerfile             # Dockerfile для backend
```

## Архитектура проекта

Проект состоит из следующих компонентов:

- Backend (FastAPI)
- Frontend (React)
- PostgreSQL
- MinIO (для хранения моделей)
- Prometheus + Grafana (для мониторинга)

## Требования

- Docker
- Docker Compose
- Python 3.9+
- Node.js 14+

## Установка необходимых технологий

### Docker и Docker Compose

#### macOS
1. Установите [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Docker Compose входит в состав Docker Desktop

#### Linux
```bash
sudo apt-get update
sudo apt-get install docker.io

sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

sudo usermod -aG docker $USER
```

### Python 3.9+

#### macOS
```bash
brew install python@3.9
```

#### Linux
```bash
sudo apt-get update
sudo apt-get install python3.9 python3.9-venv python3.9-dev
```

### Node.js 14+

#### macOS
```bash
brew install node@14

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 14
```

#### Linux
```bash
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 14
```

**Note**: Проверить, что все компоненты установлены:

```bash
docker --version
docker-compose --version

python3 --version

node --version
npm --version
```

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone git@github.com:lllchak/infergate.git
cd infergate
```

2. Создайте файл `.env` в корневой директории проекта. Пример можно посмотреть в [.env.example](.env.example)

3. Запустите проект с помощью Docker Compose:
```bash
docker-compose down -v && docker-compose up -d --build --force-recreate
```

После запуска будут доступны следующие хосты:
- Backend API: http://localhost:8000
- Frontend: http://localhost:3001
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- MinIO Console: http://localhost:9001

## Схема API

### Аутентификация

- `POST /api/v1/auth/register` - Регистрация нового пользователя
- `POST /api/v1/auth/login` - Вход в систему

### Пользователи

- `GET /api/v1/users/me` - Получение информации о текущем пользователе
- `PUT /api/v1/users/me` - Обновление информации о пользователе
- `PUT /api/v1/users/me/credits` - Пополнение кредитов

### Модели

- `POST /api/v1/models/` - Создание новой модели
- `GET /api/v1/models/` - Получение списка моделей
- `GET /api/v1/models/{model_id}` - Получение информации о конкретной модели
- `POST /api/v1/models/{model_id}/predict` - Выполнение предсказания
- `DELETE /api/v1/models/{model_id}` - Удаление модели
- `POST /api/v1/models/estimate-cost` - Оценка стоимости модели

### Предсказания

- `POST /api/v1/predictions/` - Создание предсказания
- `GET /api/v1/predictions/` - Получение списка предсказаний
- `GET /api/v1/predictions/{prediction_id}` - Получение информации о предсказании
- `POST /api/v1/predictions/file` - Создание предсказаний из файла
- `GET /api/v1/predictions/file/{filename}` - Скачивание файла с результатами

**Note**: Более подробная документация API доступна в файле [API.md](API.md)

## Запуск тестов

1. Установите зависимости для тестов:
```bash
pip install -r app/tests/requirements-test.txt
```

2. Запустите тесты:
```bash
pytest app/tests/
```

Для запуска тестов с отчетом о покрытии:
```bash
pytest --cov=app app/tests/
```

## Мониторинг

Система базово поддерживает мониторинг следующих основных метрик:

- Количество предсказаний
- Латентность предсказаний
- Использование моделей
- Стоимость предсказаний
- Кредиты пользователей
- История кредитов
- Успешность моделей
- Ошибки системы
- Время загрузки моделей

## Лицензия

Apache 2.0
