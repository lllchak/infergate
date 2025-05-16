import joblib

# from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split

X, y = make_classification(
    n_samples=10000,
    n_features=20,
    n_informative=10,
    n_redundant=5,
    random_state=42,
)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# model = LogisticRegression(
#     C=1.0,
#     max_iter=10000,
#     solver='lbfgs',
#     random_state=42,
# )

model = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    min_samples_split=2,
    random_state=42,
)

model.fit(X_train, y_train)

model_filename = 'random_forest_model.pkl'
joblib.dump(model, model_filename)
