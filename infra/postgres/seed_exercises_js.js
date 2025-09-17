// Simple script to seed exercises using Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uajwqpocubnhrotapire.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhandxcG9jdWJuaHJvdGFwaXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjI0MzcsImV4cCI6MjA2OTUzODQzN30.BVefkikNJHoPh5JJKTkTEaQu_bAO5eSxx-ZYNiqZZm0';

const supabase = createClient(supabaseUrl, supabaseKey);

const exercises = [
  { name: 'Push-ups', description: 'Classic bodyweight exercise for chest, shoulders, and triceps' },
  { name: 'Squats', description: 'Fundamental lower body exercise targeting glutes and quads' },
  { name: 'Burpees', description: 'Full-body high-intensity exercise combining squat, push-up, and jump' },
  { name: 'Mountain Climbers', description: 'Cardio exercise targeting core and legs' },
  { name: 'Jumping Jacks', description: 'Basic cardio exercise for warm-up' },
  { name: 'Plank', description: 'Isometric core strengthening exercise' },
  { name: 'Lunges', description: 'Single-leg exercise for glutes, quads, and hamstrings' },
  { name: 'High Knees', description: 'Cardio exercise with knee lifts' },
  { name: 'Butt Kicks', description: 'Cardio exercise with heel kicks' },
  { name: 'Arm Circles', description: 'Shoulder mobility and warm-up exercise' },
  { name: 'Leg Raises', description: 'Core exercise targeting lower abs' },
  { name: 'Russian Twists', description: 'Core exercise with rotational movement' },
  { name: 'Wall Sit', description: 'Isometric exercise for quads and glutes' },
  { name: 'Tricep Dips', description: 'Upper body exercise targeting triceps' },
  { name: 'Bicycle Crunches', description: 'Core exercise with alternating knee-to-elbow movement' },
  { name: 'Bear Crawl', description: 'Full-body exercise on hands and feet' },
  { name: 'Dead Bug', description: 'Core stability exercise' },
  { name: 'Superman', description: 'Back strengthening exercise' },
  { name: 'Glute Bridges', description: 'Hip and glute strengthening exercise' },
  { name: 'Calf Raises', description: 'Lower leg strengthening exercise' },
  { name: 'Jump Squats', description: 'Explosive lower body exercise' },
  { name: 'Pike Push-ups', description: 'Advanced push-up variation targeting shoulders' },
  { name: 'Single-leg Glute Bridges', description: 'Unilateral glute strengthening' },
  { name: 'Side Plank', description: 'Lateral core strengthening exercise' },
  { name: 'Hollow Body Hold', description: 'Advanced core isometric exercise' },
  { name: 'V-ups', description: 'Core exercise combining leg raises and crunches' },
  { name: 'Flutter Kicks', description: 'Core exercise with alternating leg movements' },
  { name: 'Scissor Kicks', description: 'Core exercise with crossing leg movements' },
  { name: 'Reverse Crunches', description: 'Core exercise targeting lower abs' },
  { name: 'Mason Twists', description: 'Core exercise with rotational movement' },
];

async function seedExercises() {
  try {
    console.log('Starting to seed exercises...');
    
    // First, check if exercises already exist
    const { data: existingExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('name');
    
    if (fetchError) {
      console.error('Error fetching existing exercises:', fetchError);
      return;
    }
    
    const existingNames = new Set(existingExercises?.map(e => e.name) || []);
    const newExercises = exercises.filter(e => !existingNames.has(e.name));
    
    if (newExercises.length === 0) {
      console.log('All exercises already exist in the database.');
      return;
    }
    
    console.log(`Adding ${newExercises.length} new exercises...`);
    
    // Insert new exercises
    const { data, error } = await supabase
      .from('exercises')
      .insert(newExercises)
      .select();
    
    if (error) {
      console.error('Error inserting exercises:', error);
      return;
    }
    
    console.log(`✅ Successfully added ${data.length} exercises!`);
    console.log('Added exercises:', data.map(e => e.name).join(', '));
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

seedExercises();
