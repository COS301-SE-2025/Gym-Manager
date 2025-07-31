"""
NOTES FOR ANYONE READING THIS:
1) You need to change the info below (lines 24 - 28) to match YOUR database info (change the 2nd argument)
2) Relevant details will be printed on the terminal after you run the script (user passswords, classes, etc...)
3) You need to download the dependencies on line 8
4) All data in your database will be deleted, and then the new data from this script will be added

pip install psycopg2-binary Faker passlib bcrypt
"""

from __future__ import annotations
import os
import random
from datetime import datetime, timedelta, time, date

import bcrypt
import psycopg2
from psycopg2.extras import execute_values
from faker import Faker
from passlib.hash import pbkdf2_sha256
import bcrypt

fake = Faker()
DB_CFG = dict(
    host=os.getenv("PGHOST", "localhost"),
    port=os.getenv("PGPORT", 33322),
    dbname=os.getenv("PGDATABASE", "HIIT_GYM_MANAGER"),
    user=os.getenv("PGUSER", "postgres"),
    password=os.getenv("PGPASSWORD", "denispi"),
)

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

DEMO_PASSWORD = "Passw0rd!" # one password to rule them all
DEMO_HASH     = pbkdf2_sha256.hash(DEMO_PASSWORD, rounds=260_000)

def hash_pw(clear: str) -> str:
    return bcrypt.hashpw(clear.encode(), bcrypt.gensalt()).decode()

def conn():            # tiny helper for brevity
    return psycopg2.connect(**DB_CFG)


def rand_pw() -> str:
    return fake.password(length=10)

# ---------------------------------------------------------------------------
# seeding functions
# ---------------------------------------------------------------------------

def insert_user(cur, first, last, email, phone, clear_pw, role):
    cur.execute(
        """
        INSERT INTO users (first_name,last_name,email,phone,password_hash)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING user_id;
        """,
        (first, last, email, phone, hash_pw(clear_pw)),
    )
    user_id = cur.fetchone()[0]

    # every user gets at least one role
    cur.execute(
        "INSERT INTO userroles (user_id,user_role) VALUES (%s,%s);",
        (user_id, role),
    )

    # subtype tables
    if role == "member":
        cur.execute(
            """
            INSERT INTO members (user_id,status,credits_balance)
            VALUES (%s,'approved',%s);
            """,
            (user_id, random.randint(5, 20)),
        )
    elif role == "coach":
        cur.execute(
            "INSERT INTO coaches (user_id,bio) VALUES (%s,%s);",
            (user_id, fake.sentence(nb_words=12)),
        )
    elif role == "admin":
        cur.execute(
            "INSERT INTO admins (user_id,authorisation) VALUES (%s,'all');",
            (user_id,),
        )
    elif role == "manager":
        cur.execute(
            "INSERT INTO managers (user_id) VALUES (%s);",
            (user_id,),
        )

    return user_id


def seed_core_users(cur):
    """
    Returns four dicts with ids that the rest of the script can use:
      {admins:[...], coaches:[...], members:[...], managers:[...]}
    """
    demo = [
        ("Alice", "Admin",   "alice.admin@example.com",  "0101001001", DEMO_PASSWORD, "admin"),
        ("Carl",  "Coach",   "carl.coach@example.com",   "0101002002", DEMO_PASSWORD, "coach"),
        ("Mandy", "Manager", "mandy.manager@example.com","0101003003", DEMO_PASSWORD, "manager"),
        ("Mike",  "Member",  "mike.member@example.com",  "0101004004", DEMO_PASSWORD, "member"),
        ("Mia",   "Member",  "mia.member@example.com",   "0101005005", DEMO_PASSWORD, "member"),
    ]
    ids_by_role = dict(admins=[], coaches=[], managers=[], members=[])

    for first, last, email, phone, pw, role in demo:
        uid = insert_user(cur, first, last, email, phone, pw, role)
        ids_by_role[{"admin":"admins","coach":"coaches",
                     "manager":"managers","member":"members"}[role]].append(uid)

    # sprinkle some extra random users for more realistic joins
    for _ in range(3):
        ids_by_role["admins"].append(insert_user(
            cur, fake.first_name(), fake.last_name(), fake.unique.email(),
            fake.phone_number()[:15], rand_pw(), "admin"
        ))

    for _ in range(5):
        ids_by_role["coaches"].append(insert_user(
            cur, fake.first_name(), fake.last_name(), fake.unique.email(),
            fake.phone_number()[:15], rand_pw(), "coach"
        ))

    for _ in range(15):
        ids_by_role["members"].append(insert_user(
            cur, fake.first_name(), fake.last_name(), fake.unique.email(),
            fake.phone_number()[:15], rand_pw(), "member"
        ))

    return ids_by_role


def seed_workouts(cur, how_many=8):
    data = [
        (fake.word().capitalize() + " Blast", fake.paragraph(nb_sentences=3))
        for _ in range(how_many)
    ]
    execute_values(
        cur,
        """
        INSERT INTO workouts (workout_name,workout_content)
        VALUES %s
        RETURNING workout_id;
        """,
        data,
    )
    return [wid for (wid,) in cur.fetchall()]


def seed_classes(cur, workout_ids, coach_ids, admin_ids):
    """
    Creates:
      • 2 past  (yesterday)
      • 2 ongoing (started 20 / 40 min ago, 90‑min)
      • 1 starting in 5 min   ← NEW
      • 2 later today (+1 h, +3 h)
      • 4 within the next week
    """
    now   = datetime.now()
    today = date.today()

    def mk_entry(start_dt, dur_min=60):
        end_dt = start_dt + timedelta(minutes=dur_min)
        return dict(
            capacity=random.randint(8, 20),
            scheduled_date=start_dt.date(),
            scheduled_time=start_dt.time().replace(second=0, microsecond=0),
            duration_minutes=dur_min,
            coach_id=random.choice(coach_ids),
            workout_id=random.choice(workout_ids),
            created_by=random.choice(admin_ids),
            starts_at=start_dt,
            ends_at=end_dt,
        )

    bucket = []

    # 2 already ended (yesterday)
    for h in (9, 17):
        bucket.append(mk_entry(datetime.combine(today - timedelta(days=1), time(h, 0))))

    # 2 in progress now (started 20 and 40 min ago, 90‑min duration)
    bucket.append(mk_entry(now - timedelta(minutes=20), dur_min=90))
    bucket.append(mk_entry(now - timedelta(minutes=40), dur_min=90))

    # 1 starting in ~5 minutes
    bucket.append(mk_entry(now + timedelta(minutes=5)))

    # 2 later today (+1 h & +3 h)
    bucket.append(mk_entry(now + timedelta(hours=1)))
    bucket.append(mk_entry(now + timedelta(hours=3)))

    # 4 random within next week
    for _ in range(4):
        random_day   = today + timedelta(days=random.randint(1, 7))
        random_start = datetime.combine(
            random_day,
            time(hour=random.randint(6, 20), minute=random.choice((0, 30)))
        )
        bucket.append(mk_entry(random_start, dur_min=random.choice((45, 60, 90))))

    # ---------- DB insert ----------
    execute_values(
        cur,
        """
        INSERT INTO classes
          (capacity,scheduled_date,scheduled_time,duration_minutes,
           coach_id,workout_id,created_by)
        VALUES %s
        RETURNING class_id;
        """,
        [
            (
                b["capacity"], b["scheduled_date"], b["scheduled_time"],
                b["duration_minutes"], b["coach_id"], b["workout_id"], b["created_by"]
            )
            for b in bucket
        ],
    )
    class_ids = [cid for (cid,) in cur.fetchall()]
    for d, cid in zip(bucket, class_ids):
        d["class_id"] = cid
    return bucket


def seed_bookings_and_attendance(cur, class_info, member_ids):
    bookings, attend = [], []
    now = datetime.now()

    demo_member_ids = {
        "mike":  next(m for m in member_ids if m <= 5), # id 4
        "mia":   next(m for m in member_ids if m <= 5 and m != 4)  # id 5
    }

    for cls in class_info:
        c_id   = cls["class_id"]

        # --------- make normal random picks ---------
        picks  = random.sample(
            member_ids,
            k=min(cls["capacity"], random.randint(3, 15))
        )

        # ensure both demo members are included
        picks += [mid for mid in demo_member_ids.values() if mid not in picks]
        bookings.extend([(c_id, m) for m in picks])

        # --------- mark attendance for past classes ---------
        if cls["ends_at"] < now:
            attended = random.sample(picks, k=max(1, int(len(picks)*0.8)))
            attend.extend([(c_id, m, random.randint(60, 100)) for m in attended])

    # insert bookings
    execute_values(
        cur,
        """
        INSERT INTO classbookings (class_id,member_id)
        VALUES %s;
        """,
        bookings,
    )

    # insert attendance
    if attend:
        execute_values(
            cur,
            """
            INSERT INTO classattendance (class_id,member_id,score)
            VALUES %s;
            """,
            attend,
        )

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    with conn() as con, con.cursor() as cur:
        cur.execute(
            """
            TRUNCATE TABLE
              classattendance,
              classbookings,
              classes,
              workouts,
              userroles,
              members,
              coaches,
              admins,
              managers,
              users
            RESTART IDENTITY CASCADE;
            """
        )

        ids         = seed_core_users(cur)
        workout_ids = seed_workouts(cur, how_many=8)
        class_info  = seed_classes(cur, workout_ids,
                                   coach_ids=ids["coaches"],
                                   admin_ids=ids["admins"])
        seed_bookings_and_attendance(cur, class_info, ids["members"])

        con.commit()

        print("\n✅  Seed complete!")
        print("--------------------------------------------------")
        print("Demo login accounts (all passwords = Passw0rd!)")
        print("--------------------------------------------------")
        print("Admin   :", "alice.admin@example.com")
        print("Coach   :", "carl.coach@example.com")
        print("Manager :", "mandy.manager@example.com")
        print("Member  :", "mike.member@example.com")
        print("Member  :", "mia.member@example.com")
        print("--------------------------------------------------")
        print(f"Total users   : {sum(len(v) for v in ids.values())}")
        print(f"  ↳ admins    : {len(ids['admins'])}")
        print(f"  ↳ coaches   : {len(ids['coaches'])}")
        print(f"  ↳ managers  : {len(ids['managers'])}")
        print(f"  ↳ members   : {len(ids['members'])}")
        print(f"Workouts      : {len(workout_ids)}")
        print(f"Classes       : {len(class_info)}")
        now = datetime.now()
        past   = sum(1 for c in class_info if c['ends_at'] <  now)
        live   = sum(1 for c in class_info if c['starts_at'] <= now <= c['ends_at'])
        soon   = sum(1 for c in class_info if 0 < (c['starts_at'] - now).total_seconds() <= 600)
        future = len(class_info) - past - live - soon
        print(f"  ↳ past      : {past}")
        print(f"  ↳ ongoing   : {live}")
        print(f"  ↳ soon (<10m): {soon}")
        print(f"  ↳ upcoming  : {future}")
        print("--------------------------------------------------")

if __name__ == "__main__":
    main()