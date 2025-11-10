# app.py
from fastapi import FastAPI
import numpy as np, pandas as pd
from typing import List
import os

app = FastAPI()
MODEL_DIR='models'
DATA_DIR='data'

lr = np.load(os.path.join(MODEL_DIR,'lr.npz'), allow_pickle=True)
mf = np.load(os.path.join(MODEL_DIR,'mf.npz'), allow_pickle=True)
hybrid_df = pd.read_csv(os.path.join(MODEL_DIR,'hybrid_scores.csv'))

weights = lr['weights']; mu = lr['mu']; sigma = lr['sigma']; feature_cols = lr['feature_cols']
users = mf['users']; items = mf['items']

@app.get("/recommend/{student_id}")
def recommend(student_id: int, top_n: int = 5):
    # read hybrid df and return top-n tutors for student_id
    df = hybrid_df[hybrid_df.student_id==student_id].sort_values('hybrid', ascending=False).head(top_n)
    results = df[['tutor_id','lr_score','cf_score','hybrid']].to_dict(orient='records')
    return {"student_id": student_id, "recommendations": results}

@app.get("/health")
def health():
    return {"status":"ok"}
