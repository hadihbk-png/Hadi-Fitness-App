-- PulseFit sample data. Safe to run repeatedly: rows are matched by name/title and updated, never duplicated.

INSERT INTO exercises (name, muscle_group, sets, reps, difficulty, rest_seconds, description) VALUES
  -- Chest
  ('Push-up',                'Chest',  3, '12-15',    'Beginner',     60, 'Hands just wider than shoulders, body in a straight line, lower your chest to a fist above the floor.'),
  ('Barbell Bench Press',    'Chest',  4, '6-8',      'Intermediate', 120, 'Feet planted, shoulder blades squeezed, lower the bar to mid-chest and press up powerfully.'),
  ('Incline Dumbbell Press', 'Chest',  3, '8-10',     'Intermediate', 90, 'On a 30° bench, press the dumbbells up and slightly together, controlling the way down.'),
  ('Cable Fly',              'Chest',  3, '12-15',    'Beginner',     60, 'Soft elbows, sweep the handles together in a wide hugging arc and squeeze at the middle.'),
  ('Weighted Dip',           'Chest',  4, '6-8',      'Advanced',     120, 'Lean forward slightly, lower until shoulders are below elbows, then drive back up.'),
  -- Back
  ('Lat Pulldown',           'Back',   3, '10-12',    'Beginner',     75, 'Pull the bar to your upper chest, leading with the elbows, and control it back up.'),
  ('Seated Cable Row',       'Back',   3, '10-12',    'Beginner',     75, 'Sit tall, pull the handle to your belly button and squeeze your shoulder blades together.'),
  ('Barbell Row',            'Back',   4, '8',        'Intermediate', 90, 'Hinge to about 45°, flat back, row the bar to your lower ribs.'),
  ('Pull-up',                'Back',   4, '6-10',     'Intermediate', 120, 'From a dead hang, pull until your chin clears the bar, then lower all the way down.'),
  ('Deadlift',               'Back',   5, '3-5',      'Advanced',     180, 'Bar over mid-foot, brace hard, push the floor away and lock out with your glutes.'),
  -- Legs
  ('Goblet Squat',           'Legs',   3, '10-12',    'Beginner',     60, 'Hold a dumbbell at your chest, sit between your heels and stand tall.'),
  ('Walking Lunge',          'Legs',   3, '12 / leg', 'Beginner',     60, 'Long steps, back knee kisses the floor, drive through the front heel.'),
  ('Romanian Deadlift',      'Legs',   3, '8-10',     'Intermediate', 90, 'Soft knees, push the hips back until you feel the hamstrings, then squeeze up.'),
  ('Leg Press',              'Legs',   4, '10-12',    'Intermediate', 90, 'Feet shoulder-width on the platform, lower under control, do not lock the knees.'),
  ('Barbell Back Squat',     'Legs',   5, '5',        'Advanced',     180, 'Bar on upper back, brace, sit down to at least parallel and drive up.'),
  -- Arms
  ('Dumbbell Curl',          'Arms',   3, '10-12',    'Beginner',     60, 'Elbows pinned to your sides, curl up and lower slowly.'),
  ('Rope Pushdown',          'Arms',   3, '12-15',    'Beginner',     60, 'Elbows tucked, push the rope down and split it apart at the bottom.'),
  ('Hammer Curl',            'Arms',   3, '10-12',    'Intermediate', 60, 'Neutral grip, curl with control to build the forearms and brachialis.'),
  ('Skull Crusher',          'Arms',   3, '8-10',     'Intermediate', 75, 'Lying on a bench, lower the EZ bar towards your forehead and extend back up.'),
  ('Close-Grip Bench Press', 'Arms',   4, '6-8',      'Advanced',     120, 'Hands shoulder-width, elbows tucked, press to build heavy triceps strength.'),
  -- Core
  ('Plank',                  'Core',   3, '45 s',     'Beginner',     45, 'Forearms down, squeeze glutes and abs, keep a straight line from head to heels.'),
  ('Dead Bug',               'Core',   3, '10 / side','Beginner',     45, 'Lower back pressed into the floor, extend opposite arm and leg slowly.'),
  ('Russian Twist',          'Core',   3, '20',       'Intermediate', 45, 'Lean back, feet up if you can, rotate the weight from hip to hip.'),
  ('Hanging Knee Raise',     'Core',   3, '12',       'Intermediate', 60, 'Hang from a bar and curl your knees up to your chest without swinging.'),
  ('Ab Wheel Rollout',       'Core',   3, '8-10',     'Advanced',     75, 'From your knees, roll out as far as you can while keeping your back flat.'),
  -- Cardio
  ('Jumping Jacks',          'Cardio', 3, '45 s',     'Beginner',     30, 'Light and quick on your toes to raise your heart rate.'),
  ('Rowing Machine',         'Cardio', 4, '500 m',    'Beginner',     90, 'Legs, then body, then arms. Keep a strong, steady stroke.'),
  ('Kettlebell Swing',       'Cardio', 4, '20',       'Intermediate', 60, 'Hinge and snap the hips to float the bell to chest height.'),
  ('Battle Ropes',           'Cardio', 5, '30 s',     'Intermediate', 45, 'Athletic stance, make fast alternating waves all the way to the anchor.'),
  ('Burpee',                 'Cardio', 4, '12',       'Advanced',     60, 'Squat, kick back to a push-up, jump the feet in and explode upwards.')
ON CONFLICT (name) DO UPDATE SET
  muscle_group = EXCLUDED.muscle_group,
  sets         = EXCLUDED.sets,
  reps         = EXCLUDED.reps,
  difficulty   = EXCLUDED.difficulty,
  rest_seconds = EXCLUDED.rest_seconds,
  description  = EXCLUDED.description;

-- 10 classes spread over this week (Monday = start of week)
INSERT INTO classes (title, category, coach_name, room, start_time, duration_minutes, capacity, intensity) VALUES
  ('Sunrise HIIT',     'HIIT',     'Maya Torres',  'Studio A',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '0 days 06:30', 45, 20, 3),
  ('Barbell Club',     'Strength', 'Leo Brandt',   'Iron Zone', date_trunc('week', LOCALTIMESTAMP) + INTERVAL '0 days 18:00', 60, 14, 3),
  ('Vinyasa Flow',     'Yoga',     'Aiko Mori',    'Zen Room',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '1 days 09:00', 50, 24, 1),
  ('Rhythm Ride',      'Spin',     'Jordan Ellis', 'Cycle Lab', date_trunc('week', LOCALTIMESTAMP) + INTERVAL '1 days 12:15', 40, 30, 2),
  ('Knockout Cardio',  'Boxing',   'Sam Okafor',   'The Ring',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '2 days 17:30', 50, 16, 3),
  ('Glute Lab',        'Strength', 'Nina Park',    'Studio B',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '3 days 18:30', 45, 18, 2),
  ('Tabata Torch',     'HIIT',     'Maya Torres',  'Studio A',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '4 days 07:00', 30, 20, 3),
  ('Hill Climb Spin',  'Spin',     'Jordan Ellis', 'Cycle Lab', date_trunc('week', LOCALTIMESTAMP) + INTERVAL '4 days 19:00', 45, 30, 2),
  ('Fight Fit',        'Boxing',   'Sam Okafor',   'The Ring',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '5 days 10:00', 50, 16, 2),
  ('Yin & Restore',    'Yoga',     'Aiko Mori',    'Zen Room',  date_trunc('week', LOCALTIMESTAMP) + INTERVAL '6 days 17:00', 60, 24, 1)
ON CONFLICT (title) DO UPDATE SET
  category         = EXCLUDED.category,
  coach_name       = EXCLUDED.coach_name,
  room             = EXCLUDED.room,
  start_time       = EXCLUDED.start_time,
  duration_minutes = EXCLUDED.duration_minutes,
  capacity         = EXCLUDED.capacity,
  intensity        = EXCLUDED.intensity;
