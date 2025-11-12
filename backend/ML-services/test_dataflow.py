import numpy as np
from collections import defaultdict
from improved_recommendation import (
    gen_students,
    gen_tutors,
    generate_interactions,
    build_id_maps,
    compute_pair_features,
    split_train_test,
    sample_lr_dataset,
    HybridTutorRecommender
)

# -----------------------------
# STEP 1: DATA GENERATION
# -----------------------------
print("\n===== STEP 1: DATA GENERATION =====")
students = gen_students(100)
tutors = gen_tutors(50)

print(f"[INFO] Generated {len(students)} students and {len(tutors)} tutors")
print("[SAMPLE STUDENT]:", students[0])
print("[SAMPLE TUTOR]:", tutors[0])

# -----------------------------
# STEP 2: INTERACTION CREATION
# -----------------------------
print("\n===== STEP 2: INTERACTION CREATION =====")
sid_to_idx, tid_to_idx, _, _ = build_id_maps(students, tutors)
interactions = generate_interactions(students, tutors, sid_to_idx, tid_to_idx)

print(f"[INFO] Total Interactions: {len(interactions)}")
print("[SAMPLE INTERACTION]:", interactions[0])

# -----------------------------
# STEP 3: SPLIT TRAIN & TEST
# -----------------------------
print("\n===== STEP 3: TRAIN-TEST SPLIT =====")
train_interactions, test_interactions = split_train_test(interactions, test_holdout_per_user=1)
print(f"[INFO] Train interactions: {len(train_interactions)}, Test interactions: {len(test_interactions)}")

# -----------------------------
# STEP 4: BUILD FEATURE MATRIX
# -----------------------------
print("\n===== STEP 4: FEATURE MATRIX BUILDING =====")
X, y, s_idx, t_idx = sample_lr_dataset(students, tutors, train_interactions, sid_to_idx, tid_to_idx, neg_ratio=1.0)

print(f"[DEBUG] Feature Matrix Shape: {X.shape}")
print("[DEBUG] Labels Distribution:", np.unique(y, return_counts=True))
print("[DEBUG] First feature vector sample:", X[0])

# -----------------------------
# STEP 5: TRAIN HYBRID MODEL
# -----------------------------
print("\n===== STEP 5: TRAIN HYBRID MODEL =====")
hybrid = HybridTutorRecommender(alpha=0.70)
hybrid.fit(students, tutors, X, y, train_interactions)

print("[INFO] Logistic Regression weights shape:", hybrid.lr_model.weights.shape)
print("[INFO] Sample weights:", hybrid.lr_model.weights[:5])

print("[INFO] CF Tutor similarity matrix shape:", hybrid.cf_model.similarity_matrix.shape)
print("[INFO] Sample similarities (first 5 tutors):", hybrid.cf_model.similarity_matrix[0][:5])

# -----------------------------
# STEP 6: TEST RECOMMENDATION OUTPUT
# -----------------------------
print("\n===== STEP 6: RECOMMENDATION OUTPUT =====")
test_student_id = students[0]['student_id']
recommendations = hybrid.recommend(test_student_id, top_n=5)

print(f"[RECOMMEND] Top 5 tutors for student {test_student_id}:")
for tid, score in recommendations:
    tutor_profile = hybrid.get_tutor_profile(tid)
    print(f"   Tutor: {tid} | Subject: {tutor_profile['subject_specialization']} | Score: {score:.4f}")


