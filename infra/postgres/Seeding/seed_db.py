"""
Simple seeding script for populating database

• Uses environment variables for the connection string:
  PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD

Dependencies
------------
pip install psycopg2-binary Faker passlib
"""

import os
import random
from datetime import date, datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values
from faker import Faker
from passlib.hash import pbkdf2_sha256

fake = Faker()

# --- helpers --------------------------------------------------------------

# CHANGE YOUR DETAILS HERE
def conn():
    return psycopg2.connect(
        host= "localhost",
        port= 5432,
        dbname= "HIIT_GYM_MANAGER",
        user= "jaredhurlimann",
        password= "root"
    )


def hash_pw(clear: str) -> str:
    return pbkdf2_sha256.hash(clear, rounds=260000)


def rnd_pw() -> str:
    return fake.password(length=10)


# --- insert functions -----------------------------------------------------

def seed_users(cur, how_many: int, role: str):
    """Insert users and return list of (user_id, fname, lname)."""
    people = [
        (
            fake.first_name(),
            fake.last_name(),
            fake.unique.email(),
            fake.phone_number()[:15],
            hash_pw(rnd_pw()),
        )
        for _ in range(how_many)
    ]
    execute_values(
        cur,
        """
        INSERT INTO Users (first_name,last_name,email,phone,password_hash)
        VALUES %s
        ON CONFLICT (email) DO NOTHING
        RETURNING user_id, first_name, last_name;
        """,
        people,
    )
    rows = cur.fetchall()

    # attach role
    execute_values(
        cur,
        """
        INSERT INTO UserRoles (user_id,user_role)
        VALUES %s
        ON CONFLICT DO NOTHING;
        """,
        [(uid, role) for uid, *_ in rows],
    )

    # subtype tables
    if role == "member":
        execute_values(
            cur,
            """
            INSERT INTO Members (user_id,status,credits_balance)
            VALUES %s
            ON CONFLICT DO NOTHING;
            """,
            [(uid, "approved", random.randint(0, 20)) for uid, *_ in rows],
        )
    elif role == "coach":
        execute_values(
            cur,
            """
            INSERT INTO Coaches (user_id,bio)
            VALUES %s
            ON CONFLICT DO NOTHING;
            """,
            [(uid, fake.sentence(nb_words=12)) for uid, *_ in rows],
        )
    elif role == "admin":
        execute_values(
            cur,
            """
            INSERT INTO Admins (user_id,authorisation)
            VALUES %s
            ON CONFLICT DO NOTHING;
            """,
            [(uid, "all") for uid, *_ in rows],
        )
    elif role == "manager":
        execute_values(
            cur,
            """
            INSERT INTO Managers (user_id)
            VALUES %s
            ON CONFLICT DO NOTHING;
            """,
            [(uid,) for uid, *_ in rows],
        )

    return [uid for uid, *_ in rows]


def seed_workouts(cur, n=5):
    data = [
        (
            fake.word().capitalize() + " Blast",
            fake.paragraph(nb_sentences=3),
        )
        for _ in range(n)
    ]
    execute_values(
        cur,
        """
        INSERT INTO Workouts (workout_name,workout_content)
        VALUES %s
        ON CONFLICT DO NOTHING
        RETURNING workout_id;
        """,
        data,
    )
    return [wid for (wid,) in cur.fetchall()]


def seed_classes(cur, workout_ids, coach_ids, admin_ids, days_ahead=7):
    entries = []
    for _ in range(10):
        w_id = random.choice(workout_ids)
        c_id = random.choice(coach_ids)
        a_id = random.choice(admin_ids)
        d = date.today() + timedelta(days=random.randint(0, days_ahead))
        t = (datetime.min + timedelta(minutes=random.randint(6 * 60, 20 * 60))).time()
        entries.append(
            (random.randint(10, 20), d, t, random.choice([45, 60, 90]), c_id, w_id, a_id)
        )

    execute_values(
        cur,
        """
        INSERT INTO Classes
          (capacity,scheduled_date,scheduled_time,duration_minutes,
           coach_id,workout_id,created_by)
        VALUES %s
        ON CONFLICT DO NOTHING
        RETURNING class_id;
        """,
        entries,
    )
    return [cid for (cid,) in cur.fetchall()]


def seed_bookings(cur, class_ids, member_ids):
    bookings = []
    for c in class_ids:
        spots = random.sample(member_ids, k=min(len(member_ids), random.randint(3, 15)))
        bookings += [(c, m) for m in spots]

    execute_values(
        cur,
        """
        INSERT INTO ClassBookings (class_id,member_id)
        VALUES %s
        ON CONFLICT DO NOTHING;
        """,
        bookings,
    )


# --- main ---------------------------------------------------------------

def main():
    with conn() as con, con.cursor() as cur:
        print("🌱 Seeding database…")

        # optional: wipe previous dev data (keep reference data!)
        cur.execute(
            """
            DO $$
            BEGIN
              TRUNCATE TABLE ClassBookings RESTART IDENTITY CASCADE;
              TRUNCATE TABLE Classes      RESTART IDENTITY CASCADE;
              TRUNCATE TABLE Workouts     RESTART IDENTITY CASCADE;
              -- leave Users etc. intact if you prefer
            END
            $$;
            """
        )

        admin_ids   = seed_users(cur,  2, "admin")
        manager_ids = seed_users(cur,  1, "manager")
        coach_ids   = seed_users(cur,  3, "coach")
        member_ids  = seed_users(cur, 20, "member")

        workout_ids = seed_workouts(cur, n=6)
        class_ids   = seed_classes(cur, workout_ids, coach_ids, admin_ids)

        seed_bookings(cur, class_ids, member_ids)

        con.commit()
        print("✅ Done! Inserted:")
        print(f"  Admins   : {len(admin_ids)}")
        print(f"  Managers : {len(manager_ids)}")
        print(f"  Coaches  : {len(coach_ids)}")
        print(f"  Members  : {len(member_ids)}")
        print(f"  Workouts : {len(workout_ids)}")
        print(f"  Classes  : {len(class_ids)}")


if __name__ == "__main__":
    main()
