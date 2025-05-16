import pandas as pd
from sklearn.datasets import make_classification

X, _ = make_classification(
    n_samples=10,
    n_features=20,
    n_informative=10,
    n_redundant=5,
    random_state=42,
)

print([round(float(el), 2) for el in list(X[0])])

columns = [f"feature_{i}" for i in range(X.shape[1])]

df = pd.DataFrame(X, columns=columns)

df.to_csv("test.csv", index=False)
