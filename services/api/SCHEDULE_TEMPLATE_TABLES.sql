-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
    template_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT schedule_templates_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES admins(user_id) ON DELETE CASCADE
);

-- Create template_schedule_items table
CREATE TABLE IF NOT EXISTS template_schedule_items (
    item_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    coach_id INTEGER,
    workout_id INTEGER,
    class_title VARCHAR(255),
    CONSTRAINT template_schedule_items_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES schedule_templates(template_id) ON DELETE CASCADE,
    CONSTRAINT template_schedule_items_coach_id_fkey 
        FOREIGN KEY (coach_id) REFERENCES coaches(user_id),
    CONSTRAINT template_schedule_items_workout_id_fkey 
        FOREIGN KEY (workout_id) REFERENCES workouts(workout_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_by ON schedule_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_is_active ON schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_template_schedule_items_template_id ON template_schedule_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_schedule_items_day_of_week ON template_schedule_items(day_of_week);
CREATE INDEX IF NOT EXISTS idx_template_schedule_items_coach_id ON template_schedule_items(coach_id);

-- Add comments for documentation
COMMENT ON TABLE schedule_templates IS 'Templates for recurring class schedules';
COMMENT ON TABLE template_schedule_items IS 'Individual schedule items within a template';

COMMENT ON COLUMN schedule_templates.template_id IS 'Primary key for schedule template';
COMMENT ON COLUMN schedule_templates.name IS 'Name of the schedule template';
COMMENT ON COLUMN schedule_templates.description IS 'Optional description of the template';
COMMENT ON COLUMN schedule_templates.is_active IS 'Whether the template is active and can be used';
COMMENT ON COLUMN schedule_templates.created_by IS 'Admin user who created the template';
COMMENT ON COLUMN schedule_templates.created_at IS 'When the template was created';
COMMENT ON COLUMN schedule_templates.updated_at IS 'When the template was last updated';

COMMENT ON COLUMN template_schedule_items.item_id IS 'Primary key for schedule item';
COMMENT ON COLUMN template_schedule_items.template_id IS 'Foreign key to schedule_templates';
COMMENT ON COLUMN template_schedule_items.day_of_week IS 'Day of week (0=Sunday, 1=Monday, etc.)';
COMMENT ON COLUMN template_schedule_items.scheduled_time IS 'Time of day for the class';
COMMENT ON COLUMN template_schedule_items.duration_minutes IS 'Duration of the class in minutes';
COMMENT ON COLUMN template_schedule_items.capacity IS 'Maximum number of participants';
COMMENT ON COLUMN template_schedule_items.coach_id IS 'Optional coach assigned to this schedule item';
COMMENT ON COLUMN template_schedule_items.workout_id IS 'Optional workout assigned to this schedule item';
COMMENT ON COLUMN template_schedule_items.class_title IS 'Optional title for the class';
