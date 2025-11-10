# train_lr.py
import numpy as np
import pandas as pd
import os

DATA_DIR = 'data'
MODEL_DIR = 'models'
os.makedirs(MODEL_DIR, exist_ok=True)

# Load CSVs
students = pd.read_csv(f'{DATA_DIR}/students.csv')
tutors = pd.read_csv(f'{DATA_DIR}/tutors.csv')
inter = pd.read_csv(f'{DATA_DIR}/interactions.csv')

# join data to build feature rows (student-tutor interactions)
df = inter.merge(students, on='student_id', how='left').merge(tutors, on='tutor_id', how='left')

# Feature engineering (simple)
df['subject_match'] = (df['preferred_subject'] == df['subject']).astype(int)
# - mode match
df['mode_match'] = (df['learning_mode'] == df['teaching_mode']).astype(int)
# - normalized experience, hourly diff, budget diff
df['exp'] = df['experience_years'].astype(float)
df['hourly_rate'] = df['hourly_rate'].astype(float)
df['budget'] = df['budget'].astype(float)
df['rate_diff'] = np.abs(df['hourly_rate'] - df['budget'])

# features and label
feature_cols = ['subject_match','mode_match','exp','hourly_rate','rate_diff','session_count']
X = df[feature_cols].astype(float).values
y = df['match_success'].astype(int).values

# standardize numeric cols (columns 2..)
from math import sqrt
# compute mean/std (simple)
mu = X.mean(axis=0)
sigma = X.std(axis=0)
sigma[sigma==0] = 1.0
X_scaled = (X - mu) / sigma

# add bias column
m, n = X_scaled.shape
X_design = np.hstack([np.ones((m,1)), X_scaled])  # shape m x (n+1)

# init weights
weights = np.zeros(n+1)

# sigmoid
def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

# gradient descent
alpha = 0.05
epochs = 2000

for epoch in range(epochs):
    z = X_design.dot(weights)
    preds = sigmoid(z)
    error = preds - y
    grad = (X_design.T.dot(error)) / m
    weights -= alpha * grad
    if epoch % 200 == 0:
        # compute log-loss
        eps = 1e-9
        loss = -np.mean(y * np.log(preds+eps) + (1-y)*np.log(1-preds+eps))
        print(f'Epoch {epoch}, loss={loss:.4f}')

# save weights + mu + sigma + feature_cols
np.savez(f'{MODEL_DIR}/lr.npz', weights=weights, mu=mu, sigma=sigma, feature_cols=feature_cols)
print("Saved logistic model to", f'{MODEL_DIR}/lr.npz')
