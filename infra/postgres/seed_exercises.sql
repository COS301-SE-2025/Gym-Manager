-- Seed some common exercises for testing
INSERT INTO exercises (name, description) VALUES
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
('Calf Raises', 'Lower leg strengthening exercise')
ON CONFLICT DO NOTHING;
