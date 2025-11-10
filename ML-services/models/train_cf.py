# train_mf.py
import numpy as np
import pandas as pd, os
DATA_DIR='data'; MODEL_DIR='models'
os.makedirs(MODEL_DIR, exist_ok=True)

inter = pd.read_csv(f'{DATA_DIR}/interactions.csv')
# build rating matrix: rows student_id, cols tutor_id
R_df = inter.pivot_table(index='student_id', columns='tutor_id', values='rating', aggfunc='mean').fillna(0)
R = R_df.values
num_users, num_items = R.shape

# matrix factorization (simple)
def matrix_factorization(R, K=10, steps=100, alpha=0.002, beta=0.02):
    num_users, num_items = R.shape
    P = np.random.normal(scale=0.1, size=(num_users, K))
    Q = np.random.normal(scale=0.1, size=(num_items, K))
    for step in range(steps):
        for i in range(num_users):
            for j in range(num_items):
                if R[i,j] > 0:
                    eij = R[i,j] - P[i,:].dot(Q[j,:].T)
                    P[i,:] += alpha*(eij*Q[j,:] - beta*P[i,:])
                    Q[j,:] += alpha*(eij*P[i,:] - beta*Q[j,:])
        if step % 10 == 0:
            pred = P.dot(Q.T)
            mask = R>0
            err = np.sum(((R - pred)*mask)**2)
            print(f"Step {step}, error {err:.4f}")
    return P, Q

P, Q = matrix_factorization(R, K=15, steps=80, alpha=0.005, beta=0.02)
R_hat = P.dot(Q.T)

# save P, Q and index/columns mapping
np.savez(f'{MODEL_DIR}/mf.npz', P=P, Q=Q, users=R_df.index.values, items=R_df.columns.values)
print("Saved MF model to", f'{MODEL_DIR}/mf.npz')
