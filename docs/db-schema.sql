-- Math Race - MySQL Schema
-- Charset and collation recommended for Hebrew + English support.

CREATE DATABASE IF NOT EXISTS math_race
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE math_race;

-- =========================================================
-- 1) teachers
-- =========================================================
CREATE TABLE IF NOT EXISTS teachers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'TEACHER',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 2) students
-- =========================================================
CREATE TABLE IF NOT EXISTS students (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  display_name VARCHAR(80) NOT NULL,
  external_ref VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 3) race_rooms
-- =========================================================
CREATE TABLE IF NOT EXISTS race_rooms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  teacher_id BIGINT NOT NULL,
  room_code VARCHAR(12) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  class_name VARCHAR(120) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'LOBBY', -- DRAFT/LOBBY/RUNNING/FINISHED/CANCELLED
  max_participants INT NOT NULL DEFAULT 8,
  question_time_ms INT NOT NULL DEFAULT 15000,
  initial_difficulty VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
  enable_luck_events TINYINT(1) NOT NULL DEFAULT 1,
  enable_path_choice TINYINT(1) NOT NULL DEFAULT 1,
  start_at DATETIME NULL,
  finish_at DATETIME NULL,
  winner_participant_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_race_rooms_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_race_rooms_teacher ON race_rooms(teacher_id);
CREATE INDEX idx_race_rooms_status ON race_rooms(status);

-- =========================================================
-- 4) race_participants
-- =========================================================
CREATE TABLE IF NOT EXISTS race_participants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  race_room_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  lane_no INT NOT NULL, -- 1..8
  car_color VARCHAR(30) NOT NULL,
  participant_status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING/ACTIVE/DISCONNECTED/LEFT/FINISHED
  progress_points INT NOT NULL DEFAULT 0, -- 0..1000
  score_total INT NOT NULL DEFAULT 0,
  streak_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  avg_response_ms INT NULL,
  last_answer_at DATETIME NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_participants_room
    FOREIGN KEY (race_room_id) REFERENCES race_rooms(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_participants_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uk_room_student UNIQUE (race_room_id, student_id),
  CONSTRAINT uk_room_lane UNIQUE (race_room_id, lane_no)
);

CREATE INDEX idx_participants_room ON race_participants(race_room_id);
CREATE INDEX idx_participants_progress ON race_participants(race_room_id, progress_points DESC);

-- =========================================================
-- 5) question_templates
-- =========================================================
CREATE TABLE IF NOT EXISTS question_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  template_code VARCHAR(80) NOT NULL UNIQUE,
  topic VARCHAR(60) NOT NULL, -- ADDITION/SUBTRACTION/MULTIPLICATION/DIVISION/MIXED
  difficulty VARCHAR(30) NOT NULL, -- EASY/MEDIUM/HARD
  expression_pattern VARCHAR(255) NOT NULL, -- e.g. "{a} + {b}"
  min_operand INT NOT NULL,
  max_operand INT NOT NULL,
  allow_negative TINYINT(1) NOT NULL DEFAULT 0,
  estimated_time_ms INT NOT NULL DEFAULT 15000,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_topic_diff ON question_templates(topic, difficulty, is_active);

-- =========================================================
-- 6) generated_questions
-- =========================================================
CREATE TABLE IF NOT EXISTS generated_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  race_room_id BIGINT NOT NULL,
  race_participant_id BIGINT NOT NULL,
  template_id BIGINT NULL,
  difficulty VARCHAR(30) NOT NULL,
  question_text VARCHAR(255) NOT NULL,
  correct_answer VARCHAR(80) NOT NULL,
  options_json JSON NULL,
  seed_value BIGINT NULL,
  max_time_ms INT NOT NULL,
  presented_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expired_at DATETIME NULL,
  is_answered TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_generated_room
    FOREIGN KEY (race_room_id) REFERENCES race_rooms(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_generated_participant
    FOREIGN KEY (race_participant_id) REFERENCES race_participants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_generated_template
    FOREIGN KEY (template_id) REFERENCES question_templates(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_generated_room_participant ON generated_questions(race_room_id, race_participant_id);
CREATE INDEX idx_generated_presented_at ON generated_questions(presented_at);

-- =========================================================
-- 7) answers
-- =========================================================
CREATE TABLE IF NOT EXISTS answers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  race_room_id BIGINT NOT NULL,
  race_participant_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  submitted_answer VARCHAR(80) NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  response_time_ms INT NOT NULL,
  base_points INT NOT NULL DEFAULT 0,
  bonus_points INT NOT NULL DEFAULT 0,
  penalty_points INT NOT NULL DEFAULT 0,
  final_delta_points INT NOT NULL DEFAULT 0,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_answers_room
    FOREIGN KEY (race_room_id) REFERENCES race_rooms(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_answers_participant
    FOREIGN KEY (race_participant_id) REFERENCES race_participants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_answers_question
    FOREIGN KEY (question_id) REFERENCES generated_questions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_answers_room_participant ON answers(race_room_id, race_participant_id);
CREATE INDEX idx_answers_submitted_at ON answers(submitted_at);

-- =========================================================
-- 8) game_events
-- =========================================================
CREATE TABLE IF NOT EXISTS game_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  race_room_id BIGINT NOT NULL,
  race_participant_id BIGINT NULL,
  event_type VARCHAR(40) NOT NULL, -- TURBO/MALFUNCTION/SLOWDOWN/BOOST/HINT/SWAP/PATH_DECISION/OVERTAKE/WINNER
  event_scope VARCHAR(20) NOT NULL DEFAULT 'PERSONAL', -- PERSONAL/ROOM
  payload_json JSON NULL,
  impact_points INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_room
    FOREIGN KEY (race_room_id) REFERENCES race_rooms(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_events_participant
    FOREIGN KEY (race_participant_id) REFERENCES race_participants(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_events_room_time ON game_events(race_room_id, created_at DESC);

-- =========================================================
-- 9) race_results
-- =========================================================
CREATE TABLE IF NOT EXISTS race_results (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  race_room_id BIGINT NOT NULL,
  race_participant_id BIGINT NOT NULL,
  final_rank INT NOT NULL,
  final_progress INT NOT NULL,
  final_score INT NOT NULL,
  accuracy_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  avg_response_ms INT NULL,
  total_correct INT NOT NULL DEFAULT 0,
  total_wrong INT NOT NULL DEFAULT 0,
  total_events INT NOT NULL DEFAULT 0,
  finished_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_room
    FOREIGN KEY (race_room_id) REFERENCES race_rooms(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_results_participant
    FOREIGN KEY (race_participant_id) REFERENCES race_participants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uk_results_room_participant UNIQUE (race_room_id, race_participant_id)
);

CREATE INDEX idx_results_room_rank ON race_results(race_room_id, final_rank);

-- Optional initial templates
INSERT INTO question_templates
  (template_code, topic, difficulty, expression_pattern, min_operand, max_operand, allow_negative, estimated_time_ms, is_active)
VALUES
  ('ADD_EASY_A', 'ADDITION', 'EASY', '{a} + {b}', 1, 20, 0, 12000, 1),
  ('SUB_EASY_A', 'SUBTRACTION', 'EASY', '{a} - {b}', 1, 20, 0, 12000, 1),
  ('MUL_MED_A', 'MULTIPLICATION', 'MEDIUM', '{a} x {b}', 2, 12, 0, 15000, 1),
  ('DIV_MED_A', 'DIVISION', 'MEDIUM', '{a} / {b}', 2, 12, 0, 18000, 1),
  ('MIX_HARD_A', 'MIXED', 'HARD', '({a} x {b}) + {c}', 3, 25, 0, 20000, 1);
