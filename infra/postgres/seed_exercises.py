#!/usr/bin/env python3
"""
Simple script to seed exercises table with common exercises.
Run this after the main seed_db.py script.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Database connection (same as seed_db.py)
SUPA_DSN = os.getenv("DATABASE_URL")
if SUPA_DSN:
    if "sslmode=" not in SUPA_DSN:
        SUPA_DSN += ("&" if "?" in SUPA_DSN else "?") + "sslmode=require"
    DB_CFG = dict(dsn=SUPA_DSN, sslmode="require")
else:
    DB_CFG = dict(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", 5432),
        dbname=os.getenv("PGDATABASE", "HIIT_GYM"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "root"),
    )

def conn():
    return psycopg2.connect(**DB_CFG)

def seed_exercises():
    exercises = [
        ('Push-ups', 'Classic bodyweight exercise for chest, shoulders, and triceps'),
        ('Squats', 'Fundamental lower body exercise targeting glutes and quads'),
        ('Burpees', 'Full-body high-intensity exercise combining squat, push-up, and jump'),
        ('Mountain Climbers', 'Cardio exercise targeting core and legs'),
        ('Jumping Jacks', 'Basic cardio exercise for warm-up'),
        ('Plank', 'Isometric core strengthening exercise'),
        ('Lunges', 'Single-leg exercise for glutes, quads, and hamstrings'),
        ('High Knees', 'Cardio exercise with knee lifts'),
        ('Butt Kicks', 'Cardio exercise with heel kicks'),
        ('Arm Circles', 'Shoulder mobility and warm-up exercise'),
        ('Leg Raises', 'Core exercise targeting lower abs'),
        ('Russian Twists', 'Core exercise with rotational movement'),
        ('Wall Sit', 'Isometric exercise for quads and glutes'),
        ('Tricep Dips', 'Upper body exercise targeting triceps'),
        ('Bicycle Crunches', 'Core exercise with alternating knee-to-elbow movement'),
        ('Bear Crawl', 'Full-body exercise on hands and feet'),
        ('Dead Bug', 'Core stability exercise'),
        ('Superman', 'Back strengthening exercise'),
        ('Glute Bridges', 'Hip and glute strengthening exercise'),
        ('Calf Raises', 'Lower leg strengthening exercise'),
        ('Jump Squats', 'Explosive lower body exercise'),
        ('Pike Push-ups', 'Advanced push-up variation targeting shoulders'),
        ('Single-leg Glute Bridges', 'Unilateral glute strengthening'),
        ('Side Plank', 'Lateral core strengthening exercise'),
        ('Hollow Body Hold', 'Advanced core isometric exercise'),
        ('V-ups', 'Core exercise combining leg raises and crunches'),
        ('Flutter Kicks', 'Core exercise with alternating leg movements'),
        ('Scissor Kicks', 'Core exercise with crossing leg movements'),
        ('Reverse Crunches', 'Core exercise targeting lower abs'),
        ('Mason Twists', 'Core exercise with rotational movement'),
    ]
    
    with conn() as con, con.cursor() as cur:
        # Insert exercises, ignoring duplicates
        cur.execute("""
            INSERT INTO exercises (name, description) 
            VALUES %s 
            ON CONFLICT (name) DO NOTHING
        """, exercises)
        
        con.commit()
        
        # Count inserted exercises
        cur.execute("SELECT COUNT(*) FROM exercises")
        count = cur.fetchone()[0]
        
        print(f"✅ Seeded {len(exercises)} exercises (total in DB: {count})")

if __name__ == "__main__":
    try:
        seed_exercises()
    except Exception as e:
        print(f"❌ Error seeding exercises: {e}")
        exit(1)
