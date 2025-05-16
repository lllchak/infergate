from prometheus_fastapi_instrumentator import Instrumentator, metrics
from prometheus_client import Counter, Histogram, Gauge

PREDICTION_COUNTER = Counter(
    'prediction_total',
    'Total number of predictions',
    ['model_name', 'status', 'user_email']
)

PREDICTION_LATENCY = Histogram(
    'prediction_latency_seconds',
    'Time spent processing prediction',
    ['model_name']
)

PREDICTION_COST = Counter(
    'prediction_cost_total',
    'Total cost of predictions',
    ['model_name', 'user_email']
)

PREDICTION_DURATION = Histogram(
    "ml_prediction_duration_seconds",
    "Time spent making predictions",
    ["model_name"]
)

USER_CREDITS = Gauge(
    'user_credits',
    'Current user credits',
    ['user_email']
)

USER_CREDITS_HISTORY = Counter(
    'user_credits_history_total',
    'Total credits history',
    ['user_email', 'operation']
)

MODEL_USAGE = Counter(
    'model_usage_total',
    'Total number of model usages',
    ['model_name']
)

MODEL_SUCCESS_RATE = Gauge(
    'model_success_rate',
    'Model success rate',
    ['model_name']
)

SYSTEM_ERRORS = Counter(
    'system_errors_total',
    'Total number of system errors',
    ['error_type']
)

API_REQUESTS = Counter(
    "ml_service_api_requests_total",
    "Total number of API requests",
    ["endpoint", "method", "status"]
)

PREDICTION_QUEUE_SIZE = Gauge(
    "ml_service_prediction_queue_size",
    "Current size of prediction queue"
)

MODEL_LOAD_TIME = Histogram(
    'model_load_time_seconds',
    'Time spent loading model',
    ['model_name']
)

def setup_metrics(app):
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="ml_inprogress_requests",
        inprogress_labels=True,
    )

    instrumentator.add(metrics.default())

    @instrumentator.instrument
    def prediction_metrics(response, request, duration):
        if request.url.path.startswith("/api/v1/predictions/"):
            model_name = request.path_params.get("model_name", "unknown")
            PREDICTION_COUNTER.labels(model_name=model_name).inc()
            PREDICTION_DURATION.labels(model_name=model_name).observe(duration)

    instrumentator.add(prediction_metrics)

    instrumentator.instrument(app).expose(app)
