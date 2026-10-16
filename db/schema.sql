-- PulseFit schema. Safe to run repeatedly (everything is IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  email                TEXT NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  full_name            TEXT NOT NULL,
  weekly_goal_workouts INTEGER NOT NULL DEFAULT 4 CHECK (weekly_goal_workouts BETWEEN 1 AND 14),
  weekly_goal_minutes  INTEGER NOT NULL DEFAULT 150 CHECK (weekly_goal_minutes BETWEEN 10 AND 3000),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercises (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN ('Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio')),
  sets         INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 10),
  reps         TEXT NOT NULL,
  difficulty   TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 600),
  description  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS exercises_muscle_group_idx ON exercises (muscle_group);

CREATE TABLE IF NOT EXISTS workouts (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  workout_date     DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  duration_minutes INTEGER CHECK (duration_minutes >= 0),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workouts_user_date_idx ON workouts (user_id, workout_date);
CREATE INDEX IF NOT EXISTS workouts_status_idx ON workouts (status);
-- At most one open (not yet completed) workout per user per day
CREATE UNIQUE INDEX IF NOT EXISTS workouts_one_open_per_day_idx ON workouts (user_id, workout_date) WHERE status <> 'completed';

CREATE TABLE IF NOT EXISTS workout_exercises (
  id          SERIAL PRIMARY KEY,
  workout_id  INTEGER NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE (workout_id, exercise_id)
);
CREATE INDEX IF NOT EXISTS workout_exercises_exercise_idx ON workout_exercises (exercise_id);

CREATE TABLE IF NOT EXISTS workout_sets (
  id                  SERIAL PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises (id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL CHECK (set_number >= 1),
  completed           BOOLEAN NOT NULL DEFAULT false,
  completed_at        TIMESTAMPTZ,
  UNIQUE (workout_exercise_id, set_number)
);

-- start_time is the gym's local wall-clock time. Classes repeat weekly:
-- the API shows each one on the same weekday and time in the current week.
CREATE TABLE IF NOT EXISTS classes (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL UNIQUE,
  category         TEXT NOT NULL,
  coach_name       TEXT NOT NULL,
  room             TEXT NOT NULL DEFAULT 'Studio A',
  start_time       TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  capacity         INTEGER NOT NULL CHECK (capacity > 0),
  intensity        INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 3)
);
CREATE INDEX IF NOT EXISTS classes_start_time_idx ON classes (start_time);

-- Bookings are per class per week (week_start = that week's Monday)
CREATE TABLE IF NOT EXISTS class_bookings (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  class_id   INTEGER NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  waitlisted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, class_id, week_start)
);
CREATE INDEX IF NOT EXISTS class_bookings_class_week_idx ON class_bookings (class_id, week_start);

-- Footer "Weekly programs" sign-ups
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
