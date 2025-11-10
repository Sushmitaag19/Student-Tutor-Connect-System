# generate_dummy_data.py
import random, csv
from faker import Faker

fake = Faker()
subjects = ["Math","Physics","English","Computer Science","Chemistry","Biology","Nepali"]
locations = ["Kathmandu","Lalitpur","Bhaktapur","Pokhara","Dharan"]
modes = ["Online","Offline","Hybrid"]

NUM_TUTORS = 20
NUM_STUDENTS = 100
NUM_INTERACTIONS = 800

# tutors.csv
with open('../data/tutors.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['tutor_id','name','education_level','subject','experience_years','hourly_rate','teaching_mode','location'])
    for i in range(1, NUM_TUTORS+1):
        writer.writerow([
            i,
            fake.name(),
            random.choice(['Bachelors','Masters','PhD']),
            random.choice(subjects),
            random.randint(1,12),
            round(random.uniform(500,2000),2),
            random.choice(modes),
            random.choice(locations)
        ])

# students.csv
with open('../data/students.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['student_id','name','preferred_subject','learning_mode','budget','location'])
    for i in range(1, NUM_STUDENTS+1):
        writer.writerow([
            i,
            fake.name(),
            random.choice(subjects),
            random.choice(modes),
            random.randint(300,2500),
            random.choice(locations)
        ])

with open('../data/interactions.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['student_id','tutor_id','rating','session_count','match_success'])
    for _ in range(NUM_INTERACTIONS):
        s = random.randint(1,NUM_STUDENTS)
        t = random.randint(1,NUM_TUTORS)
        rating = random.choice([3,4,5]) if random.random() < 0.65 else random.choice([1,2,3])
        session_count = random.randint(1,6)
        match_success = 1 if rating >= 4 else 0
        writer.writerow([s,t,rating,session_count,match_success])

print("Dummy CSVs generated in data/")
