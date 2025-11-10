# build_hybrid_scores.py
import numpy as np, pandas as pd, os
DATA_DIR='data'; MODEL_DIR='models'
lr = np.load(f'{MODEL_DIR}/lr.npz', allow_pickle=True)
mf = np.load(f'{MODEL_DIR}/mf.npz', allow_pickle=True)

weights = lr['weights']; mu = lr['mu']; sigma=lr['sigma']; feature_cols = lr['feature_cols']
P = mf['P']; Q = mf['Q']
users = mf['users']; items = mf['items']

students = pd.read_csv(f'{DATA_DIR}/students.csv')
tutors = pd.read_csv(f'{DATA_DIR}/tutors.csv')
inter = pd.read_csv(f'{DATA_DIR}/interactions.csv')

# Build df of all candidate pairs (cartesian) or use observed pairs only
pairs = []
for s_id in students['student_id'].values:
    for t_id in tutors['tutor_id'].values:
        # compute LR features same as train
        s = students[students.student_id==s_id].iloc[0]
        t = tutors[tutors.tutor_id==t_id].iloc[0]
        subject_match = 1 if s.preferred_subject==t.subject else 0
        mode_match = 1 if s.learning_mode==t.teaching_mode else 0
        exp = float(t.experience_years)
        hourly_rate = float(t.hourly_rate)
        budget = float(s.budget)
        rate_diff = abs(hourly_rate - budget)
        session_count = 0
        features = np.array([subject_match, mode_match, exp, hourly_rate, rate_diff, session_count], dtype=float)
        Xs = (features - mu)/sigma
        Xs = np.hstack([1.0, Xs])
        lr_score = 1/(1+np.exp(-Xs.dot(weights)))
        # cf_score: find indices in users/items
        try:
            uidx = np.where(users==s_id)[0][0]
            tidx = np.where(items==t_id)[0][0]
            cf_score = (P[uidx,:].dot(Q[tidx,:].T)).item()
        except:
            cf_score = 0.0
        hybrid = 0.6*lr_score + 0.4*cf_score
        pairs.append((s_id,t_id,lr_score,cf_score,hybrid))
df_pairs = pd.DataFrame(pairs, columns=['student_id','tutor_id','lr_score','cf_score','hybrid'])
df_pairs.to_csv(f'{MODEL_DIR}/hybrid_scores.csv', index=False)
print("Saved hybrid_scores.csv")
