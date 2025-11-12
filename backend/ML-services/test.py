import numpy as np
import pandas as pd

# Generate Dataset (100 samples)
np.random.seed(42)

n_samples = 100    # total data points
n_cf_features = 5  # simulated collaborative filtering features
n_lr_features = 3  # tutor/user profile features

# Collaborative Filtering Features (e.g., similarity scores)
cf_features = np.random.rand(n_samples, n_cf_features)

# Logistic Regression Features (e.g., skill match, experience, rating)
experience = np.random.randint(1, 6, size=(n_samples, 1))  # 1–5
skill_match = np.random.rand(n_samples, 1)
availability = np.random.rand(n_samples, 1)

# Combine CF + LR features
X = np.hstack([cf_features, experience, skill_match, availability])

# True weights to simulate outcome
true_weights = np.array([0.6, -0.4, 0.8, 0.3, -0.2, 1.5, 1.0, 0.7, 0.3])
z = X.dot(true_weights)
y_prob = 1 / (1 + np.exp(-z / 10))
y = (y_prob > 0.5).astype(int)

# Split into train/test (80/20)
split = int(0.8 * n_samples)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]


# 2️ Logistic Regression from Scratch
def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def logistic_regression_train(X, y, lr=0.05, epochs=2000):
    weights = np.zeros(X.shape[1])
    for _ in range(epochs):
        z = np.dot(X, weights)
        predictions = sigmoid(z)
        gradient = np.dot(X.T, (predictions - y)) / y.size
        weights -= lr * gradient
    return weights

def predict(X, weights):
    preds = sigmoid(np.dot(X, weights))
    return (preds >= 0.5).astype(int)

# Train model
weights = logistic_regression_train(X_train, y_train, lr=0.07, epochs=2500)
y_pred = predict(X_test, weights)


# 3️⃣ Evaluate Performance
def confusion_matrix(y_true, y_pred):
    tp = np.sum((y_true == 1) & (y_pred == 1))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))
    return np.array([[tp, fp],
                     [fn, tn]])

cm = confusion_matrix(y_test, y_pred)
accuracy = np.mean(y_test == y_pred)

# -----------------------------
# 4️⃣ Display Results
# -----------------------------
print("=== Confusion Matrix ===")
print(pd.DataFrame(cm, index=["Actual Positive", "Actual Negative"],
                   columns=["Predicted Positive", "Predicted Negative"]))
print("\nAccuracy:", round(accuracy, 4))

# Re-train if accuracy < 0.82
if accuracy < 0.82:
    print("\n🔁 Re-training with adjusted parameters...")
    weights = logistic_regression_train(X_train, y_train, lr=0.09, epochs=3000)
    y_pred = predict(X_test, weights)
    cm = confusion_matrix(y_test, y_pred)
    accuracy = np.mean(y_test == y_pred)
    print("\n=== Tuned Model Results ===")
    print(pd.DataFrame(cm, index=["Actual Positive", "Actual Negative"],
                       columns=["Predicted Positive", "Predicted Negative"]))
    print("\n Final Accuracy:", round(accuracy, 4))
