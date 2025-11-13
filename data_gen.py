# data_gen.py
import numpy as np
import pandas as pd
import random
import os

os.makedirs("data", exist_ok=True)

def generate_synthetic_bank_data(n=8000, seed=42):
    np.random.seed(seed)
    random.seed(seed)
    rows = []
    for _ in range(n):
        age = np.random.randint(21, 70)
        employment_tenure = max(0, int(np.random.normal(5, 3)))
        avg_monthly_income = max(5000, int(np.random.normal(40000, 15000)))
        savings_balance = max(0, int(np.random.normal(50000, 40000)))
        monthly_spend_ratio = float(np.clip(np.random.beta(2, 5), 0.05, 1.0))
        num_past_defaults = int(np.random.choice([0,1,2,3], p=[0.85,0.1,0.04,0.01]))
        late_payments_6m = int(np.random.poisson(0.3))
        bureau_score = int(np.clip(np.random.normal(650, 60), 300, 900))
        avg_daily_balance = int(max(0, savings_balance * np.random.uniform(0.1, 1.5)))
        txn_count_3m = int(np.random.poisson(50))
        loan_amount = int(np.random.choice([50000,100000,200000,500000,1000000], p=[0.25,0.35,0.25,0.10,0.05]))
        loan_term = int(np.random.choice([12,24,36,60]))
        purpose = str(np.random.choice(['education','home','car','business','personal']))
        household_size = int(np.random.choice([1,2,3,4,5]))

        score = (
            (bureau_score / 900) * 0.4 +
            (avg_monthly_income / 100000) * 0.25 +
            (1 - num_past_defaults * 0.2) * 0.15 +
            (1 - late_payments_6m * 0.05) * 0.10 +
            (employment_tenure / 20) * 0.10
        )
        score += float(np.random.normal(0, 0.05))
        score = float(np.clip(score, 0, 1))
        threshold = 0.45 + (loan_amount / 1000000) * 0.2 + (loan_term / 60) * 0.1
        label = 1 if score > threshold else 0

        rows.append({
            "age": age,
            "employment_tenure": employment_tenure,
            "avg_monthly_income": avg_monthly_income,
            "savings_balance": savings_balance,
            "monthly_spend_ratio": monthly_spend_ratio,
            "num_past_defaults": num_past_defaults,
            "late_payments_6m": late_payments_6m,
            "bureau_score": bureau_score,
            "avg_daily_balance": avg_daily_balance,
            "txn_count_3m": txn_count_3m,
            "loan_amount": loan_amount,
            "loan_term": loan_term,
            "purpose": purpose,
            "household_size": household_size,
            "label": label
        })
    df = pd.DataFrame(rows)
    df.to_csv("data/synthetic_bank_data.csv", index=False)
    print("Saved data/synthetic_bank_data.csv rows:", len(df))
    return df

if __name__ == "__main__":
    generate_synthetic_bank_data(8000)